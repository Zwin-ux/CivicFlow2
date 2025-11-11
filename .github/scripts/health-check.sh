#!/bin/bash

# Health check script for deployment verification
# Usage: ./health-check.sh <base_url> <max_attempts> <wait_seconds>

BASE_URL=${1:-"http://localhost:3000"}
MAX_ATTEMPTS=${2:-10}
WAIT_SECONDS=${3:-5}

echo "Starting health checks for $BASE_URL"
echo "Max attempts: $MAX_ATTEMPTS, Wait time: ${WAIT_SECONDS}s"

# Function to check endpoint
check_endpoint() {
    local endpoint=$1
    local url="${BASE_URL}${endpoint}"
    
    echo -n "Checking $url... "
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    
    if [ "$response" = "200" ]; then
        echo "✓ OK (HTTP $response)"
        return 0
    else
        echo "✗ FAILED (HTTP $response)"
        return 1
    fi
}

# Function to perform all health checks
perform_health_checks() {
    local all_passed=true
    
    # Check main health endpoint
    if ! check_endpoint "/health"; then
        all_passed=false
    fi
    
    # Check API health
    if ! check_endpoint "/api/v1/health"; then
        all_passed=false
    fi
    
    # Check metrics endpoint
    if ! check_endpoint "/api/v1/metrics"; then
        all_passed=false
    fi
    
    if [ "$all_passed" = true ]; then
        return 0
    else
        return 1
    fi
}

# Main health check loop
attempt=1
while [ $attempt -le $MAX_ATTEMPTS ]; do
    echo ""
    echo "Attempt $attempt of $MAX_ATTEMPTS"
    echo "================================"
    
    if perform_health_checks; then
        echo ""
        echo "✓ All health checks passed!"
        exit 0
    fi
    
    if [ $attempt -lt $MAX_ATTEMPTS ]; then
        echo ""
        echo "Waiting ${WAIT_SECONDS}s before next attempt..."
        sleep $WAIT_SECONDS
    fi
    
    attempt=$((attempt + 1))
done

echo ""
echo "✗ Health checks failed after $MAX_ATTEMPTS attempts"
exit 1
