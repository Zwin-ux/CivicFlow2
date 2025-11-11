#!/bin/bash

# Kubernetes Deployment Script for Government Lending CRM Platform
# This script automates the deployment of all Kubernetes resources

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="lending-crm"
TIMEOUT="300s"

# Function to print colored output
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if kubectl is installed
check_kubectl() {
    if ! command -v kubectl &> /dev/null; then
        print_error "kubectl is not installed. Please install kubectl first."
        exit 1
    fi
    print_info "kubectl is installed"
}

# Function to check if cluster is accessible
check_cluster() {
    if ! kubectl cluster-info &> /dev/null; then
        print_error "Cannot connect to Kubernetes cluster. Please check your kubeconfig."
        exit 1
    fi
    print_info "Connected to Kubernetes cluster"
}

# Function to check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."
    
    # Check for NGINX Ingress Controller
    if ! kubectl get namespace ingress-nginx &> /dev/null; then
        print_warning "NGINX Ingress Controller not found. Installing..."
        kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/cloud/deploy.yaml
        kubectl wait --namespace ingress-nginx \
            --for=condition=ready pod \
            --selector=app.kubernetes.io/component=controller \
            --timeout=300s
    else
        print_info "NGINX Ingress Controller is installed"
    fi
    
    # Check for Cert Manager
    if ! kubectl get namespace cert-manager &> /dev/null; then
        print_warning "Cert Manager not found. Installing..."
        kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
        sleep 30
        kubectl wait --namespace cert-manager \
            --for=condition=ready pod \
            --selector=app.kubernetes.io/instance=cert-manager \
            --timeout=300s
    else
        print_info "Cert Manager is installed"
    fi
    
    # Check for Metrics Server
    if ! kubectl get deployment metrics-server -n kube-system &> /dev/null; then
        print_warning "Metrics Server not found. Installing..."
        kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
    else
        print_info "Metrics Server is installed"
    fi
}

# Function to deploy namespace
deploy_namespace() {
    print_info "Creating namespace..."
    kubectl apply -f namespace.yaml
}

# Function to deploy configuration
deploy_config() {
    print_info "Deploying configuration and secrets..."
    kubectl apply -f configmap.yaml
    kubectl apply -f secrets.yaml
}

# Function to deploy database
deploy_database() {
    print_info "Deploying PostgreSQL database..."
    kubectl apply -f postgres-deployment.yaml
    
    print_info "Waiting for PostgreSQL to be ready..."
    kubectl wait --for=condition=ready pod -l app=postgres -n $NAMESPACE --timeout=$TIMEOUT
    print_info "PostgreSQL is ready"
}

# Function to deploy Redis
deploy_redis() {
    print_info "Deploying Redis cache..."
    kubectl apply -f redis-deployment.yaml
    
    print_info "Waiting for Redis to be ready..."
    kubectl wait --for=condition=ready pod -l app=redis -n $NAMESPACE --timeout=$TIMEOUT
    print_info "Redis is ready"
}

# Function to deploy API
deploy_api() {
    print_info "Deploying API application..."
    kubectl apply -f api-deployment.yaml
    
    print_info "Waiting for API to be ready..."
    kubectl wait --for=condition=ready pod -l app=lending-crm-api -n $NAMESPACE --timeout=$TIMEOUT
    print_info "API is ready"
}

# Function to deploy autoscaling
deploy_autoscaling() {
    print_info "Configuring horizontal pod autoscaling..."
    kubectl apply -f hpa.yaml
}

# Function to deploy networking
deploy_networking() {
    print_info "Deploying network policies..."
    kubectl apply -f network-policy.yaml
    
    print_info "Deploying resource quotas..."
    kubectl apply -f resource-quota.yaml
    
    print_info "Deploying pod disruption budgets..."
    kubectl apply -f pod-disruption-budget.yaml
}

# Function to deploy ingress
deploy_ingress() {
    print_info "Deploying certificate issuers..."
    kubectl apply -f cert-issuer.yaml
    
    print_info "Deploying ingress..."
    kubectl apply -f ingress.yaml
    
    print_info "Waiting for certificate provisioning (this may take 2-5 minutes)..."
    sleep 10
}

# Function to verify deployment
verify_deployment() {
    print_info "Verifying deployment..."
    
    echo ""
    print_info "Pods:"
    kubectl get pods -n $NAMESPACE
    
    echo ""
    print_info "Services:"
    kubectl get svc -n $NAMESPACE
    
    echo ""
    print_info "Ingress:"
    kubectl get ingress -n $NAMESPACE
    
    echo ""
    print_info "HPA:"
    kubectl get hpa -n $NAMESPACE
    
    echo ""
    print_info "Certificates:"
    kubectl get certificate -n $NAMESPACE
}

# Function to show access information
show_access_info() {
    echo ""
    print_info "=========================================="
    print_info "Deployment Complete!"
    print_info "=========================================="
    echo ""
    
    INGRESS_IP=$(kubectl get ingress lending-crm-ingress -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "pending")
    INGRESS_HOST=$(kubectl get ingress lending-crm-ingress -n $NAMESPACE -o jsonpath='{.spec.rules[0].host}')
    
    print_info "Access Information:"
    echo "  - Ingress IP: $INGRESS_IP"
    echo "  - Hostname: $INGRESS_HOST"
    echo ""
    print_info "Next Steps:"
    echo "  1. Update your DNS to point $INGRESS_HOST to $INGRESS_IP"
    echo "  2. Wait for TLS certificate provisioning (check with: kubectl get certificate -n $NAMESPACE)"
    echo "  3. Access the application at: https://$INGRESS_HOST"
    echo ""
    print_info "Useful Commands:"
    echo "  - View logs: kubectl logs -f deployment/lending-crm-api -n $NAMESPACE"
    echo "  - Check pods: kubectl get pods -n $NAMESPACE"
    echo "  - Check HPA: kubectl get hpa -n $NAMESPACE"
    echo "  - Scale manually: kubectl scale deployment lending-crm-api --replicas=5 -n $NAMESPACE"
}

# Main deployment function
main() {
    print_info "Starting Kubernetes deployment for Government Lending CRM Platform"
    
    # Check prerequisites
    check_kubectl
    check_cluster
    
    # Parse command line arguments
    COMPONENT="${1:-all}"
    
    case $COMPONENT in
        all)
            check_prerequisites
            deploy_namespace
            deploy_config
            deploy_database
            deploy_redis
            deploy_api
            deploy_autoscaling
            deploy_networking
            deploy_ingress
            verify_deployment
            show_access_info
            ;;
        namespace)
            deploy_namespace
            ;;
        config)
            deploy_config
            ;;
        database)
            deploy_database
            ;;
        redis)
            deploy_redis
            ;;
        api)
            deploy_api
            ;;
        networking)
            deploy_networking
            ;;
        ingress)
            deploy_ingress
            ;;
        verify)
            verify_deployment
            ;;
        *)
            print_error "Unknown component: $COMPONENT"
            echo "Usage: $0 [all|namespace|config|database|redis|api|networking|ingress|verify]"
            exit 1
            ;;
    esac
    
    print_info "Deployment completed successfully!"
}

# Run main function
main "$@"
