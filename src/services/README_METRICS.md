# Performance Metrics and Monitoring System

## Overview

The metrics system provides comprehensive performance monitoring and tracking for the Government Lending CRM Platform. It tracks three key areas:

1. **Document Classification Accuracy** - Monitors ML model performance
2. **Application Processing Time** - Tracks efficiency improvements
3. **Privacy Breach Detection** - Identifies security threats

## Components

### Models (`src/models/metrics.ts`)

- `ClassificationValidation` - Records manual validation of ML predictions
- `ClassificationAccuracyMetrics` - Aggregated accuracy statistics
- `ProcessingTimeMetrics` - Application processing time analytics
- `PrivacyBreachAlert` - Security breach notifications
- `PerformanceMetricsSummary` - Comprehensive metrics overview

### Database Tables

#### `classification_validations`
Stores manual validation results for document classification:
- Links to documents table
- Records predicted vs actual document type
- Tracks confidence scores and correctness
- Used to calculate real accuracy metrics

#### `privacy_breach_alerts`
Stores detected security threats:
- Alert type and severity
- User ID and evidence
- Acknowledgment and resolution tracking
- Supports audit trail

### Repository (`src/repositories/metricsRepository.ts`)

Handles data persistence and retrieval:
- `createClassificationValidation()` - Record validation
- `getClassificationAccuracyMetrics()` - Calculate accuracy
- `getProcessingTimeMetrics()` - Calculate processing times
- `createPrivacyBreachAlert()` - Create security alert
- `getUnresolvedAlerts()` - Retrieve pending alerts

### Service (`src/services/metricsService.ts`)

Business logic layer:
- `recordClassificationValidation()` - Validate classification and check threshold
- `getClassificationAccuracyMetrics()` - Get accuracy metrics
- `getProcessingTimeMetrics()` - Get processing time metrics
- `detectPrivacyBreaches()` - Analyze audit logs for threats
- `getPerformanceMetricsSummary()` - Get all metrics

### API Routes (`src/routes/metrics.ts`)

REST endpoints:
- `POST /api/v1/metrics/classification-validations` - Record validation
- `GET /api/v1/metrics/classification-accuracy` - Get accuracy metrics
- `GET /api/v1/metrics/processing-time` - Get processing metrics
- `POST /api/v1/metrics/privacy-breaches/detect` - Run breach detection
- `GET /api/v1/metrics/privacy-breaches/alerts` - Get unresolved alerts
- `POST /api/v1/metrics/privacy-breaches/alerts/:id/acknowledge` - Acknowledge alert
- `POST /api/v1/metrics/privacy-breaches/alerts/:id/resolve` - Resolve alert
- `GET /api/v1/metrics/summary` - Get comprehensive summary

## Features

### 1. Document Classification Accuracy Tracking

**Purpose**: Monitor ML model performance and ensure 95%+ accuracy

**How it works**:
1. Staff manually reviews classified documents
2. System records predicted vs actual document type
3. Calculates accuracy percentage from validations
4. Alerts administrators if accuracy falls below 95%

**Requirements**: 8.1, 8.5

**Example**:
```typescript
// Record a validation
await metricsService.recordClassificationValidation(
  documentId,
  'W9', // actual type
  userId
);

// Get accuracy metrics
const metrics = await metricsService.getClassificationAccuracyMetrics({
  startDate: thirtyDaysAgo,
  endDate: new Date()
});
// Returns: { accuracyPercentage: 96.5, totalValidations: 200, ... }
```

### 2. Application Processing Time Metrics

**Purpose**: Track efficiency improvements and demonstrate 40% reduction

**How it works**:
1. Calculates time from submission to decision
2. Compares against baseline manual processing time (100 hours)
3. Displays reduction percentage on dashboard
4. Breaks down by program type

**Requirements**: 8.2

**Example**:
```typescript
const metrics = await metricsService.getProcessingTimeMetrics({
  startDate: lastMonth,
  endDate: new Date()
});
// Returns: { 
//   averageProcessingTime: 60, 
//   baselineProcessingTime: 100,
//   reductionPercentage: 40,
//   ...
// }
```

### 3. Privacy Breach Detection

**Purpose**: Identify security threats and alert administrators immediately

**How it works**:
1. Analyzes audit logs for unusual patterns
2. Detects excessive access (>1000 requests/24h)
3. Detects multiple failed attempts (>10/24h)
4. Detects unauthorized access attempts
5. Creates alerts and emails administrators

**Requirements**: 6.5, 8.3

**Alert Types**:
- `EXCESSIVE_ACCESS` - Too many requests
- `MULTIPLE_FAILED_ATTEMPTS` - Repeated failures
- `UNAUTHORIZED_ACCESS` - Unauthorized operations
- `SUSPICIOUS_PATTERN` - Anomalous behavior

**Severity Levels**:
- `CRITICAL` - Immediate action required
- `HIGH` - Urgent attention needed
- `MEDIUM` - Should be reviewed soon
- `LOW` - Informational

**Example**:
```typescript
// Run detection
const result = await metricsService.detectPrivacyBreaches();
// Returns: {
//   alerts: [...],
//   totalAlerts: 3,
//   criticalAlerts: 1,
//   highAlerts: 2,
//   ...
// }

// Acknowledge alert
await metricsService.acknowledgeAlert(alertId, adminUserId);

// Resolve alert
await metricsService.resolveAlert(alertId, adminUserId, 'False positive - legitimate testing');
```

## Administrator Alerts

The system automatically sends email alerts to administrators when:

1. **Classification accuracy falls below 95%**
   - Includes current metrics and breakdown by document type
   - Suggests model retraining or threshold adjustment

2. **Privacy breach detected**
   - Immediate notification with severity and evidence
   - Includes link to alert details in admin dashboard

**Configuration**:
Set administrator emails in environment variable:
```bash
ADMIN_EMAILS=admin1@example.com,admin2@example.com
```

## Integration with Dashboard

The metrics are integrated into the reporting dashboard:

1. **Classification Accuracy** - Displayed on main dashboard
2. **Processing Time** - Shows reduction percentage
3. **Privacy Breaches** - Alert count and status

The reporting repository uses the classification_validations table to calculate real accuracy instead of just confidence scores.

## Security

- All endpoints require authentication
- Most endpoints require Administrator or Auditor role
- Classification validation requires Reviewer, Approver, or Administrator
- Privacy breach management requires Administrator only
- All actions are logged to audit trail

## Testing

To test the metrics system:

1. **Classification Validation**:
   - Upload and classify documents
   - Manually validate classifications
   - Check accuracy metrics

2. **Processing Time**:
   - Submit applications
   - Make decisions
   - View processing time metrics

3. **Privacy Breach Detection**:
   - Generate audit log activity
   - Run breach detection
   - Review alerts

## Future Enhancements

- Scheduled breach detection (cron job)
- Real-time alerting via WebSocket
- Machine learning for anomaly detection
- Historical trend analysis
- Custom alert thresholds per organization
