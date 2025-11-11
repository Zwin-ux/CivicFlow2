# Error Handling and Circuit Breaker Documentation

## Overview

The Government Lending CRM Platform implements comprehensive error handling and circuit breaker patterns to ensure resilience and provide clear, actionable error messages to users.

## Standardized Error Handling

### Error Classes

All errors in the application extend from the base `AppError` class, which provides consistent structure:

```typescript
class AppError extends Error {
  statusCode: number;
  code: string;
  details?: any;
  isOperational: boolean;
}
```

### Available Error Types

| Error Class | Status Code | Use Case |
|------------|-------------|----------|
| `ValidationError` | 400 | Invalid input data, missing required fields |
| `UnauthorizedError` | 401 | Authentication required or failed |
| `ForbiddenError` | 403 | Insufficient permissions |
| `NotFoundError` | 404 | Resource does not exist |
| `ConflictError` | 409 | State conflict (e.g., duplicate resource) |
| `UnprocessableEntityError` | 422 | Business logic validation failed |
| `ExternalServiceError` | 502 | External service failure |
| `ServiceUnavailableError` | 503 | Service temporarily unavailable |
| `InternalServerError` | 500 | Unexpected internal errors |

### Error Response Format

All errors return a consistent JSON structure:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Missing required fields",
    "details": {
      "fields": ["applicantId", "programType"]
    },
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req-123abc"
  }
}
```

### Using Error Classes

```typescript
import { ValidationError, NotFoundError } from '../utils/errors';

// Throw validation error
if (!data.applicantId) {
  throw new ValidationError('Missing required field: applicantId', {
    field: 'applicantId'
  });
}

// Throw not found error
const application = await getApplication(id);
if (!application) {
  throw new NotFoundError('Application');
}
```

### User-Friendly Error Messages

The `ErrorMessages` constant provides user-friendly messages for common scenarios:

```typescript
import { ErrorMessages } from '../utils/errors';

throw new ValidationError(ErrorMessages.INVALID_EMAIL_FORMAT);
```

## Circuit Breaker Pattern

### Overview

Circuit breakers prevent cascading failures when external services are unavailable. The circuit has three states:

1. **CLOSED**: Normal operation, requests pass through
2. **OPEN**: Service is failing, requests are rejected immediately
3. **HALF_OPEN**: Testing if service has recovered

### Configuration

Circuit breakers are configured with the following default settings:

```typescript
{
  timeout: 10000,                    // 10 second timeout
  errorThresholdPercentage: 50,      // Open after 50% failures
  resetTimeout: 30000,                // Try to close after 30 seconds
  rollingCountTimeout: 10000,         // 10 second rolling window
  rollingCountBuckets: 10             // 10 buckets of 1 second each
}
```

### Protected Services

The following external services are protected by circuit breakers:

#### 1. EIN Verification Service

- **Service**: IRS or third-party EIN verification API
- **Fallback**: Mock verification with warning log
- **Configuration**: 10s timeout, 50% error threshold, 60s reset timeout

```typescript
import einVerificationClient from '../clients/einVerificationClient';

// Automatically uses circuit breaker
const result = await einVerificationClient.verifyEIN(ein, businessName);
```

#### 2. Email Service

- **Service**: SendGrid email delivery
- **Fallback**: Queue email for later delivery
- **Configuration**: 15s timeout, 50% error threshold, 60s reset timeout

```typescript
import emailClient from '../clients/emailClient';

// Automatically uses circuit breaker
const result = await emailClient.sendEmail(message);
```

### Creating Custom Circuit Breakers

```typescript
import { createCircuitBreaker } from '../utils/circuitBreaker';

// Create circuit breaker for async function
const breaker = createCircuitBreaker(
  myAsyncFunction,
  {
    timeout: 5000,
    errorThresholdPercentage: 50,
    resetTimeout: 30000,
    name: 'MyService',
  }
);

// Use circuit breaker
const result = await breaker.fire(arg1, arg2);
```

### Circuit Breaker with Fallback

```typescript
import { createCircuitBreakerWithFallback } from '../utils/circuitBreaker';

const breaker = createCircuitBreakerWithFallback(
  primaryFunction,
  fallbackFunction,
  { name: 'MyService' }
);
```

## Monitoring

### Health Check Endpoints

#### Basic Health Check
```
GET /api/v1/health
```

Returns basic service status.

#### Detailed Health Check
```
GET /api/v1/health/detailed
```

Returns detailed status including:
- Database connectivity
- Redis cache connectivity
- External service circuit breaker states

#### Circuit Breaker Status
```
GET /api/v1/health/circuit-breakers
```

Returns status of all circuit breakers:

```json
{
  "circuitBreakers": [
    {
      "service": "EIN Verification",
      "name": "EINVerificationService",
      "state": "CLOSED",
      "stats": {
        "fires": 150,
        "failures": 2,
        "successes": 148,
        "rejects": 0,
        "timeouts": 0
      }
    },
    {
      "service": "Email Service",
      "name": "EmailService",
      "state": "CLOSED",
      "stats": {
        "fires": 500,
        "failures": 5,
        "successes": 495,
        "rejects": 0,
        "timeouts": 0
      }
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Circuit Breaker Events

Circuit breakers emit events that are automatically logged:

- `open`: Circuit opened due to failures
- `halfOpen`: Circuit testing if service recovered
- `close`: Circuit closed, service healthy
- `timeout`: Request timed out
- `reject`: Request rejected (circuit open)
- `failure`: Request failed

### Audit Logging

Non-operational errors and security-related errors (401, 403) are automatically logged to the audit system:

```typescript
{
  actionType: 'ERROR_OCCURRED',
  entityType: 'SYSTEM',
  entityId: 'req-123abc',
  performedBy: 'user-id-or-ANONYMOUS',
  details: {
    statusCode: 403,
    code: 'FORBIDDEN',
    message: 'Insufficient permissions',
    path: '/api/v1/applications/123',
    method: 'POST'
  }
}
```

## Best Practices

### 1. Use Appropriate Error Types

Choose the error type that best matches the situation:

```typescript
// Bad
throw new Error('User not found');

// Good
throw new NotFoundError('User');
```

### 2. Provide Helpful Details

Include details that help with debugging:

```typescript
throw new ValidationError('Invalid application data', {
  fields: ['applicantId', 'programType'],
  received: data
});
```

### 3. Handle Circuit Breaker Failures

Check for circuit breaker errors and provide appropriate fallback:

```typescript
try {
  const result = await einVerificationClient.verifyEIN(ein, businessName);
} catch (error) {
  if (error instanceof ExternalServiceError && error.details?.circuitBreakerOpen) {
    // Circuit is open, use cached data or manual review
    return { requiresManualReview: true };
  }
  throw error;
}
```

### 4. Monitor Circuit Breaker Health

Regularly check circuit breaker status in production:

```bash
curl https://api.example.com/api/v1/health/circuit-breakers
```

Set up alerts when circuits open frequently.

### 5. Test Error Scenarios

Test error handling in your code:

```typescript
// Test validation errors
it('should throw ValidationError for missing fields', async () => {
  await expect(createApplication({})).rejects.toThrow(ValidationError);
});

// Test circuit breaker behavior
it('should use fallback when circuit is open', async () => {
  // Simulate circuit open
  // Verify fallback behavior
});
```

## Configuration

### Environment Variables

```bash
# EIN Verification
EIN_VERIFICATION_API_URL=https://api.ein-verification.example.com
EIN_VERIFICATION_API_KEY=your-api-key
USE_MOCK_EIN_VERIFICATION=false

# Email Service
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your-api-key
EMAIL_FROM=noreply@example.com
```

### Circuit Breaker Tuning

Adjust circuit breaker settings based on your service characteristics:

- **High-latency services**: Increase timeout
- **Unreliable services**: Lower error threshold
- **Critical services**: Increase reset timeout
- **Fast-recovering services**: Decrease reset timeout

## Troubleshooting

### Circuit Breaker Stuck Open

If a circuit breaker remains open:

1. Check the external service health
2. Review error logs for root cause
3. Verify network connectivity
4. Check API credentials and rate limits
5. Consider increasing reset timeout

### High Error Rates

If seeing high error rates:

1. Check circuit breaker stats
2. Review application logs
3. Verify external service status
4. Check for configuration issues
5. Monitor resource usage (CPU, memory, connections)

### Request ID Tracking

Every request has a unique ID for tracking:

```bash
# Client can provide request ID
curl -H "X-Request-ID: my-custom-id" https://api.example.com/api/v1/applications

# Server returns request ID in response
X-Request-ID: my-custom-id
```

Use request IDs to correlate logs across services.
