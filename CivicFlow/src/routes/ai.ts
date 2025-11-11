/**
 * AI Features Routes
 * API endpoints for AI-powered document intelligence features
 */

import express, { Request, Response, NextFunction } from 'express';
import aiDocumentAnalyzerService from '../services/aiDocumentAnalyzerService';
import smartExtractionService from '../services/smartExtractionService';
import documentSummarizationService from '../services/documentSummarizationService';
import riskAssessmentEngine from '../services/riskAssessmentEngine';
import aiRecommendationEngine from '../services/aiRecommendationEngine';
import aiDecisionSupportService from '../services/aiDecisionSupportService';
import documentQuestionAnsweringService from '../services/documentQuestionAnsweringService';
import anomalyRepository from '../repositories/anomalyRepository';
import documentRepository from '../repositories/documentRepository';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import logger from '../utils/logger';

const router = express.Router();

// ==================== Document Analysis Endpoints ====================

/**
 * POST /api/v1/ai/documents/:id/analyze
 * Trigger AI analysis for a document
 */
router.post(
  '/documents/:id/analyze',
  authenticate,
  authorize('Reviewer', 'Approver', 'Administrator'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      logger.info('Triggering AI analysis', {
        documentId: id,
        userId: req.user!.userId,
      });

      const result = await aiDocumentAnalyzerService.analyzeDocument(id);

      res.status(200).json({
        data: result,
        message: 'Document analysis completed successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/ai/documents/:id/analysis
 * Get analysis results for a document
 */
router.get(
  '/documents/:id/analysis',
  authenticate,
  authorize('Applicant', 'Reviewer', 'Approver', 'Administrator', 'Auditor'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const result = await aiDocumentAnalyzerService.analyzeDocument(id);

      res.status(200).json({
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/ai/documents/batch-analyze
 * Batch analyze multiple documents
 */
router.post(
  '/documents/batch-analyze',
  authenticate,
  authorize('Reviewer', 'Approver', 'Administrator'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { documentIds } = req.body;

      // Validate request
      if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
        res.status(400).json({
          error: {
            code: 'INVALID_DOCUMENT_IDS',
            message: 'documentIds must be a non-empty array',
          },
        });
        return;
      }

      if (documentIds.length > 10) {
        res.status(400).json({
          error: {
            code: 'BATCH_SIZE_EXCEEDED',
            message: 'Maximum batch size is 10 documents',
          },
        });
        return;
      }

      logger.info('Starting batch analysis', {
        documentCount: documentIds.length,
        userId: req.user!.userId,
      });

      const result = await aiDocumentAnalyzerService.batchAnalyze(documentIds);

      res.status(200).json({
        data: result,
        message: 'Batch analysis completed',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/ai/documents/:id/quality
 * Get quality score for a document
 */
router.get(
  '/documents/:id/quality',
  authenticate,
  authorize('Applicant', 'Reviewer', 'Approver', 'Administrator'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const analysis = await aiDocumentAnalyzerService.analyzeDocument(id);

      res.status(200).json({
        data: {
          documentId: id,
          qualityScore: analysis.qualityScore,
          confidence: analysis.confidence,
          recommendations: analysis.recommendations,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== Extraction and Summarization Endpoints ====================

/**
 * GET /api/v1/ai/documents/:id/extracted-data
 * Get extracted data from a document
 */
router.get(
  '/documents/:id/extracted-data',
  authenticate,
  authorize('Reviewer', 'Approver', 'Administrator'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { type } = req.query;

      let extractedData: any;

      if (type === 'financial') {
        extractedData = await smartExtractionService.extractFinancialData(id);
      } else if (type === 'personal') {
        extractedData = await smartExtractionService.extractPersonalInfo(id);
      } else if (type === 'business') {
        extractedData = await smartExtractionService.extractBusinessInfo(id);
      } else {
        // Return all types
        const [financial, personal, business] = await Promise.allSettled([
          smartExtractionService.extractFinancialData(id),
          smartExtractionService.extractPersonalInfo(id),
          smartExtractionService.extractBusinessInfo(id),
        ]);

        extractedData = {
          financial: financial.status === 'fulfilled' ? financial.value : null,
          personal: personal.status === 'fulfilled' ? personal.value : null,
          business: business.status === 'fulfilled' ? business.value : null,
        };
      }

      res.status(200).json({
        data: extractedData,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/ai/documents/:id/summary
 * Get document summary
 */
router.get(
  '/documents/:id/summary',
  authenticate,
  authorize('Applicant', 'Reviewer', 'Approver', 'Administrator'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const maxWords = req.query.maxWords ? parseInt(req.query.maxWords as string, 10) : undefined;

      const summary = await documentSummarizationService.summarizeDocument(id, {
        maxWords,
        includeKeyPoints: true,
        includeSourceReferences: true,
      });

      res.status(200).json({
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/ai/applications/:id/summary
 * Get application summary (all documents)
 */
router.get(
  '/applications/:id/summary',
  authenticate,
  authorize('Reviewer', 'Approver', 'Administrator'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const summary = await documentSummarizationService.summarizeApplication(id);

      res.status(200).json({
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/ai/documents/:id/question
 * Ask a question about a document
 */
router.post(
  '/documents/:id/question',
  authenticate,
  authorize('Applicant', 'Reviewer', 'Approver', 'Administrator'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { question } = req.body;

      if (!question || typeof question !== 'string' || question.trim().length === 0) {
        res.status(400).json({
          error: {
            code: 'INVALID_QUESTION',
            message: 'Question is required and must be a non-empty string',
          },
        });
        return;
      }

      const answer = await documentQuestionAnsweringService.answerDocumentQuestion(id, question, {
        includeCitations: true,
        includeContext: true,
        includeFollowUpQuestions: true,
      });

      res.status(200).json({
        data: answer,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== Anomaly Detection Endpoints ====================

/**
 * GET /api/v1/ai/applications/:id/anomalies
 * Get detected anomalies for an application
 */
router.get(
  '/applications/:id/anomalies',
  authenticate,
  authorize('Reviewer', 'Approver', 'Administrator'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const anomalies = await anomalyRepository.findByApplicationId(id);

      res.status(200).json({
        data: anomalies,
        total: anomalies.length,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/ai/applications/:id/risk-score
 * Get risk assessment for an application
 */
router.get(
  '/applications/:id/risk-score',
  authenticate,
  authorize('Reviewer', 'Approver', 'Administrator'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const riskScore = await riskAssessmentEngine.calculateRiskScore(id);

      res.status(200).json({
        data: riskScore,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/v1/ai/anomalies/:id/review
 * Review an anomaly
 */
router.put(
  '/anomalies/:id/review',
  authenticate,
  authorize('Reviewer', 'Approver', 'Administrator'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { status, resolutionNotes } = req.body;

      // Validate status
      const validStatuses = ['REVIEWED', 'RESOLVED', 'FALSE_POSITIVE'];
      if (!status || !validStatuses.includes(status)) {
        res.status(400).json({
          error: {
            code: 'INVALID_STATUS',
            message: `Status must be one of: ${validStatuses.join(', ')}`,
          },
        });
        return;
      }

      const reviewedAnomaly = await anomalyRepository.review(id, {
        status,
        reviewedBy: req.user!.userId,
        resolutionNotes,
      });

      logger.info('Anomaly reviewed', {
        anomalyId: id,
        status,
        reviewedBy: req.user!.userId,
      });

      res.status(200).json({
        data: reviewedAnomaly,
        message: 'Anomaly reviewed successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/ai/documents/:id/compare
 * Compare documents for inconsistencies
 */
router.post(
  '/documents/:id/compare',
  authenticate,
  authorize('Reviewer', 'Approver', 'Administrator'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { compareWithDocumentId } = req.body;

      if (!compareWithDocumentId) {
        res.status(400).json({
          error: {
            code: 'MISSING_COMPARE_DOCUMENT',
            message: 'compareWithDocumentId is required',
          },
        });
        return;
      }

      // Get both documents
      const [doc1, doc2] = await Promise.all([
        documentRepository.findById(id),
        documentRepository.findById(compareWithDocumentId),
      ]);

      if (!doc1 || !doc2) {
        res.status(404).json({
          error: {
            code: 'DOCUMENT_NOT_FOUND',
            message: 'One or both documents not found',
          },
        });
        return;
      }

      // Analyze both documents
      const [analysis1, analysis2] = await Promise.all([
        aiDocumentAnalyzerService.analyzeDocument(id),
        aiDocumentAnalyzerService.analyzeDocument(compareWithDocumentId),
      ]);

      // Compare extracted data
      const comparison = {
        document1: {
          id: doc1.id,
          fileName: doc1.fileName,
          qualityScore: analysis1.qualityScore,
          extractedData: analysis1.extractedData,
        },
        document2: {
          id: doc2.id,
          fileName: doc2.fileName,
          qualityScore: analysis2.qualityScore,
          extractedData: analysis2.extractedData,
        },
        differences: findDifferences(analysis1.extractedData, analysis2.extractedData),
      };

      res.status(200).json({
        data: comparison,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== AI Recommendation Endpoints ====================

/**
 * GET /api/v1/ai/applications/:id/recommendations
 * Get AI recommendations for an application
 */
router.get(
  '/applications/:id/recommendations',
  authenticate,
  authorize('Applicant', 'Reviewer', 'Approver', 'Administrator'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const includeOptional = req.query.includeOptional !== 'false';

      const recommendations = await aiRecommendationEngine.generateRecommendations(id, {
        includeOptional,
      });

      res.status(200).json({
        data: recommendations,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/ai/applications/:id/missing-documents
 * Get missing documents for an application
 */
router.get(
  '/applications/:id/missing-documents',
  authenticate,
  authorize('Applicant', 'Reviewer', 'Approver', 'Administrator'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const missingDocuments = await aiRecommendationEngine.getMissingDocuments(id);

      res.status(200).json({
        data: {
          applicationId: id,
          missingDocuments,
          count: missingDocuments.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/ai/applications/:id/decision-support
 * Get AI decision recommendation for an application
 */
router.get(
  '/applications/:id/decision-support',
  authenticate,
  authorize('Approver', 'Administrator'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const includeDetailedAnalysis = req.query.detailed === 'true';

      const decision = await aiDecisionSupportService.generateDecisionRecommendation(id, {
        includeDetailedAnalysis,
      });

      res.status(200).json({
        data: decision,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/ai/applications/:id/decision-override
 * Track human override of AI decision
 */
router.post(
  '/applications/:id/decision-override',
  authenticate,
  authorize('Approver', 'Administrator'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { aiRecommendation, humanDecision, overrideReason, aiConfidence } = req.body;

      // Validate required fields
      if (!aiRecommendation || !humanDecision || !overrideReason) {
        res.status(400).json({
          error: {
            code: 'MISSING_FIELDS',
            message: 'aiRecommendation, humanDecision, and overrideReason are required',
          },
        });
        return;
      }

      await aiDecisionSupportService.trackHumanOverride({
        applicationId: id,
        aiRecommendation,
        humanDecision,
        overrideReason,
        overriddenBy: req.user!.userId,
        overriddenAt: new Date(),
        aiConfidence: aiConfidence || 0,
      });

      logger.info('AI decision override tracked', {
        applicationId: id,
        aiRecommendation,
        humanDecision,
        overriddenBy: req.user!.userId,
      });

      res.status(200).json({
        message: 'Override tracked successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== Helper Functions ====================

/**
 * Find differences between two extracted data objects
 */
function findDifferences(data1: any, data2: any): any[] {
  const differences: any[] = [];

  // Compare entities
  if (data1.entities && data2.entities) {
    const entities1Map = new Map(data1.entities.map((e: any) => [e.type + ':' + e.value, e]));
    const entities2Map = new Map(data2.entities.map((e: any) => [e.type + ':' + e.value, e]));

    // Find entities in doc1 but not in doc2
    for (const [_key, entity] of entities1Map) {
      const typedEntity = entity as any;
      if (!entities2Map.has(_key)) {
        differences.push({
          type: 'MISSING_IN_DOC2',
          category: 'ENTITY',
          field: typedEntity.type,
          value: typedEntity.value,
        });
      }
    }

    // Find entities in doc2 but not in doc1
    for (const [_key, entity] of entities2Map) {
      const typedEntity = entity as any;
      if (!entities1Map.has(_key)) {
        differences.push({
          type: 'MISSING_IN_DOC1',
          category: 'ENTITY',
          field: typedEntity.type,
          value: typedEntity.value,
        });
      }
    }
  }

  // Compare key-value pairs
  if (data1.keyValuePairs && data2.keyValuePairs) {
    const kvp1Map = new Map(data1.keyValuePairs.map((kvp: any) => [kvp.key, kvp.value]));
    const kvp2Map = new Map(data2.keyValuePairs.map((kvp: any) => [kvp.key, kvp.value]));

    for (const [key, value1] of kvp1Map) {
      const value2 = kvp2Map.get(key);
      if (value2 && value1 !== value2) {
        differences.push({
          type: 'VALUE_MISMATCH',
          category: 'KEY_VALUE_PAIR',
          field: key,
          value1,
          value2,
        });
      }
    }
  }

  return differences;
}

export default router;
