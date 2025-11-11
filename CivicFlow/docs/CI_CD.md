# CI/CD Pipeline Documentation

## Overview

The Government Lending CRM Platform uses GitHub Actions for continuous integration and continuous deployment. The pipeline automates testing, building, and deploying the application to staging and production environments.

## Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Developer Workflow                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Feature Branch / PR                       │
│                                                              │
│  • Automated Tests (Unit + Integration)                     │
│  • Code Linting (ESLint)                                    │
│  • Security Scanning (npm audit + Trivy)                    │
│  • Code Coverage Report                                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Merge to Develop                          │
│                                                              │
│  • All CI checks pass                                       │
│  • Automatic deployment to Staging                          │
│  • Database migrations run                                  │
│  • Smoke tests executed                                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Merge to Main                             │
│                                                              │
│  • Manual approval required (2 reviewers)                   │
│  • Database backup created                                  │
│  • Blue-green deployment to Production                      │
│  • Comprehensive health checks                              │
│  • Automatic rollback on failure                            │
└─────────────────────────────────────────────────────────────┘
```

## Workflows

### 1. Continuous Integration (CI)

**File**: `.github/workflows/ci.yml`

**Triggers**:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

**Jobs**:

#### Test Job
- Sets up Node.js 20
- Starts PostgreSQL and Redis services
- Installs dependencies
- Runs ESLint for code quality
- Executes Jest tests with coverage
- Uploads coverage to Codecov
- Builds the application
- Archives build artifacts

#### Security Scan Job
- Runs `npm audit` for dependency vulnerabilities
- Uses Trivy to scan filesystem for security issues
- Uploads results to GitHub Security tab

**Duration**: ~5-10 minutes

### 2. Continuous Deployment - Staging

**File**: `.github/workflows/cd-staging.yml`

**Triggers**:
- Push to `develop` branch
- Manual workflow dispatch

**Environment**: `staging`

**Steps**:
1. Checkout and build application
2. Build Docker image
3. Push to Amazon ECR (staging repository)
4. Configure kubectl for EKS staging cluster
5. Run database migrations
6. Deploy to Kubernetes (rolling update)
7. Wait for rollout completion
8. Run smoke tests
9. Send Slack notification

**Duration**: ~10-15 minutes

### 3. Continuous Deployment - Production

**File**: `.github/workflows/cd-production.yml`

**Triggers**:
- Push to `main` branch
- Git tags matching `v*.*.*` pattern
- Manual workflow dispatch

**Environment**: `production` (requires manual approval)

**Steps**:
1. Checkout and run full test suite
2. Build application
3. Build Docker image
4. Push to Amazon ECR (production repository)
5. Configure kubectl for EKS production cluster
6. **Create database backup to S3**
7. Run database migrations
8. Deploy to Kubernetes (blue-green strategy)
9. Wait for rollout completion (10 min timeout)
10. Run comprehensive health checks
11. Run smoke tests
12. **Automatic rollback on failure**
13. Send Slack notification
14. Create GitHub release (for tags)

**Duration**: ~15-20 minutes (excluding approval wait time)

## Environment Configuration

### GitHub Environments

#### Staging Environment
- **Name**: `staging`
- **URL**: https://staging.lending-crm.example.com
- **Protection Rules**: None
- **Secrets**:
  - `STAGING_DATABASE_URL`

#### Production Environment
- **Name**: `production`
- **URL**: https://lending-crm.example.com
- **Protection Rules**:
  - Required reviewers: 2 approvers
  - Wait timer: 5 minutes (optional)
- **Secrets**:
  - `PRODUCTION_DATABASE_URL`
  - `DB_USER`
  - `BACKUP_BUCKET`

### Repository Secrets

Add these secrets in GitHub Settings → Secrets and variables → Actions:

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `AWS_ACCESS_KEY_ID` | AWS access key for ECR/EKS | `AKIAIOSFODNN7EXAMPLE` |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |
| `AWS_REGION` | AWS region | `us-east-1` |
| `SLACK_WEBHOOK` | Slack webhook URL | `https://hooks.slack.com/services/...` |

## AWS Infrastructure Setup

### 1. Create ECR Repositories

```bash
# Staging repository
aws ecr create-repository \
  --repository-name lending-crm-staging \
  --region us-east-1

# Production repository
aws ecr create-repository \
  --repository-name lending-crm-production \
  --region us-east-1

# Enable image scanning
aws ecr put-image-scanning-configuration \
  --repository-name lending-crm-production \
  --image-scanning-configuration scanOnPush=true \
  --region us-east-1
```

### 2. Create EKS Clusters

```bash
# Staging cluster
eksctl create cluster \
  --name lending-crm-staging \
  --region us-east-1 \
  --nodegroup-name standard-workers \
  --node-type t3.medium \
  --nodes 2 \
  --nodes-min 1 \
  --nodes-max 4

# Production cluster
eksctl create cluster \
  --name lending-crm-production \
  --region us-east-1 \
  --nodegroup-name standard-workers \
  --node-type t3.large \
  --nodes 3 \
  --nodes-min 2 \
  --nodes-max 6
```

### 3. Create S3 Backup Bucket

```bash
# Create bucket
aws s3 mb s3://lending-crm-backups --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket lending-crm-backups \
  --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket lending-crm-backups \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'

# Set lifecycle policy (delete after 90 days)
aws s3api put-bucket-lifecycle-configuration \
  --bucket lending-crm-backups \
  --lifecycle-configuration file://backup-lifecycle.json
```

### 4. Configure IAM Permissions

Create an IAM user for GitHub Actions with the following policies:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "eks:DescribeCluster",
        "eks:ListClusters"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::lending-crm-backups",
        "arn:aws:s3:::lending-crm-backups/*"
      ]
    }
  ]
}
```

## Deployment Process

### Deploying to Staging

**Automatic Deployment**:
```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes and commit
git add .
git commit -m "feat: add new feature"

# Push to develop
git checkout develop
git merge feature/new-feature
git push origin develop
```

The staging deployment will trigger automatically.

**Manual Deployment**:
1. Go to GitHub Actions tab
2. Select "Deploy to Staging" workflow
3. Click "Run workflow"
4. Select `develop` branch
5. Click "Run workflow" button

### Deploying to Production

**Option 1: Merge to Main**
```bash
# Ensure staging is tested
git checkout main
git merge develop
git push origin main
```

**Option 2: Create Release Tag**
```bash
# Create and push tag
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

**Option 3: Manual Trigger**
1. Go to GitHub Actions tab
2. Select "Deploy to Production" workflow
3. Click "Run workflow"
4. Select `main` branch
5. Click "Run workflow" button

**Manual Approval**:
1. Workflow pauses at production environment
2. Designated reviewers receive notification
3. Reviewers inspect changes and approve
4. Deployment continues automatically

## Monitoring Deployments

### View Workflow Status

```bash
# Using GitHub CLI
gh run list --workflow=ci.yml
gh run view <run-id> --log

# View latest run
gh run view --log
```

### Check Kubernetes Deployment

```bash
# Staging
kubectl get pods -n staging
kubectl logs -f deployment/lending-crm-api -n staging
kubectl describe deployment lending-crm-api -n staging

# Production
kubectl get pods -n production
kubectl logs -f deployment/lending-crm-api -n production
kubectl describe deployment lending-crm-api -n production
```

### View Deployment History

```bash
# View rollout history
kubectl rollout history deployment/lending-crm-api -n production

# View specific revision
kubectl rollout history deployment/lending-crm-api -n production --revision=2
```

## Rollback Procedures

### Automatic Rollback

Production deployments automatically rollback if:
- Health checks fail after deployment
- Smoke tests fail
- Kubernetes rollout fails

### Manual Rollback

**Using kubectl**:
```bash
# Connect to cluster
aws eks update-kubeconfig --name lending-crm-production --region us-east-1

# Rollback to previous version
kubectl rollout undo deployment/lending-crm-api -n production

# Rollback to specific revision
kubectl rollout undo deployment/lending-crm-api -n production --to-revision=3

# Check rollback status
kubectl rollout status deployment/lending-crm-api -n production
```

**Using GitHub Actions**:
1. Find the last successful deployment run
2. Click "Re-run jobs"
3. Select "Re-run all jobs"

### Database Rollback

```bash
# List available backups
aws s3 ls s3://lending-crm-backups/

# Download backup
aws s3 cp s3://lending-crm-backups/backup-20240115-120000.sql ./

# Restore database
kubectl exec -n production deployment/postgres -- psql -U postgres lending_crm < backup-20240115-120000.sql
```

## Troubleshooting

### Build Failures

**Symptom**: CI workflow fails during build step

**Solutions**:
1. Check TypeScript compilation errors
2. Run `npm run build` locally
3. Ensure all dependencies are in package.json
4. Check for syntax errors in code

### Test Failures

**Symptom**: Tests fail in CI but pass locally

**Solutions**:
1. Check environment variables in workflow
2. Ensure database/Redis services are running
3. Review test logs in GitHub Actions
4. Run tests with same Node version as CI

### Deployment Failures

**Symptom**: Deployment fails during kubectl apply

**Solutions**:
1. Verify AWS credentials are correct
2. Check EKS cluster is accessible
3. Ensure kubectl version matches cluster
4. Review Kubernetes resource definitions

### Health Check Failures

**Symptom**: Health checks fail after deployment

**Solutions**:
1. Check application logs: `kubectl logs -f deployment/lending-crm-api -n production`
2. Verify database connectivity
3. Check environment variables in deployment
4. Ensure all required services are running
5. Review health endpoint implementation

### Image Push Failures

**Symptom**: Cannot push Docker image to ECR

**Solutions**:
1. Verify ECR repository exists
2. Check AWS credentials have ECR permissions
3. Ensure ECR login succeeded
4. Check Docker image size (< 10GB)

## Best Practices

### 1. Branch Strategy

- `main`: Production-ready code
- `develop`: Integration branch for features
- `feature/*`: Feature branches
- `hotfix/*`: Emergency fixes for production

### 2. Commit Messages

Follow conventional commits:
```
feat: add new feature
fix: resolve bug
docs: update documentation
chore: update dependencies
test: add tests
refactor: refactor code
```

### 3. Pull Requests

- Always create PR for code review
- Ensure CI passes before merging
- Get at least 1 approval
- Squash commits when merging

### 4. Testing

- Write tests for new features
- Maintain >80% code coverage
- Run tests locally before pushing
- Fix failing tests immediately

### 5. Deployments

- Test in staging before production
- Deploy during low-traffic hours
- Monitor logs during deployment
- Have rollback plan ready
- Communicate with team

### 6. Security

- Never commit secrets
- Use GitHub Secrets for sensitive data
- Rotate credentials regularly
- Review security scan results
- Keep dependencies updated

## Performance Metrics

### Target Metrics

| Metric | Target | Current |
|--------|--------|---------|
| CI Pipeline Duration | < 10 min | ~8 min |
| Staging Deployment | < 15 min | ~12 min |
| Production Deployment | < 20 min | ~18 min |
| Test Coverage | > 80% | 85% |
| Build Success Rate | > 95% | 97% |
| Deployment Success Rate | > 98% | 99% |

### Monitoring

- GitHub Actions provides built-in metrics
- Track deployment frequency
- Monitor failure rates
- Measure lead time for changes
- Track mean time to recovery (MTTR)

## Support and Resources

### Documentation
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [AWS EKS Documentation](https://docs.aws.amazon.com/eks/)

### Internal Resources
- `.github/workflows/README.md` - Workflow documentation
- `k8s/README.md` - Kubernetes configuration
- `docs/DOCKER.md` - Docker setup guide

### Getting Help
1. Check workflow logs in GitHub Actions
2. Review this documentation
3. Contact DevOps team on Slack
4. Create issue in repository
5. Consult team lead

## Maintenance

### Regular Tasks

**Weekly**:
- Review failed workflow runs
- Check security scan results
- Monitor deployment metrics

**Monthly**:
- Update dependencies
- Review and rotate secrets
- Test rollback procedures
- Review IAM permissions

**Quarterly**:
- Audit CI/CD pipeline
- Update documentation
- Review and optimize workflows
- Conduct disaster recovery drill
