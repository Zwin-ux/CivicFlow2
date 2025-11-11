/**
 * Document Repository
 * Implements repository pattern for document persistence and retrieval
 */

import { QueryResult } from 'pg';
import database from '../config/database';
import logger from '../utils/logger';
import { DocumentMetadata, DocumentType } from '../models/document';

class DocumentRepository {
  /**
   * Create a new document record
   * @param document - Document metadata
   * @returns Created document
   */
  async create(document: Omit<DocumentMetadata, 'id' | 'uploadedAt'>): Promise<DocumentMetadata> {
    const query = `
      INSERT INTO documents (
        application_id,
        file_name,
        file_size,
        mime_type,
        storage_url,
        document_type,
        classification_confidence,
        extracted_data,
        requires_manual_review
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING 
        id,
        application_id,
        file_name,
        file_size,
        mime_type,
        storage_url,
        document_type,
        classification_confidence,
        extracted_data,
        requires_manual_review,
        uploaded_at,
        classified_at,
        reviewed_at,
        reviewed_by
    `;

    const values = [
      document.applicationId,
      document.fileName,
      document.fileSize,
      document.mimeType,
      document.storageUrl,
      document.documentType || null,
      document.classificationConfidence || null,
      document.extractedData ? JSON.stringify(document.extractedData) : null,
      document.requiresManualReview,
    ];

    try {
      const result: QueryResult = await database.query(query, values);
      return this.mapRowToDocument(result.rows[0]);
    } catch (error) {
      logger.error('Failed to create document record', { error, document });
      throw new Error('Failed to create document record');
    }
  }

  /**
   * Find document by ID
   * @param id - Document ID
   * @returns Document or null if not found
   */
  async findById(id: string): Promise<DocumentMetadata | null> {
    const query = `
      SELECT 
        id,
        application_id,
        file_name,
        file_size,
        mime_type,
        storage_url,
        document_type,
        classification_confidence,
        extracted_data,
        requires_manual_review,
        uploaded_at,
        classified_at,
        reviewed_at,
        reviewed_by
      FROM documents
      WHERE id = $1
    `;

    try {
      const result: QueryResult = await database.query(query, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToDocument(result.rows[0]);
    } catch (error) {
      logger.error('Failed to find document by ID', { error, id });
      throw new Error('Failed to find document by ID');
    }
  }

  /**
   * Find all documents for an application
   * @param applicationId - Application ID
   * @returns Array of documents
   */
  async findByApplicationId(applicationId: string): Promise<DocumentMetadata[]> {
    const query = `
      SELECT 
        id,
        application_id,
        file_name,
        file_size,
        mime_type,
        storage_url,
        document_type,
        classification_confidence,
        extracted_data,
        requires_manual_review,
        uploaded_at,
        classified_at,
        reviewed_at,
        reviewed_by
      FROM documents
      WHERE application_id = $1
      ORDER BY uploaded_at DESC
    `;

    try {
      const result: QueryResult = await database.query(query, [applicationId]);
      return result.rows.map(row => this.mapRowToDocument(row));
    } catch (error) {
      logger.error('Failed to find documents by application ID', { error, applicationId });
      throw new Error('Failed to find documents by application ID');
    }
  }

  /**
   * Update document classification results
   * @param id - Document ID
   * @param classification - Classification data
   * @returns Updated document
   */
  async updateClassification(
    id: string,
    classification: {
      documentType: DocumentType;
      confidenceScore: number;
      requiresManualReview: boolean;
    }
  ): Promise<DocumentMetadata> {
    const query = `
      UPDATE documents
      SET 
        document_type = $1,
        classification_confidence = $2,
        requires_manual_review = $3,
        classified_at = NOW()
      WHERE id = $4
      RETURNING 
        id,
        application_id,
        file_name,
        file_size,
        mime_type,
        storage_url,
        document_type,
        classification_confidence,
        extracted_data,
        requires_manual_review,
        uploaded_at,
        classified_at,
        reviewed_at,
        reviewed_by
    `;

    const values = [
      classification.documentType,
      classification.confidenceScore,
      classification.requiresManualReview,
      id,
    ];

    try {
      const result: QueryResult = await database.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('Document not found');
      }

      return this.mapRowToDocument(result.rows[0]);
    } catch (error) {
      logger.error('Failed to update document classification', { error, id, classification });
      throw new Error('Failed to update document classification');
    }
  }

  /**
   * Update document extracted data
   * @param id - Document ID
   * @param extractedData - Extracted data
   * @returns Updated document
   */
  async updateExtractedData(
    id: string,
    extractedData: Record<string, any>
  ): Promise<DocumentMetadata> {
    const query = `
      UPDATE documents
      SET extracted_data = $1
      WHERE id = $2
      RETURNING 
        id,
        application_id,
        file_name,
        file_size,
        mime_type,
        storage_url,
        document_type,
        classification_confidence,
        extracted_data,
        requires_manual_review,
        uploaded_at,
        classified_at,
        reviewed_at,
        reviewed_by
    `;

    const values = [JSON.stringify(extractedData), id];

    try {
      const result: QueryResult = await database.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('Document not found');
      }

      return this.mapRowToDocument(result.rows[0]);
    } catch (error) {
      logger.error('Failed to update document extracted data', { error, id });
      throw new Error('Failed to update document extracted data');
    }
  }

  /**
   * Mark document as reviewed
   * @param id - Document ID
   * @param reviewedBy - User ID who reviewed
   * @returns Updated document
   */
  async markAsReviewed(id: string, reviewedBy: string): Promise<DocumentMetadata> {
    const query = `
      UPDATE documents
      SET 
        reviewed_at = NOW(),
        reviewed_by = $1,
        requires_manual_review = FALSE
      WHERE id = $2
      RETURNING 
        id,
        application_id,
        file_name,
        file_size,
        mime_type,
        storage_url,
        document_type,
        classification_confidence,
        extracted_data,
        requires_manual_review,
        uploaded_at,
        classified_at,
        reviewed_at,
        reviewed_by
    `;

    try {
      const result: QueryResult = await database.query(query, [reviewedBy, id]);

      if (result.rows.length === 0) {
        throw new Error('Document not found');
      }

      return this.mapRowToDocument(result.rows[0]);
    } catch (error) {
      logger.error('Failed to mark document as reviewed', { error, id, reviewedBy });
      throw new Error('Failed to mark document as reviewed');
    }
  }

  /**
   * Delete document record
   * @param id - Document ID
   */
  async delete(id: string): Promise<void> {
    const query = 'DELETE FROM documents WHERE id = $1';

    try {
      await database.query(query, [id]);
    } catch (error) {
      logger.error('Failed to delete document', { error, id });
      throw new Error('Failed to delete document');
    }
  }

  /**
   * Find documents requiring manual review
   * @param limit - Maximum number of documents to return
   * @returns Array of documents
   */
  async findRequiringReview(limit: number = 50): Promise<DocumentMetadata[]> {
    const query = `
      SELECT 
        id,
        application_id,
        file_name,
        file_size,
        mime_type,
        storage_url,
        document_type,
        classification_confidence,
        extracted_data,
        requires_manual_review,
        uploaded_at,
        classified_at,
        reviewed_at,
        reviewed_by
      FROM documents
      WHERE requires_manual_review = TRUE
      ORDER BY uploaded_at ASC
      LIMIT $1
    `;

    try {
      const result: QueryResult = await database.query(query, [limit]);
      return result.rows.map(row => this.mapRowToDocument(row));
    } catch (error) {
      logger.error('Failed to find documents requiring review', { error });
      throw new Error('Failed to find documents requiring review');
    }
  }

  /**
   * Map database row to DocumentMetadata object
   * @param row - Database row
   * @returns DocumentMetadata object
   */
  private mapRowToDocument(row: any): DocumentMetadata {
    return {
      id: row.id,
      applicationId: row.application_id,
      fileName: row.file_name,
      fileSize: parseInt(row.file_size, 10),
      mimeType: row.mime_type,
      storageUrl: row.storage_url,
      documentType: row.document_type as DocumentType | undefined,
      classificationConfidence: row.classification_confidence
        ? parseFloat(row.classification_confidence)
        : undefined,
      extractedData: row.extracted_data || undefined,
      requiresManualReview: row.requires_manual_review,
      uploadedAt: new Date(row.uploaded_at),
      classifiedAt: row.classified_at ? new Date(row.classified_at) : undefined,
      reviewedAt: row.reviewed_at ? new Date(row.reviewed_at) : undefined,
      reviewedBy: row.reviewed_by || undefined,
    };
  }
}

export default new DocumentRepository();
