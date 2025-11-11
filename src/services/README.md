# Audit Log Service

The Audit Log Service provides comprehensive audit trail functionality for the Government Lending CRM Platform. It automatically logs all API requests and system actions to ensure compliance with regulatory requirements.

## Features

- **Automatic Request Logging**: All API requests are automatically logged via middleware
- **Manual Action Logging**: System actions can be logged programmatically
- **Advanced Filtering**: Query logs by entity type, action type, user, date range, and confidence score
- **Export Functionality**: Export logs to CSV or JSON for compliance reporting
- **Privacy Breach Detection**: Automated detection of unusual access patterns
- **Immutable Logs**: Database triggers prevent modification or deletion of audit logs

## Components

### 1. Data Models (`src/models/auditLog.ts`)

Defines TypeScript interfaces for audit logging:
- `AuditAction`: Data for creating new audit log entries
- `AuditLog`: Complete audit log entry with ID and timestamp
- `AuditLogFilters`: Query filters for retrieving logs
- `EntityType`: Enum of entity types (APPLICATION, DOCUMENT, APPLICANT, etc.)

### 2. Repository (`src/repositories/auditLogRepository.ts`)

Implements data access layer for audit logs:
- `create()`: Create new audit log entry
- `find()`: Query logs with filters and pagination
- `findByEntity()`: Get logs for specific entity
- `findByUser()`: Get logs for specific user
- `findById()`: Get log by ID

### 3. Middleware (`src/middleware/auditLogger.ts`)

Express middleware that automatically logs all API requests:
- Captures HTTP method, path, query parameters, and request body
- Extracts entity type and ID from URL
- Records user ID, IP address, and user agent
- Sanitizes sensitive fields (passwords, SSN, etc.)
- Extracts confidence scores from automated actions

### 4. Service (`src/services/auditLogService.ts`)

Business logic layer for audit log operations:
- `queryLogs()`: Query logs with validation and pagination
- `getEntityLogs()`: Get logs for specific entity
- `getUserLogs()`: Get logs for specific user
- `exportToCSV()`: Export logs to CSV format
- `exportToJSON()`: Export logs to JSON format
- `detectPrivacyBreaches()`: Detect unusual access patterns

### 5. API Routes (`src/routes/auditLogs.ts`)

REST API endpoints for audit log operations:
- `GET /audit-logs`: Query logs with filters
- `GET /audit-logs/:id`: Get specific log by ID
- `GET /audit-logs/entity/:entityType/:entityId`: Get logs for entity
- `GET /audit-logs/user/:userId`: Get logs for user
- `GET /audit-logs/export/csv`: Export logs to CSV
- `GET /audit-logs/export/json`: Export logs to JSON
- `GET /audit-logs/security/breaches`: Detect privacy breaches

## Usage Examples

### Automatic Logging (via Middleware)

All API requests are automatically logged. No additional code required.

### Manual Logging (for System Actions)

```typescript
import { logAuditAction } from '../middleware/auditLogger';
import { EntityType } from '../models/auditLog';

// Log a document classification action
await logAuditAction(
  'DOCUMENT_CLASSIFIED',
  EntityType.DOCUMENT,
  documentId,
  'SYSTEM',
  95.5, // confidence score
  {
    documentType: 'W9',
    classificationMethod: 'ML_MODEL_V1',
  }
);
```

### Query Logs

```typescript
import auditLogService from '../services/auditLogService';
import { EntityType } from '../models/auditLog';

// Get all logs for an application
const logs = await auditLogService.getEntityLogs(
  EntityType.APPLICATION,
  applicationId,
  100
);

// Query logs with filters
const result = await auditLogService.queryLogs({
  entityType: EntityType.DOCUMENT,
  actionType: 'DOCUMENT_CLASSIFIED',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'),
  minConfidenceScore: 80,
  limit: 50,
  offset: 0,
});
```

### Export Logs

```typescript
// Export to CSV
const csv = await auditLogService.exportToCSV({
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'),
});

// Export to JSON
const json = await auditLogService.exportToJSON({
  entityType: EntityType.APPLICATION,
});
```

### Detect Privacy Breaches

```typescript
const alerts = await auditLogService.detectPrivacyBreaches();

for (const alert of alerts) {
  console.log(`${alert.type}: ${alert.message}`);
}
```

## API Endpoints

### Query Audit Logs

```
GET /api/v1/audit-logs?entityType=APPLICATION&limit=50&offset=0
```

Query parameters:
- `entityType`: Filter by entity type (APPLICATION, DOCUMENT, etc.)
- `entityId`: Filter by entity ID
- `actionType`: Filter by action type
- `performedBy`: Filter by user ID
- `startDate`: Filter by start date (ISO 8601)
- `endDate`: Filter by end date (ISO 8601)
- `minConfidenceScore`: Filter by minimum confidence score (0-100)
- `maxConfidenceScore`: Filter by maximum confidence score (0-100)
- `limit`: Maximum number of results (default: 50, max: 1000)
- `offset`: Pagination offset (default: 0)

### Get Logs for Entity

```
GET /api/v1/audit-logs/entity/APPLICATION/123e4567-e89b-12d3-a456-426614174000
```

### Export to CSV

```
GET /api/v1/audit-logs/export/csv?startDate=2024-01-01&endDate=2024-12-31
```

### Detect Privacy Breaches

```
GET /api/v1/audit-logs/security/breaches
```

## Compliance Features

### 7-Year Retention

Audit logs are retained for 7 years to meet regulatory requirements. Database triggers prevent modification or deletion of logs.

### Immutability

Once created, audit logs cannot be modified or deleted. This ensures the integrity of the audit trail.

### Comprehensive Tracking

All automated actions include:
- Timestamp (with millisecond precision)
- User ID or 'SYSTEM' for automated actions
- IP address and user agent
- Confidence score for ML-based decisions
- Detailed action context in JSON format

### Privacy Protection

Sensitive fields are automatically sanitized before logging:
- Passwords
- Social Security Numbers (SSN)
- Credit card numbers
- API keys and tokens

## Requirements Satisfied

This implementation satisfies the following requirements:

- **Requirement 6.1**: Complete audit trail with timestamps and confidence scores
- **Requirement 6.2**: Encrypted PII and role-based access control
- **Requirement 6.4**: 7-year retention for regulatory compliance
- **Requirement 6.5**: Privacy breach detection and alerting
