# Mock Services for MVP Deployment

This document describes the mock services created for the MVP deployment to demonstrate functionality without requiring full external service integrations.

## Overview

For the MVP demo, we use mock services for email and Teams notifications. These services log all operations to the console instead of actually sending emails or posting to Teams channels. This allows stakeholders to see the full functionality without needing to configure external services.

## Mock Email Service

**Location:** `src/services/mockEmailService.ts`

### Purpose
Simulates email sending for demo mode. All emails are logged to the console with full details instead of being sent to actual recipients.

### Features
- Logs email details to console with formatted output
- Tracks email history in memory (last 100 emails)
- Returns success responses for all operations
- Compatible with the real `emailClient` interface

### Usage

```typescript
import mockEmailService from './services/mockEmailService';

// Send email (will be logged to console)
const result = await mockEmailService.sendEmail({
  to: 'user@example.com',
  subject: 'Test Email',
  html: '<p>HTML content</p>',
  text: 'Text content',
});

// Get email log
const recentEmails = mockEmailService.getEmailLog(10);

// Clear log
mockEmailService.clearEmailLog();
```

### Console Output Example

```
============================================================
📧 MOCK EMAIL SERVICE - Email Sent
============================================================
To: applicant@example.com
From: noreply@example.com
Subject: Application Submitted Successfully
Message ID: mock-1699564800000-abc123
Timestamp: 2024-11-09T12:00:00.000Z
------------------------------------------------------------
Text Content:
Dear John Doe,

Your application for Small Business Loan has been submitted...
============================================================
```

## Mock Teams Service

**Location:** `src/services/mockTeamsService.ts`

### Purpose
Simulates Microsoft Teams integration for demo mode. All Teams notifications and meetings are logged to the console instead of being posted to actual Teams channels.

### Features
- Logs adaptive card posts to console with full details
- Logs card updates with action tracking
- Simulates meeting creation with mock join URLs
- Tracks message and meeting history in memory
- Compatible with the real `teamsIntegrationService` interface

### Usage

```typescript
import mockTeamsService from './services/mockTeamsService';

// Post adaptive card (will be logged to console)
const messageId = await mockTeamsService.postAdaptiveCard(
  'SMALL_BUSINESS_LOAN',
  'SUBMISSION',
  application,
  { priority: 'HIGH' }
);

// Update card
await mockTeamsService.updateAdaptiveCard(
  applicationId,
  'SUBMISSION',
  application,
  { actionTaken: 'APPROVED' }
);

// Create meeting
const meeting = await mockTeamsService.createMeeting(
  applicationId,
  'Application Review Meeting',
  ['user1', 'user2'],
  new Date(),
  new Date(Date.now() + 3600000)
);

// Get logs
const recentMessages = mockTeamsService.getMessageLog(10);
const recentMeetings = mockTeamsService.getMeetingLog(10);
```

### Console Output Example

```
============================================================
📢 MOCK TEAMS SERVICE - Adaptive Card Posted
============================================================
Program Type: SMALL_BUSINESS_LOAN
Card Type: SUBMISSION
Application ID: app-123
Business Name: Acme Corp
Status: SUBMITTED
Message ID: mock-teams-1699564800000-xyz789
Timestamp: 2024-11-09T12:00:00.000Z
------------------------------------------------------------
Additional Data:
{
  "priority": "HIGH",
  "eligibilityScore": 85
}
============================================================
```

## AI Services Verification

**Location:** `src/scripts/verify-ai-services.ts`

### Purpose
Verifies that AI services (LLM and Azure Document Intelligence) are properly configured and working with real API keys.

### Features
- Tests LLM service (OpenAI or Claude) with a simple completion
- Checks Azure Document Intelligence configuration
- Provides detailed pass/fail results
- Exits with error code if any tests fail

### Usage

```bash
# Run verification script
npm run verify:ai
```

### Output Example

```
============================================================
AI Services Verification
============================================================

Testing LLM Service...
Provider: openai
  - Testing basic completion...
✅ PASS: LLM service is working
  Model: gpt-4
  Tokens used: 15
  Processing time: 1234ms
  Response: Hello, AI services are working!

Testing Azure Document Intelligence...
⚠️  SKIP: Not configured (optional service)

============================================================
Verification Summary
============================================================

Total tests: 2
✅ Passed: 1
❌ Failed: 0
⚠️  Skipped: 1

✅ All AI services are working correctly!
```

## Configuration for MVP

### Environment Variables

To use mock services in production, set these environment variables:

```bash
# Enable mock services
USE_MOCK_EMAIL=true
USE_MOCK_TEAMS=true

# Real AI services (required)
LLM_PROVIDER=openai
OPENAI_API_KEY=your-real-api-key

# Azure Document Intelligence (optional)
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=your-endpoint
AZURE_DOCUMENT_INTELLIGENCE_KEY=your-key
```

### Switching Between Real and Mock Services

The application should detect the environment variables and automatically use mock services when configured. You can implement a service factory pattern:

```typescript
// Example service factory
import config from '../config';
import emailClient from '../clients/emailClient';
import mockEmailService from '../services/mockEmailService';

export const getEmailService = () => {
  return config.useMockEmail ? mockEmailService : emailClient;
};
```

## Benefits for MVP Demo

1. **No External Dependencies**: Demo works without configuring SendGrid or Microsoft Teams
2. **Full Visibility**: All operations are logged to console for transparency
3. **Cost Savings**: No email or Teams API costs during demo
4. **Easy Testing**: Can verify all notification flows without actual delivery
5. **Realistic Behavior**: Mock services return success responses just like real services

## Transitioning to Production

When moving from MVP to production:

1. Set `USE_MOCK_EMAIL=false` and `USE_MOCK_TEAMS=false`
2. Configure real service credentials:
   - `EMAIL_API_KEY` for SendGrid
   - `TEAMS_CLIENT_ID`, `TEAMS_CLIENT_SECRET`, `TEAMS_TENANT_ID` for Teams
3. Test with real services in staging environment
4. Update service factory to use real clients
5. Monitor logs to ensure smooth transition

## Monitoring Mock Services

Both mock services maintain in-memory logs that can be accessed programmatically:

```typescript
// Check email activity
const emailCount = mockEmailService.getEmailCount();
const recentEmails = mockEmailService.getEmailLog(50);

// Check Teams activity
const messageCount = mockTeamsService.getMessageCount();
const meetingCount = mockTeamsService.getMeetingCount();
const recentMessages = mockTeamsService.getMessageLog(50);
const recentMeetings = mockTeamsService.getMeetingLog(50);
```

These logs can be exposed via admin endpoints for monitoring during demos.

## Troubleshooting

### Mock services not being used

Check environment variables:
```bash
echo $USE_MOCK_EMAIL
echo $USE_MOCK_TEAMS
```

### Console output not appearing

Ensure your logger is configured to output to console:
```typescript
// In logger configuration
transports: [
  new winston.transports.Console({
    format: winston.format.simple(),
  }),
]
```

### Memory usage concerns

Mock services keep only the last 100 emails and 50 meetings/messages in memory. For long-running demos, this should not be an issue. If needed, you can clear logs:

```typescript
mockEmailService.clearEmailLog();
mockTeamsService.clearMessageLog();
mockTeamsService.clearMeetingLog();
```
