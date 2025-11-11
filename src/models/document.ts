/**
 * Document Data Models
 * Defines TypeScript interfaces for document management system
 */

export enum DocumentType {
  W9 = 'W9',
  EIN_VERIFICATION = 'EIN_VERIFICATION',
  BANK_STATEMENT = 'BANK_STATEMENT',
  TAX_RETURN = 'TAX_RETURN',
  BUSINESS_LICENSE = 'BUSINESS_LICENSE',
  OTHER = 'OTHER',
}

/**
 * Document metadata interface
 */
export interface DocumentMetadata {
  id: string;
  applicationId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storageUrl: string;
  documentType?: DocumentType;
  classificationConfidence?: number;
  extractedData?: Record<string, any>;
  requiresManualReview: boolean;
  uploadedAt: Date;
  classifiedAt?: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
}

/**
 * Document upload request
 */
export interface DocumentUploadRequest {
  applicationId: string;
  file: Express.Multer.File;
}

/**
 * Classification result from ML service
 */
export interface ClassificationResult {
  documentType: DocumentType;
  confidenceScore: number; // 0-100
  requiresManualReview: boolean;
  timestamp: Date;
}

/**
 * Extracted data from document
 */
export interface ExtractedData {
  documentId: string;
  fields: Record<string, any>;
  confidenceScores: Record<string, number>;
  rawText?: string;
}

/**
 * Document validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}
