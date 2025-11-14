import express, { Request, Response } from 'express';
import multer from 'multer';
import sbaDemoService from '../services/sbaDemoService';
import { requireDemoMode } from '../middleware/demoMode';
import logger from '../utils/logger';
import demoModeManager from '../services/demoModeManager';
import redisClient from '../config/redis';

const router = express.Router();
const upload = multer({ limits: { fileSize: 25 * 1024 * 1024 } }); // 25MB

// Start a demo session (OctoDoc)
router.post('/start', async (req: Request, res: Response) => {
  try {
    const { loanType, applicantName, email, seed: bodySeed } = req.body;
    const querySeed = typeof req.query.seed === 'string' ? req.query.seed : undefined;
    const seed = (bodySeed || querySeed)?.toString()?.trim();
    if (!loanType || !['504', '5a'].includes(loanType)) {
      return res.status(400).json({ error: { code: 'INVALID_LOAN_TYPE', message: 'loanType must be 504 or 5a' } });
    }

    const session = sbaDemoService.startSession(loanType as any, applicantName, email, seed);
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
    const job = await sbaDemoService.getStatus(jobId);
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

// Document analysis detail
router.get('/analysis/:documentId', (req: Request, res: Response) => {
  try {
    const { documentId } = req.params;
    const payload = sbaDemoService.getDocumentAnalysis(documentId);
    res.json(payload);
  } catch (error: any) {
    res.status(404).json({ error: { code: 'DOCUMENT_NOT_READY', message: error.message || 'Document not found' } });
  }
});

// Session analytics snapshot
router.get('/analytics/:sessionId', (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const analytics = sbaDemoService.getSessionAnalyticsSnapshot(sessionId);
    res.json(analytics);
  } catch (error: any) {
    res.status(404).json({ error: { code: 'SESSION_NOT_FOUND', message: 'Session not found' } });
  }
});

// Session insights bundle
router.get('/insights/:sessionId', (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const insights = sbaDemoService.getSessionInsights(sessionId);
    res.json(insights);
  } catch (error: any) {
    res.status(404).json({ error: { code: 'SESSION_NOT_FOUND', message: 'Session not found' } });
  }
});

// Live stream (Server Sent Events)
router.get('/stream/:sessionId', (req: Request, res: Response) => {
  const { sessionId } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  (res as any).flushHeaders?.();

  const pushUpdate = () => {
    try {
      const payload = sbaDemoService.getStreamSnapshot(sessionId);
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    } catch (error: any) {
      res.write(`event: error\ndata: ${JSON.stringify({ message: error.message || 'Session not found' })}\n\n`);
      clearInterval(streamInterval);
      res.end();
    }
  };

  const streamInterval = setInterval(pushUpdate, 5000);
  pushUpdate();

  req.on('close', () => {
    clearInterval(streamInterval);
  });
});

// CRM showcase snapshot
router.get('/crm/:sessionId/overview', (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const overview = sbaDemoService.getCrmSnapshot(sessionId);
    res.json(overview);
  } catch (error: any) {
    res.status(404).json({ error: { code: 'SESSION_NOT_FOUND', message: 'Session not found' } });
  }
});

// Relationship timeline
router.get('/crm/:sessionId/timeline', (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const timeline = sbaDemoService.getRelationshipTimeline(sessionId);
    res.json({ events: timeline });
  } catch (error: any) {
    res.status(404).json({ error: { code: 'SESSION_NOT_FOUND', message: 'Session not found' } });
  }
});

// Role showcase catalog
router.get('/roles', (_req: Request, res: Response) => {
  res.json({ roles: sbaDemoService.getRoleShowcases() });
});

router.get('/roles/:role', (req: Request, res: Response) => {
  const role = sbaDemoService.getRoleShowcase(req.params.role);
  if (!role) {
    return res.status(404).json({ error: { code: 'ROLE_NOT_FOUND', message: 'Role not found' } });
  }
  return res.json(role);
});

// Control room overview (demo mode + infra status)
router.get('/control-room/overview', async (_req: Request, res: Response) => {
  try {
    const demoMode = demoModeManager.getStatus();
    let redisHealthy = true;
    try {
      redisHealthy = await redisClient.healthCheck();
    } catch (error) {
      logger.warn('Redis health check (control room) failed', { error });
      redisHealthy = false;
    }

    res.json({
      demoMode,
      redis: {
        healthy: redisHealthy,
        inMemory: redisClient.isDemoMode(),
      },
      sessions: sbaDemoService.getAllSessionAnalytics(),
      recentDocuments: sbaDemoService.getRecentDocuments(),
    });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'CONTROL_OVERVIEW_FAILED', message: error.message || 'Failed to load control overview' } });
  }
});

export default router;
