# Batch Document Processing

This document describes the parallel batch processing system for documents, which allows processing multiple documents concurrently with job tracking, progress reporting, and timeout handling.

## Overview

The batch processing system provides:
- **Parallel Processing**: Process multiple documents concurrently with configurable concurrency limits
- **Job Tracking**: Track the status of batch processing jobs
- **Progress Reporting**: Real-time progress updates via WebSocket
- **Timeout Handling**: Automatic timeout detection and handling
- **Retry Logic**: Automatic retry with exponential backoff for failed documents
- **Error Handling**: Graceful error handling with detailed error reporting

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     API Layer                                │
│  POST /api/v1/documents/batch-process                       │
│  GET  /api/v1/documents/batch-process/:jobId                │
│  POST /api/v1/documents/batch-process/:jobId/cancel         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│          Document Processing Queue Service                   │
│  - Job Management                                            │
│  - Worker Pool (Concurrency Control)                         │
│  - Progress Tracking                                         │
│  - Timeout Handling                                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Processing Services                             │
│  - AI Document Analyzer                                      │
│  - Document Quality Service                                  │
│  - Smart Extraction Service                                  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              WebSocket Service                               │
│  Real-time progress updates to connected clients             │
└─────────────────────────────────────────────────────────────┘
```

## Usage

### 1. Create a Batch Processing Job

**Endpoint**: `POST /api/v1/documents/batch-process`

**Request Body**:
```json
{
  "documentIds": ["doc-id-1", "doc-id-2", "doc-id-3"],
  "type": "FULL_ANALYSIS",
  "options": {
    "maxConcurrent": 5,
    "timeout": 300000,
    "retryAttempts": 2,
    "retryDelay": 2000
  }
}
```

**Job Types**:
- `FULL_ANALYSIS`: Complete AI analysis including extraction, quality check, and anomaly detection
- `QUALITY_CHECK`: Document quality assessment only
- `DATA_EXTRACTION`: Data extraction only
- `BATCH_ANALYSIS`: Batch analysis with AI

**Options**:
- `maxConcurrent` (default: 5): Maximum number of documents to process concurrently
- `timeout` (default: 300000ms): Maximum time for the entire job
- `retryAttempts` (default: 2): Number of retry attempts for failed documents
- `retryDelay` (default: 2000ms): Delay between retries (with exponential backoff)

**Response**:
```json
{
  "data": {
    "jobId": "job_1699564800000_abc123",
    "status": "PENDING",
    "documentCount": 3,
    "type": "FULL_ANALYSIS"
  },
  "message": "Batch processing job created successfully"
}
```

### 2. Check Job Status

**Endpoint**: `GET /api/v1/documents/batch-process/:jobId`

**Response**:
```json
{
  "data": {
    "id": "job_1699564800000_abc123",
    "documentIds": ["doc-id-1", "doc-id-2", "doc-id-3"],
    "type": "FULL_ANALYSIS",
    "status": "PROCESSING",
    "progress": 66,
    "startedAt": "2024-11-09T10:00:00.000Z",
    "results": [
      {
        "documentId": "doc-id-1",
        "success": true,
        "data": { ... },
        "processingTime": 5000,
        "timestamp": "2024-11-09T10:00:05.000Z"
      },
      {
        "documentId": "doc-id-2",
        "success": true,
        "data": { ... },
        "processingTime": 4500,
        "timestamp": "2024-11-09T10:00:09.500Z"
      }
    ],
    "errors": [],
    "totalDocuments": 3,
    "processedDocuments": 2,
    "failedDocuments": 0,
    "estimatedTimeRemaining": 4750
  }
}
```

**Job Statuses**:
- `PENDING`: Job created but not yet started
- `PROCESSING`: Job is currently processing documents
- `COMPLETED`: All documents processed successfully
- `FAILED`: Job failed due to an error
- `CANCELLED`: Job was cancelled by user
- `TIMEOUT`: Job exceeded timeout limit

### 3. Cancel a Job

**Endpoint**: `POST /api/v1/documents/batch-process/:jobId/cancel`

**Response**:
```json
{
  "message": "Job cancelled successfully"
}
```

### 4. Real-time Progress Updates (WebSocket)

Connect to the WebSocket endpoint to receive real-time progress updates:

**WebSocket URL**: `ws://localhost:3000/api/dashboard/stream?userId=USER_ID`

**Event Types**:

#### Progress Update
```json
{
  "type": "batch.progress",
  "data": {
    "jobId": "job_1699564800000_abc123",
    "progress": 66,
    "processedDocuments": 2,
    "totalDocuments": 3,
    "estimatedTimeRemaining": 4750
  },
  "timestamp": "2024-11-09T10:00:09.500Z"
}
```

#### Job Completed
```json
{
  "type": "batch.completed",
  "data": {
    "jobId": "job_1699564800000_abc123",
    "totalDocuments": 3,
    "processedDocuments": 3,
    "failedDocuments": 0,
    "duration": 15000
  },
  "timestamp": "2024-11-09T10:00:15.000Z"
}
```

#### Job Failed
```json
{
  "type": "batch.failed",
  "data": {
    "jobId": "job_1699564800000_abc123",
    "error": "Job timeout exceeded",
    "processedDocuments": 2,
    "failedDocuments": 1
  },
  "timestamp": "2024-11-09T10:05:00.000Z"
}
```

#### Job Cancelled
```json
{
  "type": "batch.cancelled",
  "data": {
    "jobId": "job_1699564800000_abc123"
  },
  "timestamp": "2024-11-09T10:02:30.000Z"
}
```

## Programmatic Usage

### Using the Service Directly

```typescript
import documentProcessingQueueService, { ProcessingJobType } from '../services/documentProcessingQueueService';

// Create a batch processing job
const jobId = await documentProcessingQueueService.createJob(
  ['doc-id-1', 'doc-id-2', 'doc-id-3'],
  ProcessingJobType.FULL_ANALYSIS,
  {
    maxConcurrent: 5,
    timeout: 300000,
    retryAttempts: 2,
    retryDelay: 2000,
  }
);

// Check job status
const job = documentProcessingQueueService.getJobStatus(jobId);
console.log(`Job progress: ${job?.progress}%`);

// Cancel job
await documentProcessingQueueService.cancelJob(jobId);

// Listen to events
documentProcessingQueueService.on('progress', (update) => {
  console.log(`Job ${update.jobId}: ${update.progress}%`);
});

documentProcessingQueueService.on('jobCompleted', (result) => {
  console.log(`Job ${result.jobId} completed with ${result.results.length} results`);
});

documentProcessingQueueService.on('jobFailed', (error) => {
  console.error(`Job ${error.jobId} failed: ${error.error}`);
});
```

## Performance Considerations

### Concurrency Limits

The default concurrency limit is 5 documents processed in parallel. This can be adjusted based on:
- Available system resources (CPU, memory)
- External API rate limits (Azure AI, OpenAI)
- Database connection pool size

**Recommended Settings**:
- Small batches (< 10 docs): `maxConcurrent: 3-5`
- Medium batches (10-30 docs): `maxConcurrent: 5-10`
- Large batches (> 30 docs): `maxConcurrent: 10-15`

### Timeout Configuration

Default timeout is 5 minutes (300,000ms) for the entire job. Consider:
- Document size and complexity
- Network latency to external services
- Processing type (full analysis takes longer than quality check)

**Recommended Timeouts**:
- Quality check only: 60,000ms (1 minute)
- Data extraction: 180,000ms (3 minutes)
- Full analysis: 300,000ms (5 minutes)

### Retry Strategy

The service implements exponential backoff for retries:
- Attempt 1: Immediate
- Attempt 2: Wait `retryDelay * 1` ms
- Attempt 3: Wait `retryDelay * 2` ms
- etc.

This prevents overwhelming external services during temporary failures.

## Error Handling

### Document-Level Errors

Individual document failures don't stop the entire job. Failed documents are:
1. Retried up to `retryAttempts` times
2. Recorded in the `errors` array if all retries fail
3. Counted in `failedDocuments`

### Job-Level Errors

Job-level failures (timeout, cancellation) stop all processing:
- In-progress documents complete their current processing
- Pending documents are not started
- Job status is updated to `FAILED`, `TIMEOUT`, or `CANCELLED`

## Monitoring and Cleanup

### Job Cleanup

Old completed jobs are automatically cleaned up after 24 hours:
```typescript
// Manual cleanup
documentProcessingQueueService.cleanupOldJobs();
```

### Monitoring

Get all active jobs:
```typescript
const jobs = documentProcessingQueueService.getAllJobs();
console.log(`Active jobs: ${jobs.length}`);
```

## Best Practices

1. **Batch Size**: Keep batches under 50 documents for optimal performance
2. **Timeout Buffer**: Set timeout 20-30% higher than expected processing time
3. **Progress Monitoring**: Use WebSocket for real-time updates in UI
4. **Error Handling**: Always check `failedDocuments` count and review errors
5. **Resource Management**: Monitor system resources when processing large batches
6. **Retry Configuration**: Adjust retry attempts based on service reliability

## Example: Frontend Integration

```javascript
// Create batch processing job
const response = await fetch('/api/v1/documents/batch-process', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    documentIds: selectedDocuments,
    type: 'FULL_ANALYSIS',
    options: {
      maxConcurrent: 5,
      timeout: 300000
    }
  })
});

const { data } = await response.json();
const jobId = data.jobId;

// Connect to WebSocket for progress updates
const ws = new WebSocket(`ws://localhost:3000/api/dashboard/stream?userId=${userId}`);

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  if (message.type === 'batch.progress' && message.data.jobId === jobId) {
    updateProgressBar(message.data.progress);
    updateStatus(`Processing: ${message.data.processedDocuments}/${message.data.totalDocuments}`);
  }
  
  if (message.type === 'batch.completed' && message.data.jobId === jobId) {
    showSuccess('Batch processing completed!');
    refreshDocumentList();
  }
  
  if (message.type === 'batch.failed' && message.data.jobId === jobId) {
    showError(`Batch processing failed: ${message.data.error}`);
  }
};

// Poll for status updates (fallback if WebSocket not available)
const pollInterval = setInterval(async () => {
  const statusResponse = await fetch(`/api/v1/documents/batch-process/${jobId}`);
  const { data: job } = await statusResponse.json();
  
  updateProgressBar(job.progress);
  
  if (job.status === 'COMPLETED' || job.status === 'FAILED') {
    clearInterval(pollInterval);
  }
}, 2000);
```

## Requirements Satisfied

This implementation satisfies the following requirements:

- **Requirement 1.4**: Multiple documents are processed in parallel with maximum 30 second total processing time per document
- **Requirement 1.5**: Circuit breaker and retry logic implemented for service resilience
- **Worker Queue**: Implemented with concurrency control
- **Job Status Tracking**: Complete job lifecycle tracking with status updates
- **Progress Reporting**: Real-time progress updates via WebSocket and polling
- **Timeout Handling**: Configurable timeouts with automatic detection and handling
