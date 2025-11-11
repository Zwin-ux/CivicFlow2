/**
 * Document Summarization Service
 * Provides LLM-powered document summarization capabilities
 * Implements single document and multi-document consolidated summaries
 */

import llmClient from '../clients/llmClient';
import aiCacheService from './aiCacheService';
import documentRepository from '../repositories/documentRepository';
import aiAnalysisRepository from '../repositories/aiAnalysisRepository';
import applicationRepository from '../repositories/applicationRepository';
import logger from '../utils/logger';
import {
  DOCUMENT_SUMMARIZATION_TEMPLATE,
  APPLICATION_SUMMARIZATION_TEMPLATE,
  fillTemplate,
  sanitizeLLMResponse,
  extractConfidenceScore,
} from '../utils/promptTemplates';

export interface DocumentSummary {
  documentId: string;
  summary: string;
  keyPoints: KeyPoint[];
  confidence: number;
  wordCount: number;
  generatedAt: Date;
  processingTime: number;
}

export interface KeyPoint {
  point: string;
  importance: 'HIGH' | 'MEDIUM' | 'LOW';
  sourceReferences: DocumentReference[];
  confidence: number;
}

export interface DocumentReference {
  documentId: string;
  documentType?: string;
  page?: number;
  section?: string;
  excerpt?: string;
}

export interface ApplicationSummary {
  applicationId: string;
  overallSummary: string;
  documentSummaries: DocumentSummary[];
  keyFindings: string[];
  riskFactors: string[];
  strengths: string[];
  recommendations: string[];
  confidence: number;
  generatedAt: Date;
  processingTime: number;
}

export interface SummarizationOptions {
  maxWords?: number;
  includeKeyPoints?: boolean;
  includeSourceReferences?: boolean;
  forceRefresh?: boolean;
}

class DocumentSummarizationService {
  private static instance: DocumentSummarizationService;
  private readonly DEFAULT_MAX_WORDS = 300;
  private readonly MIN_MAX_WORDS = 50;
  private readonly MAX_MAX_WORDS = 1000;

  private constructor() {}

  public static getInstance(): DocumentSummarizationService {
    if (!DocumentSummarizationService.instance) {
      DocumentSummarizationService.instance = new DocumentSummarizationService();
    }
    return DocumentSummarizationService.instance;
  }

  /**
   * Summarize a single document
   */
  async summarizeDocument(
    documentId: string,
    options: SummarizationOptions = {}
  ): Promise<DocumentSummary> {
    const startTime = Date.now();

    try {
      logger.info('Starting document summarization', { documentId, options });

      // Validate and normalize options
      const maxWords = this.validateMaxWords(options.maxWords);
      const includeKeyPoints = options.includeKeyPoints ?? true;
      const includeSourceReferences = options.includeSourceReferences ?? true;

      // Check cache first
      if (!options.forceRefresh) {
        const cachedSummary = await aiCacheService.getDocumentSummary(documentId);
        if (cachedSummary) {
          logger.info('Returning cached document summary', { documentId });
          return cachedSummary;
        }
      }

      // Get document and analysis
      const document = await documentRepository.findById(documentId);
      if (!document) {
        throw new Error(`Document not found: ${documentId}`);
      }

      const analysis = await aiAnalysisRepository.findLatestByDocumentId(documentId);
      if (!analysis) {
        throw new Error(`No analysis found for document: ${documentId}`);
      }

      // Extract document content
      const documentContent = this.extractDocumentContent(analysis);

      // Generate summary using LLM
      const llmSummary = await this.generateLLMSummary(
        documentContent,
        document.documentType || 'UNKNOWN',
        maxWords
      );

      // Extract key points if requested
      const keyPoints = includeKeyPoints
        ? await this.extractKeyPoints(llmSummary, documentId, includeSourceReferences)
        : [];

      // Calculate confidence
      const confidence = this.calculateSummaryConfidence(llmSummary, analysis.confidence);

      const processingTime = Date.now() - startTime;

      const summary: DocumentSummary = {
        documentId,
        summary: llmSummary,
        keyPoints,
        confidence,
        wordCount: this.countWords(llmSummary),
        generatedAt: new Date(),
        processingTime,
      };

      // Cache the result
      await aiCacheService.cacheDocumentSummary(documentId, summary);

      logger.info('Document summarization completed', {
        documentId,
        wordCount: summary.wordCount,
        keyPointsCount: keyPoints.length,
        confidence,
        processingTime,
      });

      return summary;
    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      logger.error('Document summarization failed', {
        documentId,
        processingTime,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Generate consolidated summary for an application (multiple documents)
   */
  async summarizeApplication(
    applicationId: string,
    options: SummarizationOptions = {}
  ): Promise<ApplicationSummary> {
    const startTime = Date.now();

    try {
      logger.info('Starting application summarization', { applicationId, options });

      // Check cache first
      if (!options.forceRefresh) {
        const cachedSummary = await aiCacheService.getApplicationSummary(applicationId);
        if (cachedSummary) {
          logger.info('Returning cached application summary', { applicationId });
          return cachedSummary;
        }
      }

      // Get application
      const application = await applicationRepository.findById(applicationId);
      if (!application) {
        throw new Error(`Application not found: ${applicationId}`);
      }

      // Get all documents for the application
      const documents = await documentRepository.findByApplicationId(applicationId);
      if (documents.length === 0) {
        throw new Error(`No documents found for application: ${applicationId}`);
      }

      // Summarize each document
      const documentSummaries: DocumentSummary[] = [];
      for (const document of documents) {
        try {
          const docSummary = await this.summarizeDocument(document.id, {
            ...options,
            maxWords: 200, // Shorter summaries for multi-document view
          });
          documentSummaries.push(docSummary);
        } catch (error: any) {
          logger.warn('Failed to summarize document in application', {
            documentId: document.id,
            applicationId,
            error: error.message,
          });
        }
      }

      if (documentSummaries.length === 0) {
        throw new Error(`Failed to summarize any documents for application: ${applicationId}`);
      }

      // Generate consolidated summary
      const consolidatedSummary = await this.generateConsolidatedSummary(
        application,
        documentSummaries
      );

      // Extract key findings, risk factors, and strengths
      const keyFindings = this.extractKeyFindings(documentSummaries);
      const riskFactors = this.extractRiskFactors(documentSummaries);
      const strengths = this.extractStrengths(documentSummaries);
      const recommendations = this.generateRecommendations(documentSummaries);

      // Calculate overall confidence
      const confidence = this.calculateApplicationConfidence(documentSummaries);

      const processingTime = Date.now() - startTime;

      const applicationSummary: ApplicationSummary = {
        applicationId,
        overallSummary: consolidatedSummary,
        documentSummaries,
        keyFindings,
        riskFactors,
        strengths,
        recommendations,
        confidence,
        generatedAt: new Date(),
        processingTime,
      };

      // Cache the result
      await aiCacheService.cacheApplicationSummary(applicationId, applicationSummary);

      logger.info('Application summarization completed', {
        applicationId,
        documentCount: documentSummaries.length,
        confidence,
        processingTime,
      });

      return applicationSummary;
    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      logger.error('Application summarization failed', {
        applicationId,
        processingTime,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Extract document content from analysis
   */
  private extractDocumentContent(analysis: any): string {
    const extractedData = analysis.extractedData;

    // Start with full text
    let content = extractedData.text || '';

    // Add key-value pairs
    if (extractedData.keyValuePairs && extractedData.keyValuePairs.length > 0) {
      content += '\n\nKey Information:\n';
      for (const kvp of extractedData.keyValuePairs) {
        content += `${kvp.key}: ${kvp.value}\n`;
      }
    }

    // Add entities
    if (extractedData.entities && extractedData.entities.length > 0) {
      content += '\n\nExtracted Entities:\n';
      const entityGroups: Record<string, string[]> = {};
      for (const entity of extractedData.entities) {
        if (!entityGroups[entity.type]) {
          entityGroups[entity.type] = [];
        }
        entityGroups[entity.type].push(entity.value);
      }
      for (const [type, values] of Object.entries(entityGroups)) {
        content += `${type}: ${values.join(', ')}\n`;
      }
    }

    return content;
  }

  /**
   * Generate LLM summary
   */
  private async generateLLMSummary(
    content: string,
    documentType: string,
    maxWords: number
  ): Promise<string> {
    // Truncate content if too long (to fit within token limits)
    const maxContentLength = 8000;
    const truncatedContent =
      content.length > maxContentLength
        ? content.substring(0, maxContentLength) + '... [truncated]'
        : content;

    // Fill template
    const userPrompt = fillTemplate(DOCUMENT_SUMMARIZATION_TEMPLATE.userPromptTemplate, {
      documentType,
      documentContent: truncatedContent,
    });

    // Generate summary
    const result = await llmClient.complete(userPrompt, {
      systemPrompt: DOCUMENT_SUMMARIZATION_TEMPLATE.systemPrompt,
      maxTokens: Math.ceil(maxWords * 1.5), // Approximate tokens from words
      temperature: 0.3,
    });

    // Sanitize and return
    return sanitizeLLMResponse(result.content);
  }

  /**
   * Extract key points from summary
   */
  private async extractKeyPoints(
    summary: string,
    documentId: string,
    includeSourceReferences: boolean
  ): Promise<KeyPoint[]> {
    try {
      const prompt = `Extract 3-5 key points from the following summary. For each point, indicate its importance level (HIGH, MEDIUM, LOW).

Summary:
${summary}

Format your response as a JSON array with objects containing:
- point: the key point text
- importance: HIGH, MEDIUM, or LOW

Example:
[
  {"point": "Loan amount requested is $500,000", "importance": "HIGH"},
  {"point": "Business has 5 years of operating history", "importance": "MEDIUM"}
]`;

      const result = await llmClient.complete(prompt, {
        systemPrompt: 'You are a data extraction assistant. Return only valid JSON.',
        maxTokens: 500,
        temperature: 0.2,
      });

      // Parse JSON response
      const jsonMatch = result.content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        logger.warn('Failed to extract key points JSON', { documentId });
        return [];
      }

      const parsedPoints = JSON.parse(jsonMatch[0]);

      // Map to KeyPoint interface
      const keyPoints: KeyPoint[] = parsedPoints.map((p: any) => ({
        point: p.point,
        importance: p.importance || 'MEDIUM',
        sourceReferences: includeSourceReferences
          ? [{ documentId, documentType: undefined }]
          : [],
        confidence: 0.8, // Default confidence for extracted points
      }));

      return keyPoints;
    } catch (error: any) {
      logger.error('Failed to extract key points', {
        documentId,
        error: error.message,
      });
      return [];
    }
  }

  /**
   * Generate consolidated summary for application
   */
  private async generateConsolidatedSummary(
    application: any,
    documentSummaries: DocumentSummary[]
  ): Promise<string> {
    // Prepare document summaries text
    const documentsList = documentSummaries
      .map((ds, idx) => `${idx + 1}. Document ${ds.documentId}: ${ds.summary}`)
      .join('\n\n');

    // Prepare applicant info
    const applicantInfo = `
      Applicant ID: ${application.applicantId}
      Program Type: ${application.programType || 'N/A'}
      Status: ${application.status}
      Submitted: ${application.submittedAt || 'Not submitted'}
    `;

    // Fill template
    const userPrompt = fillTemplate(APPLICATION_SUMMARIZATION_TEMPLATE.userPromptTemplate, {
      applicationType: application.programType || 'General Loan Application',
      applicantInfo,
      documentsList: `${documentSummaries.length} documents analyzed`,
      documentsContent: documentsList,
    });

    // Generate consolidated summary
    const result = await llmClient.complete(userPrompt, {
      systemPrompt: APPLICATION_SUMMARIZATION_TEMPLATE.systemPrompt,
      maxTokens: 600,
      temperature: 0.3,
    });

    return sanitizeLLMResponse(result.content);
  }

  /**
   * Extract key findings from document summaries
   */
  private extractKeyFindings(documentSummaries: DocumentSummary[]): string[] {
    const findings: string[] = [];

    for (const docSummary of documentSummaries) {
      const highImportancePoints = docSummary.keyPoints.filter(
        (kp) => kp.importance === 'HIGH'
      );
      findings.push(...highImportancePoints.map((kp) => kp.point));
    }

    // Limit to top 10 findings
    return findings.slice(0, 10);
  }

  /**
   * Extract risk factors from document summaries
   */
  private extractRiskFactors(documentSummaries: DocumentSummary[]): string[] {
    const riskKeywords = [
      'risk',
      'concern',
      'issue',
      'problem',
      'deficit',
      'negative',
      'low',
      'insufficient',
      'missing',
      'incomplete',
    ];

    const riskFactors: string[] = [];

    for (const docSummary of documentSummaries) {
      for (const keyPoint of docSummary.keyPoints) {
        const pointLower = keyPoint.point.toLowerCase();
        if (riskKeywords.some((keyword) => pointLower.includes(keyword))) {
          riskFactors.push(keyPoint.point);
        }
      }
    }

    return riskFactors.slice(0, 5);
  }

  /**
   * Extract strengths from document summaries
   */
  private extractStrengths(documentSummaries: DocumentSummary[]): string[] {
    const strengthKeywords = [
      'strong',
      'excellent',
      'good',
      'positive',
      'high',
      'sufficient',
      'complete',
      'qualified',
      'approved',
    ];

    const strengths: string[] = [];

    for (const docSummary of documentSummaries) {
      for (const keyPoint of docSummary.keyPoints) {
        const pointLower = keyPoint.point.toLowerCase();
        if (strengthKeywords.some((keyword) => pointLower.includes(keyword))) {
          strengths.push(keyPoint.point);
        }
      }
    }

    return strengths.slice(0, 5);
  }

  /**
   * Generate recommendations based on document summaries
   */
  private generateRecommendations(documentSummaries: DocumentSummary[]): string[] {
    const recommendations: string[] = [];

    // Check for low confidence summaries
    const lowConfidenceDocs = documentSummaries.filter((ds) => ds.confidence < 0.7);
    if (lowConfidenceDocs.length > 0) {
      recommendations.push(
        `${lowConfidenceDocs.length} document(s) have low confidence scores. Manual review recommended.`
      );
    }

    // Check for missing key points
    const docsWithoutKeyPoints = documentSummaries.filter((ds) => ds.keyPoints.length === 0);
    if (docsWithoutKeyPoints.length > 0) {
      recommendations.push(
        `${docsWithoutKeyPoints.length} document(s) lack detailed key points. Consider requesting clearer documentation.`
      );
    }

    // Default recommendation
    if (recommendations.length === 0) {
      recommendations.push('All documents have been successfully analyzed. Proceed with review.');
    }

    return recommendations;
  }

  /**
   * Calculate summary confidence
   */
  private calculateSummaryConfidence(summary: string, analysisConfidence: number): number {
    // Start with analysis confidence
    let confidence = analysisConfidence;

    // Adjust based on summary length
    const wordCount = this.countWords(summary);
    if (wordCount < 50) {
      confidence *= 0.8; // Reduce confidence for very short summaries
    } else if (wordCount > 500) {
      confidence *= 0.9; // Slightly reduce for very long summaries
    }

    // Try to extract confidence from summary text
    const extractedConfidence = extractConfidenceScore(summary);
    if (extractedConfidence > 0) {
      confidence = (confidence + extractedConfidence) / 2;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Calculate application-level confidence
   */
  private calculateApplicationConfidence(documentSummaries: DocumentSummary[]): number {
    if (documentSummaries.length === 0) {
      return 0;
    }

    const avgConfidence =
      documentSummaries.reduce((sum, ds) => sum + ds.confidence, 0) / documentSummaries.length;

    return avgConfidence;
  }

  /**
   * Validate and normalize max words parameter
   */
  private validateMaxWords(maxWords?: number): number {
    if (!maxWords) {
      return this.DEFAULT_MAX_WORDS;
    }

    if (maxWords < this.MIN_MAX_WORDS) {
      logger.warn('Max words below minimum, using minimum', {
        requested: maxWords,
        minimum: this.MIN_MAX_WORDS,
      });
      return this.MIN_MAX_WORDS;
    }

    if (maxWords > this.MAX_MAX_WORDS) {
      logger.warn('Max words above maximum, using maximum', {
        requested: maxWords,
        maximum: this.MAX_MAX_WORDS,
      });
      return this.MAX_MAX_WORDS;
    }

    return maxWords;
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.trim().split(/\s+/).length;
  }
}

export default DocumentSummarizationService.getInstance();
