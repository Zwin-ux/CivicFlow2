/**
 * Metrics Repository
 * Implements repository pattern for performance metrics persistence and retrieval
 */

import { QueryResult } from 'pg';
import database from '../config/database';
import logger from '../utils/logger';
import {
  ClassificationValidation,
  ClassificationAccuracyMetrics,
  ProcessingTimeRecord,
  ProcessingTimeMetrics,
  PrivacyBreachAlert,
  MetricsFilters,
} from '../models/metrics';

class MetricsRepository {
  /**
   * Create a classification validation record
   * @param validation - Validation data
   * @returns Created validation record
   */
  async createClassificationValidation(
    validation: Omit<ClassificationValidation, 'id' | 'validatedAt'>
  ): Promise<ClassificationValidation> {
    const query = `
      INSERT INTO classification_validations (
        document_id,
        predicted_type,
        actual_type,
        confidence_score,
        is_correct,
        validated_by
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING 
        id,
        document_id,
        predicted_type,
        actual_type,
        confidence_score,
        is_correct,
        validated_by,
        validated_at
    `;

    const values = [
      validation.documentId,
      validation.predictedType,
      validation.actualType,
      validation.confidenceScore,
      validation.isCorrect,
      validation.validatedBy,
    ];

    try {
      const result: QueryResult = await database.query(query, values);
      return this.mapRowToClassificationValidation(result.rows[0]);
    } catch (error) {
      logger.error('Failed to create classification validation', { error, validation });
      throw new Error('Failed to create classification validation');
    }
  }

  /**
   * Get classification accuracy metrics
   * @param filters - Date and program filters
   * @returns Classification accuracy metrics
   */
  async getClassificationAccuracyMetrics(
    filters: MetricsFilters
  ): Promise<ClassificationAccuracyMetrics> {
    const whereConditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (filters.startDate) {
      whereConditions.push(`cv.validated_at >= $${paramIndex}`);
      values.push(filters.startDate);
      paramIndex++;
    }

    if (filters.endDate) {
      whereConditions.push(`cv.validated_at <= $${paramIndex}`);
      values.push(filters.endDate);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get overall metrics
    const overallQuery = `
      SELECT 
        COUNT(*) as total_validations,
        SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) as correct_predictions,
        AVG(confidence_score) as average_confidence
      FROM classification_validations cv
      ${whereClause}
    `;

    // Get metrics by document type
    const byTypeQuery = `
      SELECT 
        predicted_type,
        COUNT(*) as total,
        SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) as correct
      FROM classification_validations cv
      ${whereClause}
      GROUP BY predicted_type
    `;

    try {
      const [overallResult, byTypeResult] = await Promise.all([
        database.query(overallQuery, values),
        database.query(byTypeQuery, values),
      ]);

      const overall = overallResult.rows[0];
      const totalValidations = parseInt(overall.total_validations, 10);
      const correctPredictions = parseInt(overall.correct_predictions, 10);
      const accuracyPercentage = totalValidations > 0 
        ? (correctPredictions / totalValidations) * 100 
        : 0;

      const byDocumentType: Record<string, any> = {};
      for (const row of byTypeResult.rows) {
        const total = parseInt(row.total, 10);
        const correct = parseInt(row.correct, 10);
        byDocumentType[row.predicted_type] = {
          total,
          correct,
          accuracy: total > 0 ? (correct / total) * 100 : 0,
        };
      }

      return {
        totalValidations,
        correctPredictions,
        accuracyPercentage: parseFloat(accuracyPercentage.toFixed(2)),
        averageConfidence: parseFloat(overall.average_confidence || 0),
        byDocumentType,
        period: {
          startDate: filters.startDate || new Date(0),
          endDate: filters.endDate || new Date(),
        },
      };
    } catch (error) {
      logger.error('Failed to get classification accuracy metrics', { error, filters });
      throw new Error('Failed to get classification accuracy metrics');
    }
  }

  /**
   * Get processing time metrics
   * @param filters - Date and program filters
   * @returns Processing time metrics
   */
  async getProcessingTimeMetrics(filters: MetricsFilters): Promise<ProcessingTimeMetrics> {
    const whereConditions: string[] = ['submitted_at IS NOT NULL', 'decided_at IS NOT NULL'];
    const values: any[] = [];
    let paramIndex = 1;

    if (filters.startDate) {
      whereConditions.push(`submitted_at >= $${paramIndex}`);
      values.push(filters.startDate);
      paramIndex++;
    }

    if (filters.endDate) {
      whereConditions.push(`submitted_at <= $${paramIndex}`);
      values.push(filters.endDate);
      paramIndex++;
    }

    if (filters.programType) {
      whereConditions.push(`program_type = $${paramIndex}`);
      values.push(filters.programType);
      paramIndex++;
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    // Get overall metrics
    const overallQuery = `
      SELECT 
        COUNT(*) as total_applications,
        AVG(EXTRACT(EPOCH FROM (decided_at - submitted_at)) / 3600) as avg_hours,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (decided_at - submitted_at)) / 3600) as median_hours,
        MIN(EXTRACT(EPOCH FROM (decided_at - submitted_at)) / 3600) as min_hours,
        MAX(EXTRACT(EPOCH FROM (decided_at - submitted_at)) / 3600) as max_hours
      FROM applications
      ${whereClause}
    `;

    // Get metrics by program type
    const byProgramQuery = `
      SELECT 
        program_type,
        COUNT(*) as count,
        AVG(EXTRACT(EPOCH FROM (decided_at - submitted_at)) / 3600) as avg_hours
      FROM applications
      ${whereClause}
      GROUP BY program_type
    `;

    try {
      const [overallResult, byProgramResult] = await Promise.all([
        database.query(overallQuery, values),
        database.query(byProgramQuery, values),
      ]);

      const overall = overallResult.rows[0];
      const averageProcessingTime = parseFloat(overall.avg_hours || 0);
      
      // Baseline manual processing time (configurable, default 100 hours)
      const baselineProcessingTime = 100;
      const reductionPercentage = baselineProcessingTime > 0
        ? ((baselineProcessingTime - averageProcessingTime) / baselineProcessingTime) * 100
        : 0;

      const byProgramType: Record<string, any> = {};
      for (const row of byProgramResult.rows) {
        byProgramType[row.program_type] = {
          average: parseFloat(row.avg_hours || 0),
          count: parseInt(row.count, 10),
        };
      }

      return {
        averageProcessingTime: parseFloat(averageProcessingTime.toFixed(2)),
        medianProcessingTime: parseFloat(overall.median_hours || 0),
        minProcessingTime: parseFloat(overall.min_hours || 0),
        maxProcessingTime: parseFloat(overall.max_hours || 0),
        totalApplications: parseInt(overall.total_applications, 10),
        baselineProcessingTime,
        reductionPercentage: parseFloat(reductionPercentage.toFixed(2)),
        byProgramType,
        period: {
          startDate: filters.startDate || new Date(0),
          endDate: filters.endDate || new Date(),
        },
      };
    } catch (error) {
      logger.error('Failed to get processing time metrics', { error, filters });
      throw new Error('Failed to get processing time metrics');
    }
  }

  /**
   * Create a privacy breach alert
   * @param alert - Alert data
   * @returns Created alert
   */
  async createPrivacyBreachAlert(
    alert: Omit<PrivacyBreachAlert, 'id' | 'detectedAt' | 'resolved'>
  ): Promise<PrivacyBreachAlert> {
    const query = `
      INSERT INTO privacy_breach_alerts (
        alert_type,
        severity,
        user_id,
        description,
        evidence
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING 
        id,
        alert_type,
        severity,
        user_id,
        description,
        evidence,
        detected_at,
        acknowledged_at,
        acknowledged_by,
        resolved,
        resolved_at,
        resolved_by,
        notes
    `;

    const values = [
      alert.alertType,
      alert.severity,
      alert.userId,
      alert.description,
      JSON.stringify(alert.evidence),
    ];

    try {
      const result: QueryResult = await database.query(query, values);
      return this.mapRowToPrivacyBreachAlert(result.rows[0]);
    } catch (error) {
      logger.error('Failed to create privacy breach alert', { error, alert });
      throw new Error('Failed to create privacy breach alert');
    }
  }

  /**
   * Get unresolved privacy breach alerts
   * @param limit - Maximum number of alerts to return
   * @returns Array of alerts
   */
  async getUnresolvedAlerts(limit: number = 100): Promise<PrivacyBreachAlert[]> {
    const query = `
      SELECT 
        id,
        alert_type,
        severity,
        user_id,
        description,
        evidence,
        detected_at,
        acknowledged_at,
        acknowledged_by,
        resolved,
        resolved_at,
        resolved_by,
        notes
      FROM privacy_breach_alerts
      WHERE resolved = FALSE
      ORDER BY detected_at DESC
      LIMIT $1
    `;

    try {
      const result: QueryResult = await database.query(query, [limit]);
      return result.rows.map(row => this.mapRowToPrivacyBreachAlert(row));
    } catch (error) {
      logger.error('Failed to get unresolved alerts', { error });
      throw new Error('Failed to get unresolved alerts');
    }
  }

  /**
   * Get privacy breach alerts by severity
   * @param severity - Alert severity
   * @param resolved - Filter by resolved status
   * @param limit - Maximum number of alerts to return
   * @returns Array of alerts
   */
  async getAlertsBySeverity(
    severity: string,
    resolved: boolean = false,
    limit: number = 100
  ): Promise<PrivacyBreachAlert[]> {
    const query = `
      SELECT 
        id,
        alert_type,
        severity,
        user_id,
        description,
        evidence,
        detected_at,
        acknowledged_at,
        acknowledged_by,
        resolved,
        resolved_at,
        resolved_by,
        notes
      FROM privacy_breach_alerts
      WHERE severity = $1 AND resolved = $2
      ORDER BY detected_at DESC
      LIMIT $3
    `;

    try {
      const result: QueryResult = await database.query(query, [severity, resolved, limit]);
      return result.rows.map(row => this.mapRowToPrivacyBreachAlert(row));
    } catch (error) {
      logger.error('Failed to get alerts by severity', { error, severity });
      throw new Error('Failed to get alerts by severity');
    }
  }

  /**
   * Acknowledge a privacy breach alert
   * @param id - Alert ID
   * @param acknowledgedBy - User ID
   * @returns Updated alert
   */
  async acknowledgeAlert(id: string, acknowledgedBy: string): Promise<PrivacyBreachAlert> {
    const query = `
      UPDATE privacy_breach_alerts
      SET 
        acknowledged_at = NOW(),
        acknowledged_by = $1,
        updated_at = NOW()
      WHERE id = $2
      RETURNING 
        id,
        alert_type,
        severity,
        user_id,
        description,
        evidence,
        detected_at,
        acknowledged_at,
        acknowledged_by,
        resolved,
        resolved_at,
        resolved_by,
        notes
    `;

    try {
      const result: QueryResult = await database.query(query, [acknowledgedBy, id]);
      if (result.rows.length === 0) {
        throw new Error('Alert not found');
      }
      return this.mapRowToPrivacyBreachAlert(result.rows[0]);
    } catch (error) {
      logger.error('Failed to acknowledge alert', { error, id, acknowledgedBy });
      throw new Error('Failed to acknowledge alert');
    }
  }

  /**
   * Resolve a privacy breach alert
   * @param id - Alert ID
   * @param resolvedBy - User ID
   * @param notes - Resolution notes
   * @returns Updated alert
   */
  async resolveAlert(id: string, resolvedBy: string, notes?: string): Promise<PrivacyBreachAlert> {
    const query = `
      UPDATE privacy_breach_alerts
      SET 
        resolved = TRUE,
        resolved_at = NOW(),
        resolved_by = $1,
        notes = $2,
        updated_at = NOW()
      WHERE id = $3
      RETURNING 
        id,
        alert_type,
        severity,
        user_id,
        description,
        evidence,
        detected_at,
        acknowledged_at,
        acknowledged_by,
        resolved,
        resolved_at,
        resolved_by,
        notes
    `;

    try {
      const result: QueryResult = await database.query(query, [resolvedBy, notes || null, id]);
      if (result.rows.length === 0) {
        throw new Error('Alert not found');
      }
      return this.mapRowToPrivacyBreachAlert(result.rows[0]);
    } catch (error) {
      logger.error('Failed to resolve alert', { error, id, resolvedBy });
      throw new Error('Failed to resolve alert');
    }
  }

  /**
   * Get alert counts by severity
   * @param startDate - Start date filter
   * @param endDate - End date filter
   * @returns Alert counts
   */
  async getAlertCountsBySeverity(
    startDate?: Date,
    endDate?: Date
  ): Promise<Record<string, number>> {
    const whereConditions: string[] = ['resolved = FALSE'];
    const values: any[] = [];
    let paramIndex = 1;

    if (startDate) {
      whereConditions.push(`detected_at >= $${paramIndex}`);
      values.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      whereConditions.push(`detected_at <= $${paramIndex}`);
      values.push(endDate);
      paramIndex++;
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    const query = `
      SELECT 
        severity,
        COUNT(*) as count
      FROM privacy_breach_alerts
      ${whereClause}
      GROUP BY severity
    `;

    try {
      const result: QueryResult = await database.query(query, values);
      const counts: Record<string, number> = {
        CRITICAL: 0,
        HIGH: 0,
        MEDIUM: 0,
        LOW: 0,
      };

      for (const row of result.rows) {
        counts[row.severity] = parseInt(row.count, 10);
      }

      return counts;
    } catch (error) {
      logger.error('Failed to get alert counts by severity', { error });
      throw new Error('Failed to get alert counts by severity');
    }
  }

  /**
   * Map database row to ClassificationValidation object
   */
  private mapRowToClassificationValidation(row: any): ClassificationValidation {
    return {
      id: row.id,
      documentId: row.document_id,
      predictedType: row.predicted_type,
      actualType: row.actual_type,
      confidenceScore: parseFloat(row.confidence_score),
      isCorrect: row.is_correct,
      validatedBy: row.validated_by,
      validatedAt: new Date(row.validated_at),
    };
  }

  /**
   * Map database row to PrivacyBreachAlert object
   */
  private mapRowToPrivacyBreachAlert(row: any): PrivacyBreachAlert {
    return {
      id: row.id,
      alertType: row.alert_type,
      severity: row.severity,
      userId: row.user_id,
      description: row.description,
      evidence: row.evidence || {},
      detectedAt: new Date(row.detected_at),
      acknowledgedAt: row.acknowledged_at ? new Date(row.acknowledged_at) : undefined,
      acknowledgedBy: row.acknowledged_by || undefined,
      resolved: row.resolved,
      resolvedAt: row.resolved_at ? new Date(row.resolved_at) : undefined,
      resolvedBy: row.resolved_by || undefined,
      notes: row.notes || undefined,
    };
  }
}

export default new MetricsRepository();
