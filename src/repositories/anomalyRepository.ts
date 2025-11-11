/**
 * Anomaly Repository
 * Handles persistence and retrieval of anomaly detections
 * Implements status tracking, review workflow, and audit trail
 */

import { QueryResult } from 'pg';
import database from '../config/database';
import logger from '../utils/logger';

export interface AnomalyRecord {
  id: string;
  applicationId: string;
  documentId?: string;
  anomalyType: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  evidence: any;
  confidence: number;
  status: 'PENDING' | 'REVIEWED' | 'RESOLVED' | 'FALSE_POSITIVE';
  reviewedBy?: string;
  reviewedAt?: Date;
  resolutionNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAnomalyRequest {
  applicationId: string;
  documentId?: string;
  anomalyType: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  evidence: any;
  confidence: number;
}

export interface ReviewAnomalyRequest {
  status: 'REVIEWED' | 'RESOLVED' | 'FALSE_POSITIVE';
  reviewedBy: string;
  resolutionNotes?: string;
}

export interface AnomalyStatistics {
  total: number;
  bySeverity: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
    CRITICAL: number;
  };
  byStatus: {
    PENDING: number;
    REVIEWED: number;
    RESOLVED: number;
    FALSE_POSITIVE: number;
  };
  byType: Record<string, number>;
  avgConfidence: number;
}

class AnomalyRepository {
  private static instance: AnomalyRepository;

  private constructor() {}

  public static getInstance(): AnomalyRepository {
    if (!AnomalyRepository.instance) {
      AnomalyRepository.instance = new AnomalyRepository();
    }
    return AnomalyRepository.instance;
  }

  /**
   * Create a new anomaly record
   */
  async create(data: CreateAnomalyRequest): Promise<AnomalyRecord> {
    const query = `
      INSERT INTO anomaly_detections (
        application_id,
        document_id,
        anomaly_type,
        severity,
        description,
        evidence,
        confidence,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING 
        id,
        application_id,
        document_id,
        anomaly_type,
        severity,
        description,
        evidence,
        confidence,
        status,
        reviewed_by,
        reviewed_at,
        resolution_notes,
        created_at,
        updated_at
    `;

    const values = [
      data.applicationId,
      data.documentId || null,
      data.anomalyType,
      data.severity,
      data.description,
      JSON.stringify(data.evidence),
      data.confidence,
      'PENDING',
    ];

    try {
      const result: QueryResult = await database.query(query, values);
      logger.info('Anomaly record created', {
        id: result.rows[0].id,
        applicationId: data.applicationId,
        anomalyType: data.anomalyType,
        severity: data.severity,
      });
      return this.mapRowToRecord(result.rows[0]);
    } catch (error: any) {
      logger.error('Failed to create anomaly record', {
        error: error.message,
        data,
      });
      throw new Error('Failed to create anomaly record');
    }
  }

  /**
   * Create multiple anomaly records in batch
   */
  async createBatch(anomalies: CreateAnomalyRequest[]): Promise<AnomalyRecord[]> {
    if (anomalies.length === 0) {
      return [];
    }

    const client = await database.getClient();

    try {
      await client.query('BEGIN');

      const records: AnomalyRecord[] = [];

      for (const anomaly of anomalies) {
        const query = `
          INSERT INTO anomaly_detections (
            application_id,
            document_id,
            anomaly_type,
            severity,
            description,
            evidence,
            confidence,
            status
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING 
            id,
            application_id,
            document_id,
            anomaly_type,
            severity,
            description,
            evidence,
            confidence,
            status,
            reviewed_by,
            reviewed_at,
            resolution_notes,
            created_at,
            updated_at
        `;

        const values = [
          anomaly.applicationId,
          anomaly.documentId || null,
          anomaly.anomalyType,
          anomaly.severity,
          anomaly.description,
          JSON.stringify(anomaly.evidence),
          anomaly.confidence,
          'PENDING',
        ];

        const result = await client.query(query, values);
        records.push(this.mapRowToRecord(result.rows[0]));
      }

      await client.query('COMMIT');

      logger.info('Batch anomaly records created', {
        count: records.length,
      });

      return records;
    } catch (error: any) {
      await client.query('ROLLBACK');
      logger.error('Failed to create batch anomaly records', {
        error: error.message,
        count: anomalies.length,
      });
      throw new Error('Failed to create batch anomaly records');
    } finally {
      client.release();
    }
  }

  /**
   * Find anomaly by ID
   */
  async findById(id: string): Promise<AnomalyRecord | null> {
    const query = `
      SELECT 
        id,
        application_id,
        document_id,
        anomaly_type,
        severity,
        description,
        evidence,
        confidence,
        status,
        reviewed_by,
        reviewed_at,
        resolution_notes,
        created_at,
        updated_at
      FROM anomaly_detections
      WHERE id = $1
    `;

    try {
      const result: QueryResult = await database.query(query, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToRecord(result.rows[0]);
    } catch (error: any) {
      logger.error('Failed to find anomaly by ID', {
        error: error.message,
        id,
      });
      throw new Error('Failed to find anomaly by ID');
    }
  }

  /**
   * Find all anomalies for an application
   */
  async findByApplicationId(applicationId: string): Promise<AnomalyRecord[]> {
    const query = `
      SELECT 
        id,
        application_id,
        document_id,
        anomaly_type,
        severity,
        description,
        evidence,
        confidence,
        status,
        reviewed_by,
        reviewed_at,
        resolution_notes,
        created_at,
        updated_at
      FROM anomaly_detections
      WHERE application_id = $1
      ORDER BY severity DESC, created_at DESC
    `;

    try {
      const result: QueryResult = await database.query(query, [applicationId]);
      return result.rows.map(row => this.mapRowToRecord(row));
    } catch (error: any) {
      logger.error('Failed to find anomalies by application ID', {
        error: error.message,
        applicationId,
      });
      throw new Error('Failed to find anomalies by application ID');
    }
  }

  /**
   * Find all anomalies for a document
   */
  async findByDocumentId(documentId: string): Promise<AnomalyRecord[]> {
    const query = `
      SELECT 
        id,
        application_id,
        document_id,
        anomaly_type,
        severity,
        description,
        evidence,
        confidence,
        status,
        reviewed_by,
        reviewed_at,
        resolution_notes,
        created_at,
        updated_at
      FROM anomaly_detections
      WHERE document_id = $1
      ORDER BY severity DESC, created_at DESC
    `;

    try {
      const result: QueryResult = await database.query(query, [documentId]);
      return result.rows.map(row => this.mapRowToRecord(row));
    } catch (error: any) {
      logger.error('Failed to find anomalies by document ID', {
        error: error.message,
        documentId,
      });
      throw new Error('Failed to find anomalies by document ID');
    }
  }

  /**
   * Find anomalies by status
   */
  async findByStatus(
    status: 'PENDING' | 'REVIEWED' | 'RESOLVED' | 'FALSE_POSITIVE',
    limit: number = 50
  ): Promise<AnomalyRecord[]> {
    const query = `
      SELECT 
        id,
        application_id,
        document_id,
        anomaly_type,
        severity,
        description,
        evidence,
        confidence,
        status,
        reviewed_by,
        reviewed_at,
        resolution_notes,
        created_at,
        updated_at
      FROM anomaly_detections
      WHERE status = $1
      ORDER BY severity DESC, created_at DESC
      LIMIT $2
    `;

    try {
      const result: QueryResult = await database.query(query, [status, limit]);
      return result.rows.map(row => this.mapRowToRecord(row));
    } catch (error: any) {
      logger.error('Failed to find anomalies by status', {
        error: error.message,
        status,
      });
      throw new Error('Failed to find anomalies by status');
    }
  }

  /**
   * Find anomalies by severity
   */
  async findBySeverity(
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    limit: number = 50
  ): Promise<AnomalyRecord[]> {
    const query = `
      SELECT 
        id,
        application_id,
        document_id,
        anomaly_type,
        severity,
        description,
        evidence,
        confidence,
        status,
        reviewed_by,
        reviewed_at,
        resolution_notes,
        created_at,
        updated_at
      FROM anomaly_detections
      WHERE severity = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;

    try {
      const result: QueryResult = await database.query(query, [severity, limit]);
      return result.rows.map(row => this.mapRowToRecord(row));
    } catch (error: any) {
      logger.error('Failed to find anomalies by severity', {
        error: error.message,
        severity,
      });
      throw new Error('Failed to find anomalies by severity');
    }
  }

  /**
   * Review an anomaly
   */
  async review(id: string, reviewData: ReviewAnomalyRequest): Promise<AnomalyRecord> {
    const query = `
      UPDATE anomaly_detections
      SET 
        status = $1,
        reviewed_by = $2,
        reviewed_at = NOW(),
        resolution_notes = $3,
        updated_at = NOW()
      WHERE id = $4
      RETURNING 
        id,
        application_id,
        document_id,
        anomaly_type,
        severity,
        description,
        evidence,
        confidence,
        status,
        reviewed_by,
        reviewed_at,
        resolution_notes,
        created_at,
        updated_at
    `;

    const values = [
      reviewData.status,
      reviewData.reviewedBy,
      reviewData.resolutionNotes || null,
      id,
    ];

    try {
      const result: QueryResult = await database.query(query, values);

      if (result.rows.length === 0) {
        throw new Error(`Anomaly not found: ${id}`);
      }

      logger.info('Anomaly reviewed', {
        id,
        status: reviewData.status,
        reviewedBy: reviewData.reviewedBy,
      });

      return this.mapRowToRecord(result.rows[0]);
    } catch (error: any) {
      logger.error('Failed to review anomaly', {
        error: error.message,
        id,
      });
      throw new Error('Failed to review anomaly');
    }
  }

  /**
   * Get anomaly statistics
   */
  async getStatistics(applicationId?: string): Promise<AnomalyStatistics> {
    let query = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN severity = 'LOW' THEN 1 END) as low_count,
        COUNT(CASE WHEN severity = 'MEDIUM' THEN 1 END) as medium_count,
        COUNT(CASE WHEN severity = 'HIGH' THEN 1 END) as high_count,
        COUNT(CASE WHEN severity = 'CRITICAL' THEN 1 END) as critical_count,
        COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_count,
        COUNT(CASE WHEN status = 'REVIEWED' THEN 1 END) as reviewed_count,
        COUNT(CASE WHEN status = 'RESOLVED' THEN 1 END) as resolved_count,
        COUNT(CASE WHEN status = 'FALSE_POSITIVE' THEN 1 END) as false_positive_count,
        AVG(confidence) as avg_confidence
      FROM anomaly_detections
    `;

    const values: any[] = [];

    if (applicationId) {
      query += ' WHERE application_id = $1';
      values.push(applicationId);
    }

    try {
      const result: QueryResult = await database.query(query, values);
      const row = result.rows[0];

      // Get type distribution
      let typeQuery = `
        SELECT anomaly_type, COUNT(*) as count
        FROM anomaly_detections
      `;

      if (applicationId) {
        typeQuery += ' WHERE application_id = $1';
      }

      typeQuery += ' GROUP BY anomaly_type';

      const typeResult: QueryResult = await database.query(typeQuery, values);
      const byType: Record<string, number> = {};

      typeResult.rows.forEach(typeRow => {
        byType[typeRow.anomaly_type] = parseInt(typeRow.count, 10);
      });

      return {
        total: parseInt(row.total, 10),
        bySeverity: {
          LOW: parseInt(row.low_count, 10),
          MEDIUM: parseInt(row.medium_count, 10),
          HIGH: parseInt(row.high_count, 10),
          CRITICAL: parseInt(row.critical_count, 10),
        },
        byStatus: {
          PENDING: parseInt(row.pending_count, 10),
          REVIEWED: parseInt(row.reviewed_count, 10),
          RESOLVED: parseInt(row.resolved_count, 10),
          FALSE_POSITIVE: parseInt(row.false_positive_count, 10),
        },
        byType,
        avgConfidence: parseFloat(row.avg_confidence) || 0,
      };
    } catch (error: any) {
      logger.error('Failed to get anomaly statistics', {
        error: error.message,
        applicationId,
      });
      throw new Error('Failed to get anomaly statistics');
    }
  }

  /**
   * Get pending anomalies requiring review
   */
  async getPendingReviews(limit: number = 50): Promise<AnomalyRecord[]> {
    const query = `
      SELECT 
        id,
        application_id,
        document_id,
        anomaly_type,
        severity,
        description,
        evidence,
        confidence,
        status,
        reviewed_by,
        reviewed_at,
        resolution_notes,
        created_at,
        updated_at
      FROM anomaly_detections
      WHERE status = 'PENDING'
      ORDER BY 
        CASE severity
          WHEN 'CRITICAL' THEN 1
          WHEN 'HIGH' THEN 2
          WHEN 'MEDIUM' THEN 3
          WHEN 'LOW' THEN 4
        END,
        created_at ASC
      LIMIT $1
    `;

    try {
      const result: QueryResult = await database.query(query, [limit]);
      return result.rows.map(row => this.mapRowToRecord(row));
    } catch (error: any) {
      logger.error('Failed to get pending reviews', {
        error: error.message,
      });
      throw new Error('Failed to get pending reviews');
    }
  }

  /**
   * Delete anomaly record
   */
  async delete(id: string): Promise<void> {
    const query = 'DELETE FROM anomaly_detections WHERE id = $1';

    try {
      await database.query(query, [id]);
      logger.info('Anomaly record deleted', { id });
    } catch (error: any) {
      logger.error('Failed to delete anomaly', {
        error: error.message,
        id,
      });
      throw new Error('Failed to delete anomaly');
    }
  }

  /**
   * Delete all anomalies for an application
   */
  async deleteByApplicationId(applicationId: string): Promise<void> {
    const query = 'DELETE FROM anomaly_detections WHERE application_id = $1';

    try {
      await database.query(query, [applicationId]);
      logger.info('Anomalies deleted for application', { applicationId });
    } catch (error: any) {
      logger.error('Failed to delete anomalies for application', {
        error: error.message,
        applicationId,
      });
      throw new Error('Failed to delete anomalies for application');
    }
  }

  /**
   * Map database row to AnomalyRecord
   */
  private mapRowToRecord(row: any): AnomalyRecord {
    return {
      id: row.id,
      applicationId: row.application_id,
      documentId: row.document_id || undefined,
      anomalyType: row.anomaly_type,
      severity: row.severity,
      description: row.description,
      evidence: row.evidence,
      confidence: parseFloat(row.confidence),
      status: row.status,
      reviewedBy: row.reviewed_by || undefined,
      reviewedAt: row.reviewed_at ? new Date(row.reviewed_at) : undefined,
      resolutionNotes: row.resolution_notes || undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

export default AnomalyRepository.getInstance();
