# Microsoft Teams Integration Infrastructure

This directory contains the Microsoft Graph API client for Teams integration.

## Overview

The Teams integration infrastructure provides:
- OAuth 2.0 authentication with Microsoft Graph API
- Channel and chat management
- Message posting with Adaptive Cards
- Online meeting creation
- Circuit breaker pattern for resilience

## Components

### Graph Client (`graphClient.ts`)

The main client for interacting with Microsoft Graph API.

**Key Features:**
- Automatic token acquisition and refresh
- Circuit breaker protection for API calls
- Support for channels, chats, and meetings
- Comprehensive error handling

**Usage Example:**

```typescript
import graphClient from './clients/graphClient';

// Check if initialized
if (!graphClient.isInitialized()) {
  console.error('Teams integration not configured');
  return;
}

// Create a Teams channel
const channel = await graphClient.createChannel(
  'team-id',
  'Loan Applications - Small Business',
  'Channel for small business loan applications'
);

// Post a message with Adaptive Card
const message = {
  body: {
    contentType: 'html',
    content: '<attachment id="1"></attachment>',
  },
  attachments: [
    {
      id: '1',
      contentType: 'application/vnd.microsoft.card.adaptive',
      content: adaptiveCard,
    },
  ],
};

const response = await graphClient.postMessageToChannel(
  'team-id',
  'channel-id',
  message
);
```

## Database Schema

### teams_channels

Stores Teams channel configuration per program type.

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

**Example notification_rules:**
```json
{
  "NEW_SUBMISSION": true,
  "SLA_WARNING": true,
  "DECISION_READY": true,
  "DOCUMENTS_RECEIVED": false,
  "FRAUD_DETECTED": true
}
```

### teams_messages

Tracks messages posted to Teams for later updates.

```sql
CREATE TABLE teams_messages (
  id UUID PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES applications(id),
  message_id VARCHAR(255) NOT NULL,
  channel_id VARCHAR(255) NOT NULL,
  card_type VARCHAR(50) NOT NULL,
  posted_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### assignment_rules

Defines auto-assignment rules for applications.

```sql
CREATE TABLE assignment_rules (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  condition JSONB NOT NULL,
  assign_to JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Example condition:**
```json
{
  "programTypes": ["SMALL_BUSINESS_LOAN"],
  "amountRange": { "min": 0, "max": 50000 },
  "riskScoreRange": { "min": 0, "max": 50 }
}
```

**Example assign_to:**
```json
{
  "type": "LEAST_LOADED",
  "userPool": ["user-id-1", "user-id-2", "user-id-3"]
}
```

## Configuration

### Environment Variables

```bash
# Microsoft Teams Integration
TEAMS_CLIENT_ID=your-azure-ad-client-id
TEAMS_CLIENT_SECRET=your-client-secret
TEAMS_TENANT_ID=your-tenant-id
TEAMS_WEBHOOK_SECRET=your-webhook-secret
```

### Required Azure AD Permissions

The application requires the following Microsoft Graph API permissions:

| Permission | Type | Purpose |
|------------|------|---------|
| Channel.ReadBasic.All | Application | Read channel information |
| ChannelMessage.Send | Application | Post messages to channels |
| Chat.Create | Application | Create group chats |
| ChatMessage.Send | Application | Send messages to chats |
| OnlineMeetings.ReadWrite.All | Application | Create Teams meetings |
| User.Read.All | Application | Read user information |

## Circuit Breaker

The Graph client implements a circuit breaker pattern to handle API failures gracefully.

**Configuration:**
- Timeout: 30 seconds
- Error threshold: 50%
- Reset timeout: 60 seconds
- Rolling window: 30 seconds

**States:**
- **CLOSED**: Normal operation, all requests pass through
- **OPEN**: Too many failures, requests fail immediately
- **HALF_OPEN**: Testing if service recovered

**Monitoring:**

```typescript
const status = graphClient.getCircuitBreakerStatus();
console.log(status);
// {
//   name: 'GraphAPIService',
//   state: 'CLOSED',
//   stats: { ... }
// }
```

## Error Handling

### Common Errors

#### 1. Client Not Initialized

```typescript
if (!graphClient.isInitialized()) {
  // Handle missing configuration
  logger.warn('Teams integration disabled - credentials not configured');
  return;
}
```

#### 2. API Call Failures

```typescript
try {
  await graphClient.postMessageToChannel(teamId, channelId, message);
} catch (error) {
  if (error.message.includes('temporarily unavailable')) {
    // Circuit breaker is open
    logger.warn('Teams API temporarily unavailable, will retry later');
  } else {
    // Other error
    logger.error('Failed to post Teams message', { error });
  }
}
```

#### 3. Permission Errors

```
Error: Insufficient privileges to complete the operation
```

**Solution**: Verify all required permissions are granted in Azure AD with admin consent.

## Testing

### Unit Tests

Test the Graph client with mocked responses:

```typescript
import graphClient from './graphClient';

jest.mock('@microsoft/microsoft-graph-client');

describe('GraphClient', () => {
  it('should create a channel', async () => {
    const channel = await graphClient.createChannel(
      'team-id',
      'Test Channel'
    );
    expect(channel.channelId).toBeDefined();
  });
});
```

### Integration Tests

Test with actual Microsoft Graph API (requires valid credentials):

```typescript
describe('GraphClient Integration', () => {
  beforeAll(() => {
    // Ensure credentials are configured
    expect(graphClient.isInitialized()).toBe(true);
  });

  it('should get user info', async () => {
    const user = await graphClient.getUserInfo('user-id');
    expect(user.displayName).toBeDefined();
  });
});
```

## Performance Considerations

### Rate Limiting

Microsoft Graph API has rate limits:
- Per-app: 2,000 requests per second
- Per-user: 50 requests per second

The circuit breaker helps prevent hitting rate limits by failing fast when errors occur.

### Caching

Consider caching:
- Channel information (1 hour TTL)
- User information (30 minutes TTL)
- Team membership (1 hour TTL)

### Retry Strategy

The circuit breaker implements automatic retry with exponential backoff for transient failures.

## Security

### Token Management

- Tokens are acquired automatically using client credentials flow
- Tokens are cached and refreshed automatically by Azure Identity library
- Never log or expose access tokens

### Webhook Validation

Always validate webhook signatures:

```typescript
import crypto from 'crypto';

function validateWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const expectedSignature = hmac.digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

## Monitoring

### Metrics to Track

1. **API Call Success Rate**: Percentage of successful Graph API calls
2. **Circuit Breaker State**: Current state and state transitions
3. **Response Times**: Average and P95 response times
4. **Error Rates**: Errors by type (auth, permission, network, etc.)
5. **Message Delivery**: Success rate of message posting

### Logging

All Graph API operations are logged with context:

```typescript
logger.info('Posting message to Teams channel', {
  teamId,
  channelId,
  cardType: 'SUBMISSION',
});
```

### Alerts

Set up alerts for:
- Circuit breaker opening (indicates API issues)
- High error rates (>5% of requests)
- Authentication failures
- Permission errors

## Troubleshooting

### Debug Mode

Enable debug logging:

```bash
LOG_LEVEL=debug npm run dev
```

### Common Issues

1. **"Client not initialized"**
   - Check environment variables are set
   - Verify credentials are valid

2. **"Insufficient privileges"**
   - Verify API permissions in Azure AD
   - Ensure admin consent is granted

3. **"Channel not found"**
   - Verify team ID and channel ID are correct
   - Check app has access to the team

4. **"Circuit breaker open"**
   - Check Microsoft Graph service status
   - Verify network connectivity
   - Wait for circuit breaker to reset

## References

- [Microsoft Graph API Documentation](https://docs.microsoft.com/graph)
- [Adaptive Cards Documentation](https://adaptivecards.io)
- [Azure Identity Library](https://docs.microsoft.com/javascript/api/@azure/identity)
- [Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)
