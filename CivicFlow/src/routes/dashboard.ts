/**
 * Dashboard Routes
 * REST API endpoints for loan operations dashboard
 */

import { Router, Request, Response } from 'express';
import dashboardService from '../services/dashboardService';
import communicationService from '../services/communicationService';
import applicationService from '../services/applicationService';
import teamsIntegrationService from '../services/teamsIntegrationService';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import logger from '../utils/logger';

const router = Router();

/**
 * Get pipeline view
 * GET /api/dashboard/pipeline
 */
router.get(
  '/pipeline',
  authenticate,
  authorize('Reviewer', 'Approver', 'Administrator'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const filters: any = {};

      if (req.query.programType) {
        filters.programType = req.query.programType as string;
      }

      if (req.query.assignedTo) {
        filters.assignedTo = req.query.assignedTo as string;
      }

      const result = await dashboardService.getPipelineView(filters);

      res.json(result);
    } catch (error: any) {
      logger.error('Failed to get pipeline view', { error, query: req.query });
      res.status(500).json({
        error: {
          code: 'PIPELINE_FETCH_FAILED',
          message: error.message || 'Failed to retrieve pipeline view',
          timestamp: new Date(),
        },
      });
    }
  }
);

/**
 * Get queue view
 * GET /api/dashboard/queue
 */
router.get(
  '/queue',
  authenticate,
  authorize('Reviewer', 'Approver', 'Administrator'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const view = (req.query.view as string) || 'my-queue';
      
      if (view !== 'my-queue' && view !== 'unassigned') {
        res.status(400).json({
          error: {
            code: 'INVALID_VIEW',
            message: 'View must be "my-queue" or "unassigned"',
            timestamp: new Date(),
          },
        });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      const filters = {
        view: view as 'my-queue' | 'unassigned',
        userId: view === 'my-queue' ? req.user!.userId : undefined,
        page,
        limit,
      };

      const result = await dashboardService.getQueueView(filters);

      res.json(result);
    } catch (error: any) {
      logger.error('Failed to get queue view', { error, query: req.query });
      res.status(500).json({
        error: {
          code: 'QUEUE_FETCH_FAILED',
          message: error.message || 'Failed to retrieve queue view',
          timestamp: new Date(),
        },
      });
    }
  }
);

/**
 * Claim an application
 * POST /api/dashboard/queue/claim
 */
router.post(
  '/queue/claim',
  authenticate,
  authorize('Reviewer', 'Approver', 'Administrator'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { applicationId } = req.body;

      if (!applicationId) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'applicationId is required',
            timestamp: new Date(),
          },
        });
        return;
      }

      const result = await dashboardService.claimApplication(
        applicationId,
        req.user!.userId
      );

      res.json(result);
    } catch (error: any) {
      logger.error('Failed to claim application', { error, body: req.body });
      
      if (error.message.includes('not found') || error.message.includes('already assigned')) {
        res.status(400).json({
          error: {
            code: 'CLAIM_FAILED',
            message: error.message,
            timestamp: new Date(),
          },
        });
        return;
      }

      res.status(500).json({
        error: {
          code: 'CLAIM_FAILED',
          message: 'Failed to claim application',
          timestamp: new Date(),
        },
      });
    }
  }
);

/**
 * Get SLA analytics
 * GET /api/dashboard/sla
 */
router.get(
  '/sla',
  authenticate,
  authorize('Reviewer', 'Approver', 'Administrator'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const filters: any = {};

      if (req.query.startDate) {
        filters.startDate = new Date(req.query.startDate as string);
      }

      if (req.query.endDate) {
        filters.endDate = new Date(req.query.endDate as string);
      }

      const result = await dashboardService.getSLAAnalytics(filters);

      res.json(result);
    } catch (error: any) {
      logger.error('Failed to get SLA analytics', { error, query: req.query });
      res.status(500).json({
        error: {
          code: 'SLA_FETCH_FAILED',
          message: error.message || 'Failed to retrieve SLA analytics',
          timestamp: new Date(),
        },
      });
    }
  }
);

/**
 * Request documents from applicant
 * POST /api/dashboard/actions/request-documents
 */
router.post(
  '/actions/request-documents',
  authenticate,
  authorize('Reviewer', 'Approver', 'Administrator'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { applicationId, documentTypes, message } = req.body;

      if (!applicationId || !documentTypes || !Array.isArray(documentTypes)) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'applicationId and documentTypes array are required',
            timestamp: new Date(),
          },
        });
        return;
      }

      // Send document request communication
      await communicationService.sendDocumentRequest(
        applicationId,
        documentTypes,
        message || 'Please upload the following documents to complete your application.'
      );

      res.json({
        success: true,
        message: 'Document request sent successfully',
      });
    } catch (error: any) {
      logger.error('Failed to request documents', { error, body: req.body });
      res.status(500).json({
        error: {
          code: 'REQUEST_FAILED',
          message: error.message || 'Failed to request documents',
          timestamp: new Date(),
        },
      });
    }
  }
);

/**
 * Add internal note
 * POST /api/dashboard/actions/add-note
 */
router.post(
  '/actions/add-note',
  authenticate,
  authorize('Reviewer', 'Approver', 'Administrator'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { applicationId, note, isInternal } = req.body;

      if (!applicationId || !note) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'applicationId and note are required',
            timestamp: new Date(),
          },
        });
        return;
      }

      // Send internal note
      await communicationService.sendInternalNote(
        applicationId,
        note,
        req.user!.userId,
        isInternal !== false
      );

      res.json({
        success: true,
        message: 'Note added successfully',
      });
    } catch (error: any) {
      logger.error('Failed to add note', { error, body: req.body });
      res.status(500).json({
        error: {
          code: 'NOTE_FAILED',
          message: error.message || 'Failed to add note',
          timestamp: new Date(),
        },
      });
    }
  }
);

/**
 * Start Teams huddle
 * POST /api/dashboard/actions/start-huddle
 */
router.post(
  '/actions/start-huddle',
  authenticate,
  authorize('Reviewer', 'Approver', 'Administrator'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { applicationId, participants } = req.body;

      if (!applicationId || !participants || !Array.isArray(participants)) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'applicationId and participants array are required',
            timestamp: new Date(),
          },
        });
        return;
      }

      // Get application to create meeting subject
      const application = await applicationService.getApplication(
        applicationId,
        req.user!.userId
      );

      // Create Teams meeting (1 hour from now, 1 hour duration)
      const startDateTime = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
      const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // 1 hour duration

      const meetingInfo = await teamsIntegrationService.createMeeting(
        applicationId,
        `Application Review: ${application.programType}`,
        participants,
        startDateTime,
        endDateTime
      );

      res.json({
        success: true,
        meetingLink: meetingInfo.joinUrl,
        meetingId: meetingInfo.id,
      });
    } catch (error: any) {
      logger.error('Failed to start huddle', { error, body: req.body });
      res.status(500).json({
        error: {
          code: 'HUDDLE_FAILED',
          message: error.message || 'Failed to start Teams huddle',
          timestamp: new Date(),
        },
      });
    }
  }
);

/**
 * Log quick decision
 * POST /api/dashboard/actions/log-decision
 */
router.post(
  '/actions/log-decision',
  authenticate,
  authorize('Approver', 'Administrator'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { applicationId, decision, amount, justification, overrideReason } = req.body;

      if (!applicationId || !decision || !justification) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'applicationId, decision, and justification are required',
            timestamp: new Date(),
          },
        });
        return;
      }

      // Submit decision
      const application = await applicationService.submitDecision(
        applicationId,
        {
          decision,
          amount: amount ? parseFloat(amount) : undefined,
          justification,
          overrideReason,
        },
        req.user!.userId,
        req.user!.role
      );

      res.json({
        success: true,
        application,
      });
    } catch (error: any) {
      logger.error('Failed to log decision', { error, body: req.body });
      
      if (error.message.includes('not found')) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: error.message,
            timestamp: new Date(),
          },
        });
        return;
      }

      if (error.message.includes('required') || error.message.includes('must be')) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
            timestamp: new Date(),
          },
        });
        return;
      }

      res.status(500).json({
        error: {
          code: 'DECISION_FAILED',
          message: error.message || 'Failed to log decision',
          timestamp: new Date(),
        },
      });
    }
  }
);

export default router;
