# Kubernetes Deployment Guide

This directory contains Kubernetes manifests for deploying the Government Lending CRM Platform.

## Architecture Overview

The deployment consists of:
- **API Server**: Node.js/Express application (3-10 replicas with HPA)
- **PostgreSQL**: Primary database with persistent storage
- **Redis**: Cache layer with persistent storage
- **Ingress**: NGINX ingress controller with TLS termination
- **Cert Manager**: Automatic TLS certificate management

## Prerequisites

1. **Kubernetes Cluster**: v1.24 or higher
2. **kubectl**: Configured to access your cluster
3. **NGINX Ingress Controller**: Installed in the cluster
4. **Cert Manager**: For automatic TLS certificate provisioning
5. **Metrics Server**: For HPA to function properly
6. **Docker Image**: Build and push the API image to your registry

## Installation Steps

### 1. Install Prerequisites

```bash
# Install NGINX Ingress Controller
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/cloud/deploy.yaml

# Install Cert Manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Install Metrics Server (if not already installed)
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

### 2. Build and Push Docker Image

```bash
# Build the Docker image
docker build -t your-registry/lending-crm-api:latest -f Dockerfile .

# Push to your container registry
docker push your-registry/lending-crm-api:latest
```

Update the image reference in `api-deployment.yaml`:
```yaml
image: your-registry/lending-crm-api:latest
```

### 3. Configure Secrets

**IMPORTANT**: Update the secrets before deploying to production!

Edit `secrets.yaml` and replace all placeholder values:
- Database credentials
- JWT secrets
- Encryption keys
- OAuth credentials
- API keys
- Cloud storage credentials

For production, use base64-encoded values:
```bash
echo -n "your-secret-value" | base64
```

### 4. Update Configuration

Edit `configmap.yaml` to match your environment settings.

Edit `ingress.yaml` to use your domain names:
```yaml
- host: lending-crm.yourdomain.com
- host: api.lending-crm.yourdomain.com
```

Edit `cert-issuer.yaml` to use your email address:
```yaml
email: admin@yourdomain.com
```

### 5. Deploy to Kubernetes

Deploy in the following order:

```bash
# Create namespace
kubectl apply -f namespace.yaml

# Create configuration and secrets
kubectl apply -f configmap.yaml
kubectl apply -f secrets.yaml

# Deploy database and cache
kubectl apply -f postgres-deployment.yaml
kubectl apply -f redis-deployment.yaml

# Wait for database and cache to be ready
kubectl wait --for=condition=ready pod -l app=postgres -n lending-crm --timeout=300s
kubectl wait --for=condition=ready pod -l app=redis -n lending-crm --timeout=300s

# Deploy API application
kubectl apply -f api-deployment.yaml

# Wait for API to be ready
kubectl wait --for=condition=ready pod -l app=lending-crm-api -n lending-crm --timeout=300s

# Configure autoscaling
kubectl apply -f hpa.yaml

# Set up networking
kubectl apply -f network-policy.yaml
kubectl apply -f resource-quota.yaml
kubectl apply -f pod-disruption-budget.yaml

# Configure TLS certificates
kubectl apply -f cert-issuer.yaml

# Deploy ingress (this will trigger certificate provisioning)
kubectl apply -f ingress.yaml
```

### 6. Verify Deployment

```bash
# Check all pods are running
kubectl get pods -n lending-crm

# Check services
kubectl get svc -n lending-crm

# Check ingress
kubectl get ingress -n lending-crm

# Check HPA status
kubectl get hpa -n lending-crm

# Check certificate status
kubectl get certificate -n lending-crm

# View logs
kubectl logs -f deployment/lending-crm-api -n lending-crm
```

## Quick Deploy Script

Use the provided script for automated deployment:

```bash
# Make the script executable
chmod +x deploy.sh

# Deploy everything
./deploy.sh

# Or deploy specific components
./deploy.sh --component api
./deploy.sh --component database
```

## Horizontal Pod Autoscaling

The API deployment includes HPA configuration:
- **Min Replicas**: 3
- **Max Replicas**: 10
- **CPU Target**: 70% utilization
- **Memory Target**: 80% utilization

The HPA will automatically scale pods based on resource usage.

Monitor HPA:
```bash
kubectl get hpa -n lending-crm -w
```

## TLS Configuration

The ingress is configured with:
- **TLS 1.3** only
- Strong cipher suites
- Automatic certificate provisioning via Let's Encrypt
- Force HTTPS redirect

Certificate provisioning may take 2-5 minutes. Check status:
```bash
kubectl describe certificate lending-crm-tls-cert -n lending-crm
```

## Resource Management

Resource quotas and limits are configured:
- **Namespace Quota**: 10 CPU, 20Gi memory (requests)
- **Container Limits**: Max 2 CPU, 4Gi memory per container
- **Pod Limits**: Max 4 CPU, 8Gi memory per pod

## Network Policies

Network policies restrict traffic:
- API pods can only communicate with PostgreSQL and Redis
- PostgreSQL and Redis only accept connections from API pods
- External traffic only allowed through ingress

## Monitoring and Health Checks

Health check endpoints:
- **Liveness**: `/api/v1/health` (checks if app is running)
- **Readiness**: `/api/v1/health` (checks if app can serve traffic)

View health status:
```bash
kubectl describe pod <pod-name> -n lending-crm
```

## Backup and Disaster Recovery

### Database Backups

PostgreSQL data is stored in a PersistentVolume. Configure regular backups:

```bash
# Manual backup
kubectl exec -n lending-crm deployment/postgres -- pg_dump -U postgres lending_crm > backup.sql

# Restore from backup
kubectl exec -i -n lending-crm deployment/postgres -- psql -U postgres lending_crm < backup.sql
```

For production, use automated backup solutions like:
- Velero for cluster backups
- Cloud provider backup services
- PostgreSQL backup operators

### Redis Backups

Redis is configured with AOF persistence. Data is stored in a PersistentVolume.

## Scaling

### Manual Scaling

```bash
# Scale API deployment
kubectl scale deployment lending-crm-api --replicas=5 -n lending-crm

# Scale database (not recommended for PostgreSQL)
# Use read replicas instead
```

### Vertical Scaling

Update resource requests/limits in deployment manifests and apply:
```bash
kubectl apply -f api-deployment.yaml
```

## Troubleshooting

### Pods Not Starting

```bash
# Check pod status
kubectl describe pod <pod-name> -n lending-crm

# Check logs
kubectl logs <pod-name> -n lending-crm

# Check events
kubectl get events -n lending-crm --sort-by='.lastTimestamp'
```

### Database Connection Issues

```bash
# Test database connectivity
kubectl exec -it deployment/lending-crm-api -n lending-crm -- nc -zv postgres-service 5432

# Check database logs
kubectl logs deployment/postgres -n lending-crm
```

### Certificate Issues

```bash
# Check certificate status
kubectl describe certificate lending-crm-tls-cert -n lending-crm

# Check cert-manager logs
kubectl logs -n cert-manager deployment/cert-manager

# Delete and recreate certificate
kubectl delete certificate lending-crm-tls-cert -n lending-crm
kubectl apply -f ingress.yaml
```

### HPA Not Scaling

```bash
# Check metrics server
kubectl top nodes
kubectl top pods -n lending-crm

# Check HPA status
kubectl describe hpa lending-crm-api-hpa -n lending-crm

# If metrics are unavailable, restart metrics-server
kubectl rollout restart deployment metrics-server -n kube-system
```

## Updating the Application

### Rolling Update

```bash
# Update image version
kubectl set image deployment/lending-crm-api api=your-registry/lending-crm-api:v2.0.0 -n lending-crm

# Or apply updated manifest
kubectl apply -f api-deployment.yaml

# Watch rollout status
kubectl rollout status deployment/lending-crm-api -n lending-crm
```

### Rollback

```bash
# View rollout history
kubectl rollout history deployment/lending-crm-api -n lending-crm

# Rollback to previous version
kubectl rollout undo deployment/lending-crm-api -n lending-crm

# Rollback to specific revision
kubectl rollout undo deployment/lending-crm-api --to-revision=2 -n lending-crm
```

## Cleanup

To remove the entire deployment:

```bash
# Delete all resources
kubectl delete namespace lending-crm

# Or use the cleanup script
./cleanup.sh
```

## Production Considerations

1. **Secrets Management**: Use external secret managers (AWS Secrets Manager, HashiCorp Vault)
2. **Database**: Consider managed database services (AWS RDS, Azure Database)
3. **Monitoring**: Set up Prometheus and Grafana for metrics
4. **Logging**: Configure centralized logging (ELK, Loki, CloudWatch)
5. **Backup**: Implement automated backup solutions
6. **High Availability**: Deploy across multiple availability zones
7. **Security**: Regular security audits and vulnerability scanning
8. **Cost Optimization**: Monitor resource usage and adjust limits

## Support

For issues or questions:
- Check logs: `kubectl logs -f deployment/lending-crm-api -n lending-crm`
- Review events: `kubectl get events -n lending-crm`
- Contact DevOps team

## References

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [NGINX Ingress Controller](https://kubernetes.github.io/ingress-nginx/)
- [Cert Manager](https://cert-manager.io/docs/)
- [Horizontal Pod Autoscaling](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)
