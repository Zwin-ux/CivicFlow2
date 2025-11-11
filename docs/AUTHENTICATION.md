# Authentication and Authorization Implementation

## Overview

This document describes the authentication and authorization system implemented for the Government Lending CRM Platform.

## Components Implemented

### 1. Database Schema

**Migration**: `src/database/migrations/006_create_users_table.sql`

Created two tables:
- `users` - Stores user accounts with email, password hash, role, and profile information
- `refresh_tokens` - Stores JWT refresh tokens for token rotation

### 2. User Model

**File**: `src/models/user.ts`

Defines TypeScript interfaces for:
- User entity with all fields
- User roles (Applicant, Reviewer, Approver, Administrator, Auditor)
- Authentication tokens and payloads
- Request/response DTOs

### 3. User Repository

**File**: `src/repositories/userRepository.ts`

Provides data access methods:
- `findByEmail()` - Find user by email
- `findById()` - Find user by ID
- `create()` - Create new user
- `updateLastLogin()` - Update last login timestamp
- `updatePassword()` - Change user password
- `saveRefreshToken()` - Store refresh token
- `findRefreshToken()` - Validate refresh token
- `deleteRefreshToken()` - Invalidate single token
- `deleteUserRefreshTokens()` - Invalidate all user tokens
- `deleteExpiredRefreshTokens()` - Cleanup expired tokens

### 4. Authentication Service

**File**: `src/services/authService.ts`

Implements core authentication logic:
- `register()` - Register new users with password hashing
- `login()` - Authenticate users and generate JWT tokens
- `logout()` - Invalidate refresh tokens
- `refreshAccessToken()` - Generate new access token from refresh token
- `verifyAccessToken()` - Validate and decode JWT tokens
- `changePassword()` - Update user password with validation
- `cleanupExpiredTokens()` - Periodic cleanup of expired tokens

**Token Configuration**:
- Access tokens: 15 minutes expiry
- Refresh tokens: 7 days expiry
- Password hashing: bcrypt with 10 salt rounds

### 5. Authentication Middleware

**File**: `src/middleware/authenticate.ts`

Provides middleware functions:
- `authenticate` - Requires valid JWT token, attaches user to request
- `optionalAuthenticate` - Attempts authentication without failing

### 6. Authorization Middleware

**File**: `src/middleware/authorize.ts`

Provides role-based authorization:
- `authorize(...roles)` - Restrict access to specific roles
- `authorizeOwnerOrRole()` - Allow resource owners or elevated roles
- Helper functions: `hasRole()`, `isAdministrator()`, `canApprove()`, `canReview()`, `canAccessAuditLogs()`

### 7. Permission System

**File**: `src/config/permissions.ts`

Defines fine-grained permissions:
- Resources: APPLICATION, DOCUMENT, USER, AUDIT_LOG, REPORT, PROGRAM_RULE
- Actions: CREATE, READ, UPDATE, DELETE, APPROVE, REVIEW, EXPORT
- Permission matrix mapping roles to allowed actions on resources
- Helper functions: `hasPermission()`, `getRolePermissions()`, `isRoleHigherOrEqual()`

**File**: `src/middleware/checkPermission.ts`

Middleware to enforce permission checks based on the permission system.

### 8. Authentication Routes

**File**: `src/routes/auth.ts`

REST API endpoints:
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login and get tokens
- `POST /api/v1/auth/logout` - Logout and invalidate refresh token
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/change-password` - Change password (authenticated)
- `GET /api/v1/auth/me` - Get current user info (authenticated)

### 9. Test Data

**File**: `src/database/seeds/003_test_users.ts`

Seeds test users for each role:
- admin@example.com (Administrator)
- reviewer@example.com (Reviewer)
- approver@example.com (Approver)
- auditor@example.com (Auditor)
- applicant@example.com (Applicant)

Default password: `Password123!`

### 10. Protected Routes

Updated `src/routes/auditLogs.ts` to require:
- Authentication on all routes
- Auditor or Administrator role for read access
- Auditor or Administrator role for export operations

## User Roles and Permissions

### Applicant
- Create and manage own applications
- Upload documents for own applications
- View own application status

### Reviewer
- View all applications
- Review applications and request information
- Access reports
- Cannot make final approval decisions

### Approver
- All Reviewer permissions
- Make final funding decisions
- Approve or reject applications

### Administrator
- Full system access
- Manage users
- Configure program rules
- Access all resources

### Auditor
- Read-only access to audit logs
- Access compliance reports
- View all applications (read-only)
- Cannot modify any data

## Security Features

1. **Password Security**
   - Minimum 8 characters required
   - Bcrypt hashing with 10 salt rounds
   - Password change requires current password verification

2. **Token Security**
   - JWT tokens with configurable expiry
   - Refresh token rotation on use
   - Token invalidation on logout
   - Automatic cleanup of expired tokens

3. **Access Control**
   - Role-based access control (RBAC)
   - Fine-grained permission system
   - Resource ownership validation
   - Audit logging of authorization failures

4. **API Security**
   - Bearer token authentication
   - Standardized error responses
   - No sensitive data in error messages
   - Request validation and sanitization

## Usage Examples

### Protecting Routes

```typescript
import { authenticate } from './middleware/authenticate';
import { authorize } from './middleware/authorize';
import { checkPermission } from './middleware/checkPermission';
import { Resource, Action } from './config/permissions';

// Require authentication only
router.get('/profile', authenticate, handler);

// Require specific role
router.delete('/users/:id', authenticate, authorize('Administrator'), handler);

// Require permission
router.post('/applications', 
  authenticate, 
  checkPermission(Resource.APPLICATION, Action.CREATE), 
  handler
);

// Protect entire router
router.use(authenticate);
router.use(checkPermission(Resource.AUDIT_LOG, Action.READ));
```

### Client Authentication Flow

```typescript
// 1. Login
const loginResponse = await fetch('/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
});

const { accessToken, refreshToken } = await loginResponse.json();

// 2. Make authenticated requests
const response = await fetch('/api/v1/protected', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

// 3. Refresh token when access token expires
const refreshResponse = await fetch('/api/v1/auth/refresh', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ refreshToken })
});

const { accessToken: newAccessToken } = await refreshResponse.json();

// 4. Logout
await fetch('/api/v1/auth/logout', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ refreshToken })
});
```

## Testing

### Test Users

After running migrations and seeds, use these credentials:

| Email | Password | Role |
|-------|----------|------|
| admin@example.com | Password123! | Administrator |
| reviewer@example.com | Password123! | Reviewer |
| approver@example.com | Password123! | Approver |
| auditor@example.com | Password123! | Auditor |
| applicant@example.com | Password123! | Applicant |

### Manual Testing

```bash
# Login as administrator
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Password123!"}'

# Access protected route
curl http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Try to access audit logs as applicant (should fail)
curl http://localhost:3000/api/v1/audit-logs \
  -H "Authorization: Bearer APPLICANT_TOKEN"
```

## Requirements Satisfied

This implementation satisfies the following requirements from the specification:

- **Requirement 6.2**: Encrypt all PII at rest and in transit (passwords hashed with bcrypt)
- **Requirement 6.3**: Restrict access based on staff member role permissions (RBAC system)
- **Requirement 7.1**: Route applications to staff member review (role-based access)
- **Requirement 7.2**: Present supporting evidence to staff member (authenticated API access)
- **Requirement 7.3**: Allow staff to override with documented justification (role-based permissions)

## Next Steps

To use this authentication system in other parts of the application:

1. Add authentication middleware to new routes
2. Use `checkPermission` for fine-grained access control
3. Check `req.user` to get authenticated user information
4. Add new permissions to `src/config/permissions.ts` as needed
5. Create additional role-specific endpoints as required

## Maintenance

### Periodic Tasks

1. **Token Cleanup**: Run `authService.cleanupExpiredTokens()` periodically (e.g., daily cron job)
2. **Security Audits**: Review authorization logs for suspicious patterns
3. **Password Policy**: Consider implementing password expiry and complexity rules
4. **Token Rotation**: Consider shorter token expiry times for production

### Configuration

Update these environment variables in production:

```env
JWT_SECRET=<strong-random-secret>
ENCRYPTION_KEY=<strong-random-key>
```

Never use the default development secrets in production!
