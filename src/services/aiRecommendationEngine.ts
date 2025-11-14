/**
 * AI Recommendation Engine
 * Generates missing document recommendations and context-aware suggestions
 * Updates recommendations based on uploads and tracks completion
 */

import llmClient from '../clients/llmClient';
import aiCacheService from './aiCacheService';
import documentRepository from '../repositories/documentRepository';
import applicationRepository from '../repositories/applicationRepository';
import aiAnalysisRepository from '../repositories/aiAnalysisRepository';
import logger from '../utils/logger';
import {
  MISSING_DOCUMENT_TEMPLATE,
  fillTemplate,
  sanitizeLLMResponse,
} from '../utils/promptTemplates';

export interface DocumentRecommendation {
  type: 'MISSING_DOCUMENT' | 'ADDITIONAL_INFO' | 'CLARIFICATION' | 'QUALITY_IMPROVEMENT';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  documentType?: string;
  description: string;
  reasoning: string;
  suggestedAction: string;
  isRequired: boolean;
}

export interface ApplicationRecommendations {
  applicationId: string;
  recommendations: DocumentRecommendation[];
  completionPercentage: number;
  missingDocuments: string[];
  optionalDocuments: string[];
  generatedAt: Date;
  processingTime: number;
}

export interface CompletionTracking {
  applicationId: string;
  totalRequired: number;
  totalSubmitted: number;
  completionPercentage: number;
  missingRequired: string[];
  missingOptional: string[];
  lastUpdated: Date;
}

export interface RecommendationOptions {
  includeOptional?: boolean;
  forceRefresh?: boolean;
  programType?: string;
}

class AIRecommendationEngine {
  private static instance: AIRecommendationEngine;

  // Standard document requirements by program type
  private readonly PROGRAM_REQUIREMENTS: Record<string, string[]> = {
    SBA_7A: [
      'Business Tax Returns (3 years)',
      'Personal Tax Returns (3 years)',
      'Business Financial Statements',
      'Personal Financial Statement',
      'Business License',
      'Articles of Incorporation',
      'Business Plan',
      'Debt Schedule',
    ],
    SBA_504: [
      'Business Tax Returns (3 years)',
      'Personal Tax Returns (3 years)',
      'Business Financial Statements',
      'Personal Financial Statement',
      'Business License',
      'Real Estate Appraisal',
      'Environmental Report',
      'Project Budget',
    ],
    USDA_B_AND_I: [
      'Business Tax Returns (3 years)',
      'Business Financial Statements',
      'Personal Financial Statement',
      'Business Plan',
      'Feasibility Study',
      'Environmental Assessment',
      'Job Creation Plan',
    ],
    DEFAULT: [
      'Business Tax Returns',
      'Personal Tax Returns',
      'Business Financial Statements',
      'Personal Financial Statement',
      'Business License',
    ],
  };

  private constructor() {}

  public static getInstance(): AIRecommendationEngine {
    if (!AIRecommendationEngine.instance) {
      AIRecommendationEngine.instance = new AIRecommendationEngine();
    }
    return AIRecommendationEngine.instance;
  }

  /**
   * Generate recommendations for an application
   */
  async generateRecommendations(
    applicationId: string,
    options: RecommendationOptions = {}
  ): Promise<ApplicationRecommendations> {
    const startTime = Date.now();

    try {
      logger.info('Generating recommendations', { applicationId, options });

      // Check cache first
      if (!options.forceRefresh) {
        const cachedRecommendations = await aiCacheService.getRecommendations(applicationId);
        if (cachedRecommendations) {
          logger.info('Returning cached recommendations', { applicationId });
          return cachedRecommendations;
        }
      }

      // Get application
      const application = await applicationRepository.findById(applicationId);
      if (!application) {
        throw new Error(`Application not found: ${applicationId}`);
      }

      // Get submitted documents
      const submittedDocuments = await documentRepository.findByApplicationId(applicationId);

      // Get program requirements
      const programType = options.programType || application.programType || 'DEFAULT';
      const programRequirements = this.getProgramRequirements(programType);

      // Identify missing documents
      const missingDocuments = this.identifyMissingDocuments(
        submittedDocuments,
        programRequirements
      );

      // Generate AI-powered recommendations
      const recommendations = await this.generateAIRecommendations(
        application,
        submittedDocuments,
        missingDocuments,
        programRequirements,
        options.includeOptional ?? true
      );

      // Calculate completion percentage
      const completionPercentage = this.calculateCompletionPercentage(
        submittedDocuments,
        programRequirements
      );

      // Separate required and optional missing documents
      const { required, optional } = this.categorizeMissingDocuments(
        missingDocuments,
        programType
      );

      const processingTime = Date.now() - startTime;

      const result: ApplicationRecommendations = {
        applicationId,
        recommendations,
        completionPercentage,
        missingDocuments: required,
        optionalDocuments: optional,
        generatedAt: new Date(),
        processingTime,
      };

      // Cache the result
      await aiCacheService.cacheRecommendations(applicationId, result);

      logger.info('Recommendations generated', {
        applicationId,
        recommendationCount: recommendations.length,
        completionPercentage,
        processingTime,
      });

      return result;
    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      logger.error('Failed to generate recommendations', {
        applicationId,
        processingTime,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Update recommendations based on new document upload
   */
  async updateRecommendations(
    applicationId: string,
    newDocumentId: string
  ): Promise<ApplicationRecommendations> {
    try {
      logger.info('Updating recommendations after document upload', {
        applicationId,
        newDocumentId,
      });

      // Invalidate cache
      await aiCacheService.invalidateApplicationCache(applicationId);

      // Regenerate recommendations
      return await this.generateRecommendations(applicationId, { forceRefresh: true });
    } catch (error: any) {
      logger.error('Failed to update recommendations', {
        applicationId,
        newDocumentId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get completion tracking for an application
   */
  async getCompletionTracking(applicationId: string): Promise<CompletionTracking> {
    try {
      logger.info('Getting completion tracking', { applicationId });

      const application = await applicationRepository.findById(applicationId);
      if (!application) {
        throw new Error(`Application not found: ${applicationId}`);
      }

      const submittedDocuments = await documentRepository.findByApplicationId(applicationId);
      const programType = application.programType || 'DEFAULT';
      const programRequirements = this.getProgramRequirements(programType);

      const missingDocuments = this.identifyMissingDocuments(
        submittedDocuments,
        programRequirements
      );

      const { required, optional } = this.categorizeMissingDocuments(
        missingDocuments,
        programType
      );

      const completionPercentage = this.calculateCompletionPercentage(
        submittedDocuments,
        programRequirements
      );

      return {
        applicationId,
        totalRequired: programRequirements.length,
        totalSubmitted: submittedDocuments.length,
        completionPercentage,
        missingRequired: required,
        missingOptional: optional,
        lastUpdated: new Date(),
      };
    } catch (error: any) {
      logger.error('Failed to get completion tracking', {
        applicationId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get missing documents for an application
   */
  async getMissingDocuments(applicationId: string): Promise<string[]> {
    try {
      const tracking = await this.getCompletionTracking(applicationId);
      return [...tracking.missingRequired, ...tracking.missingOptional];
    } catch (error: any) {
      logger.error('Failed to get missing documents', {
        applicationId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get program requirements
   */
  private getProgramRequirements(programType: string): string[] {
    return this.PROGRAM_REQUIREMENTS[programType] || this.PROGRAM_REQUIREMENTS.DEFAULT;
  }

  /**
   * Identify missing documents
   */
  private identifyMissingDocuments(
    submittedDocuments: any[],
    programRequirements: string[]
  ): string[] {
    const submittedTypes = new Set(
      submittedDocuments.map((doc) => this.normalizeDocumentType(doc.documentType || doc.fileName))
    );

    const missing: string[] = [];

    for (const requirement of programRequirements) {
      const normalizedRequirement = this.normalizeDocumentType(requirement);
      let found = false;

      for (const submittedType of submittedTypes) {
        if (this.isDocumentMatch(normalizedRequirement, submittedType)) {
          found = true;
          break;
        }
      }

      if (!found) {
        missing.push(requirement);
      }
    }

    return missing;
  }

  /**
   * Normalize document type for comparison
   */
  private normalizeDocumentType(docType: string): string {
    return docType
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .trim();
  }

  /**
   * Check if document types match
   */
  private isDocumentMatch(requirement: string, submitted: string): boolean {
    // Exact match
    if (requirement === submitted) {
      return true;
    }

    // Partial match (e.g., "taxreturn" matches "businesstaxreturn")
    if (submitted.includes(requirement) || requirement.includes(submitted)) {
      return true;
    }

    // Common aliases
    const aliases: Record<string, string[]> = {
      taxreturn: ['tax', 'return', '1040', '1120'],
      financialstatement: ['financial', 'statement', 'balance', 'income'],
      businesslicense: ['license', 'permit'],
      bankstatement: ['bank', 'statement', 'account'],
    };

    for (const [key, values] of Object.entries(aliases)) {
      if (requirement.includes(key)) {
        for (const value of values) {
          if (submitted.includes(value)) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Generate AI-powered recommendations using LLM
   */
  private async generateAIRecommendations(
    application: any,
    submittedDocuments: any[],
    missingDocuments: string[],
    programRequirements: string[],
    includeOptional: boolean
  ): Promise<DocumentRecommendation[]> {
    try {
      // includeOptional parameter currently not used in this simplified implementation
      void includeOptional;
      // Prepare submitted documents list
      const submittedList = submittedDocuments
        .map((doc) => `- ${doc.documentType || doc.fileName}`)
        .join('\n');

      // Prepare applicant profile
      const applicantProfile = `
        Application ID: ${application.id}
        Program Type: ${application.programType || 'N/A'}
        Status: ${application.status}
        Submitted Documents: ${submittedDocuments.length}
      `;

      // Fill template
      const userPrompt = fillTemplate(MISSING_DOCUMENT_TEMPLATE.userPromptTemplate, {
        applicationType: application.programType || 'General Loan Application',
        programRequirements: programRequirements.join(', '),
        submittedDocuments: submittedList || 'None',
        applicantProfile,
      });

      // Generate recommendations
      const result = await llmClient.complete(userPrompt, {
        systemPrompt: MISSING_DOCUMENT_TEMPLATE.systemPrompt,
        maxTokens: 800,
        temperature: 0.3,
      });

      const sanitizedResponse = sanitizeLLMResponse(result.content);

      // Parse recommendations from LLM response
      const recommendations = this.parseRecommendationsFromLLM(
        sanitizedResponse,
        missingDocuments
      );

      // Add quality improvement recommendations
      const qualityRecommendations = await this.generateQualityRecommendations(
        application.id,
        submittedDocuments
      );

      return [...recommendations, ...qualityRecommendations]
        .filter(Boolean)
        .map(rec => ({
          ...rec,
          description: this.trimRecommendationText(rec.description),
          reasoning: this.trimRecommendationText(rec.reasoning),
          suggestedAction: this.trimRecommendationText(rec.suggestedAction),
        }))
        .slice(0, 4);
    } catch (error: any) {
      logger.error('Failed to generate AI recommendations', {
        applicationId: application.id,
        error: error.message,
      });

      // Fallback to basic recommendations
      return this.generateBasicRecommendations(missingDocuments);
    }
  }

  /**
   * Parse recommendations from LLM response
   */
  private parseRecommendationsFromLLM(
    llmResponse: string,
    missingDocuments: string[]
  ): DocumentRecommendation[] {
    const recommendations: DocumentRecommendation[] = [];

    // Try to extract structured recommendations
    const lines = llmResponse.split('\n');
    let currentRec: Partial<DocumentRecommendation> | null = null;

    for (const line of lines) {
      const trimmed = line.trim();

      // Check for priority indicators
      if (trimmed.match(/priority:\s*(HIGH|MEDIUM|LOW)/i)) {
        const match = trimmed.match(/priority:\s*(HIGH|MEDIUM|LOW)/i);
        if (currentRec && match) {
          currentRec.priority = match[1].toUpperCase() as 'HIGH' | 'MEDIUM' | 'LOW';
        }
      }

      // Check for document type
      if (trimmed.match(/document:\s*(.+)/i)) {
        if (currentRec && currentRec.description) {
          recommendations.push(currentRec as DocumentRecommendation);
        }
        const match = trimmed.match(/document:\s*(.+)/i);
        currentRec = {
          type: 'MISSING_DOCUMENT',
          priority: 'MEDIUM',
          documentType: match ? match[1] : undefined,
          description: '',
          reasoning: '',
          suggestedAction: '',
          isRequired: true,
        };
      }

      // Check for description
      if (trimmed.match(/description:\s*(.+)/i)) {
        const match = trimmed.match(/description:\s*(.+)/i);
        if (currentRec && match) {
          currentRec.description = match[1];
        }
      }

      // Check for reasoning
      if (trimmed.match(/reason:\s*(.+)/i)) {
        const match = trimmed.match(/reason:\s*(.+)/i);
        if (currentRec && match) {
          currentRec.reasoning = match[1];
        }
      }
    }

    // Add last recommendation
    if (currentRec && currentRec.description) {
      recommendations.push(currentRec as DocumentRecommendation);
    }

    // If parsing failed, create basic recommendations
    if (recommendations.length === 0) {
      return this.generateBasicRecommendations(missingDocuments);
    }

    return recommendations.slice(0, 4).map(rec => ({
      ...rec,
      description: this.trimRecommendationText(rec.description),
      reasoning: this.trimRecommendationText(rec.reasoning),
      suggestedAction: this.trimRecommendationText(rec.suggestedAction),
    }));
  }

  /**
   * Generate basic recommendations (fallback)
   */
  private generateBasicRecommendations(missingDocuments: string[]): DocumentRecommendation[] {
    if (!missingDocuments?.length) {
      return [
        {
          type: 'ADDITIONAL_INFO',
          priority: 'LOW',
          description: 'Everything looks good. Continue monitoring for updates.',
          reasoning: 'No missing documents detected',
          suggestedAction: 'Proceed with underwriting when ready.',
          isRequired: false,
        },
      ];
    }

    return missingDocuments.slice(0, 4).map(doc => ({
      type: 'MISSING_DOCUMENT',
      priority: 'HIGH',
      documentType: doc,
      description: this.trimRecommendationText(`${doc} is required for this application.`),
      reasoning: 'This document is part of the standard requirements for this program type.',
      suggestedAction: this.trimRecommendationText(`Request ${doc} from the borrower and flag once received.`),
      isRequired: true,
    }));
  }

  /**
   * Generate quality improvement recommendations
   */
  private async generateQualityRecommendations(
    applicationId: string,
    submittedDocuments: any[]
  ): Promise<DocumentRecommendation[]> {
    const recommendations: DocumentRecommendation[] = [];

    for (const document of submittedDocuments) {
      try {
        const analysis = await aiAnalysisRepository.findLatestByDocumentId(document.id);

        if (analysis && analysis.qualityScore < 70) {
          recommendations.push({
            type: 'QUALITY_IMPROVEMENT',
            priority: 'MEDIUM',
            documentType: document.documentType || document.fileName,
            description: `Document quality score is ${analysis.qualityScore}/100`,
            reasoning: 'Low quality documents may result in processing delays or rejection',
            suggestedAction: 'Please upload a higher quality scan or photo of this document',
            isRequired: false,
          });
        }
      } catch (error) {
        // Skip if analysis not found
        continue;
      }
    }

    return recommendations;
  }

  /**
   * Calculate completion percentage
   */
  private calculateCompletionPercentage(
    submittedDocuments: any[],
    programRequirements: string[]
  ): number {
    if (programRequirements.length === 0) {
      return 100;
    }

    const missingCount = this.identifyMissingDocuments(
      submittedDocuments,
      programRequirements
    ).length;

    const completedCount = programRequirements.length - missingCount;
    return Math.round((completedCount / programRequirements.length) * 100);
  }

  /**
   * Categorize missing documents into required and optional
   */
  private categorizeMissingDocuments(
    missingDocuments: string[],
    programType: string
  ): { required: string[]; optional: string[] } {
    // programType param reserved for future categorization rules
    void programType;
    // For now, treat all as required
    // In a real system, you would have a more sophisticated categorization
    const coreRequirements = ['Tax Returns', 'Financial Statements', 'Business License'];

    const required: string[] = [];
    const optional: string[] = [];

    for (const doc of missingDocuments) {
      const isCore = coreRequirements.some((core) =>
        this.normalizeDocumentType(doc).includes(this.normalizeDocumentType(core))
      );

      if (isCore) {
        required.push(doc);
      } else {
        optional.push(doc);
      }
    }

    return { required, optional };
  }

  private trimRecommendationText(value?: string, maxLength = 220): string {
    if (!value) {
      return '';
    }
    const cleaned = value.replace(/\s+/g, ' ').trim();
    if (cleaned.length <= maxLength) {
      return cleaned;
    }
    return `${cleaned.slice(0, maxLength).trim()}…`;
  }
}

export default AIRecommendationEngine.getInstance();
