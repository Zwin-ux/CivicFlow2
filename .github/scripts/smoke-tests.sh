#!/bin/bash

# Smoke tests for deployment verification
# Usage: ./smoke-tests.sh <base_url>

BASE_URL=${1:-"http://localhost:3000"}

echo "Running smoke tests against $BASE_URL"
echo "========================================"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Test counter
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Function to run a test
run_test() {
    local test_name=$1
    local endpoint=$2
    local expected_status=${3:-200}
    
    TESTS_RUN=$((TESTS_RUN + 1))
    
    echo -n "Test $TESTS_RUN: $test_name... "
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}${endpoint}")
    
    if [ "$response" = "$expected_status" ]; then
        echo -e "${GREEN}PASSED${NC} (HTTP $response)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "${RED}FAILED${NC} (Expected HTTP $expected_status, got HTTP $response)"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# Function to test JSON response
test_json_response() {
    local test_name=$1
    local endpoint=$2
    local expected_field=$3
    
    TESTS_RUN=$((TESTS_RUN + 1))
    
    echo -n "Test $TESTS_RUN: $test_name... "
    
    response=$(curl -s "${BASE_URL}${endpoint}")
    
    if echo "$response" | grep -q "$expected_field"; then
        echo -e "${GREEN}PASSED${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "${RED}FAILED${NC} (Field '$expected_field' not found in response)"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

echo ""
echo "Running basic endpoint tests..."
echo "--------------------------------"

# Test 1: Health endpoint
run_test "Health endpoint responds" "/health" 200

# Test 2: API health endpoint
run_test "API health endpoint responds" "/api/v1/health" 200

# Test 3: Metrics endpoint
run_test "Metrics endpoint responds" "/api/v1/metrics" 200

# Test 4: Swagger documentation
run_test "API documentation available" "/api-docs" 200

# Test 5: Health endpoint returns correct structure
test_json_response "Health endpoint returns status" "/health" "status"

# Test 6: Metrics endpoint returns data
test_json_response "Metrics endpoint returns data" "/api/v1/metrics" "totalApplications"

echo ""
echo "Running authentication tests..."
echo "--------------------------------"

# Test 7: Protected endpoint without auth returns 401
run_test "Protected endpoint requires auth" "/api/v1/applications" 401

# Test 8: Login endpoint exists
run_test "Login endpoint available" "/api/v1/auth/login" 400

echo ""
echo "Running static file tests..."
echo "--------------------------------"

# Test 9: Applicant portal loads
run_test "Applicant portal loads" "/applicant-portal.html" 200

# Test 10: Staff portal loads
run_test "Staff portal loads" "/staff-portal.html" 200

# Test 11: Admin dashboard loads
run_test "Admin dashboard loads" "/admin-dashboard.html" 200

# Test 12: CSS file loads
run_test "Styles load" "/css/styles.css" 200

echo ""
echo "========================================"
echo "Smoke Test Results"
echo "========================================"
echo "Tests run: $TESTS_RUN"
echo -e "Tests passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests failed: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN} All smoke tests passed!${NC}"
    exit 0
else
    echo -e "${RED} Some smoke tests failed${NC}"
    exit 1
fi
