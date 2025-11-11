/**
 * Audit Log Data Models
 * Defines TypeScript interfaces for audit logging system
 */

export enum EntityType {
  APPLICATION = 'APPLICATION',
  DOCUMENT = 'DOCUMENT',
  APPLICANT = 'APPLICANT',
  USER = 'USER',
  SYSTEM = 'SYSTEM',
  PROGRAM_RULE = 'PROGRAM_RULE',
  COMMUNICATION = 'COMMUNICATION',
}

/**
 * AuditAction interface for creating new audit log entries
 */
export interface AuditAction {
  actionType: string;
  entityType: EntityType;
  entityId: string;
  performedBy: string; // user ID or 'SYSTEM'
  confidenceScore?: number; // 0-100 for automated actions
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * AuditLog interface representing a complete audit log entry
 */
export interface AuditLog extends AuditAction {
  id: string;
  timestamp: Date;
}

/**
 * Query filters for retrieving audit logs
 */
export interface AuditLogFilters {
  entityType?: EntityType;
  entityId?: string;
  actionType?: string;
  performedBy?: string;
  startDate?: Date;
  endDate?: Date;
  minConfidenceScore?: number;
  maxConfidenceScore?: number;
  limit?: number;
  offset?: number;
}

/**
 * Paginated audit log response
 */
export interface PaginatedAuditLogs {
  logs: AuditLog[];
  total: number;
  limit: number;
  offset: number;
}
