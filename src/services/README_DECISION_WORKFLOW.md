# Human-in-the-Loop Decision Workflow

This document describes the implementation of the human-in-the-loop decision workflow for the Government Lending CRM Platform.

## Overview

The decision workflow ensures that all final funding decisions require explicit staff approval, preventing automatic fund disbursement and maintaining accountability for taxpayer funds.

## Components

### 1. Staff Review Queue API

**Endpoint:** `GET /api/applications/queue/review`

**Authorization:** Reviewer, Approver, Administrator

**Features:**
- Retrieve applications assigned to staff members
- Filter by status, program type, and assigned staff member
- Sort by submission date or eligibility score (ascending/descending)
- Pagination support with configurable page size
- Returns applications with applicant details for quick review

**Query Parameters:**
- `staffMemberId` (optional): Filter by assigned staff member
- `status` (optional): Comma-separated list of statuses (defaults to review-eligible statuses)
- `programType` (optional): Filter by program type
- `sortBy` (optional): 'submittedAt' or 'eligibilityScore'
- `sortOrder` (optional): 'ASC' or 'DESC'
- `page` (optional): Page number (default: 1)
- `pageSize` (optional): Items per page (default: 50)

**Response:**
```json
{
  "applications": [
    {
      "id": "uuid",
      "applicantId": "uuid",
      "programType": "Small Business Grant",
      "requestedAmount": 50000,
      "status": "UNDER_REVIEW",
      "eligibilityScore": 85.5,
      "missingDocuments": [],
      "fraudFlags": [],
      "assignedTo": "staff-uuid",
      "submittedAt": "2025-01-15T10:30:00Z",
      "applicant": {
        "businessName": "ABC Corp",
        "ein": "12-3456789",
        "email": "contact@abc.com",
        "phone": "+1-555-0100"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 50,
    "total": 150,
    "totalPages": 3
  }
}
```

### 2. Decision Submission Endpoint

**Endpoint:** `POST /api/applications/:id/decision`

**Authorization:** Approver, Administrator (enforced at both middleware and service level)

**Features:**
- Submit APPROVED, REJECTED, or DEFERRED decisions
- Require justification text for all decisions (minimum 10 characters)
- Support override of automated eligibility scores with documented reason
- Validate approved amounts don't exceed requested amounts
- Log all decisions with staff member ID and timestamp

**Request Body:**
```json
{
  "decision": "APPROVED",
  "amount": 45000,
  "justification": "Business demonstrates strong financial need and meets all program criteria. Revenue projections are realistic.",
  "overrideReason": "Approved despite lower eligibility score due to exceptional community impact potential"
}
```

**Validation Rules:**
- `decision`: Required, must be 'APPROVED', 'REJECTED', or 'DEFERRED'
- `justification`: Required, minimum 10 characters
- `amount`: Required for APPROVED decisions, must be > 0 and <= requestedAmount
- `overrideReason`: Required when decision differs from automated eligibility recommendation

### 3. Decision Authorization Checks

**Implementation Details:**

1. **Role-Based Access Control:**
   - Only Approver and Administrator roles can submit final decisions
   - Middleware-level authorization check
   - Service-level authorization check (defense in depth)
   - Unauthorized attempts are logged to audit trail

2. **Prevent Automatic Fund Disbursement:**
   - All approved decisions create a `FUND_DISBURSEMENT_AUTHORIZED` audit log entry
   - Audit log includes `requiresManualDisbursement: true` flag
   - Manual processing required for actual fund transfer
   - No automatic disbursement logic exists in the system

3. **Comprehensive Audit Logging:**
   - Every decision logged with:
     - Staff member ID (decidedBy)
     - User role
     - Timestamp (ISO 8601 format)
     - Decision details (decision, amount, justification, override reason)
     - Previous and new application status
     - Eligibility score at time of decision
     - Confidence score for the decision
   - Unauthorized decision attempts logged separately
   - Fund disbursement authorizations logged separately

4. **Decision Confidence Scoring:**
   - Base confidence: 100
   - Reduced by 20 if decision overrides automated score
   - Reduced by 15 per high-severity fraud flag
   - Reduced by 5 per low/medium-severity fraud flag
   - Reduced by 10 per missing document
   - Final score clamped to 0-100 range

## Requirements Satisfied

- **Requirement 7.1:** Applications routed to staff member review before final funding approval
- **Requirement 7.2:** Eligibility recommendations presented with supporting evidence
- **Requirement 7.3:** Staff members can override automated scores with documented justification
- **Requirement 7.4:** Automatic fund disbursement prevented without explicit staff authorization
- **Requirement 7.5:** All decisions recorded with timestamp and staff member identifier
- **Requirement 6.1:** Complete audit trail of all automated and manual actions

## Security Considerations

1. **Defense in Depth:** Authorization checked at both middleware and service layers
2. **Audit Trail:** All actions logged, including unauthorized attempts
3. **No Automatic Disbursement:** Manual processing required for fund transfers
4. **Role Separation:** Clear distinction between Reviewer (can view) and Approver (can decide)
5. **Justification Required:** All decisions must include human reasoning

## Usage Example

```typescript
// Get review queue for a specific staff member
const response = await fetch('/api/applications/queue/review?staffMemberId=staff-123&sortBy=eligibilityScore&sortOrder=DESC', {
  headers: {
    'Authorization': 'Bearer <token>'
  }
});

// Submit an approval decision
const decision = await fetch('/api/applications/abc-123/decision', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <token>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    decision: 'APPROVED',
    amount: 45000,
    justification: 'Business meets all criteria and demonstrates strong potential for success.',
    overrideReason: 'Approved despite lower score due to exceptional community impact'
  })
});
```

## Database Schema Impact

No schema changes required. Uses existing `applications` table fields:
- `status`: Updated to APPROVED/REJECTED/DEFERRED
- `decision`: JSONB field storing decision details
- `decided_at`: Timestamp of decision
- `assigned_to`: Staff member assigned to review

## Event Emissions

The service emits the following events:
- `decisionMade`: Triggered when a decision is submitted (used by communication service)

## Error Handling

- `401 Unauthorized`: Missing or invalid authentication token
- `403 Forbidden`: User lacks Approver/Administrator role
- `404 Not Found`: Application does not exist
- `400 Validation Error`: Invalid input (missing fields, invalid amounts, etc.)
- `500 Internal Error`: Unexpected server error

All errors are logged to the audit trail and application logs.
