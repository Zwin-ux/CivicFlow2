# Kubernetes Deployment Script for Government Lending CRM Platform (PowerShell)
# This script automates the deployment of all Kubernetes resources

param(
    [string]$Component = "all"
)

$ErrorActionPreference = "Stop"

# Configuration
$NAMESPACE = "lending-crm"
$TIMEOUT = "300s"

# Function to print colored output
function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Green
}

function Write-Warning-Custom {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Function to check if kubectl is installed
function Test-Kubectl {
    try {
        kubectl version --client | Out-Null
        Write-Info "kubectl is installed"
        return $true
    }
    catch {
        Write-Error-Custom "kubectl is not installed. Please install kubectl first."
        return $false
    }
}

# Function to check if cluster is accessible
function Test-Cluster {
    try {
        kubectl cluster-info | Out-Null
        Write-Info "Connected to Kubernetes cluster"
        return $true
    }
    catch {
        Write-Error-Custom "Cannot connect to Kubernetes cluster. Please check your kubeconfig."
        return $false
    }
}

# Function to check prerequisites
function Test-Prerequisites {
    Write-Info "Checking prerequisites..."
    
    # Check for NGINX Ingress Controller
    try {
        kubectl get namespace ingress-nginx 2>$null | Out-Null
        Write-Info "NGINX Ingress Controller is installed"
    }
    catch {
        Write-Warning-Custom "NGINX Ingress Controller not found. Installing..."
        kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/cloud/deploy.yaml
        kubectl wait --namespace ingress-nginx --for=condition=ready pod --selector=app.kubernetes.io/component=controller --timeout=300s
    }
    
    # Check for Cert Manager
    try {
        kubectl get namespace cert-manager 2>$null | Out-Null
        Write-Info "Cert Manager is installed"
    }
    catch {
        Write-Warning-Custom "Cert Manager not found. Installing..."
        kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
        Start-Sleep -Seconds 30
        kubectl wait --namespace cert-manager --for=condition=ready pod --selector=app.kubernetes.io/instance=cert-manager --timeout=300s
    }
    
    # Check for Metrics Server
    try {
        kubectl get deployment metrics-server -n kube-system 2>$null | Out-Null
        Write-Info "Metrics Server is installed"
    }
    catch {
        Write-Warning-Custom "Metrics Server not found. Installing..."
        kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
    }
}

# Function to deploy namespace
function Deploy-Namespace {
    Write-Info "Creating namespace..."
    kubectl apply -f namespace.yaml
}

# Function to deploy configuration
function Deploy-Config {
    Write-Info "Deploying configuration and secrets..."
    kubectl apply -f configmap.yaml
    kubectl apply -f secrets.yaml
}

# Function to deploy database
function Deploy-Database {
    Write-Info "Deploying PostgreSQL database..."
    kubectl apply -f postgres-deployment.yaml
    
    Write-Info "Waiting for PostgreSQL to be ready..."
    kubectl wait --for=condition=ready pod -l app=postgres -n $NAMESPACE --timeout=$TIMEOUT
    Write-Info "PostgreSQL is ready"
}

# Function to deploy Redis
function Deploy-Redis {
    Write-Info "Deploying Redis cache..."
    kubectl apply -f redis-deployment.yaml
    
    Write-Info "Waiting for Redis to be ready..."
    kubectl wait --for=condition=ready pod -l app=redis -n $NAMESPACE --timeout=$TIMEOUT
    Write-Info "Redis is ready"
}

# Function to deploy API
function Deploy-Api {
    Write-Info "Deploying API application..."
    kubectl apply -f api-deployment.yaml
    
    Write-Info "Waiting for API to be ready..."
    kubectl wait --for=condition=ready pod -l app=lending-crm-api -n $NAMESPACE --timeout=$TIMEOUT
    Write-Info "API is ready"
}

# Function to deploy autoscaling
function Deploy-Autoscaling {
    Write-Info "Configuring horizontal pod autoscaling..."
    kubectl apply -f hpa.yaml
}

# Function to deploy networking
function Deploy-Networking {
    Write-Info "Deploying network policies..."
    kubectl apply -f network-policy.yaml
    
    Write-Info "Deploying resource quotas..."
    kubectl apply -f resource-quota.yaml
    
    Write-Info "Deploying pod disruption budgets..."
    kubectl apply -f pod-disruption-budget.yaml
}

# Function to deploy ingress
function Deploy-Ingress {
    Write-Info "Deploying certificate issuers..."
    kubectl apply -f cert-issuer.yaml
    
    Write-Info "Deploying ingress..."
    kubectl apply -f ingress.yaml
    
    Write-Info "Waiting for certificate provisioning (this may take 2-5 minutes)..."
    Start-Sleep -Seconds 10
}

# Function to verify deployment
function Test-Deployment {
    Write-Info "Verifying deployment..."
    
    Write-Host ""
    Write-Info "Pods:"
    kubectl get pods -n $NAMESPACE
    
    Write-Host ""
    Write-Info "Services:"
    kubectl get svc -n $NAMESPACE
    
    Write-Host ""
    Write-Info "Ingress:"
    kubectl get ingress -n $NAMESPACE
    
    Write-Host ""
    Write-Info "HPA:"
    kubectl get hpa -n $NAMESPACE
    
    Write-Host ""
    Write-Info "Certificates:"
    kubectl get certificate -n $NAMESPACE
}

# Function to show access information
function Show-AccessInfo {
    Write-Host ""
    Write-Info "=========================================="
    Write-Info "Deployment Complete!"
    Write-Info "=========================================="
    Write-Host ""
    
    try {
        $INGRESS_IP = kubectl get ingress lending-crm-ingress -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>$null
        if ([string]::IsNullOrEmpty($INGRESS_IP)) { $INGRESS_IP = "pending" }
    }
    catch {
        $INGRESS_IP = "pending"
    }
    
    $INGRESS_HOST = kubectl get ingress lending-crm-ingress -n $NAMESPACE -o jsonpath='{.spec.rules[0].host}'
    
    Write-Info "Access Information:"
    Write-Host "  - Ingress IP: $INGRESS_IP"
    Write-Host "  - Hostname: $INGRESS_HOST"
    Write-Host ""
    Write-Info "Next Steps:"
    Write-Host "  1. Update your DNS to point $INGRESS_HOST to $INGRESS_IP"
    Write-Host "  2. Wait for TLS certificate provisioning (check with: kubectl get certificate -n $NAMESPACE)"
    Write-Host "  3. Access the application at: https://$INGRESS_HOST"
    Write-Host ""
    Write-Info "Useful Commands:"
    Write-Host "  - View logs: kubectl logs -f deployment/lending-crm-api -n $NAMESPACE"
    Write-Host "  - Check pods: kubectl get pods -n $NAMESPACE"
    Write-Host "  - Check HPA: kubectl get hpa -n $NAMESPACE"
    Write-Host "  - Scale manually: kubectl scale deployment lending-crm-api --replicas=5 -n $NAMESPACE"
}

# Main deployment function
function Main {
    Write-Info "Starting Kubernetes deployment for Government Lending CRM Platform"
    
    # Check prerequisites
    if (-not (Test-Kubectl)) { exit 1 }
    if (-not (Test-Cluster)) { exit 1 }
    
    switch ($Component) {
        "all" {
            Test-Prerequisites
            Deploy-Namespace
            Deploy-Config
            Deploy-Database
            Deploy-Redis
            Deploy-Api
            Deploy-Autoscaling
            Deploy-Networking
            Deploy-Ingress
            Test-Deployment
            Show-AccessInfo
        }
        "namespace" { Deploy-Namespace }
        "config" { Deploy-Config }
        "database" { Deploy-Database }
        "redis" { Deploy-Redis }
        "api" { Deploy-Api }
        "networking" { Deploy-Networking }
        "ingress" { Deploy-Ingress }
        "verify" { Test-Deployment }
        default {
            Write-Error-Custom "Unknown component: $Component"
            Write-Host "Usage: .\deploy.ps1 [-Component <all|namespace|config|database|redis|api|networking|ingress|verify>]"
            exit 1
        }
    }
    
    Write-Info "Deployment completed successfully!"
}

# Run main function
Main
