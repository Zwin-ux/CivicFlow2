/**
 * Document Processing Queue Service
 * Manages parallel processing of multiple documents with job tracking and progress reporting
 * Implements worker queue pattern with timeout handling
 */

import aiDocumentAnalyzerService from './aiDocumentAnalyzerService';
import documentQualityService from './documentQualityService';
import smartExtractionService from './smartExtractionService';
import websocketService from './websocketService';
import logger from '../utils/logger';
import { EventEmitter } from 'events';

export interface ProcessingJob {
  id: string;
  documentIds: string[];
  type: ProcessingJobType;
  status: JobStatus;
  progress: number; // 0-100
  startedAt: Date;
  completedAt?: Date;
  results: ProcessingResult[];
  errors: ProcessingError[];
  totalDocuments: number;
  processedDocuments: number;
  failedDocuments: number;
  estimatedTimeRemaining?: number; // milliseconds
}

export enum ProcessingJobType {
  FULL_ANALYSIS = 'FULL_ANALYSIS',
  QUALITY_CHECK = 'QUALITY_CHECK',
  DATA_EXTRACTION = 'DATA_EXTRACTION',
  BATCH_ANALYSIS = 'BATCH_ANALYSIS',
}

export enum JobStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  TIMEOUT = 'TIMEOUT',
}

export interface ProcessingResult {
  documentId: string;
  success: boolean;
  data?: any;
  processingTime: number;
  timestamp: Date;
}

export interface ProcessingError {
  documentId: string;
  error: string;
  timestamp: Date;
}

export interface QueueOptions {
  maxConcurrent?: number;
  timeout?: number; // milliseconds
  retryAttempts?: number;
  retryDelay?: number; // milliseconds
}

export interface ProgressUpdate {
  jobId: string;
  progress: number;
  processedDocuments: number;
  totalDocuments: number;
  estimatedTimeRemaining?: number;
}

class DocumentProcessingQueueService extends EventEmitter {
  private static instance: DocumentProcessingQueueService;
  private jobs: Map<string, ProcessingJob> = new Map();
  private activeWorkers: number = 0;
  private readonly DEFAULT_MAX_CONCURRENT = 5;
  private readonly DEFAULT_TIMEOUT = 300000; // 5 minutes
  private readonly DEFAULT_RETRY_ATTEMPTS = 2;
  private readonly DEFAULT_RETRY_DELAY = 2000; // 2 seconds

  private constructor() {
    super();
  }

  public static getInstance(): DocumentProcessingQueueService {
    if (!DocumentProcessingQueueService.instance) {
      DocumentProcessingQueueService.instance = new DocumentProcessingQueueService();
    }
    return DocumentProcessingQueueService.instance;
  }

  /**
   * Create a new processing job
   */
  async createJob(
    documentIds: string[],
    type: ProcessingJobType = ProcessingJobType.FULL_ANALYSIS,
    options: QueueOptions = {}
  ): Promise<string> {
    const jobId = this.generateJobId();
    const job: ProcessingJob = {
      id: jobId,
      documentIds,
      type,
      status: JobStatus.PENDING,
      progress: 0,
      startedAt: new Date(),
      results: [],
      errors: [],
      totalDocuments: documentIds.length,
      processedDocuments: 0,
      failedDocuments: 0,
    };

    this.jobs.set(jobId, job);
    logger.info('Processing job created', { jobId, documentCount: documentIds.length, type });

    // Start processing asynchronously
    this.processJob(jobId, options).catch((error) => {
      logger.error('Job processing failed', { jobId, error: error.message });
      this.updateJobStatus(jobId, JobStatus.FAILED);
    });

    return jobId;
  }

  /**
   * Get job status
   */
  getJobStatus(jobId: string): ProcessingJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job) {
      logger.warn('Job not found for cancellation', { jobId });
      return false;
    }

    if (job.status === JobStatus.COMPLETED || job.status === JobStatus.FAILED) {
      logger.warn('Cannot cancel completed or failed job', { jobId, status: job.status });
      return false;
    }

    job.status = JobStatus.CANCELLED;
    job.completedAt = new Date();
    logger.info('Job cancelled', { jobId });
    this.emit('jobCancelled', { jobId });

    // Broadcast cancellation via WebSocket
    websocketService.broadcast({
      type: 'batch.cancelled',
      data: { jobId },
      timestamp: new Date(),
    });

    return true;
  }

  /**
   * Get all jobs
   */
  getAllJobs(): ProcessingJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Clean up old jobs (older than 24 hours)
   */
  cleanupOldJobs(): void {
    const cutoffTime = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago
    let cleanedCount = 0;

    for (const [jobId, job] of this.jobs.entries()) {
      if (job.completedAt && job.completedAt.getTime() < cutoffTime) {
        this.jobs.delete(jobId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info('Cleaned up old jobs', { count: cleanedCount });
    }
  }

  /**
   * Process a job with parallel document processing
   */
  private async processJob(jobId: string, options: QueueOptions): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    const maxConcurrent = options.maxConcurrent || this.DEFAULT_MAX_CONCURRENT;
    const timeout = options.timeout || this.DEFAULT_TIMEOUT;
    const retryAttempts = options.retryAttempts || this.DEFAULT_RETRY_ATTEMPTS;
    const retryDelay = options.retryDelay || this.DEFAULT_RETRY_DELAY;

    try {
      job.status = JobStatus.PROCESSING;
      this.emit('jobStarted', { jobId });

      const startTime = Date.now();
      const processingPromises: Map<string, Promise<void>> = new Map();

      // Process documents in parallel with concurrency limit
      for (let i = 0; i < job.documentIds.length; i++) {
        const documentId = job.documentIds[i];

        // Wait if we've reached max concurrent workers
        while (this.activeWorkers >= maxConcurrent) {
          await this.sleep(100);
          
          // Check for timeout
          if (Date.now() - startTime > timeout) {
            throw new Error('Job timeout exceeded');
          }

          // Check if job was cancelled
          const currentJob = this.jobs.get(jobId);
          if (currentJob && currentJob.status === JobStatus.CANCELLED) {
            logger.info('Job was cancelled during processing', { jobId });
            return;
          }
        }

        // Start processing document
        const promise = this.processDocument(
          jobId,
          documentId,
          job.type,
          retryAttempts,
          retryDelay,
          timeout
        );
        processingPromises.set(documentId, promise);
      }

      // Wait for all documents to complete
      await Promise.all(Array.from(processingPromises.values()));

      // Update final job status
      const updatedJob = this.jobs.get(jobId);
      if (updatedJob && updatedJob.status !== JobStatus.CANCELLED) {
        updatedJob.status = JobStatus.COMPLETED;
        updatedJob.completedAt = new Date();
        updatedJob.progress = 100;

        logger.info('Job completed successfully', {
          jobId,
          totalDocuments: updatedJob.totalDocuments,
          processedDocuments: updatedJob.processedDocuments,
          failedDocuments: updatedJob.failedDocuments,
          duration: Date.now() - startTime,
        });

        this.emit('jobCompleted', {
          jobId,
          results: updatedJob.results,
          errors: updatedJob.errors,
        });

        // Broadcast completion via WebSocket
        websocketService.broadcast({
          type: 'batch.completed',
          data: {
            jobId,
            totalDocuments: updatedJob.totalDocuments,
            processedDocuments: updatedJob.processedDocuments,
            failedDocuments: updatedJob.failedDocuments,
            duration: Date.now() - startTime,
          },
          timestamp: new Date(),
        });
      }
    } catch (error: any) {
      logger.error('Job processing failed', { jobId, error: error.message });
      
      const updatedJob = this.jobs.get(jobId);
      if (updatedJob) {
        updatedJob.status = error.message.includes('timeout') ? JobStatus.TIMEOUT : JobStatus.FAILED;
        updatedJob.completedAt = new Date();
        
        this.emit('jobFailed', {
          jobId,
          error: error.message,
          results: updatedJob.results,
          errors: updatedJob.errors,
        });

        // Broadcast failure via WebSocket
        websocketService.broadcast({
          type: 'batch.failed',
          data: {
            jobId,
            error: error.message,
            processedDocuments: updatedJob.processedDocuments,
            failedDocuments: updatedJob.failedDocuments,
          },
          timestamp: new Date(),
        });
      }
    }
  }

  /**
   * Process a single document with retry logic
   */
  private async processDocument(
    jobId: string,
    documentId: string,
    type: ProcessingJobType,
    maxRetries: number,
    retryDelay: number,
    timeout: number
  ): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    this.activeWorkers++;
    const startTime = Date.now();

    try {
      let lastError: Error | null = null;
      let attempt = 0;

      while (attempt <= maxRetries) {
        try {
          // Check for timeout
          if (Date.now() - startTime > timeout) {
            throw new Error(`Document processing timeout: ${documentId}`);
          }

          // Check if job was cancelled
          if (job.status === JobStatus.CANCELLED) {
            logger.info('Skipping document processing - job cancelled', { jobId, documentId });
            return;
          }

          // Process based on job type
          let result: any;
          switch (type) {
            case ProcessingJobType.FULL_ANALYSIS:
              result = await aiDocumentAnalyzerService.analyzeDocument(documentId);
              break;
            case ProcessingJobType.QUALITY_CHECK:
              result = await documentQualityService.assessQuality(documentId);
              break;
            case ProcessingJobType.DATA_EXTRACTION:
              result = await smartExtractionService.extractFinancialData(documentId);
              break;
            case ProcessingJobType.BATCH_ANALYSIS:
              result = await aiDocumentAnalyzerService.analyzeDocument(documentId);
              break;
            default:
              throw new Error(`Unknown job type: ${type}`);
          }

          // Success - record result
          const processingTime = Date.now() - startTime;
          job.results.push({
            documentId,
            success: true,
            data: result,
            processingTime,
            timestamp: new Date(),
          });

          job.processedDocuments++;
          this.updateProgress(jobId);

          logger.debug('Document processed successfully', {
            jobId,
            documentId,
            attempt,
            processingTime,
          });

          return; // Success - exit retry loop
        } catch (error: any) {
          lastError = error;
          attempt++;

          if (attempt <= maxRetries) {
            logger.warn('Document processing failed, retrying', {
              jobId,
              documentId,
              attempt,
              maxRetries,
              error: error.message,
            });
            await this.sleep(retryDelay * attempt); // Exponential backoff
          }
        }
      }

      // All retries exhausted - record error
      if (lastError) {
        job.errors.push({
          documentId,
          error: lastError.message,
          timestamp: new Date(),
        });
        job.failedDocuments++;
        this.updateProgress(jobId);

        logger.error('Document processing failed after retries', {
          jobId,
          documentId,
          attempts: maxRetries + 1,
          error: lastError.message,
        });
      }
    } finally {
      this.activeWorkers--;
    }
  }

  /**
   * Update job progress
   */
  private updateProgress(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    const completedDocuments = job.processedDocuments + job.failedDocuments;
    job.progress = Math.round((completedDocuments / job.totalDocuments) * 100);

    // Calculate estimated time remaining
    if (job.results.length > 0) {
      const avgProcessingTime =
        job.results.reduce((sum, r) => sum + r.processingTime, 0) / job.results.length;
      const remainingDocuments = job.totalDocuments - completedDocuments;
      job.estimatedTimeRemaining = Math.round(avgProcessingTime * remainingDocuments);
    }

    // Emit progress update
    const progressUpdate: ProgressUpdate = {
      jobId,
      progress: job.progress,
      processedDocuments: completedDocuments,
      totalDocuments: job.totalDocuments,
      estimatedTimeRemaining: job.estimatedTimeRemaining,
    };

    this.emit('progress', progressUpdate);

    // Broadcast progress via WebSocket
    websocketService.broadcast({
      type: 'batch.progress',
      data: progressUpdate,
      timestamp: new Date(),
    });

    logger.debug('Job progress updated', {
      jobId,
      progress: job.progress,
      processedDocuments: completedDocuments,
      totalDocuments: job.totalDocuments,
    });
  }

  /**
   * Update job status
   */
  private updateJobStatus(jobId: string, status: JobStatus): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = status;
    if (status === JobStatus.COMPLETED || status === JobStatus.FAILED || status === JobStatus.TIMEOUT) {
      job.completedAt = new Date();
    }
  }

  /**
   * Generate unique job ID
   */
  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default DocumentProcessingQueueService.getInstance();