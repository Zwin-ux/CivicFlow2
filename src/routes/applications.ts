/**
 * Application Routes
 * REST API endpoints for application management
 * 
 * @swagger
 * components:
 *   schemas:
 *     CreateApplicationRequest:
 *       type: object
 *       required:
 *         - applicantId
 *         - programType
 *         - requestedAmount
 *       properties:
 *         applicantId:
 *           type: string
 *           format: uuid
 *           description: Applicant unique identifier
 *         programType:
 *           type: string
 *           description: Type of grant or loan program
 *           example: SMALL_BUSINESS_GRANT
 *         requestedAmount:
 *           type: number
 *           format: decimal
 *           description: Requested loan or grant amount
 *           example: 50000.00
 *     DecisionRequest:
 *       type: object
 *       required:
 *         - decision
 *         - justification
 *       properties:
 *         decision:
 *           type: string
 *           enum: [APPROVED, REJECTED, DEFERRED]
 *           description: Final decision on the application
 *         amount:
 *           type: number
 *           format: decimal
 *           description: Approved amount (required if decision is APPROVED)
 *         justification:
 *           type: string
 *           description: Detailed justification for the decision
 *         overrideReason:
 *           type: string
 *           description: Reason for overriding automated eligibility score
 */

import { Router, Request, Response } from 'express';
import applicationService from '../services/applicationService';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import logger from '../utils/logger';
import {
  CreateApplicationRequest,
  UpdateApplicationRequest,
  ApplicationStatus,
} from '../models/application';

const router = Router();

/**
 * @swagger
 * /applications:
 *   post:
 *     summary: Create a new application
 *     description: Creates a new grant or loan application. Requires Applicant or Administrator role.
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateApplicationRequest'
 *     responses:
 *       201:
 *         description: Application created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Application'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.post(
  '/',
  authenticate,
  authorize('Applicant', 'Administrator'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const data: CreateApplicationRequest = {
        applicantId: req.body.applicantId,
        programType: req.body.programType,
        requestedAmount: parseFloat(req.body.requestedAmount),
      };

      // Validate required fields
      if (!data.applicantId || !data.programType || !data.requestedAmount) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing required fields: applicantId, programType, requestedAmount',
            timestamp: new Date(),
          },
        });
        return;
      }

      const application = await applicationService.createApplication(
        data,
        req.user!.userId
      );

      res.status(201).json(application);
    } catch (error: any) {
      logger.error('Failed to create application', { error, body: req.body });
      res.status(400).json({
        error: {
          code: 'CREATE_FAILED',
          message: error.message || 'Failed to create application',
          timestamp: new Date(),
        },
      });
    }
  }
);

/**
 * @swagger
 * /applications/{id}:
 *   get:
 *     summary: Get application by ID
 *     description: Retrieves a specific application by its ID. Access controlled by role permissions.
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Application ID
 *     responses:
 *       200:
 *         description: Application retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Application'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get(
  '/:id',
  authenticate,
  authorize('Applicant', 'Reviewer', 'Approver', 'Administrator', 'Auditor'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const application = await applicationService.getApplication(id, req.user!.userId);

      res.json(application);
    } catch (error: any) {
      logger.error('Failed to get application', { error, id: req.params.id });
      
      if (error.message === 'Application not found') {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Application not found',
            timestamp: new Date(),
          },
        });
        return;
      }

      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve application',
          timestamp: new Date(),
        },
      });
    }
  }
);

/**
 * Update application
 * PATCH /api/applications/:id
 */
router.patch(
  '/:id',
  authenticate,
  authorize('Applicant', 'Reviewer', 'Approver', 'Administrator'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const data: UpdateApplicationRequest = {};

      // Only include fields that are present in the request
      if (req.body.requestedAmount !== undefined) {
        data.requestedAmount = parseFloat(req.body.requestedAmount);
      }
      if (req.body.status !== undefined) {
        data.status = req.body.status as ApplicationStatus;
      }
      if (req.body.assignedTo !== undefined) {
        data.assignedTo = req.body.assignedTo;
      }
      if (req.body.decision !== undefined) {
        data.decision = req.body.decision;
      }

      const application = await applicationService.updateApplication(
        id,
        data,
        req.user!.userId
      );

      res.json(application);
    } catch (error: any) {
      logger.error('Failed to update application', { error, id: req.params.id });

      if (error.message === 'Application not found') {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Application not found',
            timestamp: new Date(),
          },
        });
        return;
      }

      if (error.message.includes('Invalid status transition')) {
        res.status(400).json({
          error: {
            code: 'INVALID_TRANSITION',
            message: error.message,
            timestamp: new Date(),
          },
        });
        return;
      }

      res.status(400).json({
        error: {
          code: 'UPDATE_FAILED',
          message: error.message || 'Failed to update application',
          timestamp: new Date(),
        },
      });
    }
  }
);

/**
 * Submit application for review
 * POST /api/applications/:id/submit
 */
router.post(
  '/:id/submit',
  authenticate,
  authorize('Applicant', 'Administrator'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const application = await applicationService.submitApplication(id, req.user!.userId);

      res.json(application);
    } catch (error: any) {
      logger.error('Failed to submit application', { error, id: req.params.id });

      if (error.message === 'Application not found') {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Application not found',
            timestamp: new Date(),
          },
        });
        return;
      }

      if (error.message === 'Only draft applications can be submitted') {
        res.status(400).json({
          error: {
            code: 'INVALID_STATUS',
            message: error.message,
            timestamp: new Date(),
          },
        });
        return;
      }

      res.status(400).json({
        error: {
          code: 'SUBMIT_FAILED',
          message: error.message || 'Failed to submit application',
          timestamp: new Date(),
        },
      });
    }
  }
);

/**
 * Calculate eligibility score
 * POST /api/applications/:id/eligibility
 */
router.post(
  '/:id/eligibility',
  authenticate,
  authorize('Reviewer', 'Approver', 'Administrator'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const eligibilityResult = await applicationService.calculateEligibility(id);

      res.json(eligibilityResult);
    } catch (error: any) {
      logger.error('Failed to calculate eligibility', { error, id: req.params.id });

      if (error.message === 'Application not found') {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Application not found',
            timestamp: new Date(),
          },
        });
        return;
      }

      res.status(500).json({
        error: {
          code: 'CALCULATION_FAILED',
          message: error.message || 'Failed to calculate eligibility',
          timestamp: new Date(),
        },
      });
    }
  }
);

/**
 * Detect missing documents
 * GET /api/applications/:id/missing-documents
 */
router.get(
  '/:id/missing-documents',
  authenticate,
  authorize('Applicant', 'Reviewer', 'Approver', 'Administrator'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const missingDocuments = await applicationService.detectMissingDocuments(id);

      res.json({ missingDocuments });
    } catch (error: any) {
      logger.error('Failed to detect missing documents', { error, id: req.params.id });

      if (error.message === 'Application not found') {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Application not found',
            timestamp: new Date(),
          },
        });
        return;
      }

      res.status(500).json({
        error: {
          code: 'DETECTION_FAILED',
          message: error.message || 'Failed to detect missing documents',
          timestamp: new Date(),
        },
      });
    }
  }
);

/**
 * Update fraud flags
 * PUT /api/applications/:id/fraud-flags
 */
router.put(
  '/:id/fraud-flags',
  authenticate,
  authorize('Reviewer', 'Approver', 'Administrator'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { fraudFlags } = req.body;

      if (!Array.isArray(fraudFlags)) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'fraudFlags must be an array',
            timestamp: new Date(),
          },
        });
        return;
      }

      const application = await applicationService.updateFraudFlags(
        id,
        fraudFlags,
        req.user!.userId
      );

      res.json(application);
    } catch (error: any) {
      logger.error('Failed to update fraud flags', { error, id: req.params.id });

      if (error.message === 'Application not found') {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Application not found',
            timestamp: new Date(),
          },
        });
        return;
      }

      res.status(400).json({
        error: {
          code: 'UPDATE_FAILED',
          message: error.message || 'Failed to update fraud flags',
          timestamp: new Date(),
        },
      });
    }
  }
);

/**
 * Get staff review queue
 * GET /api/applications/queue/review
 */
router.get(
  '/queue/review',
  authenticate,
  authorize('Reviewer', 'Approver', 'Administrator'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      // Parse query parameters
      const filters: any = {};

      // Staff member filter (optional - defaults to all if not provided)
      if (req.query.staffMemberId) {
        filters.staffMemberId = req.query.staffMemberId as string;
      }

      // Status filter (can be multiple)
      if (req.query.status) {
        const statusParam = req.query.status as string;
        filters.status = statusParam.split(',') as ApplicationStatus[];
      }

      // Program type filter
      if (req.query.programType) {
        filters.programType = req.query.programType as string;
      }

      // Sorting
      if (req.query.sortBy) {
        filters.sortBy = req.query.sortBy as 'submittedAt' | 'eligibilityScore';
      }
      if (req.query.sortOrder) {
        filters.sortOrder = req.query.sortOrder as 'ASC' | 'DESC';
      }

      // Pagination
      if (req.query.page) {
        filters.page = parseInt(req.query.page as string, 10);
      }
      if (req.query.pageSize) {
        filters.pageSize = parseInt(req.query.pageSize as string, 10);
      }

      const result = await applicationService.getReviewQueue(filters, req.user!.userId);

      res.json(result);
    } catch (error: any) {
      logger.error('Failed to get review queue', { error, query: req.query });

      res.status(500).json({
        error: {
          code: 'QUEUE_FETCH_FAILED',
          message: error.message || 'Failed to retrieve review queue',
          timestamp: new Date(),
        },
      });
    }
  }
);

/**
 * @swagger
 * /applications/{id}/decision:
 *   post:
 *     summary: Submit decision for an application
 *     description: Submit final approval, rejection, or deferral decision. Requires Approver or Administrator role.
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Application ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DecisionRequest'
 *           examples:
 *             approved:
 *               summary: Approve application
 *               value:
 *                 decision: APPROVED
 *                 amount: 50000.00
 *                 justification: "Applicant meets all eligibility criteria and has strong financials"
 *             rejected:
 *               summary: Reject application
 *               value:
 *                 decision: REJECTED
 *                 justification: "Applicant does not meet minimum credit score requirement"
 *     responses:
 *       200:
 *         description: Decision submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Application'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.post(
  '/:id/decision',
  authenticate,
  authorize('Approver', 'Administrator'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { decision, amount, justification, overrideReason } = req.body;

      // Validate required fields
      if (!decision) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Decision is required',
            timestamp: new Date(),
          },
        });
        return;
      }

      if (!justification) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Justification is required',
            timestamp: new Date(),
          },
        });
        return;
      }

      // Validate decision value
      const validDecisions = ['APPROVED', 'REJECTED', 'DEFERRED'];
      if (!validDecisions.includes(decision)) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Decision must be APPROVED, REJECTED, or DEFERRED',
            timestamp: new Date(),
          },
        });
        return;
      }

      const decisionData = {
        decision,
        amount: amount ? parseFloat(amount) : undefined,
        justification,
        overrideReason,
      };

      const application = await applicationService.submitDecision(
        id,
        decisionData,
        req.user!.userId,
        req.user!.role
      );

      res.json(application);
    } catch (error: any) {
      logger.error('Failed to submit decision', { error, id: req.params.id });

      if (error.message === 'Application not found') {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Application not found',
            timestamp: new Date(),
          },
        });
        return;
      }

      if (error.message.includes('Only Approver or Administrator')) {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: error.message,
            timestamp: new Date(),
          },
        });
        return;
      }

      if (
        error.message.includes('Cannot make decision') ||
        error.message.includes('required') ||
        error.message.includes('must be') ||
        error.message.includes('cannot exceed')
      ) {
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
          message: error.message || 'Failed to submit decision',
          timestamp: new Date(),
        },
      });
    }
  }
);

export default router;
