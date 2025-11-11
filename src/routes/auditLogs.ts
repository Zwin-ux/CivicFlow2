/**
 * Audit Log Routes
 * REST API endpoints for querying and exporting audit logs
 */

import { Router, Request, Response, NextFunction } from 'express';
import auditLogService from '../services/auditLogService';
import { AuditLogFilters, EntityType } from '../models/auditLog';
import { AppError } from '../utils/errors';
import { authenticate } from '../middleware/authenticate';
import { checkPermission } from '../middleware/checkPermission';
import { Resource, Action } from '../config/permissions';

const router = Router();

// All audit log routes require authentication and audit log read permission
router.use(authenticate);
router.use(checkPermission(Resource.AUDIT_LOG, Action.READ));

/**
 * GET /audit-logs
 * Query audit logs with filters and pagination
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters: AuditLogFilters = {
      entityType: req.query.entityType as EntityType | undefined,
      entityId: req.query.entityId as string | undefined,
      actionType: req.query.actionType as string | undefined,
      performedBy: req.query.performedBy as string | undefined,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      minConfidenceScore: req.query.minConfidenceScore
        ? parseFloat(req.query.minConfidenceScore as string)
        : undefined,
      maxConfidenceScore: req.query.maxConfidenceScore
        ? parseFloat(req.query.maxConfidenceScore as string)
        : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined,
    };

    const result = await auditLogService.queryLogs(filters);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /audit-logs/:id
 * Get a specific audit log by ID
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const log = await auditLogService.getLogById(id);

    if (!log) {
      throw new AppError('Audit log not found', 404, 'AUDIT_LOG_NOT_FOUND');
    }

    res.json({
      success: true,
      data: log,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /audit-logs/entity/:entityType/:entityId
 * Get audit logs for a specific entity
 */
router.get(
  '/entity/:entityType/:entityId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { entityType, entityId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;

      // Validate entity type
      if (!Object.values(EntityType).includes(entityType as EntityType)) {
        throw new AppError('Invalid entity type', 400, 'INVALID_ENTITY_TYPE');
      }

      const logs = await auditLogService.getEntityLogs(
        entityType as EntityType,
        entityId,
        limit
      );

      res.json({
        success: true,
        data: logs,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /audit-logs/user/:userId
 * Get audit logs for a specific user
 */
router.get('/user/:userId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;

    const logs = await auditLogService.getUserLogs(userId, limit);

    res.json({
      success: true,
      data: logs,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /audit-logs/export/csv
 * Export audit logs to CSV format
 */
router.get('/export/csv', checkPermission(Resource.AUDIT_LOG, Action.EXPORT), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters: AuditLogFilters = {
      entityType: req.query.entityType as EntityType | undefined,
      entityId: req.query.entityId as string | undefined,
      actionType: req.query.actionType as string | undefined,
      performedBy: req.query.performedBy as string | undefined,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      minConfidenceScore: req.query.minConfidenceScore
        ? parseFloat(req.query.minConfidenceScore as string)
        : undefined,
      maxConfidenceScore: req.query.maxConfidenceScore
        ? parseFloat(req.query.maxConfidenceScore as string)
        : undefined,
    };

    const csv = await auditLogService.exportToCSV(filters);

    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="audit-logs-${new Date().toISOString()}.csv"`
    );

    res.send(csv);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /audit-logs/export/json
 * Export audit logs to JSON format
 */
router.get('/export/json', checkPermission(Resource.AUDIT_LOG, Action.EXPORT), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters: AuditLogFilters = {
      entityType: req.query.entityType as EntityType | undefined,
      entityId: req.query.entityId as string | undefined,
      actionType: req.query.actionType as string | undefined,
      performedBy: req.query.performedBy as string | undefined,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      minConfidenceScore: req.query.minConfidenceScore
        ? parseFloat(req.query.minConfidenceScore as string)
        : undefined,
      maxConfidenceScore: req.query.maxConfidenceScore
        ? parseFloat(req.query.maxConfidenceScore as string)
        : undefined,
    };

    const json = await auditLogService.exportToJSON(filters);

    // Set headers for JSON download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="audit-logs-${new Date().toISOString()}.json"`
    );

    res.send(json);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /audit-logs/security/breaches
 * Detect potential privacy breaches
 */
router.get('/security/breaches', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const alerts = await auditLogService.detectPrivacyBreaches();

    res.json({
      success: true,
      data: {
        alerts,
        count: alerts.length,
        checkedAt: new Date(),
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
