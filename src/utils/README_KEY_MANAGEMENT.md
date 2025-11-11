# Key Management

This module provides integration with enterprise key management systems for secure encryption key storage and rotation.

## Supported Providers

1. **Local** (Development only) - Uses environment variable
2. **AWS KMS** (Key Management Service) - Production recommended
3. **Azure Key Vault** - Production recommended

## Configuration

### Local Provider (Development)

```bash
# .env
KEY_MANAGEMENT_PROVIDER=local
ENCRYPTION_KEY=your-32-character-key-here
```

### AWS KMS Provider

```bash
# .env
KEY_MANAGEMENT_PROVIDER=aws-kms
KEY_MANAGEMENT_KEY_ID=arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012
AWS_REGION=us-east-1
KEY_ROTATION_DAYS=90
```

**Setup Steps:**

1. Create a KMS key in AWS Console or CLI:
```bash
aws kms create-key --description "Lending CRM Encryption Key"
```

2. Create an alias for easier reference:
```bash
aws kms create-alias --alias-name alias/lending-crm --target-key-id <key-id>
```

3. Grant application IAM role permissions:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "kms:GenerateDataKey",
        "kms:Decrypt",
        "kms:DescribeKey"
      ],
      "Resource": "arn:aws:kms:us-east-1:123456789012:key/*"
    }
  ]
}
```

4. Enable automatic key rotation (recommended):
```bash
aws kms enable-key-rotation --key-id <key-id>
```

### Azure Key Vault Provider

```bash
# .env
KEY_MANAGEMENT_PROVIDER=azure-keyvault
AZURE_KEY_VAULT_URL=https://your-vault.vault.azure.net/
KEY_MANAGEMENT_KEY_ID=encryption-key
KEY_ROTATION_DAYS=90
```

**Setup Steps:**

1. Create a Key Vault:
```bash
az keyvault create --name your-vault --resource-group your-rg --location eastus
```

2. Create a secret for the encryption key:
```bash
# Generate a secure key
openssl rand -base64 32 > encryption-key.txt

# Store in Key Vault
az keyvault secret set --vault-name your-vault --name encryption-key --file encryption-key.txt
```

3. Grant application managed identity access:
```bash
az keyvault set-policy --name your-vault \
  --object-id <app-managed-identity-id> \
  --secret-permissions get list
```

4. Configure application to use managed identity:
```bash
# Set environment variable for Azure authentication
AZURE_CLIENT_ID=<managed-identity-client-id>
```

## Usage

### Get Encryption Key

```typescript
import { getEncryptionKey } from '../utils/keyManagement';

const key = await getEncryptionKey();
// Returns the current encryption key from configured provider
```

### Rotate Key

```typescript
import { rotateEncryptionKey } from '../utils/keyManagement';

await rotateEncryptionKey();
// Rotates the encryption key (AWS KMS and Azure Key Vault only)
```

### Get Key Metadata

```typescript
import { getKeyMetadata } from '../utils/keyManagement';

const metadata = await getKeyMetadata();
console.log(metadata);
// {
//   keyId: 'arn:aws:kms:...',
//   createdAt: Date,
//   lastRotated: Date,
//   nextRotation: Date,
//   version: 2
// }
```

### Check Rotation Status

```typescript
import { isKeyRotationNeeded } from '../utils/keyManagement';

const needsRotation = await isKeyRotationNeeded();
if (needsRotation) {
  console.log('Key rotation is recommended');
}
```

## API Endpoints

### Get Key Metadata

```http
GET /api/v1/key-management/metadata
Authorization: Bearer <admin-token>
```

Response:
```json
{
  "success": true,
  "data": {
    "keyId": "arn:aws:kms:us-east-1:123456789012:key/...",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "lastRotated": "2024-03-01T00:00:00.000Z",
    "version": 2
  }
}
```

### Check Rotation Status

```http
GET /api/v1/key-management/rotation-status
Authorization: Bearer <admin-token>
```

Response:
```json
{
  "success": true,
  "data": {
    "rotationNeeded": false,
    "lastRotated": "2024-03-01T00:00:00.000Z",
    "nextRotation": "2024-06-01T00:00:00.000Z"
  }
}
```

### Rotate Key

```http
POST /api/v1/key-management/rotate
Authorization: Bearer <admin-token>
```

Response:
```json
{
  "success": true,
  "message": "Encryption key rotated successfully",
  "data": {
    "keyId": "arn:aws:kms:us-east-1:123456789012:key/...",
    "version": 3,
    "rotatedAt": "2024-04-01T00:00:00.000Z"
  }
}
```

## Key Rotation Procedures

### Automated Rotation (Recommended)

1. **AWS KMS**: Enable automatic key rotation
```bash
aws kms enable-key-rotation --key-id <key-id>
```

2. **Azure Key Vault**: Set up key rotation policy
```bash
az keyvault secret set-attributes --vault-name your-vault \
  --name encryption-key \
  --expires "2024-12-31T23:59:59Z"
```

### Manual Rotation

1. Call the rotation API endpoint:
```bash
curl -X POST https://api.example.com/api/v1/key-management/rotate \
  -H "Authorization: Bearer <admin-token>"
```

2. Monitor the rotation status:
```bash
curl https://api.example.com/api/v1/key-management/rotation-status \
  -H "Authorization: Bearer <admin-token>"
```

### Re-encryption After Rotation

**Important**: After key rotation, existing encrypted data remains encrypted with the old key. To re-encrypt with the new key:

1. Create a migration script:
```typescript
import applicantRepository from '../repositories/applicantRepository';
import { encrypt, decrypt } from '../utils/encryption';

async function reencryptApplicants() {
  // This would need to be implemented based on your needs
  // Typically involves:
  // 1. Decrypt with old key
  // 2. Encrypt with new key
  // 3. Update database
}
```

2. Run during maintenance window
3. Verify data integrity

## Security Best Practices

### Key Storage

- ✅ **DO**: Use AWS KMS or Azure Key Vault in production
- ✅ **DO**: Enable automatic key rotation
- ✅ **DO**: Use IAM roles/managed identities for authentication
- ❌ **DON'T**: Store keys in environment variables in production
- ❌ **DON'T**: Commit keys to version control
- ❌ **DON'T**: Share keys between environments

### Access Control

- Limit key access to application service accounts only
- Use separate keys for different environments (dev, staging, prod)
- Implement least privilege access policies
- Audit all key access via CloudTrail (AWS) or Monitor (Azure)

### Rotation Schedule

- Rotate keys every 90 days (configurable via `KEY_ROTATION_DAYS`)
- Rotate immediately if:
  - Key compromise suspected
  - Employee with key access leaves
  - Security audit recommendation
  - Compliance requirement

### Monitoring

- Set up alerts for:
  - Failed key access attempts
  - Key rotation failures
  - Unusual key usage patterns
- Monitor key age and rotation status
- Log all key management operations

## Compliance

This key management implementation helps meet:

- **Requirement 6.2**: Store encryption keys separately from encrypted data
- **PCI DSS**: Key management requirements
- **HIPAA**: Encryption key management
- **SOC 2**: Key rotation and access controls
- **GDPR**: Technical measures for data protection

## Troubleshooting

### AWS KMS Issues

**Error**: "AccessDeniedException"
- Check IAM role has required KMS permissions
- Verify key policy allows application access
- Ensure key is in the same region

**Error**: "KeyUnavailableException"
- Check key is enabled
- Verify key hasn't been scheduled for deletion

### Azure Key Vault Issues

**Error**: "Forbidden"
- Check managed identity has access policy
- Verify Key Vault firewall rules
- Ensure correct vault URL

**Error**: "SecretNotFound"
- Verify secret name matches configuration
- Check secret hasn't expired

### Local Provider Issues

**Error**: "Encryption key must be at least 32 characters"
- Generate a secure key: `openssl rand -base64 32`
- Update ENCRYPTION_KEY in .env file

## Testing

```typescript
import KeyManagementFactory, { KeyProvider } from '../utils/keyManagement';

describe('Key Management', () => {
  beforeEach(() => {
    KeyManagementFactory.reset();
  });

  it('should get encryption key from local provider', async () => {
    process.env.KEY_MANAGEMENT_PROVIDER = 'local';
    const key = await getEncryptionKey();
    expect(key).toBeDefined();
    expect(key.length).toBeGreaterThanOrEqual(32);
  });

  it('should check rotation status', async () => {
    const needsRotation = await isKeyRotationNeeded();
    expect(typeof needsRotation).toBe('boolean');
  });
});
```

## Migration Guide

### From Local to AWS KMS

1. Set up AWS KMS key (see setup steps above)
2. Update environment variables:
```bash
KEY_MANAGEMENT_PROVIDER=aws-kms
KEY_MANAGEMENT_KEY_ID=<kms-key-id>
```
3. Restart application
4. Verify key access: `GET /api/v1/key-management/metadata`
5. Plan re-encryption of existing data

### From Local to Azure Key Vault

1. Set up Azure Key Vault (see setup steps above)
2. Update environment variables:
```bash
KEY_MANAGEMENT_PROVIDER=azure-keyvault
AZURE_KEY_VAULT_URL=https://your-vault.vault.azure.net/
```
3. Restart application
4. Verify key access: `GET /api/v1/key-management/metadata`
5. Plan re-encryption of existing data
