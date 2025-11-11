# Encryption Utilities

This module provides AES-256-GCM encryption for protecting sensitive PII (Personally Identifiable Information) data.

## Features

- **AES-256-GCM Encryption**: Industry-standard encryption with authenticated encryption
- **Key Derivation**: Uses PBKDF2 with 100,000 iterations for key derivation from master key
- **Random Salt & IV**: Each encryption uses unique salt and initialization vector
- **Authentication Tags**: GCM mode provides authentication to detect tampering
- **Field-Level Encryption**: Encrypt specific fields in objects

## Configuration

Set the encryption key in your environment variables:

```bash
# Generate a secure key (32+ characters recommended)
openssl rand -base64 32

# Set in .env file
ENCRYPTION_KEY=your-generated-key-here
```

**Important**: Never use the default encryption key in production!

## Usage

### Basic Encryption/Decryption

```typescript
import { encrypt, decrypt } from '../utils/encryption';

// Encrypt sensitive data
const ssn = '123-45-6789';
const encryptedSsn = encrypt(ssn);
// Returns: "base64-salt:base64-iv:base64-authTag:base64-encrypted"

// Decrypt data
const decryptedSsn = decrypt(encryptedSsn);
// Returns: "123-45-6789"
```

### Field-Level Encryption

```typescript
import { encryptFields, decryptFields } from '../utils/encryption';

// Encrypt specific fields in an object
const applicant = {
  name: 'John Doe',
  ssn: '123-45-6789',
  email: 'john@example.com',
};

const encrypted = encryptFields(applicant, ['ssn']);
// { name: 'John Doe', ssn: 'encrypted...', email: 'john@example.com' }

const decrypted = decryptFields(encrypted, ['ssn']);
// { name: 'John Doe', ssn: '123-45-6789', email: 'john@example.com' }
```

### Hashing (One-Way)

```typescript
import { hash } from '../utils/encryption';

// Create searchable hash of encrypted data
const ssnHash = hash('123-45-6789');
// Returns: SHA-256 hex digest
```

### Validation

```typescript
import { validateEncryptionKey } from '../utils/encryption';

// Validate encryption key on startup
try {
  validateEncryptionKey();
  console.log('Encryption key is valid');
} catch (error) {
  console.error('Invalid encryption key:', error.message);
}
```

## Repository Integration

The `ApplicantRepository` automatically encrypts/decrypts PII fields:

```typescript
import applicantRepository from '../repositories/applicantRepository';

// Create applicant - SSN is automatically encrypted
const applicant = await applicantRepository.create({
  businessName: 'Acme Corp',
  ein: '12-3456789',
  ownerSsn: '123-45-6789', // Will be encrypted in database
  // ... other fields
});

// Retrieve applicant - SSN is automatically decrypted
const retrieved = await applicantRepository.findById(applicant.id);
console.log(retrieved.ownerSsn); // "123-45-6789" (decrypted)
```

## Encrypted Fields

The following PII fields are encrypted at rest:

- **Applicants Table**:
  - `owner_ssn`: Social Security Number

- **Documents Table**:
  - `storage_url`: Cloud storage URLs (encrypted by storage utility)

## Security Best Practices

1. **Key Management**: Store encryption keys in secure key management systems (AWS KMS, Azure Key Vault)
2. **Key Rotation**: Implement regular key rotation procedures
3. **Access Control**: Limit access to encryption keys and encrypted data
4. **Audit Logging**: All access to encrypted data is logged via audit log system
5. **TLS in Transit**: Use TLS 1.3 for all API communications (see TLS configuration)

## Encryption Format

Encrypted strings use the following format:

```
salt:iv:authTag:encryptedData
```

All components are base64-encoded:
- **salt**: 64-byte random salt for key derivation
- **iv**: 16-byte initialization vector
- **authTag**: 16-byte authentication tag (GCM mode)
- **encryptedData**: The encrypted content

## Performance Considerations

- **Key Derivation**: PBKDF2 with 100,000 iterations adds ~50ms per encryption/decryption
- **Caching**: Consider caching decrypted data in memory for frequently accessed records
- **Batch Operations**: Encrypt/decrypt in batches when processing multiple records

## Error Handling

```typescript
try {
  const decrypted = decrypt(encryptedData);
} catch (error) {
  // Handle decryption errors
  // - Invalid format
  // - Wrong encryption key
  // - Corrupted data
  // - Authentication failure
}
```

## Testing

```typescript
import { encrypt, decrypt } from '../utils/encryption';

describe('Encryption', () => {
  it('should encrypt and decrypt data', () => {
    const original = 'sensitive-data';
    const encrypted = encrypt(original);
    const decrypted = decrypt(encrypted);
    
    expect(encrypted).not.toBe(original);
    expect(decrypted).toBe(original);
  });
});
```

## Compliance

This encryption implementation helps meet the following compliance requirements:

- **Requirement 6.2**: Encrypt all applicant PII at rest and in transit
- **GDPR**: Protect personal data with appropriate technical measures
- **HIPAA**: Encrypt electronic protected health information (if applicable)
- **PCI DSS**: Protect cardholder data (if applicable)
