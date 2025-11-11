/**
 * Metrics Routes
 * API endpoints for performance monitoring and metrics tracking
 */

import express, { Request, Response, NextFunction } from 'express';
import metricsService from '../services/metricsService';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import logger from '../utils/logger';

const router = express.Router();

/**
 * POST /api/metrics/classification-validations
 * Record a manual validation of document classification
 * Requires: REVIEWER, APPROVER, or ADMINISTRATOR role
 */
router.post(
  '/classification-validations',
  authenticate,
  authorize('Reviewer', 'Approver', 'Administrator'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { documentId, actualType } = req.body;
      const userId = req.user?.userId;

      if (!documentId || !actualType) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'documentId and actualType are required',
          },
        });
      }

      if (!userId) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
        });
      }

      const validation = await metricsService.recordClassificationValidation(
        documentId,
        actualType,
        userId
      );

      res.status(201).json(validation);
    } catch (error: any) {
      logger.error('Failed to record classification validation', { error, body: req.body });
      next(error);
    }
  }
);

/**
 * GET /api/metrics/classification-accuracy
 * Get classification accuracy metrics
 * Requires: ADMINISTRATOR or AUDITOR role
 */
router.get(
  '/classification-accuracy',
  authenticate,
  authorize('Administrator', 'Auditor'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { startDate, endDate, programType } = req.query;

      const filters: any = {};
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      if (programType) filters.programType = programType as string;

      const metrics = await metricsService.getClassificationAccuracyMetrics(filters);

      res.json(metrics);
    } catch (error: any) {
      logger.error('Failed to get classification accuracy metrics', { error, query: req.query });
      next(error);
    }
  }
);

/**
 * GET /api/metrics/processing-time
 * Get application processing time metrics
 * Requires: ADMINISTRATOR or AUDITOR role
 */
router.get(
  '/processing-time',
  authenticate,
  authorize('Administrator', 'Auditor'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { startDate, endDate, programType } = req.query;

      const filters: any = {};
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      if (programType) filters.programType = programType as string;

      const metrics = await metricsService.getProcessingTimeMetrics(filters);

      res.json(metrics);
    } catch (error: any) {
      logger.error('Failed to get processing time metrics', { error, query: req.query });
      next(error);
    }
  }
);

/**
 * POST /api/metrics/privacy-breaches/detect
 * Detect privacy breaches based on audit log patterns
 * Requires: ADMINISTRATOR role
 */
router.post(
  '/privacy-breaches/detect',
  authenticate,
  authorize('Administrator'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await metricsService.detectPrivacyBreaches();

      res.json(result);
    } catch (error: any) {
      logger.error('Failed to detect privacy breaches', { error });
      next(error);
    }
  }
);

/**
 * GET /api/metrics/privacy-breaches/alerts
 * Get unresolved privacy breach alerts
 * Requires: ADMINISTRATOR role
 */
router.get(
  '/privacy-breaches/alerts',
  authenticate,
  authorize('Administrator'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;

      const alerts = await metricsService.getUnresolvedAlerts(limit);

      res.json(alerts);
    } catch (error: any) {
      logger.error('Failed to get unresolved alerts', { error, query: req.query });
      next(error);
    }
  }
);

/**
 * POST /api/metrics/privacy-breaches/alerts/:id/acknowledge
 * Acknowledge a privacy breach alert
 * Requires: ADMINISTRATOR role
 */
router.post(
  '/privacy-breaches/alerts/:id/acknowledge',
  authenticate,
  authorize('Administrator'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
        });
      }

      const alert = await metricsService.acknowledgeAlert(id, userId);

      res.json(alert);
    } catch (error: any) {
      logger.error('Failed to acknowledge alert', { error, alertId: req.params.id });
      next(error);
    }
  }
);

/**
 * POST /api/metrics/privacy-breaches/alerts/:id/resolve
 * Resolve a privacy breach alert
 * Requires: ADMINISTRATOR role
 */
router.post(
  '/privacy-breaches/alerts/:id/resolve',
  authenticate,
  authorize('Administrator'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
        });
      }

      const alert = await metricsService.resolveAlert(id, userId, notes);

      res.json(alert);
    } catch (error: any) {
      logger.error('Failed to resolve alert', { error, alertId: req.params.id });
      next(error);
    }
  }
);

/**
 * GET /api/metrics/summary
 * Get comprehensive performance metrics summary
 * Requires: ADMINISTRATOR or AUDITOR role
 */
router.get(
  '/summary',
  authenticate,
  authorize('Administrator', 'Auditor'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { startDate, endDate, programType } = req.query;

      const filters: any = {};
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      if (programType) filters.programType = programType as string;

      const summary = await metricsService.getPerformanceMetricsSummary(filters);

      res.json(summary);
    } catch (error: any) {
      logger.error('Failed to get performance metrics summary', { error, query: req.query });
      next(error);
    }
  }
);

export default router;
