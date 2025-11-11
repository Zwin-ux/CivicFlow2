/**
 * Audit Log Repository
 * Implements repository pattern for audit log persistence and retrieval
 */

import { QueryResult } from 'pg';
import database from '../config/database';
import logger from '../utils/logger';
import {
  AuditAction,
  AuditLog,
  AuditLogFilters,
  PaginatedAuditLogs,
  EntityType,
} from '../models/auditLog';

class AuditLogRepository {
  /**
   * Create a new audit log entry
   * @param action - Audit action data
   * @returns Created audit log entry
   */
  async create(action: AuditAction): Promise<AuditLog> {
    const query = `
      INSERT INTO audit_logs (
        action_type,
        entity_type,
        entity_id,
        performed_by,
        confidence_score,
        details,
        ip_address,
        user_agent
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING 
        id,
        action_type,
        entity_type,
        entity_id,
        performed_by,
        confidence_score,
        details,
        ip_address,
        user_agent,
        timestamp
    `;

    const values = [
      action.actionType,
      action.entityType,
      action.entityId,
      action.performedBy,
      action.confidenceScore || null,
      action.details ? JSON.stringify(action.details) : null,
      action.ipAddress || null,
      action.userAgent || null,
    ];

    try {
      const result: QueryResult = await database.query(query, values);
      const row = result.rows[0];

      return this.mapRowToAuditLog(row);
    } catch (error) {
      logger.error('Failed to create audit log entry', { error, action });
      throw new Error('Failed to create audit log entry');
    }
  }

  /**
   * Find audit logs with filters and pagination
   * @param filters - Query filters
   * @returns Paginated audit logs
   */
  async find(filters: AuditLogFilters = {}): Promise<PaginatedAuditLogs> {
    const {
      entityType,
      entityId,
      actionType,
      performedBy,
      startDate,
      endDate,
      minConfidenceScore,
      maxConfidenceScore,
      limit = 50,
      offset = 0,
    } = filters;

    // Build WHERE clause dynamically
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (entityType) {
      conditions.push(`entity_type = $${paramIndex++}`);
      values.push(entityType);
    }

    if (entityId) {
      conditions.push(`entity_id = $${paramIndex++}`);
      values.push(entityId);
    }

    if (actionType) {
      conditions.push(`action_type = $${paramIndex++}`);
      values.push(actionType);
    }

    if (performedBy) {
      conditions.push(`performed_by = $${paramIndex++}`);
      values.push(performedBy);
    }

    if (startDate) {
      conditions.push(`timestamp >= $${paramIndex++}`);
      values.push(startDate);
    }

    if (endDate) {
      conditions.push(`timestamp <= $${paramIndex++}`);
      values.push(endDate);
    }

    if (minConfidenceScore !== undefined) {
      conditions.push(`confidence_score >= $${paramIndex++}`);
      values.push(minConfidenceScore);
    }

    if (maxConfidenceScore !== undefined) {
      conditions.push(`confidence_score <= $${paramIndex++}`);
      values.push(maxConfidenceScore);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Query for total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM audit_logs
      ${whereClause}
    `;

    // Query for paginated results
    const dataQuery = `
      SELECT 
        id,
        action_type,
        entity_type,
        entity_id,
        performed_by,
        confidence_score,
        details,
        ip_address,
        user_agent,
        timestamp
      FROM audit_logs
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT $${paramIndex++}
      OFFSET $${paramIndex++}
    `;

    try {
      const [countResult, dataResult] = await Promise.all([
        database.query(countQuery, values),
        database.query(dataQuery, [...values, limit, offset]),
      ]);

      const total = parseInt(countResult.rows[0].total, 10);
      const logs = dataResult.rows.map(row => this.mapRowToAuditLog(row));

      return {
        logs,
        total,
        limit,
        offset,
      };
    } catch (error) {
      logger.error('Failed to query audit logs', { error, filters });
      throw new Error('Failed to query audit logs');
    }
  }

  /**
   * Find audit logs by entity
   * @param entityType - Type of entity
   * @param entityId - ID of entity
   * @param limit - Maximum number of logs to return
   * @returns Array of audit logs
   */
  async findByEntity(
    entityType: EntityType,
    entityId: string,
    limit: number = 100
  ): Promise<AuditLog[]> {
    const result = await this.find({
      entityType,
      entityId,
      limit,
      offset: 0,
    });

    return result.logs;
  }

  /**
   * Find audit logs by user
   * @param performedBy - User ID or 'SYSTEM'
   * @param limit - Maximum number of logs to return
   * @returns Array of audit logs
   */
  async findByUser(performedBy: string, limit: number = 100): Promise<AuditLog[]> {
    const result = await this.find({
      performedBy,
      limit,
      offset: 0,
    });

    return result.logs;
  }

  /**
   * Find audit logs by action type
   * @param actionType - Type of action
   * @param limit - Maximum number of logs to return
   * @returns Array of audit logs
   */
  async findByActionType(actionType: string, limit: number = 100): Promise<AuditLog[]> {
    const result = await this.find({
      actionType,
      limit,
      offset: 0,
    });

    return result.logs;
  }

  /**
   * Find audit logs within a date range
   * @param startDate - Start date
   * @param endDate - End date
   * @param limit - Maximum number of logs to return
   * @returns Array of audit logs
   */
  async findByDateRange(
    startDate: Date,
    endDate: Date,
    limit: number = 100
  ): Promise<AuditLog[]> {
    const result = await this.find({
      startDate,
      endDate,
      limit,
      offset: 0,
    });

    return result.logs;
  }

  /**
   * Get audit log by ID
   * @param id - Audit log ID
   * @returns Audit log or null if not found
   */
  async findById(id: string): Promise<AuditLog | null> {
    const query = `
      SELECT 
        id,
        action_type,
        entity_type,
        entity_id,
        performed_by,
        confidence_score,
        details,
        ip_address,
        user_agent,
        timestamp
      FROM audit_logs
      WHERE id = $1
    `;

    try {
      const result: QueryResult = await database.query(query, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToAuditLog(result.rows[0]);
    } catch (error) {
      logger.error('Failed to find audit log by ID', { error, id });
      throw new Error('Failed to find audit log by ID');
    }
  }

  /**
   * Map database row to AuditLog object
   * @param row - Database row
   * @returns AuditLog object
   */
  private mapRowToAuditLog(row: any): AuditLog {
    return {
      id: row.id,
      actionType: row.action_type,
      entityType: row.entity_type as EntityType,
      entityId: row.entity_id,
      performedBy: row.performed_by,
      confidenceScore: row.confidence_score ? parseFloat(row.confidence_score) : undefined,
      details: row.details || undefined,
      ipAddress: row.ip_address || undefined,
      userAgent: row.user_agent || undefined,
      timestamp: new Date(row.timestamp),
    };
  }
}

export default new AuditLogRepository();
