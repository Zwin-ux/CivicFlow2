# Teams Integration Service

## Overview

The Teams Integration Service provides core functionality for integrating Microsoft Teams with the Government Lending CRM. It enables real-time collaboration through Adaptive Cards, automated notifications, and channel management.

## Features

### 1. Channel Management
- **Automatic Channel Creation**: Creates Teams channels for program types on-demand
- **Channel Caching**: Uses Redis to cache channel information (1-hour TTL)
- **Channel Verification**: Validates that cached channels still exist in Teams
- **Naming Convention**: Generates readable channel names (e.g., "Small Business Loan - Applications")

### 2. Adaptive Card Notifications
- **Submission Cards**: Posted when new applications are submitted
- **SLA Warning Cards**: Posted when applications approach SLA breach
- **Decision Ready Cards**: Posted when applications are ready for final decision
- **Status Update Cards**: Posted when application status changes

### 3. Message Management
- **Message Tracking**: Stores message IDs in database for future updates
- **Card Updates**: Updates existing cards when application status changes
- **Duplicate Prevention**: Prevents duplicate messages for same application/card type

### 4. Meeting Creation
- **Teams Meetings**: Creates online meetings for application huddles
- **Meeting Links**: Generates join URLs for participants

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  Teams Integration Service                   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Channel    │  │   Message    │  │   Meeting    │      │
│  │  Management  │  │  Management  │  │  Management  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │              │
│         └──────────────────┴──────────────────┘              │
│                            │                                 │
└────────────────────────────┼─────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
┌─────────────────┐  ┌─────────────┐  ┌─────────────────┐
│  Graph Client   │  │   Teams     │  │  Redis Cache    │
│  (MS Graph API) │  │ Repository  │  │                 │
└─────────────────┘  └─────────────┘  └─────────────────┘
```

## Usage

### Initialize Service

```typescript
import teamsIntegrationService from './services/teamsIntegrationService';

// Check if Teams integration is enabled
if (teamsIntegrationService.isEnabled()) {
  console.log('Teams integration is active');
}
```

### Ensure Channel Exists

```typescript
// Get or create channel for program type
const channelInfo = await teamsIntegrationService.ensureChannel(
  'SMALL_BUSINESS_LOAN',
  'team-id-here' // Optional, required only if creating new channel
);

console.log('Channel ID:', channelInfo.channelId);
```

### Post Adaptive Card

```typescript
// Post new submission card
const messageId = await teamsIntegrationService.postAdaptiveCard(
  'SMALL_BUSINESS_LOAN',
  'SUBMISSION',
  application
);

// Post SLA warning card
await teamsIntegrationService.postAdaptiveCard(
  'SMALL_BUSINESS_LOAN',
  'SLA_WARNING',
  application,
  {
    slaDeadline: new Date('2024-12-31'),
    timeRemaining: 3600000, // milliseconds
  }
);

// Post decision ready card
await teamsIntegrationService.postAdaptiveCard(
  'SMALL_BUSINESS_LOAN',
  'DECISION_READY',
  application
);
```

### Update Adaptive Card

```typescript
// Update existing card when application status changes
await teamsIntegrationService.updateAdaptiveCard(
  application.id,
  'DECISION_READY',
  application,
  { previousStatus: 'UNDER_REVIEW' }
);
```

### Create Meeting

```typescript
const meeting = await teamsIntegrationService.createMeeting(
  application.id,
  'Application Review Huddle',
  ['user-id-1', 'user-id-2'],
  new Date('2024-12-15T10:00:00Z'),
  new Date('2024-12-15T11:00:00Z')
);

console.log('Join URL:', meeting.joinUrl);
```

### Manage Channel Configuration

```typescript
// Get channel configuration
const config = await teamsIntegrationService.getChannelConfig('SMALL_BUSINESS_LOAN');

// Update notification rules
await teamsIntegrationService.updateChannelConfig(config.id, {
  notificationRules: {
    NEW_SUBMISSION: true,
    SLA_WARNING: true,
    DECISION_READY: false, // Disable decision ready notifications
    DOCUMENTS_RECEIVED: true,
    FRAUD_DETECTED: true,
  },
});

// Get all active configurations
const allConfigs = await teamsIntegrationService.getAllChannelConfigs();
```

## Adaptive Card Types

### 1. Submission Card
Posted when a new application is submitted.

**Features:**
- Application summary with key details
- Risk score and fraud flags
- "View Application" and "Claim Application" buttons

### 2. SLA Warning Card
Posted when an application approaches SLA breach (80% of target time).

**Features:**
- Warning styling with yellow color
- SLA deadline and time remaining
- "Review Now" button

### 3. Decision Ready Card
Posted when an application is ready for final decision.

**Features:**
- Success styling with green color
- Eligibility score and risk assessment
- Action buttons: Approve, Reject, Request More Info

### 4. Status Update Card
Posted when application status changes or decision is made.

**Features:**
- Status-specific emoji and color
- Previous and current status
- Decision details if applicable

## Caching Strategy

### Channel Cache
- **Key Format**: `teams:channel:{programType}`
- **TTL**: 1 hour (3600 seconds)
- **Purpose**: Reduce Graph API calls for channel lookups
- **Invalidation**: Automatic on configuration updates

### Cache Flow
1. Check Redis cache
2. If miss, check database
3. If miss, create new channel
4. Store in database and cache

## Error Handling

### Graph API Errors
- Circuit breaker pattern with 30-second timeout
- Automatic retry with exponential backoff
- Fallback to logging when circuit is open

### Channel Not Found
- Removes stale configuration from database
- Recreates channel if team ID is provided
- Logs warning if channel cannot be created

### Notification Disabled
- Checks notification rules before posting
- Silently skips if event type is disabled
- Logs debug message for tracking

## Database Schema

### teams_channels
Stores Teams channel configuration for program types.

```sql
CREATE TABLE teams_channels (
  id UUID PRIMARY KEY,
  program_type VARCHAR(100) UNIQUE NOT NULL,
  team_id VARCHAR(255) NOT NULL,
  channel_id VARCHAR(255) NOT NULL,
  channel_name VARCHAR(255) NOT NULL,
  notification_rules JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### teams_messages
Tracks messages posted to Teams for applications.

```sql
CREATE TABLE teams_messages (
  id UUID PRIMARY KEY,
  application_id UUID NOT NULL,
  message_id VARCHAR(255) NOT NULL,
  channel_id VARCHAR(255) NOT NULL,
  card_type VARCHAR(50) NOT NULL,
  posted_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(application_id, card_type)
);
```

## Configuration

### Environment Variables

```bash
# Microsoft Teams Configuration
TEAMS_CLIENT_ID=your-azure-app-client-id
TEAMS_CLIENT_SECRET=your-azure-app-client-secret
TEAMS_TENANT_ID=your-azure-tenant-id
TEAMS_WEBHOOK_SECRET=your-webhook-secret

# Application URL (for card links)
APP_URL=https://your-app-domain.com
```

### Required Azure AD Permissions

The Azure AD application requires the following Microsoft Graph API permissions:

- `Channel.ReadWrite.All` - Create and manage Teams channels
- `Chat.Create` - Create group chats
- `ChatMessage.Send` - Send messages to channels and chats
- `OnlineMeetings.ReadWrite` - Create online meetings
- `User.Read.All` - Read user information

## Monitoring

### Logs
- Channel creation/retrieval
- Message posting/updating
- Cache hits/misses
- Error conditions

### Metrics
- Graph API call count
- Circuit breaker state
- Cache hit rate
- Message post latency

## Testing

### Unit Tests
Test individual methods with mocked dependencies:
- Channel management logic
- Card generation
- Cache operations

### Integration Tests
Test with actual Graph API (test environment):
- Channel creation
- Message posting
- Card updates

### Manual Testing
1. Configure Azure AD application
2. Set environment variables
3. Submit test application
4. Verify card appears in Teams
5. Test action buttons

## Troubleshooting

### Teams Integration Not Working
1. Check if Graph client is initialized: `teamsIntegrationService.isEnabled()`
2. Verify environment variables are set
3. Check Azure AD app permissions
4. Review logs for Graph API errors

### Cards Not Appearing
1. Verify channel configuration exists
2. Check notification rules for event type
3. Ensure Graph API permissions are granted
3. Review circuit breaker status

### Cache Issues
1. Check Redis connection
2. Verify cache TTL settings
3. Manually invalidate cache if needed

## Future Enhancements

- [ ] Support for private channels
- [ ] Batch message posting
- [ ] Message templates customization
- [ ] Webhook action handling
- [ ] User mention support
- [ ] File attachment support
- [ ] Threaded conversations
