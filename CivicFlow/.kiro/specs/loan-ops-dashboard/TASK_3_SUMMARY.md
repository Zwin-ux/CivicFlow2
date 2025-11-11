# Task 3: Implement Webhook Handler for Teams Actions - Summary

## Overview
Successfully implemented a complete webhook handler for Microsoft Teams Adaptive Card actions, including request validation, user authentication/authorization, action processing, and comprehensive audit logging with metrics tracking.

## Implementation Details

### 3.1 Create Webhook Endpoint and Request Validation ✅

**Files Created:**
- `src/routes/teams.ts` - Teams webhook routes

**Key Features:**
- POST `/api/v1/teams/webhook` endpoint for receiving Teams action callbacks
- HMAC-SHA256 signature validation using shared secret from config
- Timing-safe signature comparison to prevent timing attacks
- Request structure validation (type, value, from fields)
- Action and applicationId extraction and validation
- Teams user information extraction (id, name, aadObjectId)
- Comprehensive error handling and logging

**Security:**
- Webhook signature validation prevents unauthorized requests
- Invalid signatures return 401 Unauthorized
- Malformed requests return 400 Bad Request

### 3.2 Build User Authentication and Authorization ✅

**Files Created:**
- `src/services/webhookService.ts` - Webhook processing service
- `src/database/migrations/011_add_aad_object_id_to_users.sql` - Database migration

**Files Modified:**
- `src/models/user.ts` - Added aadObjectId field
- `src/repositories/userRepository.ts` - Added findByAadObjectId method

**Key Features:**
- Azure AD Object ID mapping to system users
- User account status validation (active/inactive)
- Role-based authorization for different actions:
  - APPROVE/REJECT/DEFER: Requires Approver or Administrator role
  - REQUEST_INFO: Requires Reviewer, Approver, or Administrator role
  - CLAIM: Requires Reviewer, Approver, or Administrator role
  - ADD_NOTE: Requires Reviewer, Approver, or Administrator role
- Detailed authorization failure messages
- Audit logging for unmapped users and unauthorized attempts

**Database Changes:**
- Added `aad_object_id` column to users table
- Created unique index on aad_object_id for fast lookups
- Migration successfully executed

### 3.3 Implement Action Handlers ✅

**Action Handlers Implemented:**

1. **APPROVE Action**
   - Calls ApplicationService.submitDecision with APPROVED status
   - Uses requested amount or custom amount from webhook data
   - Includes justification and override reason support
   - Returns updated application with decision details

2. **REJECT Action**
   - Calls ApplicationService.submitDecision with REJECTED status
   - Includes justification from webhook or default message
   - Logs rejection decision to audit trail

3. **DEFER Action**
   - Calls ApplicationService.submitDecision with DEFERRED status
   - Allows deferring decisions for later review
   - Maintains audit trail of deferral

4. **REQUEST_INFO Action**
   - Updates application status to PENDING_DOCUMENTS
   - Creates audit log entry for information request
   - Includes custom message support

5. **CLAIM Action**
   - Assigns application to the Teams user
   - Updates assignedTo field in application
   - Logs claim action for tracking

**Adaptive Card Updates:**
- Automatically updates Teams Adaptive Card after successful action
- Shows action taken, who performed it, and when
- Handles card update failures gracefully (logs error but doesn't fail webhook)

**Error Handling:**
- Comprehensive try-catch blocks for each handler
- Detailed error logging with context
- User-friendly error messages returned to Teams
- Failed actions don't crash the webhook endpoint

### 3.4 Add Webhook Audit Logging ✅

**Files Modified:**
- `src/services/webhookService.ts` - Added metrics and alerting
- `src/config/redis.ts` - Added Redis helper methods
- `src/routes/teams.ts` - Added metrics endpoint

**Audit Logging Features:**
- Every webhook request logged to audit_logs table
- Includes action type, Teams user ID, success/failure status
- Processing time tracking for performance monitoring
- Error messages captured for failed requests

**Metrics Tracking (Redis-based):**
- Daily metrics per action type:
  - Total requests
  - Successful requests
  - Failed requests
  - Total processing time (for average calculation)
- Metrics stored with 30-day TTL
- GET `/api/v1/teams/metrics` endpoint for retrieving metrics
- Supports date range queries

**Failure Alerting:**
- Tracks recent failures in Redis sorted sets
- Configurable threshold (default: 5 failures in 5 minutes)
- Automatic administrator alerts when threshold exceeded
- Alert cooldown period (15 minutes) to prevent spam
- Critical alerts logged to audit trail
- Includes failure count, window, and last error message

**Redis Methods Added:**
- `hincrby` - Increment hash field
- `hgetall` - Get all hash fields
- `zadd` - Add to sorted set
- `zremrangebyscore` - Remove by score range
- `zcount` - Count members in score range
- `expire` - Set key expiration

## Integration Points

### Application Service
- Uses `submitDecision` for APPROVE/REJECT/DEFER actions
- Uses `updateApplication` for CLAIM and REQUEST_INFO actions
- Uses `getApplication` to retrieve application details

### Teams Integration Service
- Calls `updateAdaptiveCard` after successful actions
- Updates cards with action details and user information

### Audit Log Repository
- Logs all webhook events
- Tracks unauthorized attempts
- Records unmapped user attempts
- Creates failure alerts

## Configuration

**Environment Variables Required:**
- `TEAMS_WEBHOOK_SECRET` - Shared secret for signature validation

**Database:**
- Migration 011 adds aad_object_id to users table
- Unique index on aad_object_id for performance

## API Endpoints

### POST /api/v1/teams/webhook
Receives Teams action callbacks

**Request Headers:**
- `x-teams-signature` - HMAC-SHA256 signature

**Request Body:**
```json
{
  "type": "message",
  "value": {
    "action": "APPROVE",
    "applicationId": "uuid",
    "justification": "optional",
    "amount": "optional"
  },
  "from": {
    "id": "teams-user-id",
    "name": "User Name",
    "aadObjectId": "aad-object-id"
  },
  "conversation": {
    "id": "conversation-id"
  },
  "replyToId": "message-id"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Application approved by John Doe",
  "application": { ... }
}
```

**Response (Unauthorized):**
```json
{
  "success": false,
  "error": "This action requires one of the following roles: Approver, Administrator. Your role is: Reviewer"
}
```

### GET /api/v1/teams/metrics
Retrieve webhook metrics

**Query Parameters:**
- `action` - Action type (APPROVE, REJECT, etc.)
- `startDate` - Start date (YYYY-MM-DD)
- `endDate` - End date (YYYY-MM-DD)

**Response:**
```json
{
  "success": true,
  "metrics": {
    "action": "APPROVE",
    "dateRange": {
      "start": "2025-11-01",
      "end": "2025-11-11"
    },
    "totalRequests": 150,
    "successfulRequests": 145,
    "failedRequests": 5,
    "successRate": 96.67,
    "averageProcessingTime": 1234.56
  }
}
```

## Testing Recommendations

1. **Signature Validation:**
   - Test with valid signature
   - Test with invalid signature
   - Test with missing signature

2. **User Mapping:**
   - Test with mapped AAD Object ID
   - Test with unmapped AAD Object ID
   - Test with inactive user account

3. **Authorization:**
   - Test each action with correct role
   - Test each action with incorrect role
   - Verify error messages are user-friendly

4. **Action Handlers:**
   - Test APPROVE with valid application
   - Test REJECT with justification
   - Test REQUEST_INFO status change
   - Test CLAIM assignment
   - Test error handling for invalid applications

5. **Metrics and Alerting:**
   - Verify metrics are tracked correctly
   - Test failure threshold alerting
   - Verify alert cooldown works
   - Test metrics retrieval endpoint

6. **Adaptive Card Updates:**
   - Verify cards update after actions
   - Test graceful handling of update failures

## Security Considerations

1. **Signature Validation:** All webhook requests must have valid HMAC-SHA256 signatures
2. **User Mapping:** Only users with linked AAD Object IDs can perform actions
3. **Role-Based Access:** Actions are restricted based on user roles
4. **Audit Trail:** All actions and attempts are logged for compliance
5. **Rate Limiting:** Consider adding rate limiting to webhook endpoint (future enhancement)

## Performance Considerations

1. **Redis Caching:** Metrics stored in Redis for fast access
2. **Async Processing:** All operations are asynchronous
3. **Processing Time Tracking:** Average processing time monitored
4. **Database Indexes:** Unique index on aad_object_id for fast lookups

## Future Enhancements

1. Add rate limiting to webhook endpoint
2. Implement webhook retry mechanism for failed card updates
3. Add more granular metrics (per user, per program type)
4. Create admin dashboard for webhook metrics visualization
5. Add webhook request/response logging for debugging
6. Implement webhook signature rotation
7. Add support for batch actions

## Files Modified/Created

**Created:**
- `src/routes/teams.ts`
- `src/services/webhookService.ts`
- `src/database/migrations/011_add_aad_object_id_to_users.sql`
- `.kiro/specs/loan-ops-dashboard/TASK_3_SUMMARY.md`

**Modified:**
- `src/app.ts` - Added Teams routes
- `src/models/user.ts` - Added aadObjectId field
- `src/repositories/userRepository.ts` - Added findByAadObjectId method
- `src/config/redis.ts` - Added Redis helper methods

## Verification

✅ All sub-tasks completed
✅ Database migration executed successfully
✅ TypeScript compilation successful (no errors in webhook implementation)
✅ All requirements from design document addressed
✅ Comprehensive error handling implemented
✅ Audit logging and metrics tracking in place
✅ Security measures implemented (signature validation, authorization)

## Requirements Addressed

- **Requirement 7.1:** Webhook endpoint receives Teams action callbacks ✅
- **Requirement 7.2:** User authentication using Teams AAD Object ID ✅
- **Requirement 7.2:** User authorization based on role ✅
- **Requirement 7.3:** APPROVE action handler ✅
- **Requirement 7.4:** REJECT action handler ✅
- **Requirement 7.5:** REQUEST_INFO action handler ✅
- **Requirement 7.6:** Adaptive Card updates after actions ✅
- **Requirement 7.7:** Webhook audit logging ✅
- **Requirement 10.1:** Webhook signature validation ✅
- **Requirement 10.2:** Role-based authorization ✅
- **Requirement 10.4:** Comprehensive audit logging ✅

## Conclusion

Task 3 has been successfully completed with all sub-tasks implemented. The webhook handler provides a secure, robust, and well-monitored integration between Microsoft Teams and the application system. All actions are properly authenticated, authorized, audited, and tracked for performance and reliability monitoring.
