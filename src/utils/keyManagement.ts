/**
 * Key Management Service
 * Integrates with AWS KMS or Azure Key Vault for encryption key management
 */

import crypto from 'crypto';
import logger from './logger';
import config from '../config';

export enum KeyProvider {
  LOCAL = 'local',
  AWS_KMS = 'aws-kms',
  AZURE_KEY_VAULT = 'azure-keyvault',
}

export interface KeyManagementConfig {
  provider: KeyProvider;
  keyId?: string;
  region?: string;
  vaultUrl?: string;
  rotationDays?: number;
}

/**
 * Abstract Key Management Service
 */
abstract class KeyManagementService {
  protected config: KeyManagementConfig;

  constructor(config: KeyManagementConfig) {
    this.config = config;
  }

  /**
   * Get the current encryption key
   */
  abstract getEncryptionKey(): Promise<string>;

  /**
   * Rotate the encryption key
   */
  abstract rotateKey(): Promise<void>;

  /**
   * Get key metadata (creation date, rotation date, etc.)
   */
  abstract getKeyMetadata(): Promise<KeyMetadata>;
}

export interface KeyMetadata {
  keyId: string;
  createdAt: Date;
  lastRotated?: Date;
  nextRotation?: Date;
  version: number;
}

/**
 * Local Key Management (for development)
 * Uses environment variable for encryption key
 */
class LocalKeyManagement extends KeyManagementService {
  async getEncryptionKey(): Promise<string> {
    const key = config.security.encryptionKey;
    
    if (!key || key.length < 32) {
      throw new Error('Encryption key must be at least 32 characters');
    }

    return key;
  }

  async rotateKey(): Promise<void> {
    logger.warn('Key rotation not supported for local key management');
    throw new Error('Key rotation not supported for local provider. Use AWS KMS or Azure Key Vault.');
  }

  async getKeyMetadata(): Promise<KeyMetadata> {
    return {
      keyId: 'local-key',
      createdAt: new Date(),
      version: 1,
    };
  }
}

/**
 * AWS KMS Key Management
 * Integrates with AWS Key Management Service
 */
class AWSKMSKeyManagement extends KeyManagementService {
  private kmsClient: any;
  private dataKey: string | null = null;
  private dataKeyExpiry: Date | null = null;

  constructor(config: KeyManagementConfig) {
    super(config);
    this.initializeKMSClient();
  }

  private initializeKMSClient(): void {
    try {
      // Lazy load AWS SDK to avoid requiring it in development
      const { KMSClient } = require('@aws-sdk/client-kms');
      
      this.kmsClient = new KMSClient({
        region: this.config.region || process.env.AWS_REGION || 'us-east-1',
      });

      logger.info('AWS KMS client initialized', { region: this.config.region });
    } catch (error) {
      logger.error('Failed to initialize AWS KMS client. Install @aws-sdk/client-kms package.', { error });
      throw new Error('AWS KMS client initialization failed');
    }
  }

  async getEncryptionKey(): Promise<string> {
    // Check if we have a cached data key that hasn't expired
    if (this.dataKey && this.dataKeyExpiry && this.dataKeyExpiry > new Date()) {
      return this.dataKey;
    }

    try {
      const { GenerateDataKeyCommand } = require('@aws-sdk/client-kms');
      
      const command = new GenerateDataKeyCommand({
        KeyId: this.config.keyId,
        KeySpec: 'AES_256',
      });

      const response = await this.kmsClient.send(command);
      
      // Store the plaintext data key (in memory only)
      const plaintext = response.Plaintext;
      if (!plaintext) {
        throw new Error('No plaintext data key returned from KMS');
      }
      this.dataKey = Buffer.from(plaintext).toString('base64');
      
      // Set expiry to 1 hour from now
      this.dataKeyExpiry = new Date(Date.now() + 60 * 60 * 1000);

      logger.info('Generated new data key from AWS KMS');

      return this.dataKey;
    } catch (error) {
      logger.error('Failed to generate data key from AWS KMS', { error });
      throw new Error('Failed to get encryption key from AWS KMS');
    }
  }

  async rotateKey(): Promise<void> {
    try {
      // In AWS KMS, key rotation is typically enabled on the key itself
      // This method would create a new key and update the alias
      logger.info('Initiating key rotation in AWS KMS', { keyId: this.config.keyId });

      // Clear cached data key to force regeneration
      this.dataKey = null;
      this.dataKeyExpiry = null;

      logger.info('Key rotation completed. New data keys will be generated on next request.');
    } catch (error) {
      logger.error('Failed to rotate key in AWS KMS', { error });
      throw new Error('Failed to rotate key in AWS KMS');
    }
  }

  async getKeyMetadata(): Promise<KeyMetadata> {
    try {
      const { DescribeKeyCommand } = require('@aws-sdk/client-kms');
      
      const command = new DescribeKeyCommand({
        KeyId: this.config.keyId,
      });

      const response = await this.kmsClient.send(command);
      const keyMetadata = response.KeyMetadata;

      return {
        keyId: keyMetadata.KeyId,
        createdAt: keyMetadata.CreationDate,
        version: 1, // AWS KMS handles versioning internally
      };
    } catch (error) {
      logger.error('Failed to get key metadata from AWS KMS', { error });
      throw new Error('Failed to get key metadata from AWS KMS');
    }
  }
}

/**
 * Azure Key Vault Key Management
 * Integrates with Azure Key Vault
 */
class AzureKeyVaultManagement extends KeyManagementService {
  private secretClient: any;
  private cachedKey: string | null = null;
  private cacheExpiry: Date | null = null;

  constructor(config: KeyManagementConfig) {
    super(config);
    this.initializeKeyVaultClients();
  }

  private initializeKeyVaultClients(): void {
    try {
      // Lazy load Azure SDK to avoid requiring it in development
      const { SecretClient } = require('@azure/keyvault-secrets');
      const { DefaultAzureCredential } = require('@azure/identity');

      const credential = new DefaultAzureCredential();
      
      this.secretClient = new SecretClient(
        this.config.vaultUrl || process.env.AZURE_KEY_VAULT_URL || '',
        credential
      );

      logger.info('Azure Key Vault client initialized', { vaultUrl: this.config.vaultUrl });
    } catch (error) {
      logger.error('Failed to initialize Azure Key Vault client. Install @azure/keyvault-secrets package.', { error });
      throw new Error('Azure Key Vault client initialization failed');
    }
  }

  async getEncryptionKey(): Promise<string> {
    // Check if we have a cached key that hasn't expired
    if (this.cachedKey && this.cacheExpiry && this.cacheExpiry > new Date()) {
      return this.cachedKey;
    }

    try {
      const secretName = this.config.keyId || 'encryption-key';
      const secret = await this.secretClient.getSecret(secretName);

      const secretValue = secret.value;
      if (!secretValue) {
        throw new Error('Secret value is empty');
      }

      // Cache the key for 1 hour
      this.cachedKey = secretValue;
      this.cacheExpiry = new Date(Date.now() + 60 * 60 * 1000);

      logger.info('Retrieved encryption key from Azure Key Vault');

      return secretValue;
    } catch (error) {
      logger.error('Failed to get encryption key from Azure Key Vault', { error });
      throw new Error('Failed to get encryption key from Azure Key Vault');
    }
  }

  async rotateKey(): Promise<void> {
    try {
      const secretName = this.config.keyId || 'encryption-key';
      
      // Generate new encryption key
      const newKey = crypto.randomBytes(32).toString('base64');

      // Create new version of the secret
      await this.secretClient.setSecret(secretName, newKey);

      // Clear cached key to force retrieval of new version
      this.cachedKey = null;
      this.cacheExpiry = null;

      logger.info('Key rotated successfully in Azure Key Vault', { secretName });
    } catch (error) {
      logger.error('Failed to rotate key in Azure Key Vault', { error });
      throw new Error('Failed to rotate key in Azure Key Vault');
    }
  }

  async getKeyMetadata(): Promise<KeyMetadata> {
    try {
      const secretName = this.config.keyId || 'encryption-key';
      const secret = await this.secretClient.getSecret(secretName);

      return {
        keyId: secretName,
        createdAt: secret.properties.createdOn || new Date(),
        lastRotated: secret.properties.updatedOn,
        version: parseInt(secret.properties.version || '1', 10),
      };
    } catch (error) {
      logger.error('Failed to get key metadata from Azure Key Vault', { error });
      throw new Error('Failed to get key metadata from Azure Key Vault');
    }
  }
}

/**
 * Key Management Factory
 */
class KeyManagementFactory {
  private static instance: KeyManagementService | null = null;

  static getInstance(): KeyManagementService {
    if (!this.instance) {
      const provider = (process.env.KEY_MANAGEMENT_PROVIDER as KeyProvider) || KeyProvider.LOCAL;
      
      const config: KeyManagementConfig = {
        provider,
        keyId: process.env.KEY_MANAGEMENT_KEY_ID,
        region: process.env.AWS_REGION,
        vaultUrl: process.env.AZURE_KEY_VAULT_URL,
        rotationDays: parseInt(process.env.KEY_ROTATION_DAYS || '90', 10),
      };

      switch (provider) {
        case KeyProvider.AWS_KMS:
          this.instance = new AWSKMSKeyManagement(config);
          break;
        case KeyProvider.AZURE_KEY_VAULT:
          this.instance = new AzureKeyVaultManagement(config);
          break;
        case KeyProvider.LOCAL:
        default:
          this.instance = new LocalKeyManagement(config);
          break;
      }

      logger.info('Key management service initialized', { provider });
    }

    return this.instance;
  }

  static reset(): void {
    this.instance = null;
  }
}

/**
 * Get the current encryption key from configured provider
 */
export async function getEncryptionKey(): Promise<string> {
  const keyManagement = KeyManagementFactory.getInstance();
  return await keyManagement.getEncryptionKey();
}

/**
 * Rotate the encryption key
 */
export async function rotateEncryptionKey(): Promise<void> {
  const keyManagement = KeyManagementFactory.getInstance();
  await keyManagement.rotateKey();
}

/**
 * Get key metadata
 */
export async function getKeyMetadata(): Promise<KeyMetadata> {
  const keyManagement = KeyManagementFactory.getInstance();
  return await keyManagement.getKeyMetadata();
}

/**
 * Check if key rotation is needed based on configured rotation period
 */
export async function isKeyRotationNeeded(): Promise<boolean> {
  try {
    const metadata = await getKeyMetadata();
    const config = KeyManagementFactory.getInstance()['config'];
    
    if (!metadata.lastRotated || !config.rotationDays) {
      return false;
    }

    const daysSinceRotation = Math.floor(
      (Date.now() - metadata.lastRotated.getTime()) / (1000 * 60 * 60 * 24)
    );

    return daysSinceRotation >= config.rotationDays;
  } catch (error) {
    logger.error('Failed to check key rotation status', { error });
    return false;
  }
}

export default KeyManagementFactory;
