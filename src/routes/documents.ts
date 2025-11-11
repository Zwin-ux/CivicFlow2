/**
 * Document Routes
 * API endpoints for document management
 */

import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import documentService from '../services/documentService';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import logger from '../utils/logger';

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

/**
 * POST /api/v1/documents/upload
 * Upload a document for an application
 */
router.post(
  '/upload',
  authenticate,
  authorize('Applicant', 'Reviewer', 'Approver', 'Administrator'),
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { applicationId } = req.body;
      const file = req.file;

      // Validate request
      if (!file) {
        res.status(400).json({
          error: {
            code: 'MISSING_FILE',
            message: 'No file uploaded',
          },
        });
        return;
      }

      if (!applicationId) {
        res.status(400).json({
          error: {
            code: 'MISSING_APPLICATION_ID',
            message: 'Application ID is required',
          },
        });
        return;
      }

      // Upload document
      const document = await documentService.uploadDocument(
        file,
        applicationId,
        req.user!.userId || 'SYSTEM'
      );

      // Trigger classification asynchronously (don't wait for it)
      documentService.classifyDocument(document.id).catch(error => {
        logger.error('Failed to classify document asynchronously', {
          error,
          documentId: document.id,
        });
      });

      res.status(201).json({
        data: document,
        message: 'Document uploaded successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/documents/:id/classify
 * Manually trigger document classification
 */
router.post(
  '/:id/classify',
  authenticate,
  authorize('Reviewer', 'Approver', 'Administrator'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const classificationResult = await documentService.classifyDocument(id);

      res.status(200).json({
        data: classificationResult,
        message: 'Document classified successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/documents/:id/extract
 * Extract data from document
 */
router.post(
  '/:id/extract',
  authenticate,
  authorize('Reviewer', 'Approver', 'Administrator'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const extractedData = await documentService.extractData(id);

      res.status(200).json({
        data: extractedData,
        message: 'Document data extracted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/documents/:id
 * Get document metadata by ID
 */
router.get(
  '/:id',
  authenticate,
  authorize('Applicant', 'Reviewer', 'Approver', 'Administrator', 'Auditor'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const document = await documentService.getDocument(id);

      res.status(200).json({
        data: document,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/documents/:id/download
 * Download document file
 */
router.get(
  '/:id/download',
  authenticate,
  authorize('Applicant', 'Reviewer', 'Approver', 'Administrator', 'Auditor'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const document = await documentService.getDocument(id);
      const fileBuffer = await documentService.downloadDocument(id);

      res.setHeader('Content-Type', document.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${document.fileName}"`);
      res.setHeader('Content-Length', fileBuffer.length);

      res.send(fileBuffer);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/documents/application/:applicationId
 * Get all documents for an application
 */
router.get(
  '/application/:applicationId',
  authenticate,
  authorize('Applicant', 'Reviewer', 'Approver', 'Administrator', 'Auditor'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { applicationId } = req.params;

      const documents = await documentService.getApplicationDocuments(applicationId);

      res.status(200).json({
        data: documents,
        total: documents.length,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/v1/documents/:id
 * Delete a document
 */
router.delete(
  '/:id',
  authenticate,
  authorize('Applicant', 'Administrator'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      await documentService.deleteDocument(id, req.user!.userId || 'SYSTEM');

      res.status(200).json({
        message: 'Document deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
