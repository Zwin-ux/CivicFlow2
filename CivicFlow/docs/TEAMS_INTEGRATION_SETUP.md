# Microsoft Teams Integration Setup Guide

This guide provides step-by-step instructions for setting up Microsoft Teams integration with the Government Lending CRM platform.

## Prerequisites

- Azure Active Directory (Azure AD) tenant
- Microsoft Teams administrator access
- Access to Azure Portal

## Azure AD App Registration

### Step 1: Register Application in Azure AD

1. Navigate to [Azure Portal](https://portal.azure.com)
2. Go to **Azure Active Directory** > **App registrations**
3. Click **New registration**
4. Configure the application:
   - **Name**: Government Lending CRM - Teams Integration
   - **Supported account types**: Accounts in this organizational directory only (Single tenant)
   - **Redirect URI**: Leave blank for now
5. Click **Register**

### Step 2: Note Application IDs

After registration, note the following values from the **Overview** page:
- **Application (client) ID** - This is your `TEAMS_CLIENT_ID`
- **Directory (tenant) ID** - This is your `TEAMS_TENANT_ID`

### Step 3: Create Client Secret

1. In your app registration, go to **Certificates & secrets**
2. Click **New client secret**
3. Add a description: "Teams Integration Secret"
4. Select expiration period (recommended: 24 months)
5. Click **Add**
6. **Important**: Copy the secret **Value** immediately - This is your `TEAMS_CLIENT_SECRET`
   - You won't be able to see this value again after leaving the page

### Step 4: Configure API Permissions

1. In your app registration, go to **API permissions**
2. Click **Add a permission**
3. Select **Microsoft Graph**
4. Select **Application permissions** (not Delegated)
5. Add the following permissions:
   - `Channel.ReadBasic.All` - Read basic channel properties
   - `ChannelMessage.Send` - Send messages to channels
   - `Chat.Create` - Create group chats
   - `ChatMessage.Send` - Send messages to chats
   - `OnlineMeetings.ReadWrite.All` - Create online meetings
   - `User.Read.All` - Read user profiles

6. Click **Add permissions**
7. Click **Grant admin consent for [Your Organization]**
8. Confirm by clicking **Yes**

### Step 5: Verify Permissions

Ensure all permissions show "Granted for [Your Organization]" with a green checkmark.

## Environment Configuration

### Update Environment Variables

Add the following variables to your `.env` file:

```bash
# Microsoft Teams Integration
TEAMS_CLIENT_ID=your-application-client-id
TEAMS_CLIENT_SECRET=your-client-secret-value
TEAMS_TENANT_ID=your-directory-tenant-id
TEAMS_WEBHOOK_SECRET=generate-a-secure-random-string
```

### Generate Webhook Secret

Generate a secure random string for webhook validation:

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Using OpenSSL
openssl rand -hex 32
```

## Database Setup

Run the database migrations to create the required tables:

```bash
npm run migrate
```

This will create the following tables:
- `teams_channels` - Stores Teams channel configuration per program type
- `teams_messages` - Tracks posted messages for updates
- `assignment_rules` - Auto-assignment rules for applications

## Webhook Configuration

### Step 1: Configure Webhook URL

The webhook endpoint will be available at:
```
https://your-domain.com/api/teams/webhook
```

### Step 2: Configure in Teams Admin Center

1. Go to [Teams Admin Center](https://admin.teams.microsoft.com)
2. Navigate to **Teams apps** > **Manage apps**
3. Find your custom app or create a new one
4. Configure the webhook URL in the app manifest

### Step 3: Test Webhook

Use the provided test script to verify webhook functionality:

```bash
curl -X POST https://your-domain.com/api/teams/webhook \
  -H "Content-Type: application/json" \
  -d '{"type":"test","value":{"action":"ping"}}'
```

## Teams Channel Setup

### Option 1: Automatic Channel Creation

The system will automatically create Teams channels when:
1. A new application is submitted for a configured program type
2. No existing channel mapping exists in the database

### Option 2: Manual Channel Configuration

1. Create a Teams channel manually in your desired team
2. Get the Team ID and Channel ID:
   - Open Teams in web browser
   - Navigate to the channel
   - Copy IDs from the URL: `teams.microsoft.com/l/channel/{channelId}/...?groupId={teamId}`
3. Add configuration via Admin UI or directly in database

## Testing the Integration

### Test 1: Verify Graph Client Initialization

```bash
# Check application logs for successful initialization
grep "Microsoft Graph client initialized" logs/combined.log
```

### Test 2: Create Test Channel

Use the admin API to test channel creation:

```bash
curl -X POST https://your-domain.com/api/admin/teams/config \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "programType": "SMALL_BUSINESS_LOAN",
    "teamId": "your-team-id",
    "notificationRules": {
      "NEW_SUBMISSION": true,
      "SLA_WARNING": true,
      "DECISION_READY": true
    }
  }'
```

### Test 3: Submit Test Application

Submit a test application and verify:
1. Adaptive Card appears in configured Teams channel
2. Message is tracked in `teams_messages` table
3. Action buttons are functional

## Troubleshooting

### Common Issues

#### 1. "Microsoft Graph client not initialized"

**Cause**: Missing or invalid credentials

**Solution**:
- Verify `TEAMS_CLIENT_ID`, `TEAMS_CLIENT_SECRET`, and `TEAMS_TENANT_ID` are set
- Check that client secret hasn't expired
- Ensure credentials are correct (no extra spaces)

#### 2. "Insufficient privileges to complete the operation"

**Cause**: Missing API permissions or admin consent not granted

**Solution**:
- Verify all required permissions are added in Azure AD
- Ensure admin consent is granted (green checkmarks)
- Wait 5-10 minutes for permissions to propagate

#### 3. "Channel not found"

**Cause**: Invalid Team ID or Channel ID

**Solution**:
- Verify IDs are correct from Teams URL
- Ensure the app has access to the team
- Check that the channel hasn't been deleted

#### 4. "Circuit breaker open"

**Cause**: Multiple failed API calls to Microsoft Graph

**Solution**:
- Check network connectivity to graph.microsoft.com
- Verify credentials are valid
- Wait for circuit breaker to reset (1 minute)
- Check Microsoft Graph service status

### Debug Logging

Enable debug logging for Teams integration:

```bash
LOG_LEVEL=debug npm run dev
```

### Check Circuit Breaker Status

Query the health endpoint to check circuit breaker status:

```bash
curl https://your-domain.com/api/health
```

## Security Considerations

1. **Protect Client Secret**: Never commit client secret to version control
2. **Rotate Secrets**: Rotate client secrets every 6-12 months
3. **Webhook Validation**: Always validate webhook signatures
4. **Least Privilege**: Only grant required API permissions
5. **Audit Logging**: Monitor all Teams integration actions

## Required Permissions Summary

| Permission | Type | Purpose |
|------------|------|---------|
| Channel.ReadBasic.All | Application | Read channel information |
| ChannelMessage.Send | Application | Post messages to channels |
| Chat.Create | Application | Create group chats |
| ChatMessage.Send | Application | Send messages to chats |
| OnlineMeetings.ReadWrite.All | Application | Create Teams meetings |
| User.Read.All | Application | Map Teams users to system users |

## Support

For additional support:
- Check application logs in `logs/combined.log`
- Review Microsoft Graph API documentation: https://docs.microsoft.com/graph
- Contact your Azure AD administrator for permission issues

## Next Steps

After completing setup:
1. Configure notification rules per program type
2. Set up auto-assignment rules
3. Train staff on using Teams integration features
4. Monitor integration performance and errors
