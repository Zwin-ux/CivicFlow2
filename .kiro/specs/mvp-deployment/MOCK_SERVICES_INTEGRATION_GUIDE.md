# Mock Services Integration Guide

This guide explains how to integrate the mock email and Teams services into the application for MVP deployment.

## Overview

The mock services have been created and are ready to use. To complete the integration, you need to:

1. Add environment variable checks
2. Create service factory functions
3. Update service imports throughout the application
4. Test the integration

## Step 1: Add Environment Variables

Add these to your `.env.production` file:

```bash
# Mock Services Configuration
USE_MOCK_EMAIL=true
USE_MOCK_TEAMS=true

# Real AI Services (required)
LLM_PROVIDER=openai
OPENAI_API_KEY=your-real-api-key

# Azure Document Intelligence (optional)
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=
AZURE_DOCUMENT_INTELLIGENCE_KEY=
```

Update `src/config/index.ts` to include these settings:

```typescript
interface Config {
  // ... existing config
  mockServices: {
    email: boolean;
    teams: boolean;
  };
}

const config: Config = {
  // ... existing config
  mockServices: {
    email: process.env.USE_MOCK_EMAIL === 'true',
    teams: process.env.USE_MOCK_TEAMS === 'true',
  },
};
```

## Step 2: Create Service Factory Functions

Create `src/services/serviceFactory.ts`:

```typescript
/**
 * Service Factory
 * Provides the correct service implementation based on configuration
 */

import config from '../config';
import emailClient from '../clients/emailClient';
import mockEmailService from './mockEmailService';
import teamsIntegrationService from './teamsIntegrationService';
import mockTeamsService from './mockTeamsService';
import logger from '../utils/logger';

/**
 * Get email service (real or mock based on config)
 */
export const getEmailService = () => {
  if (config.mockServices.email) {
    logger.info('Using mock email service');
    return mockEmailService;
  }
  logger.info('Using real email service');
  return emailClient;
};

/**
 * Get Teams service (real or mock based on config)
 */
export const getTeamsService = () => {
  if (config.mockServices.teams) {
    logger.info('Using mock Teams service');
    return mockTeamsService;
  }
  logger.info('Using real Teams service');
  return teamsIntegrationService;
};
```

## Step 3: Update Service Imports

### Update Communication Service

In `src/services/communicationService.ts`, replace:

```typescript
import emailClient from '../clients/emailClient';
```

With:

```typescript
import { getEmailService } from './serviceFactory';
const emailService = getEmailService();
```

Then update all `emailClient` references to `emailService`:

```typescript
// Before
const result = await emailClient.sendEmail({...});

// After
const result = await emailService.sendEmail({...});
```

### Update Teams Notification Service

In `src/services/teamsNotificationService.ts`, replace:

```typescript
import teamsIntegrationService from './teamsIntegrationService';
```

With:

```typescript
import { getTeamsService } from './serviceFactory';
const teamsService = getTeamsService();
```

Then update all `teamsIntegrationService` references to `teamsService`:

```typescript
// Before
await teamsIntegrationService.postAdaptiveCard(...);

// After
await teamsService.postAdaptiveCard(...);
```

## Step 4: Update Initialization Logic

### Update Teams Notification Service Initialization

In `src/services/teamsNotificationService.ts`, update the `initialize()` method:

```typescript
initialize(): void {
  if (this.initialized) {
    logger.warn('Teams notification service already initialized');
    return;
  }

  // Check if Teams integration is enabled (works for both real and mock)
  const teamsService = getTeamsService();
  if (!teamsService.isEnabled()) {
    logger.info('Teams integration disabled, notification service will not start');
    return;
  }

  // Subscribe to application events
  this.subscribeToEvents();

  this.initialized = true;
  logger.info('Teams notification service initialized successfully');
}
```

## Step 5: Add Admin Endpoints (Optional)

Create endpoints to view mock service logs for debugging:

In `src/routes/admin/mockServices.ts`:

```typescript
import { Router } from 'express';
import mockEmailService from '../../services/mockEmailService';
import mockTeamsService from '../../services/mockTeamsService';
import config from '../../config';

const router = Router();

/**
 * Get mock email log
 */
router.get('/emails', (req, res) => {
  if (!config.mockServices.email) {
    return res.status(404).json({ error: 'Mock email service not enabled' });
  }

  const limit = parseInt(req.query.limit as string) || 50;
  const emails = mockEmailService.getEmailLog(limit);
  const count = mockEmailService.getEmailCount();

  res.json({
    count,
    emails,
  });
});

/**
 * Get mock Teams message log
 */
router.get('/teams/messages', (req, res) => {
  if (!config.mockServices.teams) {
    return res.status(404).json({ error: 'Mock Teams service not enabled' });
  }

  const limit = parseInt(req.query.limit as string) || 50;
  const messages = mockTeamsService.getMessageLog(limit);
  const count = mockTeamsService.getMessageCount();

  res.json({
    count,
    messages,
  });
});

/**
 * Get mock Teams meeting log
 */
router.get('/teams/meetings', (req, res) => {
  if (!config.mockServices.teams) {
    return res.status(404).json({ error: 'Mock Teams service not enabled' });
  }

  const limit = parseInt(req.query.limit as string) || 50;
  const meetings = mockTeamsService.getMeetingLog(limit);
  const count = mockTeamsService.getMeetingCount();

  res.json({
    count,
    meetings,
  });
});

/**
 * Clear mock service logs
 */
router.post('/clear', (req, res) => {
  if (config.mockServices.email) {
    mockEmailService.clearEmailLog();
  }
  if (config.mockServices.teams) {
    mockTeamsService.clearMessageLog();
    mockTeamsService.clearMeetingLog();
  }

  res.json({ message: 'Mock service logs cleared' });
});

export default router;
```

Register the routes in `src/app.ts`:

```typescript
import mockServicesRoutes from './routes/admin/mockServices';

// ... other routes
app.use('/api/v1/admin/mock-services', authenticate, authorize(['ADMIN']), mockServicesRoutes);
```

## Step 6: Update Health Check

Update `src/routes/health.ts` to include mock service status:

```typescript
import config from '../config';
import mockEmailService from '../services/mockEmailService';
import mockTeamsService from '../services/mockTeamsService';

// In the health check response
const healthStatus = {
  // ... existing checks
  services: {
    email: {
      enabled: true,
      mock: config.mockServices.email,
      status: config.mockServices.email 
        ? mockEmailService.isInitialized() 
        : emailClient.isInitialized(),
    },
    teams: {
      enabled: true,
      mock: config.mockServices.teams,
      status: config.mockServices.teams
        ? mockTeamsService.isEnabled()
        : teamsIntegrationService.isEnabled(),
    },
  },
};
```

## Step 7: Testing

### Test Mock Email Service

```bash
# Start the application with mock services enabled
USE_MOCK_EMAIL=true npm run dev

# Trigger an email (e.g., submit an application)
# Check console for mock email output
```

### Test Mock Teams Service

```bash
# Start the application with mock services enabled
USE_MOCK_TEAMS=true npm run dev

# Trigger a Teams notification (e.g., submit an application)
# Check console for mock Teams output
```

### Test AI Services

```bash
# Verify AI services are working
npm run verify:ai

# Should see:
# [OK] PASS: LLM service is working
# [WARN]  SKIP: Azure Document Intelligence not configured (optional)
```

## Step 8: Deployment Checklist

Before deploying to Railway:

- [ ] Set `USE_MOCK_EMAIL=true` in Railway environment variables
- [ ] Set `USE_MOCK_TEAMS=true` in Railway environment variables
- [ ] Set real `OPENAI_API_KEY` or `CLAUDE_API_KEY`
- [ ] Run `npm run verify:ai` locally to test AI services
- [ ] Test application locally with mock services enabled
- [ ] Verify console logs show mock service output
- [ ] Deploy to Railway
- [ ] Check Railway logs for mock service output
- [ ] Test key workflows (application submission, status changes)

## Troubleshooting

### Mock services not being used

**Problem:** Real services are being called instead of mock services

**Solution:**
1. Check environment variables: `echo $USE_MOCK_EMAIL`
2. Verify config is loading correctly
3. Check service factory is being used instead of direct imports
4. Restart the application

### Console output not appearing

**Problem:** Mock service logs not showing in console

**Solution:**
1. Check logger configuration includes console transport
2. Verify log level is set to 'info' or lower
3. Check Railway logs (not just local console)

### AI services failing

**Problem:** AI verification script fails

**Solution:**
1. Verify API keys are set correctly
2. Check API key has sufficient credits/quota
3. Test API key directly with curl or Postman
4. Check network connectivity to AI service

## Production Transition

When ready to use real services:

1. Set `USE_MOCK_EMAIL=false`
2. Set `USE_MOCK_TEAMS=false`
3. Configure real service credentials:
   - `EMAIL_API_KEY` for SendGrid
   - `TEAMS_CLIENT_ID`, `TEAMS_CLIENT_SECRET`, `TEAMS_TENANT_ID`
4. Test in staging environment first
5. Monitor logs for any errors
6. Gradually roll out to production

## Benefits Summary

[OK] **For MVP Demo:**
- No external service configuration needed
- Full visibility into all operations
- No costs for email/Teams during demo
- Easy to test and verify

[OK] **For Development:**
- Fast iteration without external dependencies
- Clear console output for debugging
- No risk of sending test emails to real users
- No risk of posting test messages to real Teams channels

[OK] **For Production:**
- Easy switch to real services via environment variables
- Same interface for both mock and real services
- Gradual rollout possible
- Fallback to mock if real services fail
