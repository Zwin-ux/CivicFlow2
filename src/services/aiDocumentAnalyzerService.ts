/**
 * AI Document Analyzer Service
 * Orchestrates AI analysis workflows for uploaded documents
 * Implements batch processing, quality scoring, and confidence validation
 */

import azureDocumentIntelligenceClient from '../clients/azureDocumentIntelligenceClient';
import llmClient from '../clients/llmClient';
import aiCacheService from './aiCacheService';
import documentRepository from '../repositories/documentRepository';
import logger from '../utils/logger';
import config from '../config';
import { AnalyzeResult } from '@azure/ai-form-recognizer';

export interface DocumentAnalysisResult {
  documentId: string;
  qualityScore: number; // 0-100
  extractedData: ExtractedData;
  anomalies: Anomaly[];
  summary: string;
  recommendations: string[];
  confidence: number; // 0-1
  processingTime: number; // milliseconds
  aiProvider: string;
}

export interface ExtractedData {
  text: string;
  entities: Entity[];
  keyValuePairs: KeyValuePair[];
  tables: Table[];
  metadata: DocumentMetadata;
}

export interface Entity {
  type: EntityType;
  value: string;
  confidence: number;
  boundingBox?: BoundingBox;
}

export enum EntityType {
  PERSON = 'PERSON',
  ORGANIZATION = 'ORGANIZATION',
  LOCATION = 'LOCATION',
  DATE = 'DATE',
  MONEY = 'MONEY',
  PHONE = 'PHONE',
  EMAIL = 'EMAIL',
  ADDRESS = 'ADDRESS',
  SSN = 'SSN',
  EIN = 'EIN',
  ACCOUNT_NUMBER = 'ACCOUNT_NUMBER',
  OTHER = 'OTHER',
}

export interface KeyValuePair {
  key: string;
  value: string;
  confidence: number;
}

export interface Table {
  rowCount: number;
  columnCount: number;
  cells: TableCell[];
}

export interface TableCell {
  rowIndex: number;
  columnIndex: number;
  content: string;
  confidence: number;
}

export interface DocumentMetadata {
  pageCount: number;
  language?: string;
  createdDate?: Date;
  modifiedDate?: Date;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
}

export interface Anomaly {
  type: AnomalyType;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  evidence: string[];
  confidence: number;
  location?: BoundingBox;
}

export enum AnomalyType {
  IMAGE_MANIPULATION = 'IMAGE_MANIPULATION',
  INCONSISTENCY = 'INCONSISTENCY',
  MISSING_INFO = 'MISSING_INFO',
  LOW_QUALITY = 'LOW_QUALITY',
  SUSPICIOUS_PATTERN = 'SUSPICIOUS_PATTERN',
}

export interface AnalysisStatus {
  documentId: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  progress: number; // 0-100
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

export interface ReanalysisOptions {
  forceRefresh?: boolean;
  skipCache?: boolean;
  modelId?: string;
}

export interface BatchAnalysisResult {
  results: DocumentAnalysisResult[];
  totalProcessingTime: number;
  successCount: number;
  failureCount: number;
  errors: Array<{ documentId: string; error: string }>;
}

class AIDocumentAnalyzerService {
  private static instance: AIDocumentAnalyzerService;
  private readonly CONFIDENCE_THRESHOLD = config.ai.confidenceThreshold;
  private readonly MAX_BATCH_SIZE = 10;
  private readonly PARALLEL_PROCESSING_LIMIT = 5;

  private constructor() {}

  public static getInstance(): AIDocumentAnalyzerService {
    if (!AIDocumentAnalyzerService.instance) {
      AIDocumentAnalyzerService.instance = new AIDocumentAnalyzerService();
    }
    return AIDocumentAnalyzerService.instance;
  }

  /**
   * Analyze a single document
   */
  async analyzeDocument(documentId: string): Promise<DocumentAnalysisResult> {
    const startTime = Date.now();

    try {
      logger.info('Starting document analysis', { documentId });

      // Check cache first
      const cachedResult = await aiCacheService.getDocumentAnalysis(documentId);
      if (cachedResult) {
        logger.info('Returning cached analysis result', { documentId });
        return cachedResult;
      }

      // Get document from repository
      const document = await documentRepository.findById(documentId);
      if (!document) {
        throw new Error(`Document not found: ${documentId}`);
      }

      // Perform Azure AI Document Intelligence analysis
      const azureResult = await this.performAzureAnalysis(document.storageUrl);

      // Extract structured data from Azure result
      const extractedData = this.extractDataFromAzureResult(azureResult.result);

      // Calculate quality score
      const qualityScore = this.calculateQualityScore(extractedData, azureResult.result);

      // Detect anomalies
      const anomalies = await this.detectAnomalies(extractedData, azureResult.result);

      // Generate summary using LLM
      const summary = await this.generateSummary(extractedData);

      // Generate recommendations
      const recommendations = this.generateRecommendations(qualityScore, anomalies, extractedData);

      // Calculate overall confidence
      const confidence = this.calculateOverallConfidence(extractedData, qualityScore);

      const processingTime = Date.now() - startTime;

      const result: DocumentAnalysisResult = {
        documentId,
        qualityScore,
        extractedData,
        anomalies,
        summary,
        recommendations,
        confidence,
        processingTime,
        aiProvider: 'Azure Document Intelligence',
      };

      // Validate confidence threshold
      if (confidence < this.CONFIDENCE_THRESHOLD) {
        logger.warn('Analysis confidence below threshold', {
          documentId,
          confidence,
          threshold: this.CONFIDENCE_THRESHOLD,
        });
        result.recommendations.push(
          `Low confidence score (${(confidence * 100).toFixed(1)}%). Manual review recommended.`
        );
      }

      // Cache the result
      await aiCacheService.cacheDocumentAnalysis(documentId, result);

      logger.info('Document analysis completed', {
        documentId,
        qualityScore,
        confidence,
        processingTime,
      });

      return result;
    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      logger.error('Document analysis failed', {
        documentId,
        processingTime,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Batch analyze multiple documents with parallel processing
   */
  async batchAnalyze(documentIds: string[]): Promise<BatchAnalysisResult> {
    const startTime = Date.now();

    try {
      logger.info('Starting batch analysis', {
        documentCount: documentIds.length,
      });

      if (documentIds.length > this.MAX_BATCH_SIZE) {
        throw new Error(
          `Batch size exceeds maximum allowed (${this.MAX_BATCH_SIZE}). Please split into smaller batches.`
        );
      }

      const results: DocumentAnalysisResult[] = [];
      const errors: Array<{ documentId: string; error: string }> = [];

      // Process documents in parallel with limit
      const chunks = this.chunkArray(documentIds, this.PARALLEL_PROCESSING_LIMIT);

      for (const chunk of chunks) {
        const promises = chunk.map(async (documentId) => {
          try {
            const result = await this.analyzeDocument(documentId);
            return { success: true, result };
          } catch (error: any) {
            return {
              success: false,
              documentId,
              error: error.message,
            };
          }
        });

        const chunkResults = await Promise.all(promises);

        for (const chunkResult of chunkResults) {
          if (chunkResult.success && 'result' in chunkResult) {
            results.push(chunkResult.result);
          } else if (!chunkResult.success && 'documentId' in chunkResult) {
            errors.push({
              documentId: chunkResult.documentId,
              error: chunkResult.error,
            });
          }
        }
      }

      const totalProcessingTime = Date.now() - startTime;

      logger.info('Batch analysis completed', {
        totalDocuments: documentIds.length,
        successCount: results.length,
        failureCount: errors.length,
        totalProcessingTime,
      });

      return {
        results,
        totalProcessingTime,
        successCount: results.length,
        failureCount: errors.length,
        errors,
      };
    } catch (error: any) {
      logger.error('Batch analysis failed', {
        documentCount: documentIds.length,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get analysis status for a document
   */
  async getAnalysisStatus(documentId: string): Promise<AnalysisStatus> {
    try {
      // Check if analysis exists in cache
      const cachedResult = await aiCacheService.getDocumentAnalysis(documentId);

      if (cachedResult) {
        return {
          documentId,
          status: 'COMPLETED',
          progress: 100,
          completedAt: new Date(),
        };
      }

      // Check if document exists
      const document = await documentRepository.findById(documentId);
      if (!document) {
        throw new Error(`Document not found: ${documentId}`);
      }

      // If no cached result, status is pending
      return {
        documentId,
        status: 'PENDING',
        progress: 0,
      };
    } catch (error: any) {
      logger.error('Failed to get analysis status', {
        documentId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Reanalyze document with options
   */
  async reanalyzeDocument(
    documentId: string,
    options: ReanalysisOptions = {}
  ): Promise<DocumentAnalysisResult> {
    try {
      logger.info('Reanalyzing document', { documentId, options });

      // Invalidate cache if requested
      if (options.forceRefresh || options.skipCache) {
        await aiCacheService.invalidateDocumentCache(documentId);
      }

      // Perform new analysis
      return await this.analyzeDocument(documentId);
    } catch (error: any) {
      logger.error('Document reanalysis failed', {
        documentId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Perform Azure AI Document Intelligence analysis
   */
  private async performAzureAnalysis(documentUrl: string) {
    return await azureDocumentIntelligenceClient.analyzeDocumentFromUrl(documentUrl);
  }

  /**
   * Extract structured data from Azure analysis result
   */
  private extractDataFromAzureResult(result: AnalyzeResult): ExtractedData {
    const entities: Entity[] = [];
    const keyValuePairs: KeyValuePair[] = [];
    const tables: Table[] = [];
    let fullText = '';

    // Extract text content
    if (result.content) {
      fullText = result.content;
    }

    // Extract key-value pairs
    if (result.keyValuePairs) {
      for (const kvp of result.keyValuePairs) {
        if (kvp.key && kvp.value) {
          keyValuePairs.push({
            key: kvp.key.content || '',
            value: kvp.value.content || '',
            confidence: kvp.confidence || 0,
          });
        }
      }
    }

    // Extract entities (from documents)
    if (result.documents) {
      for (const doc of result.documents) {
        if (doc.fields) {
          for (const [fieldName, field] of Object.entries(doc.fields)) {
            if (field && field.content) {
              entities.push({
                type: this.mapFieldTypeToEntityType(field.kind || fieldName),
                value: field.content,
                confidence: field.confidence || 0,
              });
            }
          }
        }
      }
    }

    // Extract tables
    if (result.tables) {
      for (const table of result.tables) {
        const cells: TableCell[] = [];

        for (const cell of table.cells) {
          cells.push({
            rowIndex: cell.rowIndex,
            columnIndex: cell.columnIndex,
            content: cell.content,
            confidence: 1.0, // Azure doesn't provide cell-level confidence
          });
        }

        tables.push({
          rowCount: table.rowCount,
          columnCount: table.columnCount,
          cells,
        });
      }
    }

    const metadata: DocumentMetadata = {
      pageCount: result.pages?.length || 0,
      language: result.languages?.[0] || undefined,
    };

    return {
      text: fullText,
      entities,
      keyValuePairs,
      tables,
      metadata,
    };
  }

  /**
   * Map Azure field type to entity type
   */
  private mapFieldTypeToEntityType(fieldType: string): EntityType {
    const typeMap: Record<string, EntityType> = {
      string: EntityType.OTHER,
      date: EntityType.DATE,
      time: EntityType.DATE,
      phoneNumber: EntityType.PHONE,
      number: EntityType.OTHER,
      integer: EntityType.OTHER,
      selectionMark: EntityType.OTHER,
      countryRegion: EntityType.LOCATION,
      signature: EntityType.OTHER,
      currency: EntityType.MONEY,
      address: EntityType.ADDRESS,
    };

    return typeMap[fieldType] || EntityType.OTHER;
  }

  /**
   * Calculate quality score (0-100)
   */
  private calculateQualityScore(extractedData: ExtractedData, azureResult: AnalyzeResult): number {
    let score = 100;

    // Deduct points for low page count
    if (extractedData.metadata.pageCount === 0) {
      score -= 50;
    }

    // Deduct points for low text content
    if (extractedData.text.length < 100) {
      score -= 20;
    }

    // Deduct points for low confidence in key-value pairs
    const lowConfidenceKVPs = extractedData.keyValuePairs.filter((kvp) => kvp.confidence < 0.7);
    score -= lowConfidenceKVPs.length * 5;

    // Deduct points for missing entities
    if (extractedData.entities.length === 0) {
      score -= 15;
    }

    // Check for page quality issues
    if (azureResult.pages) {
      for (const page of azureResult.pages) {
        // Check if page has minimal content
        if (page.lines && page.lines.length < 5) {
          score -= 10;
        }
      }
    }

    // Ensure score is within bounds
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Detect anomalies in the document
   */
  private async detectAnomalies(
    extractedData: ExtractedData,
    azureResult: AnalyzeResult
  ): Promise<Anomaly[]> {
    // azureResult is accepted for future checks but not used in this simplified implementation
    void azureResult;
    const anomalies: Anomaly[] = [];

    // Check for missing critical information
    if (extractedData.entities.length === 0 && extractedData.keyValuePairs.length === 0) {
      anomalies.push({
        type: AnomalyType.MISSING_INFO,
        severity: 'HIGH',
        description: 'No structured data could be extracted from the document',
        evidence: ['Zero entities and key-value pairs found'],
        confidence: 0.95,
      });
    }

    // Check for low quality indicators
    if (extractedData.text.length < 50) {
      anomalies.push({
        type: AnomalyType.LOW_QUALITY,
        severity: 'MEDIUM',
        description: 'Document contains very little text content',
        evidence: [`Only ${extractedData.text.length} characters extracted`],
        confidence: 0.9,
      });
    }

    // Check for inconsistencies in extracted data
    const lowConfidenceItems = extractedData.keyValuePairs.filter((kvp) => kvp.confidence < 0.5);
    if (lowConfidenceItems.length > 3) {
      anomalies.push({
        type: AnomalyType.INCONSISTENCY,
        severity: 'MEDIUM',
        description: 'Multiple fields have low confidence scores',
        evidence: lowConfidenceItems.map((item) => `${item.key}: ${item.confidence.toFixed(2)}`),
        confidence: 0.85,
      });
    }

    return anomalies;
  }

  /**
   * Generate summary using LLM
   */
  private async generateSummary(extractedData: ExtractedData): Promise<string> {
    try {
      // If document is too short, return simple summary
      if (extractedData.text.length < 100) {
        return 'Document contains minimal text content. Manual review recommended.';
      }

      // Truncate text if too long (to fit within token limits)
      const maxTextLength = 4000;
      const textToSummarize =
        extractedData.text.length > maxTextLength
          ? extractedData.text.substring(0, maxTextLength) + '...'
          : extractedData.text;

      const prompt = `Summarize the following document in 2-3 sentences, focusing on key information:\n\n${textToSummarize}`;

      const result = await llmClient.complete(prompt, {
        maxTokens: 200,
        temperature: 0.3,
        systemPrompt: 'You are a document analysis assistant. Provide concise, factual summaries.',
      });

      return result.content.trim();
    } catch (error: any) {
      logger.error('Failed to generate summary', { error: error.message });
      return 'Summary generation failed. Please review document manually.';
    }
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(
    qualityScore: number,
    anomalies: Anomaly[],
    extractedData: ExtractedData
  ): string[] {
    const recommendations: string[] = [];

    // Quality-based recommendations
    if (qualityScore < 70) {
      recommendations.push('Document quality is below acceptable threshold. Consider requesting a higher quality scan.');
    }

    if (qualityScore >= 70 && qualityScore < 85) {
      recommendations.push('Document quality is acceptable but could be improved for better data extraction.');
    }

    // Anomaly-based recommendations
    const criticalAnomalies = anomalies.filter((a) => a.severity === 'CRITICAL');
    if (criticalAnomalies.length > 0) {
      recommendations.push('Critical anomalies detected. Immediate manual review required.');
    }

    const highAnomalies = anomalies.filter((a) => a.severity === 'HIGH');
    if (highAnomalies.length > 0) {
      recommendations.push('High-severity issues found. Manual verification recommended.');
    }

    // Content-based recommendations
    if (extractedData.metadata.pageCount > 10) {
      recommendations.push('Document is lengthy. Consider reviewing key sections highlighted in the summary.');
    }

    if (extractedData.tables.length > 0) {
      recommendations.push(`Document contains ${extractedData.tables.length} table(s). Verify numerical data accuracy.`);
    }

    // Default recommendation if none generated
    if (recommendations.length === 0 && qualityScore >= 85) {
      recommendations.push('Document analysis completed successfully. No issues detected.');
    }

    return recommendations;
  }

  /**
   * Calculate overall confidence score
   */
  private calculateOverallConfidence(extractedData: ExtractedData, qualityScore: number): number {
    // Start with quality score as base
    let confidence = qualityScore / 100;

    // Factor in key-value pair confidences
    if (extractedData.keyValuePairs.length > 0) {
      const avgKVPConfidence =
        extractedData.keyValuePairs.reduce((sum, kvp) => sum + kvp.confidence, 0) /
        extractedData.keyValuePairs.length;
      confidence = (confidence + avgKVPConfidence) / 2;
    }

    // Factor in entity confidences
    if (extractedData.entities.length > 0) {
      const avgEntityConfidence =
        extractedData.entities.reduce((sum, entity) => sum + entity.confidence, 0) /
        extractedData.entities.length;
      confidence = (confidence + avgEntityConfidence) / 2;
    }

    // Ensure confidence is within bounds
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Utility: Chunk array into smaller arrays
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}

export default AIDocumentAnalyzerService.getInstance();
