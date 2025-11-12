/**
 * Azure AI Document Intelligence Client
 * Wrapper for Azure AI Document Intelligence (formerly Form Recognizer) with error handling and retry logic
 */

import {
  DocumentAnalysisClient,
  AzureKeyCredential,
  AnalyzeResult,
} from '@azure/ai-form-recognizer';
import config from '../config';
import logger from '../utils/logger';
import { createCircuitBreaker, CircuitBreakerOptions } from '../utils/circuitBreaker';
import { ExternalServiceError } from '../utils/errors';
import CircuitBreaker from 'opossum';

export interface DocumentAnalysisOptions {
  modelId?: string;
  pages?: string;
  locale?: string;
}

export interface AnalysisResultWithMetadata {
  result: AnalyzeResult;
  processingTime: number;
  modelId: string;
}

class AzureDocumentIntelligenceClient {
  private client: DocumentAnalysisClient | null = null;
  private circuitBreaker: CircuitBreaker<any, AnalysisResultWithMetadata>;
  private static instance: AzureDocumentIntelligenceClient;
  private isConfigured: boolean = false;

  private constructor() {
    const { endpoint, key, timeout } = config.ai.azureDocumentIntelligence;

    if (!endpoint || !key) {
      logger.warn('Azure Document Intelligence credentials not configured. Client will operate in mock mode.');
      this.isConfigured = false;
    } else {
      try {
        // Initialize Azure client only if credentials are provided
        this.client = new DocumentAnalysisClient(
          endpoint,
          new AzureKeyCredential(key)
        );
        this.isConfigured = true;
        logger.info('Azure Document Intelligence client initialized successfully');
      } catch (error: any) {
        logger.error('Failed to initialize Azure Document Intelligence client', { error: error.message });
        this.isConfigured = false;
      }
    }

    // Circuit breaker configuration
    const circuitBreakerOptions: CircuitBreakerOptions = {
      timeout,
      errorThresholdPercentage: 50,
      resetTimeout: 30000,
      rollingCountTimeout: 10000,
      rollingCountBuckets: 10,
      name: 'AzureDocumentIntelligence',
    };

    // Wrap the analyze method with circuit breaker
    this.circuitBreaker = createCircuitBreaker(
      this.analyzeDocumentInternal.bind(this),
      circuitBreakerOptions
    );

    // Add fallback for circuit breaker
    this.circuitBreaker.fallback(() => {
      throw new ExternalServiceError(
        'AzureDocumentIntelligence',
        'Azure Document Intelligence service is temporarily unavailable. Please try again later.',
        { circuitBreakerOpen: true }
      );
    });
  }

  public static getInstance(): AzureDocumentIntelligenceClient {
    if (!AzureDocumentIntelligenceClient.instance) {
      AzureDocumentIntelligenceClient.instance = new AzureDocumentIntelligenceClient();
    }
    return AzureDocumentIntelligenceClient.instance;
  }

  /**
   * Internal method to analyze document (wrapped by circuit breaker)
   */
  private async analyzeDocumentInternal(
    documentBuffer: Buffer,
    options: DocumentAnalysisOptions = {}
  ): Promise<AnalysisResultWithMetadata> {
    const startTime = Date.now();
    const modelId = options.modelId || 'prebuilt-document';

    // Return mock data if not configured
    if (!this.isConfigured || !this.client) {
      logger.info('Azure Document Intelligence not configured - returning mock analysis');
      return this.getMockAnalysisResult(modelId, startTime);
    }

    try {
      logger.info('Starting document analysis', {
        modelId,
        documentSize: documentBuffer.length,
        options,
      });

      // Start the analysis
      const poller = await this.client.beginAnalyzeDocument(
        modelId,
        documentBuffer,
        {
          pages: options.pages,
          locale: options.locale,
        }
      );

      // Wait for completion
      const result = await poller.pollUntilDone();
      const processingTime = Date.now() - startTime;

      logger.info('Document analysis completed', {
        modelId,
        processingTime,
        pageCount: result.pages?.length || 0,
      });

      return {
        result,
        processingTime,
        modelId,
      };
    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      logger.error('Document analysis failed', {
        modelId,
        processingTime,
        error: error.message,
        errorCode: error.code,
      });

      throw new ExternalServiceError(
        'AzureDocumentIntelligence',
        `Failed to analyze document: ${error.message}`,
        { originalError: error, modelId }
      );
    }
  }

  /**
   * Get mock analysis result for demo mode
   */
  private getMockAnalysisResult(modelId: string, startTime: number): AnalysisResultWithMetadata {
    const processingTime = Date.now() - startTime;
    
    // Create a minimal mock result
    const mockResult: any = {
      apiVersion: '2023-07-31',
      modelId,
      content: 'Mock document content for demo mode',
      pages: [
        {
          pageNumber: 1,
          width: 8.5,
          height: 11,
          unit: 'inch',
          words: [],
          lines: [],
        },
      ],
      tables: [],
      keyValuePairs: [],
      entities: [],
      styles: [],
    };

    return {
      result: mockResult as AnalyzeResult,
      processingTime,
      modelId,
    };
  }

  /**
   * Analyze document with retry logic and circuit breaker
   */
  public async analyzeDocument(
    documentBuffer: Buffer,
    options: DocumentAnalysisOptions = {}
  ): Promise<AnalysisResultWithMetadata> {
    return await this.retryWithBackoff(
      () => this.circuitBreaker.fire(documentBuffer, options),
      config.ai.maxRetries,
      config.ai.retryDelay
    );
  }

  /**
   * Analyze document from URL
   */
  public async analyzeDocumentFromUrl(
    documentUrl: string,
    options: DocumentAnalysisOptions = {}
  ): Promise<AnalysisResultWithMetadata> {
    const startTime = Date.now();
    const modelId = options.modelId || 'prebuilt-document';

    // Return mock data if not configured
    if (!this.isConfigured || !this.client) {
      logger.info('Azure Document Intelligence not configured - returning mock analysis for URL');
      return this.getMockAnalysisResult(modelId, startTime);
    }

    try {
      logger.info('Starting document analysis from URL', {
        modelId,
        documentUrl,
        options,
      });

      const poller = await this.client.beginAnalyzeDocumentFromUrl(
        modelId,
        documentUrl,
        {
          pages: options.pages,
          locale: options.locale,
        }
      );

      const result = await poller.pollUntilDone();
      const processingTime = Date.now() - startTime;

      logger.info('Document analysis from URL completed', {
        modelId,
        processingTime,
        pageCount: result.pages?.length || 0,
      });

      return {
        result,
        processingTime,
        modelId,
      };
    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      logger.error('Document analysis from URL failed', {
        modelId,
        processingTime,
        error: error.message,
        errorCode: error.code,
      });

      throw new ExternalServiceError(
        'AzureDocumentIntelligence',
        `Failed to analyze document from URL: ${error.message}`,
        { originalError: error, modelId, documentUrl }
      );
    }
  }

  /**
   * Retry logic with exponential backoff
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number,
    baseDelay: number
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;

        // Don't retry if circuit breaker is open
        if (error.metadata?.circuitBreakerOpen) {
          throw error;
        }

        // Don't retry on client errors (4xx)
        if (error.code && error.code >= 400 && error.code < 500) {
          throw error;
        }

        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt);
          logger.warn(`Retrying document analysis after ${delay}ms`, {
            attempt: attempt + 1,
            maxRetries,
            error: error.message,
          });
          await this.sleep(delay);
        }
      }
    }

    throw lastError!;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Health check
   */
  public async healthCheck(): Promise<boolean> {
    try {
      return this.isConfigured;
    } catch (error) {
      logger.error('Azure Document Intelligence health check failed', { error });
      return false;
    }
  }

  /**
   * Check if client is configured
   */
  public isClientConfigured(): boolean {
    return this.isConfigured;
  }

  /**
   * Get circuit breaker status
   */
  public getCircuitBreakerStatus() {
    return {
      name: this.circuitBreaker.name,
      state: this.circuitBreaker.opened ? 'OPEN' : this.circuitBreaker.halfOpen ? 'HALF_OPEN' : 'CLOSED',
      stats: this.circuitBreaker.stats,
      configured: this.isConfigured,
    };
  }
}

export default AzureDocumentIntelligenceClient.getInstance();
