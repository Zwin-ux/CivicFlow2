/**
 * Data Validator Routes
 * API endpoints for EIN verification, contact validation, and fraud detection
 */

import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import DataValidatorService from '../services/dataValidatorService';
import ValidatorRepository from '../repositories/validatorRepository';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { auditLogger } from '../middleware/auditLogger';
import logger from '../utils/logger';
import { ContactInfo } from '../models/validator';

const router = Router();

// Initialize service and repository
let validatorService: DataValidatorService;
let validatorRepository: ValidatorRepository;

export const initializeValidatorRoutes = (pool: Pool) => {
  validatorService = new DataValidatorService(pool);
  validatorRepository = new ValidatorRepository(pool);
};

/**
 * POST /api/v1/validator/ein/verify
 * Verify EIN against authoritative sources
 */
router.post(
  '/ein/verify',
  authenticate,
  authorize('Reviewer', 'Approver', 'Administrator'),
  auditLogger,
  async (req: Request, res: Response) => {
    try {
      const { ein, businessName } = req.body;

      if (!ein || !businessName) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'EIN and business name are required',
          },
        });
      }

      const result = await validatorService.verifyEIN(ein, businessName);

      return res.json({
        data: result,
      });
    } catch (error: any) {
      logger.error('EIN verification error:', error);
      return res.status(500).json({
        error: {
          code: 'EIN_VERIFICATION_ERROR',
          message: 'Failed to verify EIN',
          details: error.message,
        },
      });
    }
  }
);

/**
 * POST /api/v1/validator/contact/validate
 * Validate contact information
 */
router.post(
  '/contact/validate',
  authenticate,
  authorize('Reviewer', 'Approver', 'Administrator'),
  auditLogger,
  async (req: Request, res: Response) => {
    try {
      const contactInfo: ContactInfo = req.body;

      if (!contactInfo.email || !contactInfo.phone || !contactInfo.address) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Email, phone, and address are required',
          },
        });
      }

      const result = await validatorService.validateContactInfo(contactInfo);

      return res.json({
        data: result,
      });
    } catch (error: any) {
      logger.error('Contact validation error:', error);
      return res.status(500).json({
        error: {
          code: 'CONTACT_VALIDATION_ERROR',
          message: 'Failed to validate contact information',
          details: error.message,
        },
      });
    }
  }
);

/**
 * POST /api/v1/validator/fraud/detect
 * Detect fraud patterns in application data
 */
router.post(
  '/fraud/detect',
  authenticate,
  authorize('Reviewer', 'Approver', 'Administrator'),
  auditLogger,
  async (req: Request, res: Response) => {
    try {
      const applicationData = req.body;

      if (!applicationData.id) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Application ID is required',
          },
        });
      }

      const result = await validatorService.detectFraud(applicationData);

      return res.json({
        data: result,
      });
    } catch (error: any) {
      logger.error('Fraud detection error:', error);
      return res.status(500).json({
        error: {
          code: 'FRAUD_DETECTION_ERROR',
          message: 'Failed to detect fraud',
          details: error.message,
        },
      });
    }
  }
);

/**
 * GET /api/v1/validator/ein/duplicates/:ein
 * Find applications with duplicate EIN
 */
router.get(
  '/ein/duplicates/:ein',
  authenticate,
  authorize('Reviewer', 'Approver', 'Administrator', 'Auditor'),
  auditLogger,
  async (req: Request, res: Response) => {
    try {
      const { ein } = req.params;
      const { excludeApplicationId } = req.query;

      const duplicates = await validatorRepository.findDuplicateEIN(
        ein,
        excludeApplicationId as string | undefined
      );

      return res.json({
        data: {
          ein,
          count: duplicates.length,
          applications: duplicates,
        },
      });
    } catch (error: any) {
      logger.error('Duplicate EIN search error:', error);
      return res.status(500).json({
        error: {
          code: 'DUPLICATE_SEARCH_ERROR',
          message: 'Failed to search for duplicate EIN',
          details: error.message,
        },
      });
    }
  }
);

/**
 * GET /api/v1/validator/suspicious
 * Find applications with suspicious patterns
 */
router.get(
  '/suspicious',
  authenticate,
  authorize('Reviewer', 'Approver', 'Administrator', 'Auditor'),
  auditLogger,
  async (req: Request, res: Response) => {
    try {
      const { confidenceThreshold, dateFrom, dateTo } = req.query;

      const criteria: any = {};

      if (confidenceThreshold) {
        criteria.lowConfidenceThreshold = parseFloat(confidenceThreshold as string);
      }

      if (dateFrom) {
        criteria.dateFrom = new Date(dateFrom as string);
      }

      if (dateTo) {
        criteria.dateTo = new Date(dateTo as string);
      }

      const suspicious = await validatorRepository.findSuspiciousApplications(criteria);

      return res.json({
        data: {
          count: suspicious.length,
          applications: suspicious,
        },
      });
    } catch (error: any) {
      logger.error('Suspicious applications search error:', error);
      return res.status(500).json({
        error: {
          code: 'SUSPICIOUS_SEARCH_ERROR',
          message: 'Failed to search for suspicious applications',
          details: error.message,
        },
      });
    }
  }
);

export { router as validatorRouter };
