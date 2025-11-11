/**
 * Reporting Routes
 * Defines REST API endpoints for reporting and dashboard functionality
 */

import { Router, Request, Response } from 'express';
import reportingService from '../services/reportingService';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import logger from '../utils/logger';
import { ApplicationStatus } from '../models/application';

const router = Router();

/**
 * GET /api/v1/reporting/dashboard
 * Get dashboard metrics
 * @access Reviewer, Approver, Administrator, Auditor
 */
router.get(
  '/dashboard',
  authenticate,
  authorize('Reviewer', 'Approver', 'Administrator', 'Auditor'),
  async (req: Request, res: Response) => {
    try {
      const { startDate, endDate, programType, status } = req.query;

      const filters: any = {};

      if (startDate) {
        filters.startDate = new Date(startDate as string);
      }
      if (endDate) {
        filters.endDate = new Date(endDate as string);
      }
      if (programType) {
        filters.programType = programType as string;
      }
      if (status) {
        filters.status = status as ApplicationStatus;
      }

      const dashboardData = await reportingService.getDashboardMetrics(filters);

      res.json({
        success: true,
        data: dashboardData,
      });
    } catch (error) {
      logger.error('Failed to get dashboard metrics', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to get dashboard metrics',
      });
    }
  }
);

/**
 * GET /api/v1/reporting/eligibility-report
 * Generate eligibility report
 * @access Reviewer, Approver, Administrator, Auditor
 */
router.get(
  '/eligibility-report',
  authenticate,
  authorize('Reviewer', 'Approver', 'Administrator', 'Auditor'),
  async (req: Request, res: Response) => {
    try {
      const { startDate, endDate, programType, status } = req.query;

      const filters: any = {};

      if (startDate) {
        filters.startDate = new Date(startDate as string);
      }
      if (endDate) {
        filters.endDate = new Date(endDate as string);
      }
      if (programType) {
        filters.programType = programType as string;
      }
      if (status) {
        filters.status = status as ApplicationStatus;
      }

      const report = await reportingService.generateEligibilityReport(filters);

      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      logger.error('Failed to generate eligibility report', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to generate eligibility report',
      });
    }
  }
);

/**
 * GET /api/v1/reporting/missing-documents
 * Generate missing documents CSV
 * @access Reviewer, Approver, Administrator, Auditor
 */
router.get(
  '/missing-documents',
  authenticate,
  authorize('Reviewer', 'Approver', 'Administrator', 'Auditor'),
  async (req: Request, res: Response) => {
    try {
      const { startDate, endDate, programType, status } = req.query;

      const filters: any = {};

      if (startDate) {
        filters.startDate = new Date(startDate as string);
      }
      if (endDate) {
        filters.endDate = new Date(endDate as string);
      }
      if (programType) {
        filters.programType = programType as string;
      }
      if (status) {
        filters.status = status as ApplicationStatus;
      }

      const csv = await reportingService.generateMissingDocumentsCSV(filters);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=missing_documents.csv');
      res.send(csv);
    } catch (error) {
      logger.error('Failed to generate missing documents CSV', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to generate missing documents CSV',
      });
    }
  }
);

/**
 * GET /api/v1/reporting/compliance-summary
 * Generate compliance summary markdown
 * @access Administrator, Auditor
 */
router.get(
  '/compliance-summary',
  authenticate,
  authorize('Administrator', 'Auditor'),
  async (req: Request, res: Response) => {
    try {
      const { startDate, endDate, programType, status } = req.query;

      const filters: any = {};

      if (startDate) {
        filters.startDate = new Date(startDate as string);
      }
      if (endDate) {
        filters.endDate = new Date(endDate as string);
      }
      if (programType) {
        filters.programType = programType as string;
      }
      if (status) {
        filters.status = status as ApplicationStatus;
      }

      const markdown = await reportingService.generateComplianceSummary(filters);

      res.setHeader('Content-Type', 'text/markdown');
      res.setHeader('Content-Disposition', 'attachment; filename=compliance_summary.md');
      res.send(markdown);
    } catch (error) {
      logger.error('Failed to generate compliance summary', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to generate compliance summary',
      });
    }
  }
);

/**
 * POST /api/v1/reporting/invalidate-cache
 * Invalidate dashboard cache
 * @access Administrator
 */
router.post(
  '/invalidate-cache',
  authenticate,
  authorize('Administrator'),
  async (_req: Request, res: Response) => {
    try {
      await reportingService.invalidateCache();

      res.json({
        success: true,
        message: 'Dashboard cache invalidated',
      });
    } catch (error) {
      logger.error('Failed to invalidate cache', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to invalidate cache',
      });
    }
  }
);

export default router;
