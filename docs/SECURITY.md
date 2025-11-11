# Security Documentation

This document describes the security measures implemented in the Government Lending CRM Platform.

## Overview

The platform implements comprehensive security controls to protect sensitive applicant data (PII) and ensure compliance with regulatory requirements.

## Data Encryption

### Encryption at Rest

**Implementation**: AES-256-GCM encryption for all PII fields

**Encrypted Fields**:
- `applicants.owner_ssn` - Social Security Numbers
- `documents.storage_url` - Cloud storage URLs

**Key Features**:
- AES-256-GCM authenticated encryption
- Unique salt and IV for each encryption operation
- PBKDF2 key derivation with 100,000 iterations
- Authentication tags to detect tampering

**Usage**:
```typescript
import { encrypt, decrypt } from './utils/encryption';

// Automatic encryption in repositories
const applicant = await applicantRepository.create({
  ownerSsn: '123-45-6789', // Automatically encrypted
  // ... other fields
});

// Automatic decryption on retrieval
const retrieved = await applicantRepository.findById(id);
console.log(retrieved.ownerSsn); // Automatically decrypted
```

**Documentation**: See [src/utils/README_ENCRYPTION.md](../src/utils/README_ENCRYPTION.md)

### Encryption in Transit

**Implementation**: TLS 1.3 for all API communications

**Configuration**:
```bash
# .env
TLS_ENABLED=true
TLS_CERT_PATH=./certs/server.crt
TLS_KEY_PATH=./certs/server.key
TLS_CA_PATH=./certs/ca.crt
```

**Supported Protocols**:
- TLS 1.3 only (TLS 1.0, 1.1, 1.2 disabled)

**Cipher Suites**:
- TLS_AES_256_GCM_SHA384
- TLS_CHACHA20_POLY1305_SHA256
- TLS_AES_128_GCM_SHA256

**Certificate Generation** (for development):
```bash
# Generate self-signed certificate
openssl req -x509 -newkey rsa:4096 -keyout server.key -out server.crt -days 365 -nodes

# For production, use certificates from a trusted CA
```

## Key Management

### Supported Providers

1. **Local** (Development only)
   - Keys stored in environment variables
   - Not recommended for production

2. **AWS KMS** (Production recommended)
   - Centralized key management
   - Automatic key rotation
   - Audit logging via CloudTrail
   - Hardware security modules (HSMs)

3. **Azure Key Vault** (Production recommended)
   - Centralized key management
   - Key versioning
   - Access policies and RBAC
   - Audit logging via Azure Monitor

### Key Rotation

**Automatic Rotation**:
- Configured via `KEY_ROTATION_DAYS` (default: 90 days)
- AWS KMS: Enable automatic rotation on the key
- Azure Key Vault: Set expiration policies

**Manual Rotation**:
```bash
# Via API
curl -X POST https://api.example.com/api/v1/key-management/rotate \
  -H "Authorization: Bearer <admin-token>"

# Check rotation status
curl https://api.example.com/api/v1/key-management/rotation-status \
  -H "Authorization: Bearer <admin-token>"
```

**Documentation**: See [src/utils/README_KEY_MANAGEMENT.md](../src/utils/README_KEY_MANAGEMENT.md)

## Authentication & Authorization

### Authentication

**Method**: OAuth 2.0 with JWT tokens

**Token Types**:
- Access Token: Short-lived (1 hour), used for API requests
- Refresh Token: Long-lived (7 days), used to obtain new access tokens

**Implementation**:
```typescript
// Login
POST /api/v1/auth/login
{
  "email": "user@example.com",
  "password": "password"
}

// Response
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "expiresIn": 3600
}
```

**Documentation**: See [docs/AUTHENTICATION.md](./AUTHENTICATION.md)

### Authorization

**Method**: Role-Based Access Control (RBAC)

**Roles**:
- **Applicant**: Submit applications, view own data
- **Reviewer**: Review applications, request additional info
- **Approver**: Make final funding decisions
- **Administrator**: System configuration, user management
- **Auditor**: Read-only access to all data and logs

**Permissions**:
```typescript
// Example: Restrict endpoint to Administrators only
router.post('/rotate',
  authenticate,
  authorize([Permission.MANAGE_SYSTEM]),
  async (req, res) => { ... }
);
```

## Audit Logging

### What is Logged

All security-relevant events are logged to the audit log system:

- Authentication attempts (success/failure)
- Authorization failures
- Data access (read/write/delete)
- Encryption key operations
- Configuration changes
- Privacy breach detection

### Audit Log Format

```typescript
{
  "id": "uuid",
  "actionType": "USER_LOGIN",
  "entityType": "USER",
  "entityId": "user-id",
  "performedBy": "user-id",
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "details": { ... }
}
```

### Retention

- Audit logs retained for 7 years (regulatory requirement)
- Logs archived to cold storage after 90 days
- Immutable append-only storage

## Security Headers

The platform uses Helmet.js to set security headers:

```typescript
app.use(helmet());
```

**Headers Set**:
- `Strict-Transport-Security`: Force HTTPS
- `X-Content-Type-Options`: Prevent MIME sniffing
- `X-Frame-Options`: Prevent clickjacking
- `X-XSS-Protection`: Enable XSS filter
- `Content-Security-Policy`: Restrict resource loading

## Input Validation

### Request Validation

All API inputs are validated using middleware:

```typescript
// Example: Validate application creation
router.post('/applications',
  authenticate,
  validateRequest({
    body: {
      programType: { type: 'string', required: true },
      requestedAmount: { type: 'number', min: 0, required: true },
      // ...
    }
  }),
  async (req, res) => { ... }
);
```

### SQL Injection Prevention

- All database queries use parameterized queries
- No string concatenation for SQL queries
- Input sanitization for user-provided data

```typescript
// Safe query with parameters
const query = 'SELECT * FROM applicants WHERE id = $1';
const result = await database.query(query, [id]);
```

### XSS Prevention

- Output encoding for all user-generated content
- Content Security Policy headers
- Sanitization of HTML inputs

## Rate Limiting

**Implementation**: Redis-based rate limiting

**Limits**:
- Authentication endpoints: 5 requests per minute per IP
- API endpoints: 100 requests per minute per user
- Document uploads: 10 uploads per hour per user

```typescript
// Example rate limit configuration
const rateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', rateLimiter);
```

## CORS Configuration

**Development**:
```typescript
cors({
  origin: '*',
  credentials: true,
})
```

**Production**:
```typescript
cors({
  origin: process.env.ALLOWED_ORIGINS.split(','),
  credentials: true,
})
```

## Secrets Management

### Environment Variables

**Required Secrets**:
- `JWT_SECRET`: JWT token signing key
- `ENCRYPTION_KEY`: Data encryption key
- `DB_PASSWORD`: Database password
- `REDIS_PASSWORD`: Redis password
- `EMAIL_API_KEY`: Email service API key

**Best Practices**:
- Never commit secrets to version control
- Use different secrets for each environment
- Rotate secrets regularly
- Use secret management services (AWS Secrets Manager, Azure Key Vault)

### Secret Rotation

1. Generate new secret
2. Update in key management system
3. Deploy new configuration
4. Verify application functionality
5. Revoke old secret

## Compliance

### Requirements Met

- **Requirement 6.2**: Encrypt all applicant PII at rest and in transit ✅
- **Requirement 6.3**: Role-based access control ✅
- **Requirement 6.4**: 7-year audit log retention ✅
- **Requirement 6.5**: Privacy breach detection ✅

### Standards

- **PCI DSS**: Payment card data protection (if applicable)
- **HIPAA**: Protected health information (if applicable)
- **GDPR**: Personal data protection
- **SOC 2**: Security controls and audit trails

## Security Testing

### Automated Testing

```bash
# Run security tests
npm run test:security

# Check for vulnerabilities
npm audit

# Update dependencies
npm audit fix
```

### Manual Testing

- Penetration testing (annual)
- Security code review
- Vulnerability scanning
- Access control testing

## Incident Response

### Privacy Breach Detection

The system automatically detects potential privacy breaches:

```typescript
// Unusual access patterns
// Unauthorized data access attempts
// Multiple failed authentication attempts
// Suspicious data export activities
```

### Alert Notifications

Administrators are immediately alerted on:
- Privacy breach detection
- Failed encryption/decryption
- Key management errors
- Authentication anomalies

### Response Procedures

1. **Detect**: Automated monitoring and alerts
2. **Contain**: Disable affected accounts/keys
3. **Investigate**: Review audit logs
4. **Remediate**: Fix vulnerabilities
5. **Report**: Notify affected parties (if required)

## Security Checklist

### Development

- [ ] Use parameterized queries
- [ ] Validate all inputs
- [ ] Encrypt sensitive data
- [ ] Use HTTPS in development
- [ ] Never commit secrets
- [ ] Review code for security issues

### Deployment

- [ ] Enable TLS 1.3
- [ ] Configure AWS KMS or Azure Key Vault
- [ ] Set strong JWT secret
- [ ] Configure CORS properly
- [ ] Enable rate limiting
- [ ] Set up monitoring and alerts
- [ ] Review security headers
- [ ] Test authentication/authorization
- [ ] Verify encryption is working
- [ ] Check audit logging

### Operations

- [ ] Rotate keys every 90 days
- [ ] Review audit logs regularly
- [ ] Monitor for security alerts
- [ ] Update dependencies
- [ ] Conduct security audits
- [ ] Test incident response procedures
- [ ] Review access controls
- [ ] Backup encryption keys

## Additional Resources

- [Encryption Documentation](../src/utils/README_ENCRYPTION.md)
- [Key Management Documentation](../src/utils/README_KEY_MANAGEMENT.md)
- [Authentication Documentation](./AUTHENTICATION.md)
- [Error Handling Documentation](./ERROR_HANDLING.md)

## Contact

For security concerns or to report vulnerabilities:
- Email: security@example.com
- Create a private security advisory on GitHub
