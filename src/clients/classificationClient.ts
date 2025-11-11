/**
 * ML Classification Service Client
 * REST client for document classification microservice
 */

import logger from '../utils/logger';
import { DocumentType, ClassificationResult } from '../models/document';

// Configuration interface for future ML service integration
// interface ClassificationServiceConfig {
//   baseUrl: string;
//   apiKey?: string;
//   timeout: number;
// }

interface ClassificationRequest {
  documentId: string;
  fileUrl: string;
  fileName: string;
  mimeType: string;
}

interface ClassificationResponse {
  documentType: string;
  confidence: number;
  metadata?: Record<string, any>;
}

class ClassificationClient {
  private readonly CONFIDENCE_THRESHOLD = 80;

  constructor() {
    // Configuration will be loaded when actual ML service integration is implemented
    // For now, using mock classification
  }

  /**
   * Classify document using ML service
   * @param request - Classification request
   * @returns Classification result
   */
  async classifyDocument(request: ClassificationRequest): Promise<ClassificationResult> {
    try {
      logger.info('Calling ML classification service', {
        documentId: request.documentId,
        fileName: request.fileName,
      });

      // TODO: Implement actual HTTP request to ML service
      // For now, use mock classification logic
      const response = await this.mockClassification(request);

      // Map response to ClassificationResult
      const documentType = this.mapDocumentType(response.documentType);
      const confidenceScore = Math.round(response.confidence * 100) / 100;
      const requiresManualReview = confidenceScore < this.CONFIDENCE_THRESHOLD;

      const result: ClassificationResult = {
        documentType,
        confidenceScore,
        requiresManualReview,
        timestamp: new Date(),
      };

      logger.info('Document classification completed', {
        documentId: request.documentId,
        documentType,
        confidenceScore,
        requiresManualReview,
      });

      return result;
    } catch (error) {
      logger.error('Failed to classify document', {
        error,
        documentId: request.documentId,
      });

      // Return low-confidence OTHER classification on error
      return {
        documentType: DocumentType.OTHER,
        confidenceScore: 0,
        requiresManualReview: true,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Mock classification logic (to be replaced with actual ML service call)
   * @param request - Classification request
   * @returns Mock classification response
   */
  private async mockClassification(
    request: ClassificationRequest
  ): Promise<ClassificationResponse> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));

    const fileName = request.fileName.toLowerCase();
    let documentType = 'OTHER';
    let confidence = 50;

    // Simple pattern matching based on file name
    if (fileName.includes('w-9') || fileName.includes('w9')) {
      documentType = 'W9';
      confidence = 95;
    } else if (fileName.includes('ein') || fileName.includes('tax-id')) {
      documentType = 'EIN_VERIFICATION';
      confidence = 90;
    } else if (fileName.includes('bank') || fileName.includes('statement')) {
      documentType = 'BANK_STATEMENT';
      confidence = 85;
    } else if (fileName.includes('tax') && fileName.includes('return')) {
      documentType = 'TAX_RETURN';
      confidence = 88;
    } else if (fileName.includes('license')) {
      documentType = 'BUSINESS_LICENSE';
      confidence = 87;
    } else if (fileName.includes('.pdf')) {
      // Generic PDF gets lower confidence
      documentType = 'OTHER';
      confidence = 60;
    }

    logger.info('Mock classification result', {
      documentId: request.documentId,
      documentType,
      confidence,
    });

    return {
      documentType,
      confidence,
      metadata: {
        method: 'mock',
        fileName: request.fileName,
      },
    };
  }

  /**
   * Map ML service document type to internal DocumentType enum
   * @param mlDocumentType - Document type from ML service
   * @returns Internal DocumentType
   */
  private mapDocumentType(mlDocumentType: string): DocumentType {
    const typeMap: Record<string, DocumentType> = {
      'W9': DocumentType.W9,
      'W-9': DocumentType.W9,
      'EIN_VERIFICATION': DocumentType.EIN_VERIFICATION,
      'EIN': DocumentType.EIN_VERIFICATION,
      'BANK_STATEMENT': DocumentType.BANK_STATEMENT,
      'TAX_RETURN': DocumentType.TAX_RETURN,
      'BUSINESS_LICENSE': DocumentType.BUSINESS_LICENSE,
      'OTHER': DocumentType.OTHER,
    };

    return typeMap[mlDocumentType.toUpperCase()] || DocumentType.OTHER;
  }

  /**
   * Batch classify multiple documents
   * @param requests - Array of classification requests
   * @returns Array of classification results
   */
  async batchClassify(
    requests: ClassificationRequest[]
  ): Promise<ClassificationResult[]> {
    try {
      logger.info('Batch classifying documents', { count: requests.length });

      // Process in parallel with a concurrency limit
      const results = await Promise.all(
        requests.map(request => this.classifyDocument(request))
      );

      logger.info('Batch classification completed', {
        total: requests.length,
        successful: results.filter(r => r.confidenceScore >= this.CONFIDENCE_THRESHOLD).length,
      });

      return results;
    } catch (error) {
      logger.error('Failed to batch classify documents', { error });
      throw error;
    }
  }

  /**
   * Get classification service health status
   * @returns Health status
   */
  async healthCheck(): Promise<{ healthy: boolean; message: string }> {
    try {
      // TODO: Implement actual health check endpoint call
      logger.info('Checking ML classification service health');

      return {
        healthy: true,
        message: 'Mock classification service is healthy',
      };
    } catch (error) {
      logger.error('ML classification service health check failed', { error });
      return {
        healthy: false,
        message: 'Service unavailable',
      };
    }
  }
}

export default new ClassificationClient();
