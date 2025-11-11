/**
 * Audit Log Service
 * Business logic layer for audit log operations
 */

import auditLogRepository from '../repositories/auditLogRepository';
import {
  AuditLog,
  AuditLogFilters,
  PaginatedAuditLogs,
  EntityType,
} from '../models/auditLog';
import logger from '../utils/logger';

class AuditLogService {
  /**
   * Query audit logs with filters and pagination
   * @param filters - Query filters
   * @returns Paginated audit logs
   */
  async queryLogs(filters: AuditLogFilters): Promise<PaginatedAuditLogs> {
    try {
      // Validate filters
      this.validateFilters(filters);

      // Set default pagination if not provided
      const paginationFilters = {
        ...filters,
        limit: filters.limit || 50,
        offset: filters.offset || 0,
      };

      // Ensure limit doesn't exceed maximum
      if (paginationFilters.limit > 1000) {
        paginationFilters.limit = 1000;
      }

      return await auditLogRepository.find(paginationFilters);
    } catch (error) {
      logger.error('Failed to query audit logs', { error, filters });
      throw error;
    }
  }

  /**
   * Get audit logs for a specific entity
   * @param entityType - Type of entity
   * @param entityId - ID of entity
   * @param limit - Maximum number of logs to return
   * @returns Array of audit logs
   */
  async getEntityLogs(
    entityType: EntityType,
    entityId: string,
    limit: number = 100
  ): Promise<AuditLog[]> {
    try {
      return await auditLogRepository.findByEntity(entityType, entityId, limit);
    } catch (error) {
      logger.error('Failed to get entity logs', { error, entityType, entityId });
      throw error;
    }
  }

  /**
   * Get audit logs for a specific user
   * @param userId - User ID
   * @param limit - Maximum number of logs to return
   * @returns Array of audit logs
   */
  async getUserLogs(userId: string, limit: number = 100): Promise<AuditLog[]> {
    try {
      return await auditLogRepository.findByUser(userId, limit);
    } catch (error) {
      logger.error('Failed to get user logs', { error, userId });
      throw error;
    }
  }

  /**
   * Get audit log by ID
   * @param id - Audit log ID
   * @returns Audit log or null if not found
   */
  async getLogById(id: string): Promise<AuditLog | null> {
    try {
      return await auditLogRepository.findById(id);
    } catch (error) {
      logger.error('Failed to get audit log by ID', { error, id });
      throw error;
    }
  }

  /**
   * Export audit logs to CSV format
   * @param filters - Query filters
   * @returns CSV string
   */
  async exportToCSV(filters: AuditLogFilters): Promise<string> {
    try {
      // Get all logs matching filters (up to 10000 records)
      const result = await auditLogRepository.find({
        ...filters,
        limit: 10000,
        offset: 0,
      });

      // Build CSV header
      const headers = [
        'ID',
        'Timestamp',
        'Action Type',
        'Entity Type',
        'Entity ID',
        'Performed By',
        'Confidence Score',
        'IP Address',
        'User Agent',
        'Details',
      ];

      // Build CSV rows
      const rows = result.logs.map(log => [
        log.id,
        log.timestamp.toISOString(),
        log.actionType,
        log.entityType,
        log.entityId,
        log.performedBy,
        log.confidenceScore?.toString() || '',
        log.ipAddress || '',
        log.userAgent || '',
        log.details ? JSON.stringify(log.details) : '',
      ]);

      // Combine header and rows
      const csvLines = [
        headers.join(','),
        ...rows.map(row => row.map(cell => this.escapeCSVCell(cell)).join(',')),
      ];

      return csvLines.join('\n');
    } catch (error) {
      logger.error('Failed to export audit logs to CSV', { error, filters });
      throw error;
    }
  }

  /**
   * Export audit logs to JSON format
   * @param filters - Query filters
   * @returns JSON string
   */
  async exportToJSON(filters: AuditLogFilters): Promise<string> {
    try {
      // Get all logs matching filters (up to 10000 records)
      const result = await auditLogRepository.find({
        ...filters,
        limit: 10000,
        offset: 0,
      });

      const exportData = {
        metadata: {
          exportedAt: new Date().toISOString(),
          totalRecords: result.total,
          exportedRecords: result.logs.length,
          filters,
        },
        logs: result.logs,
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      logger.error('Failed to export audit logs to JSON', { error, filters });
      throw error;
    }
  }

  /**
   * Detect potential privacy breaches based on audit log patterns
   * @returns Array of potential breach alerts
   */
  async detectPrivacyBreaches(): Promise<any[]> {
    try {
      const alerts: any[] = [];

      // Check for unusual access patterns in the last 24 hours
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Get all logs from the last 24 hours
      const recentLogs = await auditLogRepository.find({
        startDate: oneDayAgo,
        limit: 10000,
        offset: 0,
      });

      // Analyze patterns
      const userAccessCounts: Record<string, number> = {};
      const failedAccessAttempts: Record<string, number> = {};

      for (const log of recentLogs.logs) {
        // Count access by user
        userAccessCounts[log.performedBy] = (userAccessCounts[log.performedBy] || 0) + 1;

        // Count failed access attempts
        if (log.actionType.includes('FAILED') || log.actionType.includes('UNAUTHORIZED')) {
          failedAccessAttempts[log.performedBy] = (failedAccessAttempts[log.performedBy] || 0) + 1;
        }
      }

      // Alert on excessive access (more than 1000 requests in 24 hours)
      for (const [userId, count] of Object.entries(userAccessCounts)) {
        if (count > 1000) {
          alerts.push({
            type: 'EXCESSIVE_ACCESS',
            severity: 'HIGH',
            userId,
            count,
            message: `User ${userId} made ${count} requests in the last 24 hours`,
            detectedAt: new Date(),
          });
        }
      }

      // Alert on multiple failed access attempts (more than 10 in 24 hours)
      for (const [userId, count] of Object.entries(failedAccessAttempts)) {
        if (count > 10) {
          alerts.push({
            type: 'MULTIPLE_FAILED_ATTEMPTS',
            severity: 'MEDIUM',
            userId,
            count,
            message: `User ${userId} had ${count} failed access attempts in the last 24 hours`,
            detectedAt: new Date(),
          });
        }
      }

      return alerts;
    } catch (error) {
      logger.error('Failed to detect privacy breaches', { error });
      throw error;
    }
  }

  /**
   * Validate audit log filters
   * @param filters - Filters to validate
   */
  private validateFilters(filters: AuditLogFilters): void {
    if (filters.minConfidenceScore !== undefined) {
      if (filters.minConfidenceScore < 0 || filters.minConfidenceScore > 100) {
        throw new Error('minConfidenceScore must be between 0 and 100');
      }
    }

    if (filters.maxConfidenceScore !== undefined) {
      if (filters.maxConfidenceScore < 0 || filters.maxConfidenceScore > 100) {
        throw new Error('maxConfidenceScore must be between 0 and 100');
      }
    }

    if (
      filters.minConfidenceScore !== undefined &&
      filters.maxConfidenceScore !== undefined &&
      filters.minConfidenceScore > filters.maxConfidenceScore
    ) {
      throw new Error('minConfidenceScore cannot be greater than maxConfidenceScore');
    }

    if (filters.startDate && filters.endDate && filters.startDate > filters.endDate) {
      throw new Error('startDate cannot be after endDate');
    }

    if (filters.limit !== undefined && filters.limit < 1) {
      throw new Error('limit must be at least 1');
    }

    if (filters.offset !== undefined && filters.offset < 0) {
      throw new Error('offset cannot be negative');
    }
  }

  /**
   * Escape CSV cell content
   * @param cell - Cell content
   * @returns Escaped cell content
   */
  private escapeCSVCell(cell: string): string {
    if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
      return `"${cell.replace(/"/g, '""')}"`;
    }
    return cell;
  }
}

export default new AuditLogService();
