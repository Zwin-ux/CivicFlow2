import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';
import redisClient from '../config/redis';

export type LoanType = '504' | '5a';
type DemoRole = 'APPLICANT' | 'REVIEWER' | 'APPROVER' | 'ADMIN';

export interface SBASession {
  sessionId: string;
  loanType: LoanType;
  applicantName?: string;
  email?: string;
  startedAt: Date;
  expiresAt: Date;
  seed: string;
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
  classification?: {
    predictedType: string;
    confidence: number;
  };
  analysis?: DocumentAnalysis;
}

type JobStatus = 'queued' | 'processing' | 'done' | 'failed';

type JobStageStatus = 'pending' | 'running' | 'done' | 'failed';

interface ProcessingStage {
  id: 'ingest' | 'threat_scan' | 'ocr' | 'policy' | 'ai_review';
  label: string;
  status: JobStageStatus;
  detail?: string;
  startedAt?: Date;
  completedAt?: Date;
  durationMs?: number;
}

interface ProcessingJob {
  jobId: string;
  documentId: string;
  sessionId: string;
  status: JobStatus;
  stages: ProcessingStage[];
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: DocumentProcessingResult;
}

interface PipelineStage {
  stage: string;
  count: number;
  avgAmount: number;
  momentum: 'up' | 'flat' | 'down';
  stuck: number;
}

interface RelationshipSummary {
  borrowerName: string;
  businessName: string;
  stage: string;
  owner: string;
  requestedAmount: number;
  lastTouch: Date;
  nextStep: string;
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'RISK';
  outstandingItems: number;
}

interface ActionItem {
  id: string;
  label: string;
  owner: string;
  channel: 'EMAIL' | 'SMS' | 'TEAMS' | 'CALL';
  dueAt: Date;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  relatedBorrower: string;
  recommendedTemplate: string;
}

interface EngagementInsight {
  id: string;
  title: string;
  detail: string;
  impact: string;
  severity: 'info' | 'warning' | 'success';
}

interface QuickReply {
  id: string;
  label: string;
  channel: 'EMAIL' | 'SMS' | 'TEAMS';
  body: string;
  tone: 'Friendly' | 'Professional' | 'Urgent';
}

interface RelationshipTimelineEvent {
  id: string;
  timestamp: Date;
  actor: string;
  channel: 'UPLOAD' | 'EMAIL' | 'SMS' | 'CALL' | 'NOTE';
  summary: string;
  impact: string;
  attachment?: string;
}

interface DemoCrmSnapshot {
  pipelineStages: PipelineStage[];
  relationshipHealth: RelationshipSummary[];
  actionItems: ActionItem[];
  engagementInsights: EngagementInsight[];
  quickReplies: QuickReply[];
}

interface RoleShowcase {
  role: DemoRole;
  title: string;
  description: string;
  headline: string;
  heroStat: string;
  entryPoint: string;
  highlights: string[];
  primaryAction: string;
}

interface DocumentQualityPreview {
  score: number;
  resolutionDpi: number;
  clarity: number; // 0-1
  orientation: number; // degrees off
  completenessScore: number;
  readabilityScore: number;
  summary: string;
  issues: string[];
  warnings: string[];
}

interface DocumentAIInsight {
  summary: string;
  confidence: number; // 0-1
  extractedEntities: Array<{ label: string; value: string; confidence: number }>;
  keywords: string[];
  recommendations: string[];
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'RISK';
}

interface DocumentRiskPreview {
  score: number;
  rating: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recommendation: 'APPROVE' | 'REQUEST_MORE_INFO' | 'ESCALATE';
  factors: Array<{ category: string; severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'; description: string }>;
  summary: string;
}

interface DocumentSuggestion {
  id: string;
  title: string;
  detail: string;
  action?: string;
  severity: 'info' | 'warning' | 'critical';
}

interface DocumentProcessingSummary {
  durationMs: number;
  completedAt: Date;
  pipeline: string[];
}

interface DocumentAnalysis {
  quality: DocumentQualityPreview;
  ai: DocumentAIInsight;
  risk: DocumentRiskPreview;
  suggestions: DocumentSuggestion[];
  processing: DocumentProcessingSummary;
}

interface DocumentProcessingResult {
  validation: NonNullable<SBADocument['validation']>;
  analysis: DocumentAnalysis;
}

interface SessionAnalytics {
  sessionId: string;
  loanType: LoanType;
  totalDocuments: number;
  acceptedDocuments: number;
  needsAttentionDocuments: number;
  averageQualityScore: number;
  averageRiskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  outstandingRequirements: string[];
  highlights: string[];
  recommendedActions: string[];
  updatedAt: Date;
}

class SBADemoService {
  private sessions: Map<string, SBASession> = new Map();
  private documents: Map<string, SBADocument> = new Map();
  private jobs: Map<string, ProcessingJob> = new Map();
  private SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes
  private crmSnapshots: Map<string, DemoCrmSnapshot> = new Map();
  private crmTimelines: Map<string, RelationshipTimelineEvent[]> = new Map();
  private sessionAnalytics: Map<string, SessionAnalytics> = new Map();
  private roleShowcases: Record<DemoRole, RoleShowcase> = {
    APPLICANT: {
      role: 'APPLICANT',
      title: 'Borrower Preview',
      description: 'Experience how applicants track document quality, AI guidance, and funding readiness in one workspace.',
      headline: 'Guided submission with live AI feedback',
      heroStat: '4 min faster uploads',
      entryPoint: '/applicant-portal.html',
      highlights: [
        'Auto-checklists aligned to SBA programs',
        'AI validation describing what is missing',
        'Secure messaging back to underwriting desk',
      ],
      primaryAction: 'Open applicant workspace',
    },
    REVIEWER: {
      role: 'REVIEWER',
      title: 'Loan Specialist',
      description: 'Jump directly into a staffing queue that blends documents, borrower health, and CRM tasks.',
      headline: 'See the next best borrower to call',
      heroStat: '6 risk alerts surfaced',
      entryPoint: '/staff-portal.html',
      highlights: [
        'Prioritized queue with AI nudges',
        'One-click chase templates',
        'Timeline of borrower touches',
      ],
      primaryAction: 'Review loan queue',
    },
    APPROVER: {
      role: 'APPROVER',
      title: 'Credit Committee',
      description: 'Preview underwriting insights, risk summaries, and decision-ready packets.',
      headline: 'Decisions with narrative context',
      heroStat: '92% of files auto-summarized',
      entryPoint: '/loan-ops-dashboard.html',
      highlights: [
        'AI risk narratives',
        'Exception tracking dashboard',
        'Escalation-ready comms',
      ],
      primaryAction: 'Open approval dashboard',
    },
    ADMIN: {
      role: 'ADMIN',
      title: 'Program Director',
      description: 'Monitor volume, SLA health, and AI observability in a single lens.',
      headline: 'Command center for lending ops',
      heroStat: 'Live SLA & intake mix',
      entryPoint: '/admin-dashboard.html',
      highlights: [
        'Deployment health + audit logs',
        'Portfolio mix + pipeline trend',
        'Control demo sessions + reset data',
      ],
      primaryAction: 'Launch command center',
    },
  };

  startSession(loanType: LoanType, applicantName?: string, email?: string, seedInput?: string) {
    const sessionId = uuidv4();
    const normalizedSeed = (seedInput || '').trim();
    const seed = normalizedSeed.length > 0 ? normalizedSeed : uuidv4().replace(/-/g, '');
    const now = new Date();
    const session: SBASession = {
      sessionId,
      loanType,
      applicantName,
      email,
      startedAt: now,
      expiresAt: new Date(now.getTime() + this.SESSION_TTL_MS),
      seed,
    };
    this.sessions.set(sessionId, session);
    this.crmSnapshots.set(sessionId, this.generateCrmSnapshot(loanType, applicantName, sessionId));
    this.crmTimelines.set(sessionId, this.generateTimeline(applicantName));
    this.updateSessionAnalytics(sessionId);
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

    logger.info('OctoDoc demo session started', {
      sessionId,
      loanType,
      applicantName,
      deterministicSeed: seed,
      userProvidedSeed: Boolean(normalizedSeed.length),
    });
    return session;
  }

  uploadDocument(sessionId: string, file: { originalname: string; size: number; mimetype?: string }, documentType?: string) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const documentId = uuidv4();
    const classification = this.generateClassification(session.sessionId, documentId, file.originalname, documentType);
    const canonicalType =
      classification.predictedType === 'supporting_documents' && documentType
        ? this.normalizeChecklistId(documentType)
        : classification.predictedType;
    const doc: SBADocument = {
      documentId,
      sessionId,
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
      uploadedAt: new Date(),
      documentType: canonicalType,
      status: 'processing',
      validation: null,
      classification: { ...classification, predictedType: canonicalType },
      analysis: undefined,
    };

    this.documents.set(documentId, doc);
    this.updateSessionAnalytics(sessionId);

    // Create processing job
    const jobId = uuidv4();
    const job: ProcessingJob = {
      jobId,
      documentId,
      sessionId,
      status: 'queued',
      stages: this.createProcessingStages(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
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

    const queueDelay = this.getDeterministicDelay(session.sessionId, `queue:${jobId}`, 320, 820);
    setTimeout(() => this.startProcessingJob(jobId), queueDelay);

    logger.info('Document uploaded (demo)', { sessionId, documentId, jobId, fileName: file.originalname });

    return { documentId, jobId, fileName: file.originalname, size: file.size, uploadedAt: doc.uploadedAt };
  }

  private startProcessingJob(jobId: string) {
    const job = this.jobs.get(jobId);
    if (!job) return;
    if (job.status === 'done' || job.status === 'failed') {
      return;
    }
    job.status = 'processing';
    job.startedAt = job.startedAt || new Date();
    job.updatedAt = new Date();
    this.jobs.set(jobId, job);
    this.advanceJobStage(jobId, 0);
  }

  private advanceJobStage(jobId: string, stageIndex: number) {
    const job = this.jobs.get(jobId);
    if (!job) return;
    const stage = job.stages[stageIndex];
    if (!stage) {
      this.finalizeProcessingJob(jobId);
      return;
    }
    if (stage.status === 'done') {
      this.advanceJobStage(jobId, stageIndex + 1);
      return;
    }

    const doc = this.documents.get(job.documentId);
    stage.status = 'running';
    stage.startedAt = new Date();
    job.stages[stageIndex] = stage;
    job.updatedAt = new Date();
    this.jobs.set(jobId, job);

    const delay = this.getDeterministicDelay(job.sessionId, `stage:${stage.id}:${stageIndex}:${job.jobId}`, 260, 780);
    setTimeout(() => {
      const activeJob = this.jobs.get(jobId);
      if (!activeJob) return;
      const activeStage = activeJob.stages[stageIndex];
      if (!activeStage) return;
      activeStage.status = 'done';
      activeStage.completedAt = new Date();
      activeStage.durationMs =
        activeStage.startedAt && activeStage.completedAt
          ? activeStage.completedAt.getTime() - activeStage.startedAt.getTime()
          : undefined;
      activeStage.detail = this.describeStage(activeStage.id, doc);
      activeJob.stages[stageIndex] = activeStage;
      activeJob.updatedAt = new Date();
      this.jobs.set(jobId, activeJob);
      if (stageIndex === activeJob.stages.length - 1) {
        this.finalizeProcessingJob(jobId);
      } else {
        this.advanceJobStage(jobId, stageIndex + 1);
      }
    }, delay);
  }

  private finalizeProcessingJob(jobId: string) {
    const job = this.jobs.get(jobId);
    if (!job) return;
    const doc = this.documents.get(job.documentId);
    if (!doc) {
      job.status = 'failed';
      job.completedAt = new Date();
      job.updatedAt = new Date();
      this.jobs.set(jobId, job);
      return;
    }

    const session = this.sessions.get(job.sessionId);
    const rand = this.createSessionScopedRandom(job.sessionId, `final:${job.jobId}:${doc.documentId}`);
    const reasons: string[] = [];
    let accepted = true;

    if (doc.size > 25 * 1024 * 1024) {
      accepted = false;
      reasons.push('File too large (>25MB)');
    }

    const ocrConfidence = Math.floor(55 + rand() * 40);
    const ocrText = `Simulated OCR extraction for ${doc.originalName} (confidence ${ocrConfidence}%)`;
    const extractedFields: Record<string, string | boolean> = {
      borrowerName: session?.applicantName || 'Demo Borrower',
      tin_present: rand() > 0.35,
      signaturesDetected: rand() > 0.5,
    };

    if (ocrConfidence < 65) {
      accepted = false;
      reasons.push(`Low OCR confidence (${ocrConfidence}%)`);
    }

    if (!extractedFields.signaturesDetected) {
      accepted = false;
      reasons.push('Signature not detected on final page');
    }

    const validation = {
      accepted,
      reasons: reasons.length > 0 ? reasons : ['Automated checks cleared with high confidence'],
      ocrText,
      extractedFields,
    };

    doc.validation = validation;
    doc.status = accepted ? 'accepted' : 'needs_attention';
    const pipeline = job.stages.map(stage => stage.label);
    const completedAt = new Date();
    const analysis = this.generateDocumentAnalysis(doc, validation, pipeline);
    if (job.startedAt) {
      analysis.processing.durationMs = completedAt.getTime() - job.startedAt.getTime();
    }
    analysis.processing.completedAt = completedAt;
    doc.analysis = analysis;
    this.documents.set(doc.documentId, doc);

    job.status = 'done';
    job.completedAt = completedAt;
    job.updatedAt = new Date();
    job.result = { validation, analysis };
    job.stages = job.stages.map(stage => ({
      ...stage,
      status: 'done',
      completedAt: stage.completedAt || job.completedAt,
      durationMs:
        stage.durationMs ||
        (stage.startedAt && stage.completedAt
          ? stage.completedAt.getTime() - stage.startedAt.getTime()
          : undefined),
      detail: stage.detail || this.describeStage(stage.id, doc),
    }));
    this.jobs.set(jobId, job);

    logger.info('Document processing complete (demo)', {
      jobId,
      documentId: doc.documentId,
      accepted,
      qualityScore: analysis.quality.score,
      riskScore: analysis.risk.score,
    });

    this.updateSessionAnalytics(doc.sessionId);

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

  private createProcessingStages(): ProcessingStage[] {
    return [
      { id: 'ingest', label: 'File intake', status: 'pending' },
      { id: 'threat_scan', label: 'Threat scan', status: 'pending' },
      { id: 'ocr', label: 'OCR & classification', status: 'pending' },
      { id: 'policy', label: 'Policy heuristics', status: 'pending' },
      { id: 'ai_review', label: 'AI coaching', status: 'pending' },
    ];
  }

  private describeStage(stageId: ProcessingStage['id'], doc?: SBADocument) {
    switch (stageId) {
      case 'ingest':
        return `Captured ${doc?.originalName || 'document'} metadata`;
      case 'threat_scan':
        return 'Virus scan cleared with no findings';
      case 'ocr':
        return 'OCR extracted entities + classification';
      case 'policy':
        return 'Policy heuristics evaluated eligibility';
      case 'ai_review':
        return 'AI Copilot drafted coaching guidance';
      default:
        return 'Processing stage completed';
    }
  }

  private getDeterministicDelay(sessionId: string, key: string, min: number, max: number) {
    const rand = this.createSessionScopedRandom(sessionId, key);
    const lower = Math.max(min, 50);
    const upper = Math.max(max, lower + 1);
    return lower + Math.round(rand() * (upper - lower));
  }

  async getStatus(jobId: string): Promise<ProcessingJob> {
    const job = this.jobs.get(jobId);
    if (job) return this.hydrateJobRecord(job);

    try {
      const key = `octodoc:job:${jobId}`;
      const raw = await redisClient.get(key);
      if (!raw) throw new Error('Job not found');
      const parsed = this.hydrateJobRecord(JSON.parse(raw) as ProcessingJob);
      this.jobs.set(jobId, parsed);
      return parsed;
    } catch (err) {
      throw new Error('Job not found');
    }
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

      const docs = this.getDocumentsForSession(sessionId);
      const analytics = this.sessionAnalytics.get(sessionId) || this.updateSessionAnalytics(sessionId) || this.buildEmptyAnalytics(session);
      return { documents: docs, requiredChecklist: this.getChecklist(session.loanType), analytics };
    })();
  }

  getDocumentAnalysis(documentId: string) {
    const doc = this.documents.get(documentId);
    if (!doc) {
      throw new Error('Document not found');
    }
    if (!doc.analysis || !doc.validation) {
      throw new Error('Document still processing');
    }

    return {
      document: {
        documentId: doc.documentId,
        sessionId: doc.sessionId,
        originalName: doc.originalName,
        size: doc.size,
        documentType: doc.documentType,
        status: doc.status,
        uploadedAt: doc.uploadedAt,
        classification: doc.classification,
      },
      validation: doc.validation,
      analysis: doc.analysis,
    };
  }

  getSessionAnalyticsSnapshot(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    return this.sessionAnalytics.get(sessionId) || this.updateSessionAnalytics(sessionId) || this.buildEmptyAnalytics(session);
  }

  getSessionInsights(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    const analytics = this.getSessionAnalyticsSnapshot(sessionId);
    const documents = this.getDocumentsForSession(sessionId)
      .map(doc => ({
        documentId: doc.documentId,
        originalName: doc.originalName,
        documentType: doc.documentType,
        status: doc.status,
        size: doc.size,
        uploadedAt: doc.uploadedAt,
        qualityScore: doc.analysis?.quality.score ?? null,
        qualitySummary: doc.analysis?.quality.summary ?? null,
        riskScore: doc.analysis?.risk.score ?? null,
        aiSummary: doc.analysis?.ai.summary ?? null,
        aiConfidence: doc.analysis ? this.round(doc.analysis.ai.confidence * 100, 0) : null,
        completedAt: doc.analysis?.processing.completedAt ?? null,
        analysis: doc.analysis || null,
        suggestions: doc.analysis?.suggestions || [],
      }));

    return {
      session: {
        sessionId: session.sessionId,
        loanType: session.loanType,
        applicantName: session.applicantName,
        email: session.email,
        expiresAt: session.expiresAt,
      },
      analytics,
      documents,
    };
  }

  getStreamSnapshot(sessionId: string) {
    const insights = this.getSessionInsights(sessionId);
    return {
      analytics: insights.analytics,
      crm: this.getCrmSnapshot(sessionId),
      timeline: this.getRelationshipTimeline(sessionId),
      documents: insights.documents,
      jobs: this.getJobStageSnapshots(sessionId),
    };
  }

  private getJobStageSnapshots(sessionId: string) {
    return this.getJobsForSession(sessionId).map(job => ({
      jobId: job.jobId,
      documentId: job.documentId,
      status: job.status,
      stages: job.stages,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
    }));
  }

  getRecentDocuments(limit: number = 5) {
    return Array.from(this.documents.values())
      .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())
      .slice(0, limit)
      .map(doc => ({
        documentId: doc.documentId,
        sessionId: doc.sessionId,
        originalName: doc.originalName,
        documentType: doc.documentType,
        status: doc.status,
        uploadedAt: doc.uploadedAt,
        qualityScore: doc.analysis?.quality.score ?? null,
        riskScore: doc.analysis?.risk.score ?? null,
        aiConfidence: doc.analysis ? this.round(doc.analysis.ai.confidence * 100, 0) : null,
      }));
  }

  getAllSessionAnalytics() {
    return Array.from(this.sessionAnalytics.values()).sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
    );
  }

  private getJobsForSession(sessionId: string): ProcessingJob[] {
    return Array.from(this.jobs.values()).filter(job => job.sessionId === sessionId);
  }

  validateDocument(documentId: string) {
    const doc = this.documents.get(documentId);
    if (!doc) throw new Error('Document not found');

    doc.status = 'processing';
    doc.validation = null;
    doc.analysis = undefined;
    this.documents.set(documentId, doc);
    this.updateSessionAnalytics(doc.sessionId);

    // Create a re-validation job
    const jobId = uuidv4();
    const job: ProcessingJob = {
      jobId,
      documentId,
      sessionId: doc.sessionId,
      status: 'queued',
      stages: this.createProcessingStages(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.jobs.set(jobId, job);
    const delay = this.getDeterministicDelay(doc.sessionId, `queue:revalidate:${jobId}`, 320, 780);
    setTimeout(() => this.startProcessingJob(jobId), delay);
    return { jobId };
  }

  schedulePickup(sessionId: string, preferredDate?: string, contactPhone?: string) {
    if (!this.sessions.has(sessionId)) throw new Error('Session not found');
    const confirmationId = uuidv4();
    const scheduledAt = preferredDate ? new Date(preferredDate) : new Date(Date.now() + 24 * 60 * 60 * 1000);
    logger.info('Pickup scheduled (demo)', { sessionId, confirmationId, scheduledAt, contactPhone });
    return { confirmationId, scheduledAt };
  }

  hasSession(sessionId: string) {
    return this.sessions.has(sessionId);
  }

  getCrmSnapshot(sessionId: string) {
    const snapshot = this.crmSnapshots.get(sessionId);
    if (snapshot) return snapshot;

    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const regenerated = this.generateCrmSnapshot(session.loanType, session.applicantName, session.sessionId);
    this.crmSnapshots.set(sessionId, regenerated);
    return regenerated;
  }

  getRelationshipTimeline(sessionId: string) {
    const timeline = this.crmTimelines.get(sessionId);
    if (timeline) return timeline;

    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const regenerated = this.generateTimeline(session.applicantName);
    this.crmTimelines.set(sessionId, regenerated);
    return regenerated;
  }

  getRoleShowcases(): RoleShowcase[] {
    return Object.values(this.roleShowcases);
  }

  getRoleShowcase(role: string): RoleShowcase | null {
    if (!role) return null;
    const key = role.toUpperCase() as DemoRole;
    return this.roleShowcases[key] || null;
  }

  private getDocumentsForSession(sessionId: string): SBADocument[] {
    return Array.from(this.documents.values()).filter(doc => doc.sessionId === sessionId);
  }

  private generateClassification(
    sessionId: string,
    documentId: string,
    originalName: string,
    providedType?: string
  ): NonNullable<SBADocument['classification']> {
    const heuristics = [
      { id: 'app_form', matches: ['application', '1919', 'form 1919'] },
      { id: 'tax_returns', matches: ['tax', 'irs', '1040', 'return'] },
      { id: 'business_plan', matches: ['plan', 'strategy', 'narrative'] },
      { id: 'financials', matches: ['financial', 'statement', 'p&l', 'balance'] },
      { id: 'ownership', matches: ['ownership', 'cap table', 'equity'] },
      { id: 'personal_guarantee', matches: ['guarantee', '912', 'personal'] },
    ];

    const tryMatch = (value: string | undefined) => {
      if (!value) return undefined;
      const normalized = value.toLowerCase();
      return heuristics.find(rule => rule.matches.some(token => normalized.includes(token)));
    };

    const providedMatch = tryMatch(providedType);
    if (providedMatch) {
      return { predictedType: providedMatch.id, confidence: 0.95 };
    }

    const filenameMatch = tryMatch(originalName);
    if (filenameMatch) {
      const rand = this.createSessionScopedRandom(sessionId, `classification:${documentId}:${originalName}`);
      return { predictedType: filenameMatch.id, confidence: this.round(0.78 + rand() * 0.18, 2) };
    }

    const rand = this.createSessionScopedRandom(sessionId, `classification:${documentId}:${originalName}:fallback`);
    return {
      predictedType: 'supporting_documents',
      confidence: this.round(0.55 + rand() * 0.3, 2),
    };
  }

  private generateDocumentAnalysis(
    doc: SBADocument,
    validation: NonNullable<SBADocument['validation']>,
    pipeline?: string[]
  ): DocumentAnalysis {
    const rand = this.createSessionScopedRandom(doc.sessionId, `analysis:${doc.documentId}`);
    const resolutionDpi = 180 + Math.round(rand() * 240);
    const clarity = this.round(0.55 + rand() * 0.4, 2);
    const orientation = this.round((rand() - 0.5) * 6, 1);
    const completenessScore = validation.accepted ? 90 + Math.round(rand() * 6) : 65 + Math.round(rand() * 18);
    const readabilityScore = validation.accepted ? 85 + Math.round(rand() * 10) : 68 + Math.round(rand() * 20);

    let qualityScore = Math.round(clarity * 25 + completenessScore * 0.35 + readabilityScore * 0.25);
    if (!validation.accepted) {
      qualityScore -= 8;
    }
    qualityScore = this.clamp(qualityScore, 45, 98);

    const qualityIssues = validation.accepted ? ['No blocking issues detected'] : [...validation.reasons];
    if (resolutionDpi < 220) {
      qualityIssues.push('Low scan resolution detected');
    }
    if (Math.abs(orientation) > 2.5) {
      qualityIssues.push('Document rotation needs adjustment');
    }
    const qualityWarnings: string[] = [];
    if (clarity < 0.7) {
      qualityWarnings.push('Detected blur in critical fields');
    }

    const quality: DocumentQualityPreview = {
      score: qualityScore,
      resolutionDpi,
      clarity,
      orientation,
      completenessScore,
      readabilityScore,
      summary: validation.accepted
        ? 'Document meets automated quality thresholds.'
        : 'Quality assistant flagged items that require follow-up.',
      issues: Array.from(new Set(qualityIssues)),
      warnings: qualityWarnings,
    };

    const aiConfidence = this.clamp(0.62 + rand() * 0.32 - (validation.accepted ? 0 : 0.12), 0.45, 0.95);
    const keywords = this.deriveKeywords(doc.originalName);
    const ai: DocumentAIInsight = {
      summary: validation.accepted
        ? 'AI Copilot extracted key entities and matched borrower identity.'
        : 'AI Copilot extracted entities but flagged inconsistencies requiring attention.',
      confidence: this.round(aiConfidence, 2),
      extractedEntities: this.buildEntitySnippets(doc, validation, rand),
      keywords,
      recommendations: this.buildAIRecommendations(validation, keywords, aiConfidence),
      sentiment: validation.accepted && aiConfidence > 0.7 ? 'POSITIVE' : aiConfidence > 0.6 ? 'NEUTRAL' : 'RISK',
    };

    const sizePenalty = doc.size > 15 * 1024 * 1024 ? 12 : doc.size > 5 * 1024 * 1024 ? 6 : 0;
    const riskScore = this.clamp(
      Math.round((100 - quality.score) * 0.6 + (1 - ai.confidence) * 70 + sizePenalty + rand() * 8),
      5,
      95
    );
    const riskRating = this.mapRiskRating(riskScore);
    const risk: DocumentRiskPreview = {
      score: riskScore,
      rating: riskRating,
      recommendation: this.mapRiskRecommendation(riskRating, validation.accepted),
      summary:
        riskRating === 'LOW'
          ? 'Minimal risk indicators detected.'
          : riskRating === 'MEDIUM'
          ? 'Moderate risk requiring team awareness.'
          : 'High risk indicators detected. Escalation recommended.',
      factors: this.buildRiskFactors(validation, riskRating, rand),
    };

    const processing: DocumentProcessingSummary = {
      durationMs: 1200 + Math.round(rand() * 900),
      completedAt: new Date(),
      pipeline: pipeline && pipeline.length ? pipeline : ['File intake', 'Threat scan', 'OCR', 'Policy heuristics', 'AI coaching'],
    };

    const suggestions = this.buildDocumentSuggestions(validation, quality, ai, risk, doc);

    return {
      quality,
      ai,
      risk,
      suggestions,
      processing,
    };
  }

  private buildEntitySnippets(
    doc: SBADocument,
    validation: NonNullable<SBADocument['validation']>,
    rand: () => number
  ): DocumentAIInsight['extractedEntities'] {
    const session = this.sessions.get(doc.sessionId);
    const borrower = session?.applicantName || 'Borrower';
    const business = session?.applicantName ? `${session.applicantName.split(' ')[0]} Ventures` : 'Demo Holdings';

    const entities: DocumentAIInsight['extractedEntities'] = [
      { label: 'Borrower', value: borrower, confidence: this.round(0.8 + rand() * 0.15, 2) },
      { label: 'Business', value: business, confidence: this.round(0.75 + rand() * 0.2, 2) },
      {
        label: 'Document Type',
        value: doc.documentType || 'Supporting',
        confidence: this.round(doc.classification?.confidence || 0.72, 2),
      },
      {
        label: 'TIN Detected',
        value: validation.extractedFields?.tin_present ? 'Yes' : 'Not found',
        confidence: this.round(0.65 + rand() * 0.2, 2),
      },
    ];

    const signatureFlag = validation.extractedFields?.signaturesDetected === false ? 'Missing' : 'Present';
    entities.push({
      label: 'Signature Presence',
      value: signatureFlag,
      confidence: this.round(0.68 + rand() * 0.2, 2),
    });

    return entities;
  }

  private buildAIRecommendations(
    validation: NonNullable<SBADocument['validation']>,
    keywords: string[],
    aiConfidence: number
  ): string[] {
    const recommendations: string[] = [];
    if (!validation.accepted) {
      recommendations.push('Route borrower through coached re-upload workflow.');
    }
    if (aiConfidence < 0.7) {
      recommendations.push('Trigger human spot-check to raise AI confidence.');
    } else {
      recommendations.push('Attach AI summary to Teams #sba-demo channel.');
    }
    if (keywords.length > 0) {
      recommendations.push(`Tag CRM timeline with keywords: ${keywords.slice(0, 2).join(', ')}`);
    }
    return Array.from(new Set(recommendations)).slice(0, 3);
  }

  private buildRiskFactors(
    validation: NonNullable<SBADocument['validation']>,
    rating: DocumentRiskPreview['rating'],
    rand: () => number
  ): DocumentRiskPreview['factors'] {
    const factors: DocumentRiskPreview['factors'] = [];

    if (!validation.accepted && validation.reasons.length > 0) {
      factors.push({
        category: 'DOCUMENT_QUALITY',
        severity: rating === 'LOW' ? 'MEDIUM' : rating,
        description: validation.reasons[0],
      });
    }

    if (rating === 'HIGH' || rating === 'CRITICAL') {
      factors.push({
        category: 'ANOMALY_DETECTION',
        severity: 'HIGH',
        description: 'AI detected anomalies in extracted data.',
      });
    } else if (rand() > 0.5) {
      factors.push({
        category: 'DATA_INCONSISTENCY',
        severity: 'MEDIUM',
        description: 'Inconsistent borrower identifiers vs CRM snapshot.',
      });
    }

    if (rand() > 0.6) {
      factors.push({
        category: 'MISSING_INFORMATION',
        severity: 'LOW',
        description: 'Checklist item still outstanding for this file.',
      });
    }

    return factors.slice(0, 3);
  }

  private buildDocumentSuggestions(
    validation: NonNullable<SBADocument['validation']>,
    quality: DocumentQualityPreview,
    ai: DocumentAIInsight,
    risk: DocumentRiskPreview,
    doc: SBADocument
  ): DocumentSuggestion[] {
    const suggestions: DocumentSuggestion[] = [];

    if (!validation.accepted) {
      suggestions.push({
        id: `reupload-${doc.documentId}`,
        title: 'Request improved scan',
        detail: validation.reasons.join(', '),
        action: 'Send borrower instructions',
        severity: 'warning',
      });
    }

    if (risk.rating === 'HIGH' || risk.rating === 'CRITICAL') {
      suggestions.push({
        id: `escalate-${doc.documentId}`,
        title: 'Escalate to credit ops',
        detail: `Risk score ${risk.score} with recommendation ${risk.recommendation}.`,
        action: 'Notify credit desk',
        severity: 'critical',
      });
    }

    if (ai.confidence < 0.68) {
      suggestions.push({
        id: `spotcheck-${doc.documentId}`,
        title: 'Add human spot-check',
        detail: 'AI confidence dipped below 70%.',
        action: 'Assign reviewer',
        severity: 'warning',
      });
    }

    if (suggestions.length === 0) {
      suggestions.push({
        id: `ready-${doc.documentId}`,
        title: 'Ready for underwriting',
        detail: `Quality score ${quality.score}% with AI confidence ${Math.round(ai.confidence * 100)}%.`,
        action: 'Share summary with credit team',
        severity: 'info',
      });
    }

    return suggestions;
  }

  private deriveKeywords(originalName: string): string[] {
    const base = originalName
      .replace(/\.[^/.]+$/, '')
      .split(/[\s_-]+/)
      .map(token => token.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 3);
    const curated = ['sba', 'loan', 'octodoc'];
    return Array.from(new Set([...base, ...curated])).slice(0, 5);
  }

  private updateSessionAnalytics(sessionId: string): SessionAnalytics | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    const docs = this.getDocumentsForSession(sessionId);
    if (docs.length === 0) {
      const analytics = this.buildEmptyAnalytics(session);
      this.sessionAnalytics.set(sessionId, analytics);
      return analytics;
    }

    const acceptedCount = docs.filter(d => d.status === 'accepted').length;
    const needsAttentionCount = docs.filter(d => d.status === 'needs_attention').length;
    const qualityScores = docs
      .map(d => d.analysis?.quality.score)
      .filter((score): score is number => typeof score === 'number');
    const avgQuality = qualityScores.length
      ? Math.round(qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length)
      : 0;
    const riskScores = docs
      .map(d => d.analysis?.risk.score)
      .filter((score): score is number => typeof score === 'number');
    const avgRisk = riskScores.length
      ? Math.round(riskScores.reduce((sum, score) => sum + score, 0) / riskScores.length)
      : 0;
    const outstanding = this.getOutstandingRequirements(session.loanType, docs);

    const analytics: SessionAnalytics = {
      sessionId: session.sessionId,
      loanType: session.loanType,
      totalDocuments: docs.length,
      acceptedDocuments: acceptedCount,
      needsAttentionDocuments: needsAttentionCount,
      averageQualityScore: avgQuality,
      averageRiskScore: avgRisk,
      riskLevel: this.mapSessionRisk(avgRisk),
      outstandingRequirements: outstanding,
      highlights: this.buildSessionHighlights(docs, avgQuality, outstanding),
      recommendedActions: this.buildSessionRecommendations(outstanding, needsAttentionCount, docs),
      updatedAt: new Date(),
    };

    this.sessionAnalytics.set(sessionId, analytics);
    return analytics;
  }

  private buildEmptyAnalytics(session: SBASession): SessionAnalytics {
    return {
      sessionId: session.sessionId,
      loanType: session.loanType,
      totalDocuments: 0,
      acceptedDocuments: 0,
      needsAttentionDocuments: 0,
      averageQualityScore: 0,
      averageRiskScore: 0,
      riskLevel: 'LOW',
      outstandingRequirements: this.getChecklist(session.loanType).filter(item => item.required).map(item => item.title),
      highlights: ['No documents uploaded yet'],
      recommendedActions: ['Kick off by uploading the application form'],
      updatedAt: new Date(),
    };
  }

  private buildSessionHighlights(docs: SBADocument[], avgQuality: number, outstanding: string[]): string[] {
    if (docs.length === 0) {
      return ['No documents uploaded yet'];
    }
    const highlights: string[] = [];
    const accepted = docs.filter(d => d.status === 'accepted').length;
    highlights.push(`${accepted}/${docs.length} docs cleared`);
    if (avgQuality) {
      highlights.push(`Avg quality ${avgQuality}%`);
    }
    const aiConfidenceValues = docs
      .map(d => d.analysis?.ai.confidence)
      .filter((value): value is number => typeof value === 'number');
    if (aiConfidenceValues.length) {
      const avgConfidence = Math.round(
        (aiConfidenceValues.reduce((sum, value) => sum + value, 0) / aiConfidenceValues.length) * 100
      );
      highlights.push(`AI confidence ${avgConfidence}%`);
    }
    if (outstanding.length > 0) {
      highlights.push(`${outstanding.length} required docs outstanding`);
    } else {
      highlights.push('Required checklist satisfied');
    }
    return highlights.slice(0, 4);
  }

  private buildSessionRecommendations(
    outstanding: string[],
    needsAttentionCount: number,
    docs: SBADocument[]
  ): string[] {
    const actions: string[] = [];

    if (outstanding.length > 0) {
      actions.push(`Request ${outstanding[0]} from borrower`);
    }

    if (needsAttentionCount > 0) {
      const flagged = docs.find(doc => doc.status === 'needs_attention');
      if (flagged) {
        actions.push(`Coach borrower on ${flagged.originalName}`);
      }
    }

    const lowQuality = docs.find(doc => (doc.analysis?.quality.score || 0) < 70);
    if (lowQuality) {
      actions.push(`Route ${lowQuality.originalName} through AI clean-up`);
    }

    if (actions.length === 0) {
      actions.push('Hand off package to underwriting');
    }

    return Array.from(new Set(actions)).slice(0, 3);
  }

  private getOutstandingRequirements(loanType: LoanType, docs: SBADocument[]): string[] {
    const checklist = this.getChecklist(loanType);
    const completed = new Set(
      docs.filter(doc => doc.status === 'accepted').map(doc => this.normalizeChecklistId(this.guessChecklistId(doc)))
    );

    return checklist
      .filter(item => item.required && !completed.has(this.normalizeChecklistId(item.id)))
      .map(item => item.title);
  }

  private guessChecklistId(doc: SBADocument): string {
    if (doc.documentType) {
      return doc.documentType;
    }
    const normalized = doc.originalName.toLowerCase();
    if (normalized.includes('tax')) return 'tax_returns';
    if (normalized.includes('application')) return 'app_form';
    if (normalized.includes('plan')) return 'business_plan';
    if (normalized.includes('financial')) return 'financials';
    if (normalized.includes('ownership')) return 'ownership';
    if (normalized.includes('guarantee') || normalized.includes('912')) return 'personal_guarantee';
    return 'supporting_documents';
  }

  private normalizeChecklistId(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  private createSessionScopedRandom(sessionId: string | undefined, key: string): () => number {
    if (!sessionId) {
      return this.createSeededRandom(`global:${key}`);
    }
    const session = this.sessions.get(sessionId);
    const seed = session?.seed || sessionId;
    return this.createSeededRandom(`${seed}:${key}`);
  }

  private createSeededRandom(seed: string): () => number {
    let h = 1779033703 ^ seed.length;
    for (let i = 0; i < seed.length; i += 1) {
      h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return () => {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      const t = (h ^= h >>> 16) >>> 0;
      return (t & 0xfffffff) / 0x10000000;
    };
  }

  private round(value: number, decimals = 2): number {
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  private mapRiskRating(score: number): DocumentRiskPreview['rating'] {
    if (score >= 80) return 'CRITICAL';
    if (score >= 60) return 'HIGH';
    if (score >= 40) return 'MEDIUM';
    return 'LOW';
  }

  private mapRiskRecommendation(
    rating: DocumentRiskPreview['rating'],
    accepted: boolean
  ): DocumentRiskPreview['recommendation'] {
    if (rating === 'CRITICAL' || rating === 'HIGH') {
      return 'ESCALATE';
    }
    if (rating === 'MEDIUM') {
      return accepted ? 'REQUEST_MORE_INFO' : 'ESCALATE';
    }
    return accepted ? 'APPROVE' : 'REQUEST_MORE_INFO';
  }

  private mapSessionRisk(score: number): SessionAnalytics['riskLevel'] {
    if (score >= 65) return 'HIGH';
    if (score >= 40) return 'MEDIUM';
    return 'LOW';
  }

  private hydrateJobRecord(job: ProcessingJob): ProcessingJob {
    if (job.createdAt) {
      job.createdAt = new Date(job.createdAt);
    }
    if (job.updatedAt) {
      job.updatedAt = new Date(job.updatedAt);
    }
    if (job.startedAt) {
      job.startedAt = new Date(job.startedAt);
    }
    if (job.completedAt) {
      job.completedAt = new Date(job.completedAt);
    }
    job.stages = (job.stages || []).map(stage => ({
      ...stage,
      startedAt: stage.startedAt ? new Date(stage.startedAt) : undefined,
      completedAt: stage.completedAt ? new Date(stage.completedAt) : undefined,
    }));
    if (job.result?.analysis?.processing?.completedAt) {
      job.result.analysis.processing.completedAt = new Date(job.result.analysis.processing.completedAt);
    }
    return job;
  }

  private generateCrmSnapshot(loanType: LoanType, applicantName?: string, sessionId?: string): DemoCrmSnapshot {
    const randomVariance = (key: string, base: number, variance: number) => {
      const rand = this.createSessionScopedRandom(sessionId, `crm:${key}`);
      return base + Math.round((rand() - 0.5) * variance);
    };

    const pipelineStages: PipelineStage[] = [
      { stage: 'Intake', count: randomVariance('pipeline:intake:count', 7, 2), avgAmount: randomVariance('pipeline:intake:avg', 180000, 40000), momentum: 'up', stuck: 1 },
      { stage: 'Document Review', count: randomVariance('pipeline:review:count', 6, 2), avgAmount: randomVariance('pipeline:review:avg', 240000, 50000), momentum: 'flat', stuck: 2 },
      { stage: 'Underwriting', count: randomVariance('pipeline:underwriting:count', 4, 2), avgAmount: randomVariance('pipeline:underwriting:avg', 360000, 60000), momentum: 'up', stuck: 1 },
      { stage: 'Credit Committee', count: randomVariance('pipeline:committee:count', 3, 1), avgAmount: randomVariance('pipeline:committee:avg', 415000, 40000), momentum: 'flat', stuck: 1 },
      { stage: 'Closing', count: randomVariance('pipeline:closing:count', 2, 1), avgAmount: randomVariance('pipeline:closing:avg', 500000, 80000), momentum: 'up', stuck: 0 },
    ];

    const borrowerRoster = [
      applicantName || 'Riverstone Bakery',
      'Brightline Coffee Collective',
      'Northwind Fabrication',
      loanType === '504' ? 'Urban Roots Marketplace' : 'Civic Impact Studio',
    ];

    const owners = ['Camila Reyes', 'Jordan Malik', 'Priya Desai', 'Ethan Patel'];
    const sentiments: Array<'POSITIVE' | 'NEUTRAL' | 'RISK'> = ['POSITIVE', 'NEUTRAL', 'RISK'];

    const relationshipHealth: RelationshipSummary[] = borrowerRoster.map((borrower, index) => ({
      borrowerName: borrower,
      businessName: borrower.includes(' ') ? `${borrower.split(' ')[0]} Holdings` : `${borrower} LLC`,
      stage: pipelineStages[index % pipelineStages.length].stage,
      owner: owners[index % owners.length],
      requestedAmount: randomVariance(`relationship:${index}:requested`, 180000 + index * 40000, 25000),
      lastTouch: new Date(Date.now() - (index + 1) * 45 * 60 * 1000),
      nextStep: ['Schedule site visit', 'Collect 4506-T', 'Prep credit memo', 'Confirm collateral'][index % 4],
      sentiment: sentiments[index % sentiments.length],
      outstandingItems: index % 3,
    }));

    const actionItems: ActionItem[] = [
      {
        id: uuidv4(),
        label: `Prep credit memo for ${borrowerRoster[0]}`,
        owner: owners[0],
        channel: 'TEAMS',
        dueAt: new Date(Date.now() + 90 * 60 * 1000),
        priority: 'HIGH',
        relatedBorrower: borrowerRoster[0],
        recommendedTemplate: 'Credit memo briefing',
      },
      {
        id: uuidv4(),
        label: 'Send doc chase for Form 912',
        owner: owners[1],
        channel: 'EMAIL',
        dueAt: new Date(Date.now() + 3 * 60 * 60 * 1000),
        priority: 'MEDIUM',
        relatedBorrower: borrowerRoster[1],
        recommendedTemplate: 'Missing tax form reminder',
      },
      {
        id: uuidv4(),
        label: 'Confirm appraisal appointment',
        owner: owners[2],
        channel: 'CALL',
        dueAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
        priority: 'LOW',
        relatedBorrower: borrowerRoster[2],
        recommendedTemplate: 'Site visit confirmation',
      },
    ];

    const engagementInsights: EngagementInsight[] = [
      {
        id: uuidv4(),
        title: 'Pipeline momentum',
        detail: '4 relationships advanced to underwriting this week. Focus on document-ready borrowers to keep pace.',
        impact: '+12% volume WoW',
        severity: 'success',
      },
      {
        id: uuidv4(),
        title: 'Outstanding items',
        detail: '3 SBA 504 packages still missing Form 413. Use quick replies to request updates.',
        impact: 'Risk of SLA breach in 18 hrs',
        severity: 'warning',
      },
      {
        id: uuidv4(),
        title: 'AI recommendation',
        detail: 'Loan Copilot suggests prioritizing Northwind Fabrication due to high approval likelihood.',
        impact: 'Improves approval probability by 8%',
        severity: 'info',
      },
    ];

    const quickReplies: QuickReply[] = [
      {
        id: 'sms_checkin',
        label: 'SMS check-in',
        channel: 'SMS',
        body: 'Hi {{firstName}}, sending a quick reminder that we still need the signed Form 912 to keep your SBA package moving. Text me if you need the link again.',
        tone: 'Friendly',
      },
      {
        id: 'email_summary',
        label: 'Email status summary',
        channel: 'EMAIL',
        body: 'Team,\n\nSharing a quick status pulse for {{businessName}}. Docs are 92% complete and AI validation cleared key risks. Ready for underwriting once we receive the updated projections.\n\nThanks,\n{{owner}}',
        tone: 'Professional',
      },
      {
        id: 'teams_handoff',
        label: 'Teams underwriting handoff',
        channel: 'TEAMS',
        body: 'Heads up {{underwriter}}, {{businessName}} is ready for credit review. AI Copilot flagged collateral schedule variance—details in the dossier card.',
        tone: 'Urgent',
      },
    ];

    return {
      pipelineStages,
      relationshipHealth,
      actionItems,
      engagementInsights,
      quickReplies,
    };
  }

  private generateTimeline(applicantName?: string): RelationshipTimelineEvent[] {
    const primaryName = applicantName || 'Borrower';
    const now = Date.now();

    return [
      {
        id: uuidv4(),
        timestamp: new Date(now - 40 * 60 * 1000),
        actor: primaryName,
        channel: 'UPLOAD',
        summary: 'Uploaded Q2 financial statements via secure portal',
        impact: 'Document set at 92% completeness',
        attachment: 'financials-q2.pdf',
      },
      {
        id: uuidv4(),
        timestamp: new Date(now - 2 * 60 * 60 * 1000),
        actor: 'Loan Copilot',
        channel: 'NOTE',
        summary: 'AI validation cleared three prior anomalies after re-scan',
        impact: 'Risk score improved to 78',
      },
      {
        id: uuidv4(),
        timestamp: new Date(now - 4 * 60 * 60 * 1000),
        actor: 'Camila Reyes',
        channel: 'CALL',
        summary: 'Coaching call: confirmed collateral schedule + site visit availability',
        impact: 'Site visit scheduled for Friday 10am',
      },
      {
        id: uuidv4(),
        timestamp: new Date(now - 7 * 60 * 60 * 1000),
        actor: primaryName,
        channel: 'EMAIL',
        summary: 'Borrower acknowledged action plan and assigned next steps to controller',
        impact: 'Engagement sentiment trending positive',
      },
      {
        id: uuidv4(),
        timestamp: new Date(now - 12 * 60 * 60 * 1000),
        actor: 'Loan Copilot',
        channel: 'NOTE',
        summary: 'Auto-generated borrower journey summary for leadership briefing',
        impact: 'Shared to Teams #sba-demo',
      },
    ];
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
