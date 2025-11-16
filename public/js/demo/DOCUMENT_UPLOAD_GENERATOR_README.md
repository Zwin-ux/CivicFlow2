# Document Upload Event Generator

## Overview

The Document Upload Event Generator creates realistic document upload events for demo mode, simulating the complete document upload workflow including AI analysis, verification, and quality assessment.

## Features

### Document Types (15 types)
- **Legal Documents**: Business License, Proof of Insurance, Articles of Incorporation, Operating Agreement, Lease Agreement
- **Financial Documents**: Tax Returns (2023, 2022), Bank Statements (Q4, Q3 2023), Financial Projection, Personal Financial Statement, Credit Report
- **Business Documents**: Business Plan, Purchase Order, Invoice

### Document Categories
- `legal`: Legal and compliance documents
- `financial`: Financial statements and records
- `business`: Business operations documents

### File Formats
- **PDF**: Most common format (100KB - 5MB)
- **DOCX**: Word documents (50KB - 2MB)
- **XLSX**: Spreadsheets (30KB - 1MB)
- **PPTX**: Presentations (500KB - 10MB)

### Uploader Types
- **Applicant**: Business owner or authorized representative
- **Staff**: Internal staff members
- **System**: Auto-generated documents

### Document Status
- `pending_review`: Awaiting review by staff
- `verified`: Verified and approved by staff
- `needs_attention`: Has issues requiring resolution

## Usage

### Basic Usage

```javascript
const eventGenerators = new EventGenerators();

// Generate document upload for random application
const documentEvent = eventGenerators.generateDocumentUploaded();

console.log(documentEvent);
// {
//   documentId: "DOC-1234567890-12345",
//   applicationId: "APP-1234567890-5678",
//   businessName: "Acme Manufacturing LLC",
//   documentType: "Business License",
//   category: "legal",
//   fileName: "business_license_567890.pdf",
//   fileSize: 524288,
//   fileSizeFormatted: "512.0 KB",
//   extension: "pdf",
//   uploadedBy: "John Smith",
//   uploaderType: "Applicant",
//   uploadedAt: Date,
//   isRequired: true,
//   documentStatus: "verified",
//   ...
// }
```

### Generate for Specific Application

```javascript
const application = {
  applicationId: 'APP-12345',
  businessName: 'Tech Startup Inc',
  status: 'UNDER_REVIEW',
  loanAmount: 150000,
  location: 'San Francisco, CA'
};

const documentEvent = eventGenerators.generateDocumentUploaded(application);
```

### Generate Human-Readable Description

```javascript
const description = eventGenerators.generateDocumentUploadDescription(documentEvent);
// "Tech Startup Inc uploaded Business License (512.0 KB, 2 pages). Uploaded by John Smith."
```

## Event Data Structure

```typescript
interface DocumentUploadEvent {
  // Document identification
  documentId: string;
  applicationId: string;
  businessName: string;
  
  // Document details
  documentType: string;
  category: 'legal' | 'financial' | 'business';
  fileName: string;
  fileSize: number;
  fileSizeFormatted: string;
  extension: string;
  pageCount: number;
  
  // Upload information
  uploadedBy: string;
  uploaderType: 'Applicant' | 'Staff' | 'System';
  uploadedAt: Date;
  
  // Status and requirements
  isRequired: boolean;
  documentStatus: 'pending_review' | 'verified' | 'needs_attention';
  qualityScore: number; // 0-100
  completesRequirement: boolean;
  
  // Verification (if verified)
  verificationDetails?: {
    verifiedBy: string;
    verifiedAt: Date;
    verificationMethod: string;
  };
  
  // AI Analysis
  aiAnalysis: {
    processed: boolean;
    confidence: number; // 0-100
    classificationCorrect: boolean;
    detectedType: string;
    extractedFields: Array<{
      name: string;
      value: string;
      confidence: number; // 0-1
    }>;
    qualityAssessment: {
      readability: number; // 0-100
      completeness: number; // 0-100
      authenticity: number; // 0-100
    };
    processingTime: number; // milliseconds
    modelVersion: string;
  };
  
  // Issues (if any)
  hasIssues: boolean;
  issues: string[];
  
  // Technical metadata
  metadata: {
    mimeType: string;
    encoding: string;
    uploadSource: string;
    ipAddress: string;
    userAgent: string;
    scanStatus: string;
    ocrProcessed: boolean;
    thumbnailGenerated: boolean;
    extractedText: boolean;
  };
}
```

## AI Analysis

The generator simulates comprehensive AI document analysis:

### Confidence Scores
- 70-98% confidence in document classification
- Higher confidence for standard document types
- Lower confidence for unusual or poor-quality documents

### Extracted Fields by Document Type

**Business License:**
- License Number
- Issue Date
- Expiration Date

**Tax Returns:**
- Tax Year
- EIN (Employer Identification Number)
- Total Income

**Bank Statements:**
- Account Number (masked)
- Statement Period
- Ending Balance

**Generic Documents:**
- Document Date
- Document ID

### Quality Assessment
- **Readability**: 70-100 (text clarity and OCR quality)
- **Completeness**: 70-100 (all required fields present)
- **Authenticity**: 80-100 (document appears genuine)

## Document Issues

When status is `needs_attention`, the generator creates 1-2 realistic issues:

- Low image quality - text may be difficult to read
- Missing signature on page 3
- Date appears to be outside acceptable range
- Document appears to be incomplete
- Watermark detected - may not be original
- Some fields are illegible
- Document format not standard
- Missing required information

## Integration Examples

### With Live Simulator

```javascript
const simulator = new LiveSimulator();

simulator.start({
  interval: 30000,
  eventTypes: ['new_application', 'status_change', 'document_uploaded'],
  intensity: 'medium'
});

simulator.on('event', (event) => {
  if (event.type === 'document_uploaded') {
    showDocumentNotification(event.data);
    updateDocumentCount(event.data.applicationId);
  }
});
```

### With Notification System

```javascript
function showDocumentNotification(documentData) {
  const notification = {
    title: 'Document Uploaded',
    message: `${documentData.businessName} uploaded ${documentData.documentType}`,
    icon: '📄',
    color: '#06b6d4',
    timestamp: documentData.uploadedAt
  };
  
  ToastNotification.show(notification);
}
```

### With Dashboard Updates

```javascript
function updateDocumentCount(applicationId) {
  const appCard = document.querySelector(`[data-app-id="${applicationId}"]`);
  const countElement = appCard.querySelector('.doc-count');
  countElement.textContent = parseInt(countElement.textContent) + 1;
}
```

## Helper Methods

### `generateFileName(documentType, extension)`
Creates realistic file names based on document type.

### `generateFileSize(category, extension)`
Generates appropriate file sizes for document types.

### `formatFileSize(bytes)`
Formats bytes to human-readable format (B, KB, MB).

### `generatePageCount(documentType)`
Returns realistic page counts for each document type.

### `getMimeType(extension)`
Returns proper MIME type for file extension.

### `generateDocumentAIAnalysis(documentType, category)`
Simulates AI processing and analysis results.

### `generateExtractedFields(documentType)`
Creates extracted field data based on document type.

### `generateDocumentIssues(documentType)`
Generates realistic document issues.

### `generateIPAddress()`
Creates realistic IP addresses.

### `generateUserAgent()`
Returns realistic browser user agent strings.

## Testing

### Manual Testing
Open `http://localhost:3000/test-event-generators.html` and:
1. Click "Generate Document Upload" for single event
2. Click "Generate 10 Document Uploads" for batch
3. Verify all fields are populated
4. Check AI analysis is comprehensive
5. Verify issues appear when status is "needs_attention"
6. Confirm verification details when status is "verified"

### Automated Testing
Run `node test-document-upload-generator.js` to execute comprehensive tests.

## Statistics

From 10 generated documents:
- **Categories**: ~30% legal, ~50% financial, ~20% business
- **Status**: ~60% pending_review, ~10% verified, ~30% needs_attention
- **Uploader Types**: ~50% Applicant, ~25% Staff, ~25% System
- **Required**: ~25% are required documents
- **Issues**: ~30% have issues requiring attention

## Best Practices

1. **Use with existing applications** when possible for consistency
2. **Check document status** before displaying to users
3. **Show AI analysis** to demonstrate intelligent features
4. **Highlight issues** when documents need attention
5. **Update counts** in real-time for better UX
6. **Animate additions** for visual feedback
7. **Group by category** for better organization

## Next Steps

This generator is ready for integration with:
- ✅ Task 3.1: Live Simulator (generate events)
- ⏳ Task 3.3: Notification System (show upload notifications)
- ⏳ Task 3.4: Real-time Dashboard Updates (update document counts)
- ⏳ Task 4.3: Document Intelligence Demo (showcase AI analysis)

## Files

- **Implementation**: `public/js/demo/event-generators.js`
- **Test Page**: `public/test-event-generators.html`
- **Test Script**: `test-document-upload-generator.js`
- **Integration Examples**: `public/js/demo/document-upload-integration-example.js`
- **Templates**: `public/data/demo-event-templates.json`

## Status

✅ **COMPLETE** - Ready for production use
