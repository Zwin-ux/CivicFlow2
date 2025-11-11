# Data Validator Service

## Overview

The Data Validator Service provides comprehensive validation and fraud detection capabilities for the Government Lending CRM Platform. It integrates with external APIs for EIN verification, validates contact information, and detects fraudulent patterns in applications.

## Components

### 1. Models (`src/models/validator.ts`)

Defines TypeScript interfaces for:
- `VerificationResult` - EIN verification results
- `ContactValidationResult` - Contact information validation
- `FraudAnalysis` - Fraud detection results
- `FraudFlag` - Individual fraud indicators
- `ContactInfo` - Contact information structure

### 2. EIN Verification Client (`src/clients/einVerificationClient.ts`)

- Integrates with IRS or third-party EIN verification APIs
- Implements exponential backoff retry logic (3 attempts: 1s, 2s, 4s delays)
- Provides mock verification for development/testing
- Masks EIN in logs for security

**Configuration:**
- `EIN_VERIFICATION_API_URL` - API endpoint
- `EIN_VERIFICATION_API_KEY` - API authentication key
- `USE_MOCK_EIN_VERIFICATION` - Enable mock mode (default: true)

### 3. Data Validator Service (`src/services/dataValidatorService.ts`)

Main service providing:

#### EIN Verification
- Verifies EIN against authoritative sources
- Caches results in Redis (24-hour TTL)
- Calculates match confidence scores
- Handles API failures gracefully

#### Contact Validation
- **Email**: Format validation, disposable domain detection
- **Phone**: Format validation, country code extraction
- **Address**: Required field validation, ZIP code format checking

#### Fraud Detection
- **Duplicate EIN Detection**: Checks for EIN reuse across applications
- **Suspicious Documents**: Flags low-confidence classifications
- **Data Mismatches**: Detects verification failures
- **Risk Scoring**: Calculates overall fraud risk (0-100)

### 4. Validator Repository (`src/repositories/validatorRepository.ts`)

Database operations for:
- Finding duplicate EINs
- Counting applications by EIN
- Finding suspicious applications
- Storing validation results
- Retrieving validation history

### 5. API Routes (`src/routes/validator.ts`)

RESTful endpoints:

#### POST `/api/v1/validator/ein/verify`
Verify EIN and business name
- **Roles**: Reviewer, Approver, Administrator
- **Body**: `{ ein, businessName }`

#### POST `/api/v1/validator/contact/validate`
Validate contact information
- **Roles**: Reviewer, Approver, Administrator
- **Body**: `{ email, phone, address }`

#### POST `/api/v1/validator/fraud/detect`
Detect fraud patterns
- **Roles**: Reviewer, Approver, Administrator
- **Body**: Application data with `id`, `ein`, `documents`, etc.

#### GET `/api/v1/validator/ein/duplicates/:ein`
Find applications with duplicate EIN
- **Roles**: Reviewer, Approver, Administrator, Auditor
- **Query**: `excludeApplicationId` (optional)

#### GET `/api/v1/validator/suspicious`
Find applications with suspicious patterns
- **Roles**: Reviewer, Approver, Administrator, Auditor
- **Query**: `confidenceThreshold`, `dateFrom`, `dateTo` (optional)

## Features

### Caching
- Redis caching for EIN verification results
- 24-hour TTL to reduce API calls
- Graceful fallback if Redis unavailable

### Retry Logic
- Exponential backoff for API failures
- Maximum 3 retry attempts
- No retry on client errors (4xx)

### Security
- EIN masking in logs (shows only last 4 digits)
- Role-based access control on all endpoints
- Audit logging for all operations

### Fraud Detection Severity Levels
- **HIGH**: Duplicate EIN, data mismatches (40 points)
- **MEDIUM**: Low classification confidence (20 points)
- **LOW**: Manual review flags (10 points)

Investigation required when:
- Risk score ≥ 50
- Any HIGH severity flag present

## Usage Example

```typescript
import DataValidatorService from './services/dataValidatorService';
import { Pool } from 'pg';

const pool = new Pool({ /* config */ });
const validator = new DataValidatorService(pool);

// Verify EIN
const einResult = await validator.verifyEIN('12-3456789', 'Acme Corp');

// Validate contact
const contactResult = await validator.validateContactInfo({
  email: 'user@example.com',
  phone: '555-123-4567',
  address: {
    street: '123 Main St',
    city: 'Springfield',
    state: 'IL',
    zipCode: '62701',
  },
});

// Detect fraud
const fraudResult = await validator.detectFraud({
  id: 'app-123',
  ein: '12-3456789',
  documents: [/* ... */],
  verificationResult: einResult,
});
```

## Requirements Satisfied

- **2.1**: EIN verification against authoritative sources
- **2.2**: Business name matching validation
- **2.3**: Data mismatch detection
- **2.4**: Contact information validation
- **2.5**: Caching and retry logic for API calls
- **3.5**: Fraud detection and risk scoring

## Future Enhancements

- Integration with USPS Address Validation API
- Machine learning-based fraud pattern detection
- Real-time fraud alerts via webhooks
- Enhanced phone validation with carrier lookup
- International address validation support
