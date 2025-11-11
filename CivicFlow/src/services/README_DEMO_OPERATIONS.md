# Demo Operation Simulation

This document describes the demo operation simulation system that allows showcasing all system features without persisting data to the database.

## Overview

The demo operation simulator provides realistic simulations of all major system operations:
- Document uploads
- AI analysis
- Approval/rejection workflows
- Data extraction
- Anomaly detection
- Eligibility calculations
- Notifications

All operations include realistic delays and return pre-computed results that demonstrate the system's capabilities.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Demo Request                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Demo Mode Middleware                            │
│  - Detects demo session                                      │
│  - Bypasses authentication                                   │
│  - Tracks interactions                                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│         Demo Operation Simulator                             │
│  - Simulates realistic delays                                │
│  - Generates pre-computed results                            │
│  - Returns mock data                                         │
│  - NO DATABASE WRITES                                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Response with Simulated Data                    │
└─────────────────────────────────────────────────────────────┘
```

## Key Features

### 1. No Data Persistence
All operations are simulated in-memory. No data is written to:
- PostgreSQL database
- File storage (S3/local)
- Redis cache (except session tracking)

### 2. Realistic Delays
Operations include realistic processing delays:
- Document upload: 500ms - 2s (based on file size)
- AI analysis: 2s - 7s
- Classification: 1s - 2s
- Data extraction: 2s - 4s
- Approval workflow: 1s - 3s
- Anomaly detection: 3s - 5s

### 3. Pre-computed Results
All AI results are generated using the `demoDataGenerator`:
- Quality scores (70-100)
- Extracted data (realistic financial/personal info)
- Anomalies (0-3 per application)
- Risk scores (0-100)
- Eligibility scores (60-95)

### 4. Realistic Metadata
All simulated operations include:
- Unique IDs (UUIDs)
- Timestamps
- Processing times
- Confidence scores
- Demo mode indicators

## API Endpoints

### Document Upload Simulation
```
POST /api/v1/demo/operations/upload
```

**Request:**
```json
{
  "applicationId": "uuid",
  "fileName": "tax_return_2023.pdf",
  "mimeType": "application/pdf",
  "size": 2048576
}
```

**Response:**
```json
{
  "document": {
    "id": "uuid",
    "applicationId": "uuid",
    "fileName": "tax_return_2023.pdf",
    "documentType": "TAX_RETURN",
    "status": "UPLOADED",
    "uploadedAt": "2024-01-15T10:30:00Z",
    "metadata": {
      "isDemo": true,
      "simulatedUpload": true
    }
  },
  "processingTime": 1250,
  "message": "Document upload simulated successfully (no data persisted)"
}
```

### AI Analysis Simulation
```
POST /api/v1/demo/operations/analyze
```

**Request:**
```json
{
  "documentId": "uuid",
  "documentType": "TAX_RETURN"
}
```

**Response:**
```json
{
  "analysis": {
    "id": "uuid",
    "documentId": "uuid",
    "qualityScore": 87,
    "extractedData": {
      "taxYear": 2023,
      "grossIncome": 125000,
      "netIncome": 95000
    },
    "summary": "Tax return shows consistent revenue...",
    "recommendations": ["Document quality is excellent"],
    "confidence": 0.94,
    "processingTime": 4523,
    "metadata": {
      "isDemo": true,
      "simulatedAnalysis": true
    }
  },
  "processingTime": 4523,
  "message": "AI analysis simulated successfully (pre-computed results)"
}
```

### Approval Workflow Simulation
```
POST /api/v1/demo/operations/decision
```

**Request:**
```json
{
  "applicationId": "uuid",
  "decision": "APPROVED",
  "justification": "Meets all eligibility criteria",
  "approvedAmount": 50000
}
```

**Response:**
```json
{
  "application": {
    "id": "uuid",
    "status": "APPROVED",
    "decision": {
      "id": "uuid",
      "decision": "APPROVED",
      "approvedAmount": 50000,
      "decidedAt": "2024-01-15T10:35:00Z"
    }
  },
  "notifications": [
    "Email notification sent to applicant: Application approved",
    "Teams notification sent to loan operations team",
    "Webhook triggered for downstream systems"
  ],
  "processingTime": 1823,
  "message": "Decision workflow simulated successfully (no data persisted)"
}
```

### Anomaly Detection Simulation
```
POST /api/v1/demo/operations/detect-anomalies
```

**Request:**
```json
{
  "applicationId": "uuid",
  "documentIds": ["uuid1", "uuid2", "uuid3"]
}
```

**Response:**
```json
{
  "anomalies": [
    {
      "id": "uuid",
      "type": "INCONSISTENT_DATA",
      "severity": "MEDIUM",
      "description": "Inconsistent business name formatting detected",
      "confidence": 0.82
    }
  ],
  "riskScore": 45,
  "processingTime": 3842,
  "message": "Anomaly detection simulated successfully"
}
```

### Eligibility Calculation Simulation
```
POST /api/v1/demo/operations/calculate-eligibility
```

**Request:**
```json
{
  "applicationId": "uuid",
  "programType": "SMALL_BUSINESS_LOAN"
}
```

**Response:**
```json
{
  "eligibilityScore": 78,
  "factors": [
    {
      "name": "Credit Score",
      "score": 85,
      "weight": 0.3
    },
    {
      "name": "Business History",
      "score": 72,
      "weight": 0.25
    }
  ],
  "recommendation": "RECOMMEND_REVIEW",
  "processingTime": 1456,
  "message": "Eligibility calculation simulated successfully"
}
```

### Batch Processing Simulation
```
POST /api/v1/demo/operations/batch-process
```

**Request:**
```json
{
  "documentIds": ["uuid1", "uuid2", "uuid3"],
  "operationType": "ANALYSIS"
}
```

**Response:**
```json
{
  "job": {
    "jobId": "uuid",
    "status": "PROCESSING",
    "totalDocuments": 3,
    "estimatedCompletionTime": 9000
  },
  "message": "Batch processing job simulated (no actual processing)"
}
```

## Usage in Frontend

### Example: Simulated Document Upload

```javascript
async function uploadDocumentInDemo(sessionId, applicationId, file) {
  const response = await fetch('/api/v1/demo/operations/upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Demo-Session': sessionId
    },
    body: JSON.stringify({
      applicationId,
      fileName: file.name,
      mimeType: file.type,
      size: file.size
    })
  });

  const result = await response.json();
  
  // Show processing indicator for realistic delay
  showProcessingIndicator(result.processingTime);
  
  // Display simulated document
  displayDocument(result.document);
  
  // Trigger simulated AI analysis
  await analyzeDocumentInDemo(sessionId, result.document.id, result.document.documentType);
}
```

### Example: Simulated Approval Workflow

```javascript
async function approveApplicationInDemo(sessionId, applicationId, amount) {
  const response = await fetch('/api/v1/demo/operations/decision', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Demo-Session': sessionId
    },
    body: JSON.stringify({
      applicationId,
      decision: 'APPROVED',
      justification: 'Application meets all criteria',
      approvedAmount: amount
    })
  });

  const result = await response.json();
  
  // Show processing animation
  await showProcessingAnimation(result.processingTime);
  
  // Update application status
  updateApplicationStatus(result.application);
  
  // Show notification indicators
  result.notifications.forEach(notification => {
    showNotificationIndicator(notification);
  });
}
```

## Integration with Existing Routes

For existing routes that need to support demo mode, use the `simulateInDemoMode` middleware:

```typescript
import { simulateInDemoMode } from '../middleware/demoMode';
import demoOperationSimulator from '../services/demoOperationSimulator';

router.post(
  '/documents/upload',
  authenticate,
  simulateInDemoMode(async (req, res) => {
    // Demo mode: simulate upload
    const result = await demoOperationSimulator.simulateDocumentUpload(
      req.body.applicationId,
      req.file
    );
    res.status(201).json(result);
  }),
  // Normal mode: actual upload handler
  async (req, res) => {
    const document = await documentService.uploadDocument(req.file, req.body.applicationId);
    res.status(201).json({ document });
  }
);
```

## Testing Demo Operations

### Manual Testing

1. Start a demo session:
```bash
curl -X POST http://localhost:3000/api/v1/demo/start \
  -H "Content-Type: application/json" \
  -d '{"userRole": "APPLICANT"}'
```

2. Use the returned `sessionId` for subsequent requests:
```bash
curl -X POST http://localhost:3000/api/v1/demo/operations/upload \
  -H "Content-Type: application/json" \
  -H "X-Demo-Session: <session-id>" \
  -d '{
    "applicationId": "test-app-id",
    "fileName": "tax_return.pdf",
    "mimeType": "application/pdf",
    "size": 1048576
  }'
```

### Automated Testing

```typescript
describe('Demo Operation Simulator', () => {
  it('should simulate document upload with realistic delay', async () => {
    const startTime = Date.now();
    
    const result = await demoOperationSimulator.simulateDocumentUpload(
      'app-id',
      { originalname: 'test.pdf', mimetype: 'application/pdf', size: 1000000 }
    );
    
    const elapsed = Date.now() - startTime;
    
    expect(result.success).toBe(true);
    expect(result.document.id).toBeDefined();
    expect(elapsed).toBeGreaterThan(500); // Minimum delay
    expect(result.document.metadata.isDemo).toBe(true);
  });
});
```

## Performance Considerations

### Delay Variance
All delays include ±10% random variance to simulate real-world conditions:
```typescript
const actualDelay = baseDelay + (Math.random() * variance * 2 - variance);
```

### Memory Management
Since no data is persisted, demo operations are memory-efficient:
- No database connections
- No file I/O
- No external API calls
- Minimal object creation

### Concurrent Sessions
The simulator supports multiple concurrent demo sessions:
- Each session is isolated
- No shared state between sessions
- Session data stored in Redis with TTL

## Monitoring and Analytics

All simulated operations are tracked for analytics:
- Operation type
- Processing time
- Success/failure
- Session ID
- Timestamp

This data helps understand:
- Which features are most used in demos
- Average demo session duration
- Conversion rates from demo to signup

## Security

Demo mode has built-in security measures:
- 30-minute session timeout
- No access to production data
- No ability to modify real applications
- Rate limiting on demo endpoints
- Session validation on every request

## Limitations

Demo mode simulations have some limitations:
1. **No Real AI Processing**: Results are pre-computed, not actual AI analysis
2. **No File Storage**: Uploaded files are not stored anywhere
3. **No Database Persistence**: All data is ephemeral
4. **No External Integrations**: Webhooks and notifications are simulated
5. **Limited Customization**: Demo data follows predefined patterns

## Future Enhancements

Potential improvements to the demo simulation system:
1. **Configurable Scenarios**: Allow admins to create custom demo scenarios
2. **Interactive Tutorials**: Guided walkthroughs of features
3. **Demo Recording**: Capture and replay demo sessions
4. **A/B Testing**: Test different demo flows
5. **Real-time Collaboration**: Multiple users in same demo session
