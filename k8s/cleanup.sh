#!/bin/bash

# Kubernetes Cleanup Script for Government Lending CRM Platform
# This script removes all deployed resources

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="lending-crm"

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

# Function to confirm deletion
confirm_deletion() {
    echo ""
    print_warning "=========================================="
    print_warning "WARNING: This will delete all resources!"
    print_warning "=========================================="
    echo ""
    print_warning "This will delete:"
    echo "  - All pods and deployments"
    echo "  - All services and ingress"
    echo "  - All persistent volumes and data"
    echo "  - The entire $NAMESPACE namespace"
    echo ""
    read -p "Are you sure you want to continue? (yes/no): " -r
    echo
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        print_info "Cleanup cancelled"
        exit 0
    fi
}

# Function to delete resources
delete_resources() {
    print_info "Starting cleanup..."
    
    # Delete ingress first to release load balancer
    print_info "Deleting ingress..."
    kubectl delete -f ingress.yaml --ignore-not-found=true
    
    # Delete HPA
    print_info "Deleting horizontal pod autoscaler..."
    kubectl delete -f hpa.yaml --ignore-not-found=true
    
    # Delete API deployment
    print_info "Deleting API deployment..."
    kubectl delete -f api-deployment.yaml --ignore-not-found=true
    
    # Delete network policies
    print_info "Deleting network policies..."
    kubectl delete -f network-policy.yaml --ignore-not-found=true
    
    # Delete pod disruption budgets
    print_info "Deleting pod disruption budgets..."
    kubectl delete -f pod-disruption-budget.yaml --ignore-not-found=true
    
    # Delete resource quotas
    print_info "Deleting resource quotas..."
    kubectl delete -f resource-quota.yaml --ignore-not-found=true
    
    # Delete Redis
    print_info "Deleting Redis..."
    kubectl delete -f redis-deployment.yaml --ignore-not-found=true
    
    # Delete PostgreSQL
    print_info "Deleting PostgreSQL..."
    kubectl delete -f postgres-deployment.yaml --ignore-not-found=true
    
    # Delete configuration
    print_info "Deleting configuration and secrets..."
    kubectl delete -f configmap.yaml --ignore-not-found=true
    kubectl delete -f secrets.yaml --ignore-not-found=true
    
    # Wait for pods to terminate
    print_info "Waiting for pods to terminate..."
    kubectl wait --for=delete pod --all -n $NAMESPACE --timeout=120s 2>/dev/null || true
    
    # Delete namespace
    print_info "Deleting namespace..."
    kubectl delete -f namespace.yaml --ignore-not-found=true
    
    # Delete certificate issuers (cluster-scoped)
    print_info "Deleting certificate issuers..."
    kubectl delete -f cert-issuer.yaml --ignore-not-found=true
    
    print_info "Cleanup completed successfully!"
}

# Function to verify cleanup
verify_cleanup() {
    print_info "Verifying cleanup..."
    
    if kubectl get namespace $NAMESPACE &> /dev/null; then
        print_warning "Namespace still exists (may be in terminating state)"
        kubectl get namespace $NAMESPACE
    else
        print_info "Namespace successfully deleted"
    fi
    
    # Check for any remaining resources
    REMAINING=$(kubectl get all -n $NAMESPACE 2>/dev/null | wc -l)
    if [ "$REMAINING" -gt 0 ]; then
        print_warning "Some resources may still be terminating:"
        kubectl get all -n $NAMESPACE
    else
        print_info "All resources have been deleted"
    fi
}

# Main function
main() {
    print_info "Kubernetes Cleanup for Government Lending CRM Platform"
    
    # Check if namespace exists
    if ! kubectl get namespace $NAMESPACE &> /dev/null; then
        print_info "Namespace $NAMESPACE does not exist. Nothing to clean up."
        exit 0
    fi
    
    # Confirm deletion
    confirm_deletion
    
    # Delete resources
    delete_resources
    
    # Verify cleanup
    verify_cleanup
    
    echo ""
    print_info "=========================================="
    print_info "Cleanup Complete!"
    print_info "=========================================="
}

# Run main function
main
