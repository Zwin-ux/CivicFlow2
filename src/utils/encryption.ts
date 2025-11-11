/**
 * Encryption Utilities
 * Provides AES-256 encryption/decryption for sensitive data (PII)
 */

import crypto from 'crypto';
import config from '../config';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // For AES, this is always 16
const SALT_LENGTH = 64;
const KEY_LENGTH = 32; // 256 bits

/**
 * Derives a key from the encryption key using PBKDF2
 */
function deriveKey(salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(
    config.security.encryptionKey,
    salt,
    100000, // iterations
    KEY_LENGTH,
    'sha256'
  );
}

/**
 * Encrypts a string using AES-256-GCM
 * Returns base64 encoded string with format: salt:iv:authTag:encryptedData
 */
export function encrypt(text: string): string {
  if (!text) {
    return text;
  }

  // Generate random salt and IV
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  
  // Derive key from master key and salt
  const key = deriveKey(salt);
  
  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  // Encrypt the text
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  // Get auth tag
  const authTag = cipher.getAuthTag();
  
  // Combine salt, iv, authTag, and encrypted data
  const result = `${salt.toString('base64')}:${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
  
  return result;
}

/**
 * Decrypts a string encrypted with encrypt()
 * Expects base64 encoded string with format: salt:iv:authTag:encryptedData
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) {
    return encryptedText;
  }

  try {
    // Split the encrypted text into components
    const parts = encryptedText.split(':');
    if (parts.length !== 4) {
      throw new Error('Invalid encrypted text format');
    }

    const salt = Buffer.from(parts[0], 'base64');
    const iv = Buffer.from(parts[1], 'base64');
    const authTag = Buffer.from(parts[2], 'base64');
    const encrypted = parts[3];

    // Derive key from master key and salt
    const key = deriveKey(salt);

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    // Decrypt the text
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Encrypts an object's specified fields
 * Returns a new object with encrypted fields
 */
export function encryptFields<T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[]
): T {
  const result = { ...obj };
  
  for (const field of fields) {
    if (result[field] && typeof result[field] === 'string') {
      result[field] = encrypt(result[field] as string) as any;
    }
  }
  
  return result;
}

/**
 * Decrypts an object's specified fields
 * Returns a new object with decrypted fields
 */
export function decryptFields<T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[]
): T {
  const result = { ...obj };
  
  for (const field of fields) {
    if (result[field] && typeof result[field] === 'string') {
      result[field] = decrypt(result[field] as string) as any;
    }
  }
  
  return result;
}

/**
 * Hashes a value using SHA-256 (one-way, for comparison purposes)
 * Useful for creating searchable hashes of encrypted data
 */
export function hash(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

/**
 * Validates that the encryption key is properly configured
 */
export function validateEncryptionKey(): void {
  if (!config.security.encryptionKey || config.security.encryptionKey.length < 32) {
    throw new Error(
      'ENCRYPTION_KEY must be set and at least 32 characters long. ' +
      'Generate a secure key using: openssl rand -base64 32'
    );
  }
  
  if (config.security.encryptionKey === 'dev-encryption-key-change-in-production' && config.env === 'production') {
    throw new Error('Default encryption key detected in production environment. Set a secure ENCRYPTION_KEY.');
  }
}
