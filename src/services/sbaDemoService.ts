import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';
import redisClient from '../config/redis';

export type LoanType = '504' | '5a';

export interface SBASession {
  sessionId: string;
  loanType: LoanType;
  applicantName?: string;
  email?: string;
  startedAt: Date;
  expiresAt: Date;
}

export interface SBADocument {
  documentId: string;
  sessionId: string;
  originalName: string;
  size: number;
  mimeType?: string;
  uploadedAt: Date;
  documentType?: string;
  status: 'uploaded' | 'processing' | 'accepted' | 'needs_attention' | 'rejected';
  validation?: {
    accepted: boolean;
    reasons: string[];
    ocrText?: string;
    extractedFields?: Record<string, string | boolean>;
  } | null;
}

type JobStatus = 'queued' | 'processing' | 'done' | 'failed';

interface ProcessingJob {
  jobId: string;
  documentId: string;
  status: JobStatus;
  result?: SBADocument['validation'];
}

class SBADemoService {
  private sessions: Map<string, SBASession> = new Map();
  private documents: Map<string, SBADocument> = new Map();
  private jobs: Map<string, ProcessingJob> = new Map();
  private SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

  startSession(loanType: LoanType, applicantName?: string, email?: string) {
    const sessionId = uuidv4();
    const now = new Date();
    const session: SBASession = {
      sessionId,
      loanType,
      applicantName,
      email,
      startedAt: now,
      expiresAt: new Date(now.getTime() + this.SESSION_TTL_MS),
    };
    this.sessions.set(sessionId, session);
    // Best-effort persist to Redis
    (async () => {
      try {
        const key = `octodoc:session:${sessionId}`;
        await redisClient.set(key, JSON.stringify(session), Math.floor(this.SESSION_TTL_MS / 1000));
        logger.info('SBA demo session persisted to Redis (OctoDoc)', { sessionId });
      } catch (err: any) {
        logger.warn('Could not persist SBA demo session to Redis (OctoDoc)', { sessionId, error: err?.message || err });
      }
    })();

    logger.info('OctoDoc demo session started', { sessionId, loanType, applicantName });
    return session;
  }

  uploadDocument(sessionId: string, file: { originalname: string; size: number; mimetype?: string }, documentType?: string) {
    if (!this.sessions.has(sessionId)) {
      throw new Error('Session not found');
    }

    const documentId = uuidv4();
    const doc: SBADocument = {
      documentId,
      sessionId,
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
      uploadedAt: new Date(),
      documentType,
      status: 'processing',
      validation: null,
    };

    this.documents.set(documentId, doc);

    // Create processing job
    const jobId = uuidv4();
    const job: ProcessingJob = { jobId, documentId, status: 'queued' };
    this.jobs.set(jobId, job);

    // Best-effort persist document and job to Redis
    (async () => {
      try {
        const docKey = `octodoc:document:${documentId}`;
        await redisClient.set(docKey, JSON.stringify(doc), Math.floor(this.SESSION_TTL_MS / 1000));
        const jobKey = `octodoc:job:${jobId}`;
        await redisClient.set(jobKey, JSON.stringify(job), Math.floor(this.SESSION_TTL_MS / 1000));
        logger.debug('Persisted OctoDoc document and job to Redis', { documentId, jobId });
      } catch (err: any) {
        logger.warn('Could not persist document/job to Redis (OctoDoc)', { documentId, jobId, error: err?.message || err });
      }
    })();

    // Simulate processing
    setTimeout(() => this.runProcessingJob(jobId), 500 + Math.random() * 1200);

    logger.info('Document uploaded (demo)', { sessionId, documentId, jobId, fileName: file.originalname });

    return { documentId, jobId, fileName: file.originalname, size: file.size, uploadedAt: doc.uploadedAt };
  }

  private runProcessingJob(jobId: string) {
    const job = this.jobs.get(jobId);
    if (!job) return;
    job.status = 'processing';
    this.jobs.set(jobId, job);

    const doc = this.documents.get(job.documentId);
    if (!doc) {
      job.status = 'failed';
      this.jobs.set(jobId, job);
      return;
    }

    // Simulate validation heuristics
    const reasons: string[] = [];
    let accepted = true;

    // File size heuristic
    if (doc.size > 25 * 1024 * 1024) {
      accepted = false;
      reasons.push('File too large (>25MB)');
    }

    // Low-confidence OCR simulated randomly
    const ocrConfidence = Math.floor(Math.random() * 100);
    const ocrText = `Simulated OCR text for ${doc.originalName}`;
    const extractedFields: Record<string, string | boolean> = {
      borrowerName: 'Demo Borrower',
      tin_present: Math.random() > 0.3,
    };

    if (ocrConfidence < 50) {
      accepted = false;
      reasons.push(`Low OCR confidence (${ocrConfidence}%)`);
    }

    // Signature heuristic (random)
    if (Math.random() > 0.7) {
      reasons.push('Missing signature detected');
      accepted = false;
    }

    const validation = { accepted, reasons, ocrText, extractedFields };

    // Update document
    doc.validation = validation;
    doc.status = accepted ? 'accepted' : 'needs_attention';
    this.documents.set(doc.documentId, doc);

    // Complete job
    job.status = 'done';
    job.result = validation;
    this.jobs.set(jobId, job);

    logger.info('Document processing complete (demo)', { jobId, documentId: doc.documentId, accepted });

    // Best-effort persist updated document and job to Redis
    (async () => {
      try {
        const docKey = `octodoc:document:${doc.documentId}`;
        await redisClient.set(docKey, JSON.stringify(doc), Math.floor(this.SESSION_TTL_MS / 1000));
        const jobKey = `octodoc:job:${jobId}`;
        await redisClient.set(jobKey, JSON.stringify(job), Math.floor(this.SESSION_TTL_MS / 1000));
        logger.debug('Persisted OctoDoc processed document and job to Redis', { documentId: doc.documentId, jobId });
      } catch (err: any) {
        logger.warn('Could not persist processed document/job to Redis (OctoDoc)', { documentId: doc.documentId, jobId, error: err?.message || err });
      }
    })();
  }

  getStatus(jobId: string) {
    const job = this.jobs.get(jobId);
    if (job) return job;

    // Best-effort: try Redis
    return (async () => {
      try {
        const key = `octodoc:job:${jobId}`;
        const raw = await redisClient.get(key);
        if (!raw) throw new Error('Job not found');
        const parsed = JSON.parse(raw) as ProcessingJob;
        // hydrate in-memory cache
        this.jobs.set(jobId, parsed);
        return parsed;
      } catch (err) {
        throw new Error('Job not found');
      }
    })();
  }

  getDocuments(sessionId: string) {
    // Try Redis first (best-effort)
    return (async () => {
      try {
        const key = `octodoc:session:${sessionId}`;
        const raw = await redisClient.get(key);
        if (raw) {
          const session = JSON.parse(raw) as any;
          // Ensure in-memory map is seeded
          this.sessions.set(sessionId, { ...session, startedAt: new Date(session.startedAt), expiresAt: new Date(session.expiresAt) });
        }
      } catch (err) {
        // ignore redis errors, fallback to in-memory
      }

      const session = this.sessions.get(sessionId);
      if (!session) throw new Error('Session not found');

      const docs = Array.from(this.documents.values()).filter(d => d.sessionId === sessionId);
      return { documents: docs, requiredChecklist: this.getChecklist(session.loanType) };
    })();
  }

  validateDocument(documentId: string) {
    const doc = this.documents.get(documentId);
    if (!doc) throw new Error('Document not found');

    // Create a re-validation job
    const jobId = uuidv4();
    const job: ProcessingJob = { jobId, documentId, status: 'queued' };
    this.jobs.set(jobId, job);
    setTimeout(() => this.runProcessingJob(jobId), 400 + Math.random() * 1000);
    return { jobId };
  }

  schedulePickup(sessionId: string, preferredDate?: string, contactPhone?: string) {
    if (!this.sessions.has(sessionId)) throw new Error('Session not found');
    const confirmationId = uuidv4();
    const scheduledAt = preferredDate ? new Date(preferredDate) : new Date(Date.now() + 24 * 60 * 60 * 1000);
    logger.info('Pickup scheduled (demo)', { sessionId, confirmationId, scheduledAt, contactPhone });
    return { confirmationId, scheduledAt };
  }

  private getChecklist(loanType: LoanType) {
    // Minimal checklist for demo purposes
    if (loanType === '504') {
      return [
        { id: 'app_form', title: 'Application Form', required: true },
        { id: 'business_plan', title: 'Business Plan', required: true },
        { id: 'financials', title: 'Financial Statements', required: true },
        { id: 'ownership', title: 'Ownership Documents', required: false },
      ];
    }
    return [
      { id: 'app_form', title: 'Application Form', required: true },
      { id: 'tax_returns', title: 'Tax Returns (last 2 years)', required: true },
      { id: 'personal_guarantee', title: 'Personal Guarantee', required: true },
      { id: 'other', title: 'Supporting Documents', required: false },
    ];
  }
}

export default new SBADemoService();
