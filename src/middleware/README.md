# Middleware Documentation

## Authentication and Authorization

This directory contains middleware for securing API endpoints with authentication and role-based access control (RBAC).

### Authentication Middleware

#### `authenticate`
Requires a valid JWT access token in the Authorization header.

```typescript
import { authenticate } from './middleware/authenticate';

router.get('/protected', authenticate, (req, res) => {
  // req.user contains the authenticated user's payload
  res.json({ user: req.user });
});
```

#### `optionalAuthenticate`
Attempts to authenticate but doesn't fail if no token is provided.

```typescript
import { optionalAuthenticate } from './middleware/authenticate';

router.get('/public', optionalAuthenticate, (req, res) => {
  // req.user will be undefined if not authenticated
  if (req.user) {
    res.json({ message: 'Authenticated', user: req.user });
  } else {
    res.json({ message: 'Anonymous' });
  }
});
```

### Authorization Middleware

#### `authorize`
Restricts access to specific user roles.

```typescript
import { authenticate } from './middleware/authenticate';
import { authorize } from './middleware/authorize';

// Only Administrators can access
router.delete('/users/:id', authenticate, authorize('Administrator'), handler);

// Approvers and Administrators can access
router.post('/applications/:id/approve', 
  authenticate, 
  authorize('Approver', 'Administrator'), 
  handler
);
```

#### `checkPermission`
Uses the permission system to check if a user can perform an action on a resource.

```typescript
import { authenticate } from './middleware/authenticate';
import { checkPermission } from './middleware/checkPermission';
import { Resource, Action } from '../config/permissions';

// Check if user can create applications
router.post('/applications', 
  authenticate, 
  checkPermission(Resource.APPLICATION, Action.CREATE), 
  handler
);

// Check if user can export audit logs
router.get('/audit-logs/export', 
  authenticate, 
  checkPermission(Resource.AUDIT_LOG, Action.EXPORT), 
  handler
);
```

#### `authorizeOwnerOrRole`
Allows access if the user owns the resource OR has an elevated role.

```typescript
import { authenticate } from './middleware/authenticate';
import { authorizeOwnerOrRole } from './middleware/authorize';

// User can access their own application, or Administrators can access any
router.get('/applications/:id', 
  authenticate, 
  authorizeOwnerOrRole(
    (req) => getApplicationOwnerId(req.params.id),
    ['Administrator', 'Reviewer', 'Approver']
  ), 
  handler
);
```

### User Roles

The system supports five user roles with different permission levels:

1. **Applicant** - Can create and manage their own applications
2. **Reviewer** - Can review applications and request additional information
3. **Approver** - Can make final funding decisions
4. **Administrator** - Full system access
5. **Auditor** - Read-only access to audit logs and compliance data

### Permission System

The permission system is defined in `src/config/permissions.ts` and provides fine-grained control over resources and actions.

#### Resources
- `APPLICATION` - Grant/loan applications
- `DOCUMENT` - Uploaded documents
- `USER` - User accounts
- `AUDIT_LOG` - System audit logs
- `REPORT` - Compliance reports
- `PROGRAM_RULE` - Eligibility rules

#### Actions
- `CREATE` - Create new resources
- `READ` - View resources
- `UPDATE` - Modify resources
- `DELETE` - Remove resources
- `APPROVE` - Approve applications
- `REVIEW` - Review applications
- `EXPORT` - Export data

#### Helper Functions

```typescript
import { hasPermission, getRolePermissions } from '../config/permissions';

// Check if a role has permission
if (hasPermission('Reviewer', Resource.APPLICATION, Action.READ)) {
  // Allow access
}

// Get all permissions for a role
const permissions = getRolePermissions('Auditor');
```

### Request Object Extension

The authentication middleware extends the Express Request object with a `user` property:

```typescript
interface Request {
  user?: {
    userId: string;
    email: string;
    role: UserRole;
    iat?: number;  // Issued at
    exp?: number;  // Expires at
  };
}
```

### Error Responses

Authentication and authorization failures return standardized error responses:

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired authentication token",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to access this resource",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

### Best Practices

1. **Always use `authenticate` before `authorize` or `checkPermission`**
   ```typescript
   router.post('/resource', authenticate, authorize('Admin'), handler);
   ```

2. **Use `checkPermission` for fine-grained control**
   ```typescript
   // Prefer this
   router.post('/applications', authenticate, checkPermission(Resource.APPLICATION, Action.CREATE), handler);
   
   // Over this
   router.post('/applications', authenticate, authorize('Applicant', 'Reviewer', 'Approver', 'Administrator'), handler);
   ```

3. **Apply middleware at the router level for common protection**
   ```typescript
   const router = Router();
   
   // Protect all routes in this router
   router.use(authenticate);
   router.use(checkPermission(Resource.AUDIT_LOG, Action.READ));
   
   router.get('/', handler);
   router.get('/:id', handler);
   ```

4. **Log authorization failures for security monitoring**
   - All authorization failures are automatically logged with user context
   - Review logs regularly for suspicious access patterns

### Testing Authentication

Use the `/api/v1/auth/login` endpoint to obtain tokens:

```bash
# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "Password123!"
  }'

# Response
{
  "data": {
    "user": { ... },
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}

# Use token in requests
curl http://localhost:3000/api/v1/protected \
  -H "Authorization: Bearer eyJhbGc..."
```

### Token Management

- **Access tokens** expire after 15 minutes
- **Refresh tokens** expire after 7 days
- Use `/api/v1/auth/refresh` to get new tokens
- Logout invalidates the refresh token
