/**
 * Communication Routes
 * API endpoints for communication management
 */

import { Router, Request, Response } from 'express';
import communicationService from '../services/communicationService';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import logger from '../utils/logger';

const router = Router();

/**
 * GET /api/v1/communications/applications/:applicationId
 * Get communication history for an application
 */
router.get(
  '/applications/:applicationId',
  authenticate,
  authorize('Reviewer', 'Approver', 'Administrator', 'Auditor'),
  async (req: Request, res: Response) => {
    try {
      const { applicationId } = req.params;

      const communications = await communicationService.getCommunicationHistory(applicationId);

      res.json({
        success: true,
        data: communications,
      });
    } catch (error: any) {
      logger.error('Failed to get communication history', { error, params: req.params });
      res.status(500).json({
        success: false,
        error: {
          code: 'COMMUNICATION_HISTORY_ERROR',
          message: 'Failed to retrieve communication history',
          details: error.message,
        },
      });
    }
  }
);

/**
 * GET /api/v1/communications/:id
 * Get communication by ID
 */
router.get(
  '/:id',
  authenticate,
  authorize('Reviewer', 'Approver', 'Administrator', 'Auditor'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const communication = await communicationService.getCommunication(id);

      if (!communication) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'COMMUNICATION_NOT_FOUND',
            message: 'Communication not found',
          },
        });
      }

      res.json({
        success: true,
        data: communication,
      });
    } catch (error: any) {
      logger.error('Failed to get communication', { error, params: req.params });
      res.status(500).json({
        success: false,
        error: {
          code: 'COMMUNICATION_ERROR',
          message: 'Failed to retrieve communication',
          details: error.message,
        },
      });
    }
  }
);

/**
 * POST /api/v1/communications/applications/:applicationId/notify
 * Send notification for application status change
 */
router.post(
  '/applications/:applicationId/notify',
  authenticate,
  authorize('Reviewer', 'Approver', 'Administrator'),
  async (req: Request, res: Response) => {
    try {
      const { applicationId } = req.params;
      const { templateType } = req.body;

      if (!templateType) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Template type is required',
          },
        });
      }

      const communication = await communicationService.sendApplicationNotification(
        applicationId,
        templateType
      );

      res.json({
        success: true,
        data: communication,
        message: 'Notification queued for sending',
      });
    } catch (error: any) {
      logger.error('Failed to send application notification', {
        error,
        params: req.params,
        body: req.body,
      });
      res.status(500).json({
        success: false,
        error: {
          code: 'NOTIFICATION_ERROR',
          message: 'Failed to send notification',
          details: error.message,
        },
      });
    }
  }
);

/**
 * POST /api/v1/communications/applications/:applicationId/staff-summary
 * Generate and send staff summary
 */
router.post(
  '/applications/:applicationId/staff-summary',
  authenticate,
  authorize('Reviewer', 'Approver', 'Administrator'),
  async (req: Request, res: Response) => {
    try {
      const { applicationId } = req.params;
      const { staffEmail } = req.body;

      if (!staffEmail) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Staff email is required',
          },
        });
      }

      const communication = await communicationService.sendStaffSummary(
        applicationId,
        staffEmail
      );

      res.json({
        success: true,
        data: communication,
        message: 'Staff summary queued for sending',
      });
    } catch (error: any) {
      logger.error('Failed to send staff summary', {
        error,
        params: req.params,
        body: req.body,
      });
      res.status(500).json({
        success: false,
        error: {
          code: 'STAFF_SUMMARY_ERROR',
          message: 'Failed to send staff summary',
          details: error.message,
        },
      });
    }
  }
);

/**
 * GET /api/v1/communications/applications/:applicationId/summary
 * Generate staff summary without sending
 */
router.get(
  '/applications/:applicationId/summary',
  authenticate,
  authorize('Reviewer', 'Approver', 'Administrator'),
  async (req: Request, res: Response) => {
    try {
      const { applicationId } = req.params;

      const summary = await communicationService.generateStaffSummary(applicationId);

      res.json({
        success: true,
        data: summary,
      });
    } catch (error: any) {
      logger.error('Failed to generate staff summary', { error, params: req.params });
      res.status(500).json({
        success: false,
        error: {
          code: 'SUMMARY_GENERATION_ERROR',
          message: 'Failed to generate staff summary',
          details: error.message,
        },
      });
    }
  }
);

/**
 * POST /api/v1/communications/process-queue
 * Process email queue (typically called by a scheduled job)
 */
router.post(
  '/process-queue',
  authenticate,
  authorize('Administrator'),
  async (_req: Request, res: Response) => {
    try {
      await communicationService.processEmailQueue();

      res.json({
        success: true,
        message: 'Email queue processed',
      });
    } catch (error: any) {
      logger.error('Failed to process email queue', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'QUEUE_PROCESSING_ERROR',
          message: 'Failed to process email queue',
          details: error.message,
        },
      });
    }
  }
);

export default router;
