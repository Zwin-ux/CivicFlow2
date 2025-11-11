# Kubernetes Deployment Guide - Government Lending CRM Platform

## Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Quick Start](#quick-start)
4. [Detailed Deployment](#detailed-deployment)
5. [Configuration](#configuration)
6. [Scaling](#scaling)
7. [Monitoring](#monitoring)
8. [Troubleshooting](#troubleshooting)
9. [Production Checklist](#production-checklist)

## Overview

This guide provides comprehensive instructions for deploying the Government Lending CRM Platform to Kubernetes. The deployment includes:

- **API Server**: Horizontally scalable Node.js application
- **PostgreSQL**: Persistent database with backup capabilities
- **Redis**: Cache layer for performance optimization
- **Ingress**: TLS-enabled external access with automatic certificate management
- **Autoscaling**: CPU and memory-based horizontal pod autoscaling
- **Monitoring**: Prometheus metrics and Grafana dashboards

## Prerequisites

### Required Tools

1. **kubectl** (v1.24+)
   ```bash
   # Install on Linux
   curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
   
   # Install on macOS
   brew install kubectl
   
   # Install on Windows
   choco install kubernetes-cli
   ```

2. **Kubernetes Cluster** (v1.24+)
   - Managed: AWS EKS, Google GKE, Azure AKS
   - Self-hosted: kubeadm, k3s, minikube (for testing)

3. **Docker** (for building images)
   ```bash
   docker --version
   ```

4. **Helm** (optional, for installing dependencies)
   ```bash
   curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
   ```

### Cluster Requirements

- **Nodes**: Minimum 3 nodes (for high availability)
- **CPU**: Minimum 4 vCPUs per node
- **Memory**: Minimum 8GB RAM per node
- **Storage**: Support for PersistentVolumes (StorageClass configured)
- **Network**: LoadBalancer support or NodePort access

### Required Kubernetes Add-ons

1. **NGINX Ingress Controller**
2. **Cert Manager** (for TLS certificates)
3. **Metrics Server** (for HPA)

## Quick Start

### 1. Clone and Navigate

```bash
cd k8s
```

### 2. Configure Secrets

Edit `secrets.yaml` and update all placeholder values:

```yaml
stringData:
  DB_PASSWORD: "your-secure-password"
  JWT_SECRET: "your-jwt-secret-key"
  # ... update all secrets
```

### 3. Update Configuration

Edit `configmap.yaml` for your environment:

```yaml
data:
  NODE_ENV: "production"
  # ... other settings
```

Edit `ingress.yaml` with your domain:

```yaml
spec:
  tls:
  - hosts:
    - your-domain.com
```

### 4. Build and Push Docker Image

```bash
# Build the image
docker build -t your-registry/lending-crm-api:v1.0.0 -f ../Dockerfile ..

# Push to registry
docker push your-registry/lending-crm-api:v1.0.0
```

Update `api-deployment.yaml`:

```yaml
containers:
- name: api
  image: your-registry/lending-crm-api:v1.0.0
```

### 5. Deploy

**Option A: Using the deployment script (Linux/macOS)**

```bash
chmod +x deploy.sh
./deploy.sh
```

**Option B: Using PowerShell (Windows)**

```powershell
.\deploy.ps1
```

**Option C: Manual deployment**

```bash
kubectl apply -f namespace.yaml
kubectl apply -f configmap.yaml
kubectl apply -f secrets.yaml
kubectl apply -f postgres-deployment.yaml
kubectl apply -f redis-deployment.yaml
kubectl apply -f api-deployment.yaml
kubectl apply -f hpa.yaml
kubectl apply -f network-policy.yaml
kubectl apply -f resource-quota.yaml
kubectl apply -f pod-disruption-budget.yaml
kubectl apply -f cert-issuer.yaml
kubectl apply -f ingress.yaml
```

**Option D: Using Kustomize**

```bash
# Base deployment
kubectl apply -k .

# Production overlay
kubectl apply -k overlays/production/

# Staging overlay
kubectl apply -k overlays/staging/
```

### 6. Verify Deployment

```bash
# Check all resources
kubectl get all -n lending-crm

# Check pods are running
kubectl get pods -n lending-crm

# Check ingress
kubectl get ingress -n lending-crm

# Check HPA
kubectl get hpa -n lending-crm

# View logs
kubectl logs -f deployment/lending-crm-api -n lending-crm
```

## Detailed Deployment

### Step 1: Prepare the Cluster

#### Install NGINX Ingress Controller

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/cloud/deploy.yaml

# Wait for it to be ready
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=300s
```

#### Install Cert Manager

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Wait for it to be ready
kubectl wait --namespace cert-manager \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/instance=cert-manager \
  --timeout=300s
```

#### Install Metrics Server

```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

### Step 2: Configure Secrets

Create a secure secrets file:

```bash
# Generate secure passwords
DB_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 64)
ENCRYPTION_KEY=$(openssl rand -base64 32)

# Update secrets.yaml with generated values
```

For production, use external secret management:

**AWS Secrets Manager:**
```bash
# Install External Secrets Operator
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets external-secrets/external-secrets -n external-secrets-system --create-namespace
```

**HashiCorp Vault:**
```bash
# Install Vault
helm repo add hashicorp https://helm.releases.hashicorp.com
helm install vault hashicorp/vault
```

### Step 3: Database Setup

The PostgreSQL deployment includes:
- Persistent storage (10Gi)
- Health checks
- Resource limits
- Backup-ready configuration

To enable automated backups:

```bash
# Using Velero
velero install --provider aws --bucket my-backup-bucket

# Schedule daily backups
velero schedule create daily-backup --schedule="0 2 * * *" --include-namespaces lending-crm
```

### Step 4: API Deployment

The API deployment includes:
- Init containers to wait for dependencies
- Database migration runner
- Health checks (liveness and readiness)
- Resource requests and limits
- Graceful shutdown handling

### Step 5: Configure Autoscaling

The HPA configuration scales based on:
- CPU utilization (target: 70%)
- Memory utilization (target: 80%)
- Min replicas: 3
- Max replicas: 10

To adjust scaling parameters:

```yaml
# Edit hpa.yaml
spec:
  minReplicas: 5  # Increase minimum
  maxReplicas: 20  # Increase maximum
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        averageUtilization: 60  # Lower threshold = scale earlier
```

### Step 6: Configure TLS

The deployment uses Let's Encrypt for automatic TLS certificates.

**For staging/testing:**
```yaml
# Use staging issuer in ingress.yaml
cert-manager.io/cluster-issuer: "letsencrypt-staging"
```

**For production:**
```yaml
# Use production issuer
cert-manager.io/cluster-issuer: "letsencrypt-prod"
```

**Using custom certificates:**
```bash
# Create TLS secret manually
kubectl create secret tls lending-crm-tls-cert \
  --cert=path/to/cert.pem \
  --key=path/to/key.pem \
  -n lending-crm
```

## Configuration

### Environment Variables

All configuration is managed through ConfigMaps and Secrets:

**ConfigMap** (`configmap.yaml`):
- Non-sensitive configuration
- Feature flags
- Service endpoints
- Performance tuning

**Secrets** (`secrets.yaml`):
- Database credentials
- API keys
- Encryption keys
- OAuth credentials

### Resource Limits

Default resource allocation:

| Component | CPU Request | CPU Limit | Memory Request | Memory Limit |
|-----------|-------------|-----------|----------------|--------------|
| API       | 250m        | 1000m     | 256Mi          | 1Gi          |
| PostgreSQL| 250m        | 1000m     | 256Mi          | 1Gi          |
| Redis     | 100m        | 500m      | 128Mi          | 512Mi        |

Adjust based on your workload:

```yaml
# In api-deployment.yaml
resources:
  requests:
    memory: "512Mi"
    cpu: "500m"
  limits:
    memory: "2Gi"
    cpu: "2000m"
```

### Network Policies

Network policies restrict traffic between pods:

- API can access PostgreSQL and Redis
- PostgreSQL and Redis only accept connections from API
- External traffic only through ingress

To disable network policies (not recommended):

```bash
kubectl delete -f network-policy.yaml
```

## Scaling

### Horizontal Scaling (HPA)

Automatic scaling is configured by default. Monitor with:

```bash
# Watch HPA status
kubectl get hpa -n lending-crm -w

# View HPA details
kubectl describe hpa lending-crm-api-hpa -n lending-crm
```

### Manual Scaling

```bash
# Scale to specific number of replicas
kubectl scale deployment lending-crm-api --replicas=5 -n lending-crm

# Temporarily disable HPA
kubectl delete hpa lending-crm-api-hpa -n lending-crm
```

### Vertical Scaling

Update resource limits and apply:

```bash
# Edit deployment
kubectl edit deployment lending-crm-api -n lending-crm

# Or update the file and apply
kubectl apply -f api-deployment.yaml
```

### Database Scaling

For PostgreSQL:
- Vertical scaling: Increase resources
- Read replicas: Deploy additional read-only instances
- Managed services: Use cloud provider managed databases

## Monitoring

### Metrics

The API exposes Prometheus metrics at `/api/v1/metrics`:

```bash
# Port-forward to access metrics
kubectl port-forward svc/lending-crm-api-service 8080:80 -n lending-crm

# View metrics
curl http://localhost:8080/api/v1/metrics
```

### Prometheus Integration

Deploy Prometheus:

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack

# Apply ServiceMonitor
kubectl apply -f monitoring.yaml
```

### Grafana Dashboards

Access Grafana:

```bash
kubectl port-forward svc/prometheus-grafana 3000:80 -n default
```

Import the dashboard from `monitoring.yaml`.

### Logging

View logs:

```bash
# All API pods
kubectl logs -l app=lending-crm-api -n lending-crm --tail=100 -f

# Specific pod
kubectl logs <pod-name> -n lending-crm -f

# Previous container (if crashed)
kubectl logs <pod-name> -n lending-crm --previous
```

Centralized logging with ELK:

```bash
helm repo add elastic https://helm.elastic.co
helm install elasticsearch elastic/elasticsearch
helm install kibana elastic/kibana
helm install filebeat elastic/filebeat
```

## Troubleshooting

### Pods Not Starting

```bash
# Check pod status
kubectl describe pod <pod-name> -n lending-crm

# Common issues:
# - Image pull errors: Check image name and registry credentials
# - Resource constraints: Check node resources
# - Init container failures: Check database/redis connectivity
```

### Database Connection Issues

```bash
# Test database connectivity from API pod
kubectl exec -it deployment/lending-crm-api -n lending-crm -- nc -zv postgres-service 5432

# Check database logs
kubectl logs deployment/postgres -n lending-crm

# Verify secrets
kubectl get secret lending-crm-secrets -n lending-crm -o yaml
```

### Ingress Not Working

```bash
# Check ingress status
kubectl describe ingress lending-crm-ingress -n lending-crm

# Check ingress controller logs
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller

# Verify DNS
nslookup your-domain.com

# Check certificate
kubectl describe certificate lending-crm-tls-cert -n lending-crm
```

### HPA Not Scaling

```bash
# Check metrics availability
kubectl top nodes
kubectl top pods -n lending-crm

# Check HPA status
kubectl describe hpa lending-crm-api-hpa -n lending-crm

# If metrics unavailable, check metrics-server
kubectl logs -n kube-system deployment/metrics-server
```

### Performance Issues

```bash
# Check resource usage
kubectl top pods -n lending-crm

# Check for throttling
kubectl describe pod <pod-name> -n lending-crm | grep -i throttl

# Increase resources
kubectl set resources deployment lending-crm-api \
  --limits=cpu=2,memory=2Gi \
  --requests=cpu=500m,memory=512Mi \
  -n lending-crm
```

## Production Checklist

Before deploying to production:

### Security
- [ ] Update all secrets with strong, unique values
- [ ] Enable network policies
- [ ] Configure RBAC for service accounts
- [ ] Enable pod security policies
- [ ] Use private container registry
- [ ] Scan images for vulnerabilities
- [ ] Enable audit logging

### High Availability
- [ ] Deploy across multiple availability zones
- [ ] Configure pod disruption budgets
- [ ] Set up database replication
- [ ] Configure backup and restore procedures
- [ ] Test disaster recovery plan

### Monitoring
- [ ] Set up Prometheus and Grafana
- [ ] Configure alerting rules
- [ ] Set up log aggregation
- [ ] Configure uptime monitoring
- [ ] Set up APM (Application Performance Monitoring)

### Performance
- [ ] Load test the application
- [ ] Tune resource limits based on actual usage
- [ ] Configure HPA thresholds
- [ ] Enable caching (Redis)
- [ ] Optimize database queries

### Operations
- [ ] Document runbooks for common issues
- [ ] Set up CI/CD pipeline
- [ ] Configure automated backups
- [ ] Plan maintenance windows
- [ ] Train operations team

### Compliance
- [ ] Enable audit logging
- [ ] Configure data retention policies
- [ ] Implement access controls
- [ ] Document security procedures
- [ ] Schedule security audits

## Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [NGINX Ingress Controller](https://kubernetes.github.io/ingress-nginx/)
- [Cert Manager](https://cert-manager.io/docs/)
- [Prometheus Operator](https://prometheus-operator.dev/)
- [Kubernetes Best Practices](https://kubernetes.io/docs/concepts/configuration/overview/)

## Support

For issues or questions:
- Review logs: `kubectl logs -f deployment/lending-crm-api -n lending-crm`
- Check events: `kubectl get events -n lending-crm --sort-by='.lastTimestamp'`
- Contact DevOps team
