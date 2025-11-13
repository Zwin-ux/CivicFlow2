import express, { Request, Response } from 'express';
import multer from 'multer';
import sbaDemoService from '../services/sbaDemoService';
import { requireDemoMode } from '../middleware/demoMode';
import logger from '../utils/logger';

const router = express.Router();
const upload = multer({ limits: { fileSize: 25 * 1024 * 1024 } }); // 25MB

// Start a demo session (OctoDoc)
router.post('/start', async (req: Request, res: Response) => {
  try {
    const { loanType, applicantName, email } = req.body;
    if (!loanType || !['504', '5a'].includes(loanType)) {
      return res.status(400).json({ error: { code: 'INVALID_LOAN_TYPE', message: 'loanType must be 504 or 5a' } });
    }

    const session = sbaDemoService.startSession(loanType as any, applicantName, email);
    res.status(201).json(session);
  } catch (error: any) {
    logger.error('Failed to start OctoDoc demo session', { error: error.message || error });
    res.status(500).json({ error: { code: 'START_FAILED', message: 'Failed to start demo session' } });
  }
});

// Upload document (multipart)
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const sessionId = req.body.sessionId || req.headers['x-demo-session'] as string;
    if (!sessionId) return res.status(400).json({ error: { code: 'MISSING_SESSION', message: 'sessionId is required' } });
    if (!req.file) return res.status(400).json({ error: { code: 'MISSING_FILE', message: 'file is required' } });

    const result = sbaDemoService.uploadDocument(sessionId, { originalname: req.file.originalname, size: req.file.size, mimetype: req.file.mimetype }, req.body.documentType);
    res.status(201).json(result);
  } catch (error: any) {
    logger.error('Upload failed (demo)', { error: error.message || error });
    res.status(500).json({ error: { code: 'UPLOAD_FAILED', message: String(error.message || error) } });
  }
});

// Job status
router.get('/status/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const job = await (sbaDemoService.getStatus(jobId) as any);
    res.json(job);
  } catch (error: any) {
    res.status(404).json({ error: { code: 'JOB_NOT_FOUND', message: 'Job not found' } });
  }
});

// Get documents for session
router.get('/documents/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const docs = await sbaDemoService.getDocuments(sessionId);
    res.json(docs);
  } catch (error: any) {
    res.status(404).json({ error: { code: 'SESSION_NOT_FOUND', message: 'Session not found' } });
  }
});

// Re-validate a document
router.post('/validate/:documentId', requireDemoMode, (req: Request, res: Response) => {
  try {
    const { documentId } = req.params;
    const { jobId } = sbaDemoService.validateDocument(documentId);
    res.json({ jobId });
  } catch (error: any) {
    res.status(404).json({ error: { code: 'DOCUMENT_NOT_FOUND', message: 'Document not found' } });
  }
});

// Schedule pickup
router.post('/schedule-pickup', (req: Request, res: Response) => {
  try {
    const { sessionId, preferredDate, contactPhone } = req.body;
    if (!sessionId) return res.status(400).json({ error: { code: 'MISSING_SESSION', message: 'sessionId is required' } });
    const result = sbaDemoService.schedulePickup(sessionId, preferredDate, contactPhone);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: { code: 'SCHEDULE_FAILED', message: 'Failed to schedule pickup' } });
  }
});

export default router;
