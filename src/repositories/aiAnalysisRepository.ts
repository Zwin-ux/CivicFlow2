/**
 * AI Analysis Repository
 * Handles persistence and retrieval of AI document analysis results
 */

import { QueryResult } from 'pg';
import database from '../config/database';
import logger from '../utils/logger';
import { DocumentAnalysisResult } from '../services/aiDocumentAnalyzerService';

export interface AIAnalysisRecord {
  id: string;
  documentId: string;
  analysisType: string;
  qualityScore: number;
  extractedData: any;
  anomalies: any;
  summary: string;
  recommendations: any;
  confidence: number;
  processingTimeMs: number;
  aiProvider: string;
  modelVersion?: string;
  createdAt: Date;
  createdBy?: string;
}

class AIAnalysisRepository {
  private static instance: AIAnalysisRepository;

  private constructor() {}

  public static getInstance(): AIAnalysisRepository {
    if (!AIAnalysisRepository.instance) {
      AIAnalysisRepository.instance = new AIAnalysisRepository();
    }
    return AIAnalysisRepository.instance;
  }

  /**
   * Create a new AI analysis record
   */
  async create(
    analysisResult: DocumentAnalysisResult,
    createdBy: string = 'SYSTEM'
  ): Promise<AIAnalysisRecord> {
    const query = `
      INSERT INTO ai_document_analysis (
        document_id,
        analysis_type,
        quality_score,
        extracted_data,
        anomalies,
        summary,
        recommendations,
        confidence,
        processing_time_ms,
        ai_provider,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING 
        id,
        document_id,
        analysis_type,
        quality_score,
        extracted_data,
        anomalies,
        summary,
        recommendations,
        confidence,
        processing_time_ms,
        ai_provider,
        model_version,
        created_at,
        created_by
    `;

    const values = [
      analysisResult.documentId,
      'FULL_ANALYSIS',
      analysisResult.qualityScore,
      JSON.stringify(analysisResult.extractedData),
      JSON.stringify(analysisResult.anomalies),
      analysisResult.summary,
      JSON.stringify(analysisResult.recommendations),
      analysisResult.confidence,
      analysisResult.processingTime,
      analysisResult.aiProvider,
      createdBy,
    ];

    try {
      const result: QueryResult = await database.query(query, values);
      return this.mapRowToRecord(result.rows[0]);
    } catch (error) {
      logger.error('Failed to create AI analysis record', {
        error,
        documentId: analysisResult.documentId,
      });
      throw new Error('Failed to create AI analysis record');
    }
  }

  /**
   * Find analysis by ID
   */
  async findById(id: string): Promise<AIAnalysisRecord | null> {
    const query = `
      SELECT 
        id,
        document_id,
        analysis_type,
        quality_score,
        extracted_data,
        anomalies,
        summary,
        recommendations,
        confidence,
        processing_time_ms,
        ai_provider,
        model_version,
        created_at,
        created_by
      FROM ai_document_analysis
      WHERE id = $1
    `;

    try {
      const result: QueryResult = await database.query(query, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToRecord(result.rows[0]);
    } catch (error) {
      logger.error('Failed to find AI analysis by ID', { error, id });
      throw new Error('Failed to find AI analysis by ID');
    }
  }

  /**
   * Find all analyses for a document
   */
  async findByDocumentId(documentId: string): Promise<AIAnalysisRecord[]> {
    const query = `
      SELECT 
        id,
        document_id,
        analysis_type,
        quality_score,
        extracted_data,
        anomalies,
        summary,
        recommendations,
        confidence,
        processing_time_ms,
        ai_provider,
        model_version,
        created_at,
        created_by
      FROM ai_document_analysis
      WHERE document_id = $1
      ORDER BY created_at DESC
    `;

    try {
      const result: QueryResult = await database.query(query, [documentId]);
      return result.rows.map((row) => this.mapRowToRecord(row));
    } catch (error) {
      logger.error('Failed to find AI analyses by document ID', { error, documentId });
      throw new Error('Failed to find AI analyses by document ID');
    }
  }

  /**
   * Find latest analysis for a document
   */
  async findLatestByDocumentId(documentId: string): Promise<AIAnalysisRecord | null> {
    const query = `
      SELECT 
        id,
        document_id,
        analysis_type,
        quality_score,
        extracted_data,
        anomalies,
        summary,
        recommendations,
        confidence,
        processing_time_ms,
        ai_provider,
        model_version,
        created_at,
        created_by
      FROM ai_document_analysis
      WHERE document_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `;

    try {
      const result: QueryResult = await database.query(query, [documentId]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToRecord(result.rows[0]);
    } catch (error) {
      logger.error('Failed to find latest AI analysis', { error, documentId });
      throw new Error('Failed to find latest AI analysis');
    }
  }

  /**
   * Find documents with low quality scores
   */
  async findLowQualityAnalyses(threshold: number = 70, limit: number = 50): Promise<AIAnalysisRecord[]> {
    const query = `
      SELECT DISTINCT ON (document_id)
        id,
        document_id,
        analysis_type,
        quality_score,
        extracted_data,
        anomalies,
        summary,
        recommendations,
        confidence,
        processing_time_ms,
        ai_provider,
        model_version,
        created_at,
        created_by
      FROM ai_document_analysis
      WHERE quality_score < $1
      ORDER BY document_id, created_at DESC
      LIMIT $2
    `;

    try {
      const result: QueryResult = await database.query(query, [threshold, limit]);
      return result.rows.map((row) => this.mapRowToRecord(row));
    } catch (error) {
      logger.error('Failed to find low quality analyses', { error, threshold });
      throw new Error('Failed to find low quality analyses');
    }
  }

  /**
   * Find analyses with anomalies
   */
  async findWithAnomalies(severity?: string, limit: number = 50): Promise<AIAnalysisRecord[]> {
    let query = `
      SELECT DISTINCT ON (document_id)
        id,
        document_id,
        analysis_type,
        quality_score,
        extracted_data,
        anomalies,
        summary,
        recommendations,
        confidence,
        processing_time_ms,
        ai_provider,
        model_version,
        created_at,
        created_by
      FROM ai_document_analysis
      WHERE jsonb_array_length(anomalies) > 0
    `;

    const values: any[] = [];

    if (severity) {
      query += ` AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(anomalies) AS anomaly
        WHERE anomaly->>'severity' = $1
      )`;
      values.push(severity);
    }

    query += ` ORDER BY document_id, created_at DESC LIMIT $${values.length + 1}`;
    values.push(limit);

    try {
      const result: QueryResult = await database.query(query, values);
      return result.rows.map((row) => this.mapRowToRecord(row));
    } catch (error) {
      logger.error('Failed to find analyses with anomalies', { error, severity });
      throw new Error('Failed to find analyses with anomalies');
    }
  }

  /**
   * Get analysis statistics
   */
  async getStatistics(startDate?: Date, endDate?: Date): Promise<any> {
    let query = `
      SELECT 
        COUNT(*) as total_analyses,
        AVG(quality_score) as avg_quality_score,
        AVG(confidence) as avg_confidence,
        AVG(processing_time_ms) as avg_processing_time,
        COUNT(CASE WHEN quality_score < 70 THEN 1 END) as low_quality_count,
        COUNT(CASE WHEN jsonb_array_length(anomalies) > 0 THEN 1 END) as anomaly_count
      FROM ai_document_analysis
      WHERE 1=1
    `;

    const values: any[] = [];

    if (startDate) {
      values.push(startDate);
      query += ` AND created_at >= $${values.length}`;
    }

    if (endDate) {
      values.push(endDate);
      query += ` AND created_at <= $${values.length}`;
    }

    try {
      const result: QueryResult = await database.query(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to get analysis statistics', { error });
      throw new Error('Failed to get analysis statistics');
    }
  }

  /**
   * Delete analysis record
   */
  async delete(id: string): Promise<void> {
    const query = 'DELETE FROM ai_document_analysis WHERE id = $1';

    try {
      await database.query(query, [id]);
    } catch (error) {
      logger.error('Failed to delete AI analysis', { error, id });
      throw new Error('Failed to delete AI analysis');
    }
  }

  /**
   * Delete all analyses for a document
   */
  async deleteByDocumentId(documentId: string): Promise<void> {
    const query = 'DELETE FROM ai_document_analysis WHERE document_id = $1';

    try {
      await database.query(query, [documentId]);
    } catch (error) {
      logger.error('Failed to delete AI analyses for document', { error, documentId });
      throw new Error('Failed to delete AI analyses for document');
    }
  }

  /**
   * Map database row to AIAnalysisRecord
   */
  private mapRowToRecord(row: any): AIAnalysisRecord {
    return {
      id: row.id,
      documentId: row.document_id,
      analysisType: row.analysis_type,
      qualityScore: parseInt(row.quality_score, 10),
      extractedData: row.extracted_data,
      anomalies: row.anomalies,
      summary: row.summary,
      recommendations: row.recommendations,
      confidence: parseFloat(row.confidence),
      processingTimeMs: parseInt(row.processing_time_ms, 10),
      aiProvider: row.ai_provider,
      modelVersion: row.model_version || undefined,
      createdAt: new Date(row.created_at),
      createdBy: row.created_by || undefined,
    };
  }
}

export default AIAnalysisRepository.getInstance();
