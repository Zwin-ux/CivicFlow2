# CI/CD Pipeline Documentation

This directory contains GitHub Actions workflows for the Government Lending CRM Platform.

## Workflows

### 1. CI Pipeline (`ci.yml`)

**Trigger**: Push or Pull Request to `main` or `develop` branches

**Purpose**: Automated testing, linting, and security scanning

**Jobs**:
- **test**: Runs unit tests, integration tests, and linting
  - Sets up PostgreSQL and Redis services
  - Runs ESLint for code quality
  - Executes Jest tests with coverage reporting
  - Uploads coverage to Codecov
  - Builds the application
  
- **security-scan**: Performs security vulnerability scanning
  - Runs npm audit for dependency vulnerabilities
  - Uses Trivy to scan for security issues
  - Uploads results to GitHub Security tab

### 2. Staging Deployment (`cd-staging.yml`)

**Trigger**: Push to `develop` branch or manual workflow dispatch

**Purpose**: Automated deployment to staging environment

**Environment**: `staging`
- URL: https://staging.lending-crm.example.com

**Steps**:
1. Checkout code and setup Node.js
2. Install dependencies and build application
3. Configure AWS credentials and login to ECR
4. Build and push Docker image to ECR
5. Configure kubectl for EKS cluster
6. Run database migrations
7. Deploy to Kubernetes staging namespace
8. Run smoke tests
9. Send Slack notification

**Required Secrets**:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `STAGING_DATABASE_URL`
- `SLACK_WEBHOOK`

### 3. Production Deployment (`cd-production.yml`)

**Trigger**: 
- Push to `main` branch
- Git tags matching `v*.*.*`
- Manual workflow dispatch

**Purpose**: Controlled deployment to production with manual approval

**Environment**: `production`
- URL: https://lending-crm.example.com
- **Requires manual approval** (configured in GitHub environment settings)

**Steps**:
1. Checkout code and setup Node.js
2. Install dependencies and run full test suite
3. Build application
4. Configure AWS credentials and login to ECR
5. Build and push Docker image to ECR
6. Configure kubectl for EKS cluster
7. **Create database backup before deployment**
8. Run database migrations
9. Deploy to Kubernetes using blue-green strategy
10. Run comprehensive health checks
11. Run smoke tests
12. Rollback automatically on failure
13. Send Slack notification
14. Create GitHub release (for tagged versions)

**Required Secrets**:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `PRODUCTION_DATABASE_URL`
- `DB_USER`
- `BACKUP_BUCKET`
- `SLACK_WEBHOOK`
- `GITHUB_TOKEN` (automatically provided)

## Setup Instructions

### 1. Configure GitHub Environments

Create two environments in your GitHub repository settings:

**Staging Environment**:
- Name: `staging`
- No protection rules required
- Add environment secrets

**Production Environment**:
- Name: `production`
- Enable "Required reviewers" - add at least 2 reviewers
- Enable "Wait timer" - set to 5 minutes (optional)
- Add environment secrets

### 2. Configure AWS Resources

**ECR Repositories**:
```bash
aws ecr create-repository --repository-name lending-crm-staging
aws ecr create-repository --repository-name lending-crm-production
```

**EKS Clusters**:
- Staging: `lending-crm-staging`
- Production: `lending-crm-production`

**S3 Backup Bucket**:
```bash
aws s3 mb s3://lending-crm-backups
aws s3api put-bucket-versioning --bucket lending-crm-backups --versioning-configuration Status=Enabled
```

### 3. Add GitHub Secrets

Navigate to Settings → Secrets and variables → Actions

**Repository Secrets** (shared across environments):
- `AWS_ACCESS_KEY_ID`: AWS access key for ECR and EKS
- `AWS_SECRET_ACCESS_KEY`: AWS secret key
- `AWS_REGION`: AWS region (e.g., us-east-1)
- `SLACK_WEBHOOK`: Slack webhook URL for notifications

**Environment Secrets**:

Staging:
- `STAGING_DATABASE_URL`: PostgreSQL connection string

Production:
- `PRODUCTION_DATABASE_URL`: PostgreSQL connection string
- `DB_USER`: Database username for backups
- `BACKUP_BUCKET`: S3 bucket name for backups

### 4. Configure Kubernetes Namespaces

```bash
# Staging
kubectl create namespace staging
kubectl apply -f k8s/ -n staging

# Production
kubectl create namespace production
kubectl apply -f k8s/ -n production
```

### 5. Setup Slack Notifications (Optional)

1. Create a Slack app and incoming webhook
2. Add webhook URL to GitHub secrets as `SLACK_WEBHOOK`
3. Notifications will be sent for deployment status

## Deployment Process

### Staging Deployment

Automatic deployment on every push to `develop`:

```bash
git checkout develop
git add .
git commit -m "feat: add new feature"
git push origin develop
```

The workflow will automatically:
- Build and test the application
- Deploy to staging environment
- Run smoke tests

### Production Deployment

**Option 1: Push to main branch**
```bash
git checkout main
git merge develop
git push origin main
```

**Option 2: Create a release tag**
```bash
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

**Option 3: Manual trigger**
- Go to Actions → Deploy to Production
- Click "Run workflow"
- Select branch and click "Run workflow"

**Manual Approval Required**:
1. Workflow will pause at the production environment
2. Designated reviewers will receive a notification
3. Reviewers must approve the deployment
4. After approval, deployment continues automatically

## Rollback Procedure

### Automatic Rollback

If health checks fail, the production workflow automatically rolls back to the previous version.

### Manual Rollback

```bash
# Connect to production cluster
aws eks update-kubeconfig --name lending-crm-production --region us-east-1

# Rollback to previous version
kubectl rollout undo deployment/lending-crm-api -n production

# Check rollback status
kubectl rollout status deployment/lending-crm-api -n production
```

## Monitoring Deployments

### View Workflow Status

- Go to Actions tab in GitHub repository
- Click on the workflow run to see detailed logs
- Each step shows execution time and output

### Check Deployment Status

```bash
# Staging
kubectl get pods -n staging
kubectl logs -f deployment/lending-crm-api -n staging

# Production
kubectl get pods -n production
kubectl logs -f deployment/lending-crm-api -n production
```

### View Deployment History

```bash
kubectl rollout history deployment/lending-crm-api -n production
```

## Troubleshooting

### Build Failures

1. Check the CI workflow logs for test failures
2. Run tests locally: `npm test`
3. Fix issues and push again

### Deployment Failures

1. Check kubectl logs in the workflow output
2. Verify AWS credentials are correct
3. Ensure EKS cluster is accessible
4. Check database migration logs

### Health Check Failures

1. Review application logs: `kubectl logs -f deployment/lending-crm-api -n production`
2. Check database connectivity
3. Verify environment variables are set correctly
4. Manual rollback if needed

### Database Migration Issues

1. Migrations are run before deployment
2. If migration fails, deployment is aborted
3. Check migration logs in workflow output
4. Fix migration scripts and redeploy

## Best Practices

1. **Always test in staging first**: Merge to `develop` before `main`
2. **Use semantic versioning**: Tag releases with `v1.0.0` format
3. **Review before production**: Ensure manual approval is configured
4. **Monitor deployments**: Watch logs during deployment
5. **Keep secrets secure**: Never commit secrets to repository
6. **Regular backups**: Production workflow creates backups automatically
7. **Test rollbacks**: Periodically test rollback procedures

## Security Considerations

- All secrets are stored in GitHub Secrets (encrypted)
- AWS credentials use least-privilege IAM policies
- Docker images are scanned for vulnerabilities
- Database backups are encrypted in S3
- TLS is enforced for all communications
- Manual approval required for production deployments

## Performance Metrics

Target deployment times:
- CI Pipeline: 5-10 minutes
- Staging Deployment: 10-15 minutes
- Production Deployment: 15-20 minutes (including approval wait time)

## Support

For issues with CI/CD pipeline:
1. Check workflow logs in GitHub Actions
2. Review this documentation
3. Contact DevOps team
4. Create an issue in the repository
