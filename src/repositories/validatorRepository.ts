/**
 * Validator Repository
 * Database operations for validation and fraud detection
 */

import { Pool } from 'pg';
import logger from '../utils/logger';

export interface DuplicateEINResult {
  applicationId: string;
  applicantId: string;
  ein: string;
  businessName: string;
  status: string;
  createdAt: Date;
}

class ValidatorRepository {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Find applications with duplicate EIN
   */
  async findDuplicateEIN(ein: string, excludeApplicationId?: string): Promise<DuplicateEINResult[]> {
    try {
      const query = `
        SELECT 
          a.id as application_id,
          a.applicant_id,
          ap.ein,
          ap.business_name,
          a.status,
          a.created_at
        FROM applications a
        JOIN applicants ap ON a.applicant_id = ap.id
        WHERE ap.ein = $1
        ${excludeApplicationId ? 'AND a.id != $2' : ''}
        ORDER BY a.created_at DESC
      `;

      const params = excludeApplicationId ? [ein, excludeApplicationId] : [ein];
      const result = await this.pool.query(query, params);

      return result.rows.map(row => ({
        applicationId: row.application_id,
        applicantId: row.applicant_id,
        ein: row.ein,
        businessName: row.business_name,
        status: row.status,
        createdAt: row.created_at,
      }));
    } catch (error) {
      logger.error('Error finding duplicate EIN:', error);
      throw error;
    }
  }

  /**
   * Get application count by EIN
   */
  async getApplicationCountByEIN(ein: string): Promise<number> {
    try {
      const query = `
        SELECT COUNT(*) as count
        FROM applications a
        JOIN applicants ap ON a.applicant_id = ap.id
        WHERE ap.ein = $1
      `;

      const result = await this.pool.query(query, [ein]);
      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      logger.error('Error getting application count by EIN:', error);
      throw error;
    }
  }

  /**
   * Find applications with suspicious patterns
   */
  async findSuspiciousApplications(criteria: {
    lowConfidenceThreshold?: number;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<any[]> {
    try {
      const conditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (criteria.lowConfidenceThreshold !== undefined) {
        conditions.push(`d.classification_confidence < $${paramIndex}`);
        params.push(criteria.lowConfidenceThreshold);
        paramIndex++;
      }

      if (criteria.dateFrom) {
        conditions.push(`a.created_at >= $${paramIndex}`);
        params.push(criteria.dateFrom);
        paramIndex++;
      }

      if (criteria.dateTo) {
        conditions.push(`a.created_at <= $${paramIndex}`);
        params.push(criteria.dateTo);
        paramIndex++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const query = `
        SELECT 
          a.id as application_id,
          a.applicant_id,
          a.status,
          COUNT(d.id) as suspicious_document_count,
          AVG(d.classification_confidence) as avg_confidence,
          a.created_at
        FROM applications a
        LEFT JOIN documents d ON a.id = d.application_id
        ${whereClause}
        GROUP BY a.id, a.applicant_id, a.status, a.created_at
        HAVING COUNT(d.id) > 0
        ORDER BY avg_confidence ASC, a.created_at DESC
      `;

      const result = await this.pool.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error finding suspicious applications:', error);
      throw error;
    }
  }

  /**
   * Store validation result
   */
  async storeValidationResult(data: {
    applicationId: string;
    validationType: string;
    result: any;
    timestamp: Date;
  }): Promise<void> {
    try {
      const query = `
        INSERT INTO validation_results (application_id, validation_type, result, validated_at)
        VALUES ($1, $2, $3, $4)
      `;

      await this.pool.query(query, [
        data.applicationId,
        data.validationType,
        JSON.stringify(data.result),
        data.timestamp,
      ]);

      logger.info(`Validation result stored for application ${data.applicationId}`);
    } catch (error) {
      // Table might not exist yet - log but don't throw
      logger.warn('Could not store validation result:', error);
    }
  }

  /**
   * Get validation history for application
   */
  async getValidationHistory(applicationId: string): Promise<any[]> {
    try {
      const query = `
        SELECT 
          id,
          validation_type,
          result,
          validated_at
        FROM validation_results
        WHERE application_id = $1
        ORDER BY validated_at DESC
      `;

      const result = await this.pool.query(query, [applicationId]);
      return result.rows.map(row => ({
        id: row.id,
        validationType: row.validation_type,
        result: row.result,
        validatedAt: row.validated_at,
      }));
    } catch (error) {
      logger.warn('Could not get validation history:', error);
      return [];
    }
  }
}

export default ValidatorRepository;
