/**
 * Document Service
 * Business logic layer for document operations
 */

import documentRepository from '../repositories/documentRepository';
import auditLogRepository from '../repositories/auditLogRepository';
import storageService from '../utils/storage';
import classificationClient from '../clients/classificationClient';
import extractionClient from '../clients/extractionClient';
import logger from '../utils/logger';
import {
  DocumentMetadata,
  ClassificationResult,
  ExtractedData,
  ValidationResult,
} from '../models/document';
import { EntityType } from '../models/auditLog';

class DocumentService {
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly ALLOWED_MIME_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/tiff',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  /**
   * Upload document and store metadata
   * @param file - Uploaded file
   * @param applicationId - Application ID
   * @param uploadedBy - User ID who uploaded
   * @returns Document metadata
   */
  async uploadDocument(
    file: Express.Multer.File,
    applicationId: string,
    uploadedBy: string
  ): Promise<DocumentMetadata> {
    try {
      // Validate file
      const validation = this.validateFile(file);
      if (!validation.isValid) {
        throw new Error(`File validation failed: ${validation.errors.join(', ')}`);
      }

      // Upload file to cloud storage
      const storageUrl = await storageService.uploadFile(
        file.buffer,
        file.originalname,
        file.mimetype
      );

      // Create document record
      const document = await documentRepository.create({
        applicationId,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        storageUrl,
        requiresManualReview: false, // Will be updated after classification
      });

      // Log upload action
      await auditLogRepository.create({
        actionType: 'DOCUMENT_UPLOADED',
        entityType: EntityType.DOCUMENT,
        entityId: document.id,
        performedBy: uploadedBy,
        details: {
          fileName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
          applicationId,
        },
      });

      logger.info('Document uploaded successfully', {
        documentId: document.id,
        applicationId,
        fileName: file.originalname,
      });

      return document;
    } catch (error) {
      logger.error('Failed to upload document', { error, applicationId });
      throw error;
    }
  }

  /**
   * Classify document using ML service
   * @param documentId - Document ID
   * @returns Classification result
   */
  async classifyDocument(documentId: string): Promise<ClassificationResult> {
    try {
      const document = await documentRepository.findById(documentId);
      if (!document) {
        throw new Error('Document not found');
      }

      // Call ML classification service
      const classificationResult = await this.callClassificationService(document);

      // Update document with classification results
      await documentRepository.updateClassification(documentId, {
        documentType: classificationResult.documentType,
        confidenceScore: classificationResult.confidenceScore,
        requiresManualReview: classificationResult.requiresManualReview,
      });

      // Log classification action
      await auditLogRepository.create({
        actionType: 'DOCUMENT_CLASSIFIED',
        entityType: EntityType.DOCUMENT,
        entityId: documentId,
        performedBy: 'SYSTEM',
        confidenceScore: classificationResult.confidenceScore,
        details: {
          documentType: classificationResult.documentType,
          requiresManualReview: classificationResult.requiresManualReview,
        },
      });

      logger.info('Document classified successfully', {
        documentId,
        documentType: classificationResult.documentType,
        confidenceScore: classificationResult.confidenceScore,
      });

      return classificationResult;
    } catch (error) {
      logger.error('Failed to classify document', { error, documentId });
      throw error;
    }
  }

  /**
   * Extract data from document
   * @param documentId - Document ID
   * @returns Extracted data
   */
  async extractData(documentId: string): Promise<ExtractedData> {
    try {
      const document = await documentRepository.findById(documentId);
      if (!document) {
        throw new Error('Document not found');
      }

      if (!document.documentType) {
        throw new Error('Document must be classified before data extraction');
      }

      // Extract data using extraction client
      const extractionResult = await extractionClient.extractData({
        documentId: document.id,
        documentType: document.documentType,
        fileUrl: document.storageUrl,
        fileName: document.fileName,
      });

      const extractedData = extractionResult.fields;
      const confidenceScores = extractionResult.confidenceScores;

      // Update document with extracted data
      await documentRepository.updateExtractedData(documentId, extractedData);

      // Log extraction action
      await auditLogRepository.create({
        actionType: 'DOCUMENT_DATA_EXTRACTED',
        entityType: EntityType.DOCUMENT,
        entityId: documentId,
        performedBy: 'SYSTEM',
        details: {
          documentType: document.documentType,
          fieldsExtracted: Object.keys(extractedData),
        },
      });

      logger.info('Document data extracted successfully', {
        documentId,
        documentType: document.documentType,
        fieldsExtracted: Object.keys(extractedData).length,
      });

      return {
        documentId,
        fields: extractedData,
        confidenceScores,
      };
    } catch (error) {
      logger.error('Failed to extract document data', { error, documentId });
      throw error;
    }
  }

  /**
   * Get document by ID
   * @param documentId - Document ID
   * @returns Document metadata
   */
  async getDocument(documentId: string): Promise<DocumentMetadata> {
    const document = await documentRepository.findById(documentId);
    if (!document) {
      throw new Error('Document not found');
    }
    return document;
  }

  /**
   * Get all documents for an application
   * @param applicationId - Application ID
   * @returns Array of documents
   */
  async getApplicationDocuments(applicationId: string): Promise<DocumentMetadata[]> {
    return await documentRepository.findByApplicationId(applicationId);
  }

  /**
   * Download document file
   * @param documentId - Document ID
   * @returns File buffer
   */
  async downloadDocument(documentId: string): Promise<Buffer> {
    try {
      const document = await documentRepository.findById(documentId);
      if (!document) {
        throw new Error('Document not found');
      }

      return await storageService.downloadFile(document.storageUrl);
    } catch (error) {
      logger.error('Failed to download document', { error, documentId });
      throw error;
    }
  }

  /**
   * Delete document
   * @param documentId - Document ID
   * @param deletedBy - User ID who deleted
   */
  async deleteDocument(documentId: string, deletedBy: string): Promise<void> {
    try {
      const document = await documentRepository.findById(documentId);
      if (!document) {
        throw new Error('Document not found');
      }

      // Delete from storage
      await storageService.deleteFile(document.storageUrl);

      // Delete from database
      await documentRepository.delete(documentId);

      // Log deletion action
      await auditLogRepository.create({
        actionType: 'DOCUMENT_DELETED',
        entityType: EntityType.DOCUMENT,
        entityId: documentId,
        performedBy: deletedBy,
        details: {
          fileName: document.fileName,
          applicationId: document.applicationId,
        },
      });

      logger.info('Document deleted successfully', { documentId });
    } catch (error) {
      logger.error('Failed to delete document', { error, documentId });
      throw error;
    }
  }

  /**
   * Validate uploaded file
   * @param file - Uploaded file
   * @returns Validation result
   */
  private validateFile(file: Express.Multer.File): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      errors.push(`File size exceeds maximum allowed size of ${this.MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    // Check MIME type
    if (!this.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      errors.push(`File type ${file.mimetype} is not allowed`);
    }

    // Check file name
    if (!file.originalname || file.originalname.length === 0) {
      errors.push('File name is required');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Call ML classification service
   * @param document - Document metadata
   * @returns Classification result
   */
  private async callClassificationService(
    document: DocumentMetadata
  ): Promise<ClassificationResult> {
    // Use classification client to classify document
    return await classificationClient.classifyDocument({
      documentId: document.id,
      fileUrl: document.storageUrl,
      fileName: document.fileName,
      mimeType: document.mimeType,
    });
  }


}

export default new DocumentService();
