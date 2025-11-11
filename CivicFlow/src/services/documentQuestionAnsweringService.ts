/**
 * Document Question Answering Service
 * Provides AI-powered Q&A capabilities for loan application documents
 * Implements context retrieval and natural language responses with citations
 */

import llmClient from '../clients/llmClient';
import aiCacheService from './aiCacheService';
import documentRepository from '../repositories/documentRepository';
import aiAnalysisRepository from '../repositories/aiAnalysisRepository';
import logger from '../utils/logger';
import crypto from 'crypto';
import {
  QUESTION_ANSWERING_TEMPLATE,
  fillTemplate,
  sanitizeLLMResponse,
  extractConfidenceScore,
} from '../utils/promptTemplates';

export interface QuestionAnswer {
  question: string;
  answer: string;
  confidence: number; // 0-1
  citations: Citation[];
  context: string[];
  suggestedFollowUpQuestions: string[];
  generatedAt: Date;
  processingTime: number;
}

export interface Citation {
  documentId: string;
  documentType?: string;
  documentName: string;
  relevantSection: string;
  page?: number;
  confidence: number;
}

export interface QuestionContext {
  documentId?: string;
  applicationId?: string;
  specificDocuments?: string[];
}

export interface QAOptions {
  maxAnswerLength?: number;
  includeCitations?: boolean;
  includeContext?: boolean;
  includeFollowUpQuestions?: boolean;
  forceRefresh?: boolean;
  specificDocuments?: string[];
}

class DocumentQuestionAnsweringService {
  private static instance: DocumentQuestionAnsweringService;
  private readonly DEFAULT_MAX_ANSWER_LENGTH = 500;
  private readonly CACHE_TTL = 3600; // 1 hour

  private constructor() {}

  public static getInstance(): DocumentQuestionAnsweringService {
    if (!DocumentQuestionAnsweringService.instance) {
      DocumentQuestionAnsweringService.instance = new DocumentQuestionAnsweringService();
    }
    return DocumentQuestionAnsweringService.instance;
  }

  /**
   * Answer a question about a specific document
   */
  async answerDocumentQuestion(
    documentId: string,
    question: string,
    options: QAOptions = {}
  ): Promise<QuestionAnswer> {
    const startTime = Date.now();

    try {
      logger.info('Answering document question', { documentId, question });

      // Check cache first
      if (!options.forceRefresh) {
        const cachedAnswer = await this.getCachedAnswer(documentId, question);
        if (cachedAnswer) {
          logger.info('Returning cached answer', { documentId, question });
          return cachedAnswer;
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

      // Retrieve relevant context
      const context = await this.retrieveRelevantContext(question, documentContent);

      // Generate answer using LLM
      const answer = await this.generateAnswer(
        question,
        [document],
        [documentContent],
        context,
        options
      );

      // Extract citations
      const citations = options.includeCitations !== false
        ? this.extractCitations(answer, document, analysis)
        : [];

      // Generate follow-up questions
      const suggestedFollowUpQuestions = options.includeFollowUpQuestions !== false
        ? await this.generateFollowUpQuestions(question, answer)
        : [];

      // Extract confidence
      const confidence = extractConfidenceScore(answer);

      const processingTime = Date.now() - startTime;

      const result: QuestionAnswer = {
        question,
        answer: sanitizeLLMResponse(answer),
        confidence,
        citations,
        context: options.includeContext !== false ? context : [],
        suggestedFollowUpQuestions,
        generatedAt: new Date(),
        processingTime,
      };

      // Cache the result
      await this.cacheAnswer(documentId, question, result);

      logger.info('Document question answered', {
        documentId,
        confidence,
        citationCount: citations.length,
        processingTime,
      });

      return result;
    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      logger.error('Failed to answer document question', {
        documentId,
        question,
        processingTime,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Answer a question about multiple documents in an application
   */
  async answerApplicationQuestion(
    applicationId: string,
    question: string,
    options: QAOptions = {}
  ): Promise<QuestionAnswer> {
    const startTime = Date.now();

    try {
      logger.info('Answering application question', { applicationId, question });

      // Check cache first
      if (!options.forceRefresh) {
        const cachedAnswer = await this.getCachedAnswer(applicationId, question);
        if (cachedAnswer) {
          logger.info('Returning cached answer', { applicationId, question });
          return cachedAnswer;
        }
      }

      // Get all documents for the application
      const documents = await documentRepository.findByApplicationId(applicationId);
      if (documents.length === 0) {
        throw new Error(`No documents found for application: ${applicationId}`);
      }

      // Filter to specific documents if requested
      const targetDocuments = options.specificDocuments
        ? documents.filter((d) => options.specificDocuments!.includes(d.id))
        : documents;

      if (targetDocuments.length === 0) {
        throw new Error('No matching documents found');
      }

      // Get analyses and content for all documents
      const documentContents: string[] = [];
      const validDocuments: any[] = [];

      for (const document of targetDocuments) {
        try {
          const analysis = await aiAnalysisRepository.findLatestByDocumentId(document.id);
          if (analysis) {
            documentContents.push(this.extractDocumentContent(analysis));
            validDocuments.push(document);
          }
        } catch (error) {
          logger.warn('Skipping document without analysis', { documentId: document.id });
          continue;
        }
      }

      if (validDocuments.length === 0) {
        throw new Error('No analyzed documents found');
      }

      // Retrieve relevant context from all documents
      const allContent = documentContents.join('\n\n---\n\n');
      const context = await this.retrieveRelevantContext(question, allContent);

      // Generate answer using LLM
      const answer = await this.generateAnswer(
        question,
        validDocuments,
        documentContents,
        context,
        options
      );

      // Extract citations from multiple documents
      const citations = options.includeCitations !== false
        ? await this.extractMultiDocumentCitations(answer, validDocuments)
        : [];

      // Generate follow-up questions
      const suggestedFollowUpQuestions = options.includeFollowUpQuestions !== false
        ? await this.generateFollowUpQuestions(question, answer)
        : [];

      // Extract confidence
      const confidence = extractConfidenceScore(answer);

      const processingTime = Date.now() - startTime;

      const result: QuestionAnswer = {
        question,
        answer: sanitizeLLMResponse(answer),
        confidence,
        citations,
        context: options.includeContext !== false ? context : [],
        suggestedFollowUpQuestions,
        generatedAt: new Date(),
        processingTime,
      };

      // Cache the result
      await this.cacheAnswer(applicationId, question, result);

      logger.info('Application question answered', {
        applicationId,
        documentCount: validDocuments.length,
        confidence,
        citationCount: citations.length,
        processingTime,
      });

      return result;
    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      logger.error('Failed to answer application question', {
        applicationId,
        question,
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
    let content = '';

    // Add full text
    if (extractedData.text) {
      content += extractedData.text + '\n\n';
    }

    // Add key-value pairs
    if (extractedData.keyValuePairs && extractedData.keyValuePairs.length > 0) {
      content += 'Key Information:\n';
      for (const kvp of extractedData.keyValuePairs) {
        content += `${kvp.key}: ${kvp.value}\n`;
      }
      content += '\n';
    }

    // Add entities
    if (extractedData.entities && extractedData.entities.length > 0) {
      content += 'Extracted Entities:\n';
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
   * Retrieve relevant context for the question
   */
  private async retrieveRelevantContext(question: string, documentContent: string): Promise<string[]> {
    // Simple keyword-based context retrieval
    // In a production system, would use vector embeddings and semantic search
    const questionKeywords = this.extractKeywords(question);
    const contentLines = documentContent.split('\n').filter((line) => line.trim().length > 0);

    const relevantLines: Array<{ line: string; score: number }> = [];

    for (const line of contentLines) {
      let score = 0;
      const lineLower = line.toLowerCase();

      for (const keyword of questionKeywords) {
        if (lineLower.includes(keyword.toLowerCase())) {
          score += 1;
        }
      }

      if (score > 0) {
        relevantLines.push({ line, score });
      }
    }

    // Sort by relevance and return top 10
    relevantLines.sort((a, b) => b.score - a.score);
    return relevantLines.slice(0, 10).map((rl) => rl.line);
  }

  /**
   * Extract keywords from question
   */
  private extractKeywords(question: string): string[] {
    // Remove common stop words
    const stopWords = new Set([
      'what', 'when', 'where', 'who', 'why', 'how', 'is', 'are', 'was', 'were',
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'about', 'this', 'that', 'these', 'those',
    ]);

    const words = question.toLowerCase().split(/\s+/);
    return words.filter((word) => !stopWords.has(word) && word.length > 2);
  }

  /**
   * Generate answer using LLM
   */
  private async generateAnswer(
    question: string,
    documents: any[],
    documentContents: string[],
    context: string[],
    options: QAOptions
  ): Promise<string> {
    // Prepare documents list
    const documentsList = documents
      .map((doc, idx) => `${idx + 1}. ${doc.documentType || doc.fileName} (ID: ${doc.id})`)
      .join('\n');

    // Prepare documents content (truncate if too long)
    const maxContentLength = 6000;
    let documentsContent = documentContents.join('\n\n---\n\n');
    if (documentsContent.length > maxContentLength) {
      documentsContent = documentsContent.substring(0, maxContentLength) + '... [truncated]';
    }

    // Add relevant context
    if (context.length > 0) {
      documentsContent += '\n\nRelevant Context:\n' + context.join('\n');
    }

    // Fill template
    const userPrompt = fillTemplate(QUESTION_ANSWERING_TEMPLATE.userPromptTemplate, {
      question,
      documentsList,
      documentsContent,
    });

    // Generate answer
    const maxTokens = Math.ceil((options.maxAnswerLength || this.DEFAULT_MAX_ANSWER_LENGTH) * 1.5);

    const result = await llmClient.complete(userPrompt, {
      systemPrompt: QUESTION_ANSWERING_TEMPLATE.systemPrompt,
      maxTokens,
      temperature: 0.3,
    });

    return result.content;
  }

  /**
   * Extract citations from answer
   */
  private extractCitations(answer: string, document: any, analysis: any): Citation[] {
    const citations: Citation[] = [];

    // Look for references to document content in the answer
    const extractedData = analysis.extractedData;

    // Check if answer references key-value pairs
    if (extractedData.keyValuePairs) {
      for (const kvp of extractedData.keyValuePairs) {
        if (answer.includes(kvp.value) || answer.includes(kvp.key)) {
          citations.push({
            documentId: document.id,
            documentType: document.documentType,
            documentName: document.fileName,
            relevantSection: `${kvp.key}: ${kvp.value}`,
            confidence: kvp.confidence,
          });
        }
      }
    }

    // Check if answer references entities
    if (extractedData.entities) {
      for (const entity of extractedData.entities) {
        if (answer.includes(entity.value)) {
          citations.push({
            documentId: document.id,
            documentType: document.documentType,
            documentName: document.fileName,
            relevantSection: `${entity.type}: ${entity.value}`,
            confidence: entity.confidence,
          });
        }
      }
    }

    // Deduplicate citations
    const uniqueCitations = this.deduplicateCitations(citations);

    return uniqueCitations.slice(0, 5); // Limit to top 5 citations
  }

  /**
   * Extract citations from multiple documents
   */
  private async extractMultiDocumentCitations(
    answer: string,
    documents: any[]
  ): Promise<Citation[]> {
    const allCitations: Citation[] = [];

    for (const document of documents) {
      try {
        const analysis = await aiAnalysisRepository.findLatestByDocumentId(document.id);
        if (analysis) {
          const docCitations = this.extractCitations(answer, document, analysis);
          allCitations.push(...docCitations);
        }
      } catch (error) {
        continue;
      }
    }

    // Deduplicate and sort by confidence
    const uniqueCitations = this.deduplicateCitations(allCitations);
    uniqueCitations.sort((a, b) => b.confidence - a.confidence);

    return uniqueCitations.slice(0, 5); // Limit to top 5 citations
  }

  /**
   * Deduplicate citations
   */
  private deduplicateCitations(citations: Citation[]): Citation[] {
    const seen = new Set<string>();
    const unique: Citation[] = [];

    for (const citation of citations) {
      const key = `${citation.documentId}:${citation.relevantSection}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(citation);
      }
    }

    return unique;
  }

  /**
   * Generate follow-up questions
   */
  private async generateFollowUpQuestions(
    originalQuestion: string,
    answer: string
  ): Promise<string[]> {
    try {
      const prompt = `Based on this question and answer, suggest 2-3 relevant follow-up questions.

Original Question: ${originalQuestion}

Answer: ${answer}

Generate follow-up questions that would help the user understand more details or related information.
Return only the questions, one per line.`;

      const result = await llmClient.complete(prompt, {
        systemPrompt: 'You are a helpful assistant that generates relevant follow-up questions.',
        maxTokens: 200,
        temperature: 0.5,
      });

      // Parse questions from response
      const questions = result.content
        .split('\n')
        .map((q) => q.trim())
        .filter((q) => q.length > 0 && q.includes('?'))
        .slice(0, 3);

      return questions;
    } catch (error: any) {
      logger.error('Failed to generate follow-up questions', { error: error.message });
      return [];
    }
  }

  /**
   * Generate cache key for Q&A
   */
  private generateCacheKey(identifier: string, question: string): string {
    const questionHash = crypto
      .createHash('md5')
      .update(question.toLowerCase().trim())
      .digest('hex')
      .substring(0, 8);

    return `ai:qa:${identifier}:${questionHash}`;
  }

  /**
   * Get cached answer
   */
  private async getCachedAnswer(
    identifier: string,
    question: string
  ): Promise<QuestionAnswer | null> {
    try {
      const cacheKey = this.generateCacheKey(identifier, question);
      const cached = await aiCacheService.get(cacheKey);

      if (cached) {
        return JSON.parse(cached);
      }

      return null;
    } catch (error) {
      logger.error('Failed to get cached answer', { identifier, error });
      return null;
    }
  }

  /**
   * Cache answer
   */
  private async cacheAnswer(
    identifier: string,
    question: string,
    answer: QuestionAnswer
  ): Promise<void> {
    try {
      const cacheKey = this.generateCacheKey(identifier, question);
      await aiCacheService.set(cacheKey, JSON.stringify(answer), this.CACHE_TTL);
    } catch (error) {
      logger.error('Failed to cache answer', { identifier, error });
    }
  }
}

export default DocumentQuestionAnsweringService.getInstance();
