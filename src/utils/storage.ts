/**
 * Cloud Storage Utility
 * Handles file uploads to S3/Azure Blob Storage with encryption
 */

import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import logger from './logger';
import config from '../config';

interface StorageConfig {
  provider: 's3' | 'azure' | 'local';
  bucket: string;
  region?: string;
}

class StorageService {
  private config: StorageConfig;

  constructor() {
    this.config = {
      provider: (process.env.STORAGE_PROVIDER as 's3' | 'azure' | 'local') || 'local',
      bucket: process.env.STORAGE_BUCKET || 'lending-crm-documents',
      region: process.env.STORAGE_REGION || 'us-east-1',
    };
  }

  /**
   * Upload file to cloud storage
   * @param file - File buffer
   * @param fileName - Original file name
   * @param mimeType - File MIME type
   * @returns Encrypted storage URL
   */
  async uploadFile(
    file: Buffer,
    fileName: string,
    mimeType: string
  ): Promise<string> {
    try {
      // Generate unique file key
      const fileKey = this.generateFileKey(fileName);

      // Encrypt file content
      const encryptedContent = this.encryptFile(file);

      // Upload based on provider
      let storageUrl: string;

      switch (this.config.provider) {
        case 's3':
          storageUrl = await this.uploadToS3(fileKey, encryptedContent, mimeType);
          break;
        case 'azure':
          storageUrl = await this.uploadToAzure(fileKey, encryptedContent, mimeType);
          break;
        case 'local':
          storageUrl = await this.uploadToLocal(fileKey, encryptedContent);
          break;
        default:
          throw new Error(`Unsupported storage provider: ${this.config.provider}`);
      }

      // Encrypt the storage URL before returning
      const encryptedUrl = this.encryptStorageUrl(storageUrl);

      logger.info('File uploaded successfully', {
        fileName,
        fileKey,
        provider: this.config.provider,
      });

      return encryptedUrl;
    } catch (error) {
      logger.error('Failed to upload file', { error, fileName });
      throw new Error('Failed to upload file to storage');
    }
  }

  /**
   * Download file from cloud storage
   * @param encryptedUrl - Encrypted storage URL
   * @returns Decrypted file buffer
   */
  async downloadFile(encryptedUrl: string): Promise<Buffer> {
    try {
      // Decrypt the storage URL
      const storageUrl = this.decryptStorageUrl(encryptedUrl);

      // Download based on provider
      let encryptedContent: Buffer;

      switch (this.config.provider) {
        case 's3':
          encryptedContent = await this.downloadFromS3(storageUrl);
          break;
        case 'azure':
          encryptedContent = await this.downloadFromAzure(storageUrl);
          break;
        case 'local':
          encryptedContent = await this.downloadFromLocal(storageUrl);
          break;
        default:
          throw new Error(`Unsupported storage provider: ${this.config.provider}`);
      }

      // Decrypt file content
      const decryptedContent = this.decryptFile(encryptedContent);

      logger.info('File downloaded successfully', {
        provider: this.config.provider,
      });

      return decryptedContent;
    } catch (error) {
      logger.error('Failed to download file', { error });
      throw new Error('Failed to download file from storage');
    }
  }

  /**
   * Delete file from cloud storage
   * @param encryptedUrl - Encrypted storage URL
   */
  async deleteFile(encryptedUrl: string): Promise<void> {
    try {
      // Decrypt the storage URL
      const storageUrl = this.decryptStorageUrl(encryptedUrl);

      // Delete based on provider
      switch (this.config.provider) {
        case 's3':
          await this.deleteFromS3(storageUrl);
          break;
        case 'azure':
          await this.deleteFromAzure(storageUrl);
          break;
        case 'local':
          await this.deleteFromLocal(storageUrl);
          break;
        default:
          throw new Error(`Unsupported storage provider: ${this.config.provider}`);
      }

      logger.info('File deleted successfully', {
        provider: this.config.provider,
      });
    } catch (error) {
      logger.error('Failed to delete file', { error });
      throw new Error('Failed to delete file from storage');
    }
  }

  /**
   * Generate unique file key
   * @param fileName - Original file name
   * @returns Unique file key
   */
  private generateFileKey(fileName: string): string {
    const timestamp = Date.now();
    const uuid = uuidv4();
    const extension = fileName.split('.').pop() || '';
    return `documents/${timestamp}-${uuid}.${extension}`;
  }

  /**
   * Encrypt file content using AES-256
   * @param content - File buffer
   * @returns Encrypted buffer
   */
  private encryptFile(content: Buffer): Buffer {
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(config.security.encryptionKey.padEnd(32, '0').slice(0, 32));
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(algorithm, key, iv);
    const encrypted = Buffer.concat([cipher.update(content), cipher.final()]);

    // Prepend IV to encrypted content
    return Buffer.concat([iv, encrypted]);
  }

  /**
   * Decrypt file content
   * @param encryptedContent - Encrypted buffer with IV prepended
   * @returns Decrypted buffer
   */
  private decryptFile(encryptedContent: Buffer): Buffer {
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(config.security.encryptionKey.padEnd(32, '0').slice(0, 32));

    // Extract IV from the beginning
    const iv = encryptedContent.slice(0, 16);
    const encrypted = encryptedContent.slice(16);

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }

  /**
   * Encrypt storage URL
   * @param url - Storage URL
   * @returns Encrypted URL
   */
  private encryptStorageUrl(url: string): string {
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(config.security.encryptionKey.padEnd(32, '0').slice(0, 32));
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(algorithm, key, iv);
    const encrypted = Buffer.concat([
      cipher.update(Buffer.from(url, 'utf8')),
      cipher.final(),
    ]);

    // Return IV + encrypted as base64
    return Buffer.concat([iv, encrypted]).toString('base64');
  }

  /**
   * Decrypt storage URL
   * @param encryptedUrl - Encrypted URL
   * @returns Decrypted URL
   */
  private decryptStorageUrl(encryptedUrl: string): string {
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(config.security.encryptionKey.padEnd(32, '0').slice(0, 32));

    const buffer = Buffer.from(encryptedUrl, 'base64');
    const iv = buffer.slice(0, 16);
    const encrypted = buffer.slice(16);

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  }

  /**
   * Upload to S3 (placeholder - requires AWS SDK)
   */
  private async uploadToS3(
    fileKey: string,
    _content: Buffer,
    _mimeType: string
  ): Promise<string> {
    // TODO: Implement AWS S3 upload using @aws-sdk/client-s3
    // For now, return a mock URL
    logger.warn('S3 upload not implemented, using mock URL');
    return `s3://${this.config.bucket}/${fileKey}`;
  }

  /**
   * Download from S3 (placeholder - requires AWS SDK)
   */
  private async downloadFromS3(_storageUrl: string): Promise<Buffer> {
    // TODO: Implement AWS S3 download using @aws-sdk/client-s3
    throw new Error('S3 download not implemented');
  }

  /**
   * Delete from S3 (placeholder - requires AWS SDK)
   */
  private async deleteFromS3(_storageUrl: string): Promise<void> {
    // TODO: Implement AWS S3 delete using @aws-sdk/client-s3
    logger.warn('S3 delete not implemented');
  }

  /**
   * Upload to Azure Blob Storage (placeholder - requires Azure SDK)
   */
  private async uploadToAzure(
    fileKey: string,
    _content: Buffer,
    _mimeType: string
  ): Promise<string> {
    // TODO: Implement Azure Blob Storage upload using @azure/storage-blob
    logger.warn('Azure upload not implemented, using mock URL');
    return `azure://${this.config.bucket}/${fileKey}`;
  }

  /**
   * Download from Azure Blob Storage (placeholder - requires Azure SDK)
   */
  private async downloadFromAzure(_storageUrl: string): Promise<Buffer> {
    // TODO: Implement Azure Blob Storage download
    throw new Error('Azure download not implemented');
  }

  /**
   * Delete from Azure Blob Storage (placeholder - requires Azure SDK)
   */
  private async deleteFromAzure(_storageUrl: string): Promise<void> {
    // TODO: Implement Azure Blob Storage delete
    logger.warn('Azure delete not implemented');
  }

  /**
   * Upload to local filesystem (for development)
   */
  private async uploadToLocal(fileKey: string, content: Buffer): Promise<string> {
    const fs = require('fs').promises;
    const path = require('path');

    const uploadDir = path.join(process.cwd(), 'uploads');
    const filePath = path.join(uploadDir, fileKey);

    // Create directory if it doesn't exist
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    // Write file
    await fs.writeFile(filePath, content);

    return `file://${filePath}`;
  }

  /**
   * Download from local filesystem
   */
  private async downloadFromLocal(storageUrl: string): Promise<Buffer> {
    const fs = require('fs').promises;
    const filePath = storageUrl.replace('file://', '');
    return await fs.readFile(filePath);
  }

  /**
   * Delete from local filesystem
   */
  private async deleteFromLocal(storageUrl: string): Promise<void> {
    const fs = require('fs').promises;
    const filePath = storageUrl.replace('file://', '');
    await fs.unlink(filePath);
  }
}

export default new StorageService();
