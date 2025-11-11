# Reporting Service

The Reporting Service provides dashboard metrics, compliance reports, and data exports for the Government Lending CRM Platform.

## Features

### 1. Real-time Dashboard API
- Aggregates application volume and approval rates
- Calculates average processing time from submission to decision
- Provides document classification accuracy metrics
- Implements 5-minute caching for performance optimization

### 2. Eligibility Report (JSON)
- Queries applications with eligibility determinations
- Formats data as structured JSON with metadata
- Includes program rules applied and decision details

### 3. Missing Documents Report (CSV)
- Queries incomplete applications with missing document lists
- Formats as CSV with application ID, applicant name, and required documents
- Implements streaming for large datasets

### 4. Compliance Summary (Markdown)
- Compiles program metrics for audit reporting
- Formats as Markdown with tables and summary statistics
- Includes date ranges and filtering criteria in report

## API Endpoints

### GET /api/v1/reporting/dashboard
Get real-time dashboard metrics with optional filters.

**Query Parameters:**
- `startDate` (optional): Filter by start date (ISO 8601)
- `endDate` (optional): Filter by end date (ISO 8601)
- `programType` (optional): Filter by program type
- `status` (optional): Filter by application status

**Response:**
```json
{
  "success": true,
  "data": {
    "totalApplications": 150,
    "approvalRate": 65.5,
    "averageProcessingTime": 48.5,
    "documentClassificationAccuracy": 96.2,
    "applicationsByStatus": {
      "DRAFT": 10,
      "SUBMITTED": 20,
      "UNDER_REVIEW": 30,
      "PENDING_DOCUMENTS": 15,
      "APPROVED": 50,
      "REJECTED": 20,
      "DEFERRED": 5
    },
    "trendsOverTime": [
      {
        "date": "2024-01-15",
        "value": 12,
        "label": "Applications"
      }
    ]
  }
}
```

### GET /api/v1/reporting/eligibility-report
Generate eligibility report in JSON format.

**Query Parameters:** Same as dashboard endpoint

**Response:**
```json
{
  "success": true,
  "data": {
    "applications": [
      {
        "id": "app-123",
        "applicantName": "ABC Corp",
        "eligibilityScore": 85.5,
        "decision": "APPROVED",
        "decidedBy": "user-456",
        "decidedAt": "2024-01-15T10:30:00Z",
        "programRules": ["SBA-7A"]
      }
    ],
    "metadata": {
      "generatedAt": "2024-01-20T14:00:00Z",
      "filters": {},
      "totalCount": 1
    }
  }
}
```

### GET /api/v1/reporting/missing-documents
Generate missing documents report in CSV format.

**Query Parameters:** Same as dashboard endpoint

**Response:** CSV file download

### GET /api/v1/reporting/compliance-summary
Generate compliance summary in Markdown format.

**Query Parameters:** Same as dashboard endpoint

**Response:** Markdown file download

### POST /api/v1/reporting/invalidate-cache
Invalidate dashboard cache (Administrator only).

**Response:**
```json
{
  "success": true,
  "message": "Dashboard cache invalidated"
}
```

## Caching Strategy

Dashboard metrics are cached in Redis with a 5-minute TTL to optimize performance. The cache key is built from the filter parameters:

```
dashboard:start:2024-01-01T00:00:00Z:end:2024-01-31T23:59:59Z:program:SBA-7A
```

Cache is automatically invalidated after 5 minutes or can be manually invalidated by administrators.

## Access Control

- **Dashboard, Eligibility Report, Missing Documents:** Reviewer, Approver, Administrator, Auditor
- **Compliance Summary:** Administrator, Auditor only
- **Cache Invalidation:** Administrator only

## Performance Considerations

1. **Database Queries:** Optimized aggregation queries with proper indexing
2. **Caching:** 5-minute TTL for dashboard metrics reduces database load
3. **Streaming:** CSV generation uses streaming for large datasets
4. **Parallel Queries:** Dashboard metrics are fetched in parallel using Promise.all

## Requirements Mapping

- **Requirement 5.1:** Real-time dashboards displaying application volume, approval rates, and average processing time
- **Requirement 5.3:** ELIGIBILITY_REPORT.json files containing structured eligibility determination data
- **Requirement 5.4:** MISSING_DOCUMENTS.csv files listing all incomplete applications
- **Requirement 5.5:** COMPLIANCE_SUMMARY.md files summarizing program metrics for audits
- **Requirement 8.2:** Average application review time reduction tracking

## Usage Example

```typescript
import reportingService from './services/reportingService';

// Get dashboard metrics
const dashboardData = await reportingService.getDashboardMetrics({
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-31'),
  programType: 'SBA-7A'
});

// Generate eligibility report
const report = await reportingService.generateEligibilityReport({
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-31')
});

// Generate missing documents CSV
const csv = await reportingService.generateMissingDocumentsCSV({
  status: 'PENDING_DOCUMENTS'
});

// Generate compliance summary
const markdown = await reportingService.generateComplianceSummary({
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-31')
});

// Invalidate cache
await reportingService.invalidateCache();
```
