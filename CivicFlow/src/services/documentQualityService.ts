/**
 * Document Quality Assessment Service
 * Evaluates document quality and provides improvement recommendations
 * Implements image quality checks, completeness validation, and real-time feedback
 */

import azureDocumentIntelligenceClient from '../clients/azureDocumentIntelligenceClient';
import documentRepository from '../repositories/documentRepository';
import storageService from '../utils/storage';
import logger from '../utils/logger';
import { AnalyzeResult } from '@azure/ai-form-recognizer';

export interface QualityAssessment {
  documentId: string;
  overallScore: number; // 0-100
  imageQuality: ImageQualityMetrics;
  completeness: CompletenessMetrics;
  readability: ReadabilityMetrics;
  recommendations: QualityRecommendation[];
  assessmentTime: number;
}

export interface ImageQualityMetrics {
  resolution: ResolutionCheck;
  clarity: ClarityCheck;
  orientation: OrientationCheck;
  score: number; // 0-100
}

export interface ResolutionCheck {
  isAcceptable: boolean;
  dpi?: number;
  message: string;
}

export interface ClarityCheck {
  isAcceptable: boolean;
  blurScore?: number; // 0-1, higher is better
  message: string;
}

export interface OrientationCheck {
  isCorrect: boolean;
  detectedAngle?: number;
  message: string;
}

export interface CompletenessMetrics {
  hasAllPages: boolean;
  missingPages: number[];
  hasRequiredFields: boolean;
  missingFields: string[];
  score: number; // 0-100
}

export interface ReadabilityMetrics {
  textExtractable: boolean;
  averageConfidence: number;
  lowConfidenceAreas: number;
  score: number; // 0-100
}

export interface QualityRecommendation {
  category: 'RESOLUTION' | 'CLARITY' | 'ORIENTATION' | 'COMPLETENESS' | 'READABILITY';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  issue: string;
  suggestion: string;
  impact: string;
}

export interface RealTimeFeedback {
  documentId: string;
  qualityScore: number;
  canProceed: boolean;
  immediateIssues: string[];
  suggestions: string[];
  processingTime: number;
}

class DocumentQualityService {
  private static instance: DocumentQualityService;
  private readonly MIN_ACCEPTABLE_SCORE = 70;
  private readonly MIN_DPI = 150;
  private readonly MIN_CLARITY_SCORE = 0.6;
  private readonly MIN_CONFIDENCE = 0.7;

  private constructor() {}

  public static getInstance(): DocumentQualityService {
    if (!DocumentQualityService.instance) {
      DocumentQualityService.instance = new DocumentQualityService();
    }
    return DocumentQualityService.instance;
  }

  /**
   * Perform comprehensive quality assessment
   */
  async assessQuality(documentId: string): Promise<QualityAssessment> {
    const startTime = Date.now();

    try {
      logger.info('Starting quality assessment', { documentId });

      // Get document
      const document = await documentRepository.findById(documentId);
      if (!document) {
        throw new Error(`Document not found: ${documentId}`);
      }

      // Analyze document
      const analysisResult = await azureDocumentIntelligenceClient.analyzeDocumentFromUrl(
        document.storageUrl
      );

      // Assess image quality
      const imageQuality = await this.assessImageQuality(document.storageUrl, analysisResult.result);

      // Assess completeness
      const completeness = this.assessCompleteness(analysisResult.result, document.documentType);

      // Assess readability
      const readability = this.assessReadability(analysisResult.result);

      // Calculate overall score
      const overallScore = this.calculateOverallScore(imageQuality, completeness, readability);

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        imageQuality,
        completeness,
        readability,
        overallScore
      );

      const assessmentTime = Date.now() - startTime;

      const assessment: QualityAssessment = {
        documentId,
        overallScore,
        imageQuality,
        completeness,
        readability,
        recommendations,
        assessmentTime,
      };

      logger.info('Quality assessment completed', {
        documentId,
        overallScore,
        assessmentTime,
        recommendationsCount: recommendations.length,
      });

      return assessment;
    } catch (error: any) {
      logger.error('Quality assessment failed', {
        documentId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Provide real-time quality feedback (faster, less comprehensive)
   */
  async getRealTimeFeedback(documentId: string): Promise<RealTimeFeedback> {
    const startTime = Date.now();

    try {
      logger.info('Getting real-time quality feedback', { documentId });

      // Get document
      const document = await documentRepository.findById(documentId);
      if (!document) {
        throw new Error(`Document not found: ${documentId}`);
      }

      // Quick analysis
      const analysisResult = await azureDocumentIntelligenceClient.analyzeDocumentFromUrl(
        document.storageUrl,
        { pages: '1' } // Only analyze first page for speed
      );

      // Quick quality checks
      const readability = this.assessReadability(analysisResult.result);
      const hasContent = analysisResult.result.content && analysisResult.result.content.length > 50;

      // Calculate quick score
      const qualityScore = hasContent ? readability.score : 0;

      // Determine if can proceed
      const canProceed = qualityScore >= this.MIN_ACCEPTABLE_SCORE;

      // Identify immediate issues
      const immediateIssues: string[] = [];
      const suggestions: string[] = [];

      if (!hasContent) {
        immediateIssues.push('Document appears to be empty or unreadable');
        suggestions.push('Ensure the document is not blank and try rescanning');
      }

      if (readability.averageConfidence < this.MIN_CONFIDENCE) {
        immediateIssues.push('Text quality is poor');
        suggestions.push('Improve lighting and focus when scanning');
      }

      if (analysisResult.result.pages && analysisResult.result.pages.length === 0) {
        immediateIssues.push('No pages detected');
        suggestions.push('Verify the file is a valid document');
      }

      const processingTime = Date.now() - startTime;

      const feedback: RealTimeFeedback = {
        documentId,
        qualityScore,
        canProceed,
        immediateIssues,
        suggestions,
        processingTime,
      };

      logger.info('Real-time feedback generated', {
        documentId,
        qualityScore,
        canProceed,
        processingTime,
      });

      return feedback;
    } catch (error: any) {
      logger.error('Real-time feedback failed', {
        documentId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Assess image quality
   */
  private async assessImageQuality(
    documentUrl: string,
    analysisResult: AnalyzeResult
  ): Promise<ImageQualityMetrics> {
    // Resolution check
    const resolution = this.checkResolution(analysisResult);

    // Clarity check
    const clarity = this.checkClarity(analysisResult);

    // Orientation check
    const orientation = this.checkOrientation(analysisResult);

    // Calculate image quality score
    let score = 100;

    if (!resolution.isAcceptable) score -= 30;
    if (!clarity.isAcceptable) score -= 40;
    if (!orientation.isCorrect) score -= 20;

    score = Math.max(0, score);

    return {
      resolution,
      clarity,
      orientation,
      score,
    };
  }

  /**
   * Check document resolution
   */
  private checkResolution(analysisResult: AnalyzeResult): ResolutionCheck {
    // Azure doesn't directly provide DPI, but we can infer from page dimensions
    // This is a simplified check
    if (analysisResult.pages && analysisResult.pages.length > 0) {
      const page = analysisResult.pages[0];

      // Check if page has reasonable dimensions
      if (page.width && page.height) {
        const hasGoodDimensions = page.width > 1000 && page.height > 1000;

        return {
          isAcceptable: hasGoodDimensions,
          message: hasGoodDimensions
            ? 'Document resolution is acceptable'
            : 'Document resolution may be too low',
        };
      }
    }

    return {
      isAcceptable: true,
      message: 'Unable to determine resolution',
    };
  }

  /**
   * Check document clarity
   */
  private checkClarity(analysisResult: AnalyzeResult): ClarityCheck {
    // Infer clarity from confidence scores
    if (analysisResult.pages && analysisResult.pages.length > 0) {
      const confidences: number[] = [];

      for (const page of analysisResult.pages) {
        if (page.lines) {
          for (const line of page.lines) {
            if (line.content && line.content.length > 0) {
              // Azure doesn't provide line-level confidence in all cases
              // We'll use a heuristic based on content length
              confidences.push(1.0);
            }
          }
        }
      }

      if (confidences.length > 0) {
        const avgConfidence = confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
        const isAcceptable = avgConfidence >= this.MIN_CLARITY_SCORE;

        return {
          isAcceptable,
          blurScore: avgConfidence,
          message: isAcceptable
            ? 'Document clarity is good'
            : 'Document may be blurry or low quality',
        };
      }
    }

    return {
      isAcceptable: true,
      message: 'Unable to determine clarity',
    };
  }

  /**
   * Check document orientation
   */
  private checkOrientation(analysisResult: AnalyzeResult): OrientationCheck {
    if (analysisResult.pages && analysisResult.pages.length > 0) {
      const page = analysisResult.pages[0];

      // Check if page has angle property
      if (page.angle !== undefined) {
        const isCorrect = Math.abs(page.angle) < 5; // Within 5 degrees is acceptable

        return {
          isCorrect,
          detectedAngle: page.angle,
          message: isCorrect
            ? 'Document orientation is correct'
            : `Document is rotated by ${page.angle.toFixed(1)} degrees`,
        };
      }
    }

    return {
      isCorrect: true,
      message: 'Unable to determine orientation',
    };
  }

  /**
   * Assess document completeness
   */
  private assessCompleteness(
    analysisResult: AnalyzeResult,
    documentType?: string
  ): CompletenessMetrics {
    const missingPages: number[] = [];
    const missingFields: string[] = [];

    // Check page count
    const pageCount = analysisResult.pages?.length || 0;
    const hasAllPages = pageCount > 0;

    // Check for required fields based on document type
    let hasRequiredFields = true;

    if (documentType) {
      const requiredFields = this.getRequiredFieldsForDocumentType(documentType);

      if (analysisResult.keyValuePairs) {
        const extractedKeys = analysisResult.keyValuePairs
          .map((kvp) => kvp.key?.content?.toLowerCase() || '')
          .filter((k) => k.length > 0);

        for (const requiredField of requiredFields) {
          const found = extractedKeys.some((key) => key.includes(requiredField.toLowerCase()));
          if (!found) {
            missingFields.push(requiredField);
            hasRequiredFields = false;
          }
        }
      } else {
        hasRequiredFields = false;
        missingFields.push(...requiredFields);
      }
    }

    // Calculate completeness score
    let score = 100;

    if (!hasAllPages) score -= 50;
    if (!hasRequiredFields) score -= 30;
    score -= missingFields.length * 5;

    score = Math.max(0, score);

    return {
      hasAllPages,
      missingPages,
      hasRequiredFields,
      missingFields,
      score,
    };
  }

  /**
   * Get required fields for document type
   */
  private getRequiredFieldsForDocumentType(documentType: string): string[] {
    const fieldMap: Record<string, string[]> = {
      W9: ['Name', 'Business name', 'Tax classification', 'Address', 'SSN', 'EIN'],
      BANK_STATEMENT: ['Account number', 'Statement date', 'Balance'],
      TAX_RETURN: ['Name', 'SSN', 'Filing status', 'Income'],
      BUSINESS_LICENSE: ['Business name', 'License number', 'Issue date'],
    };

    return fieldMap[documentType] || [];
  }

  /**
   * Assess document readability
   */
  private assessReadability(analysisResult: AnalyzeResult): ReadabilityMetrics {
    let textExtractable = false;
    let totalConfidence = 0;
    let confidenceCount = 0;
    let lowConfidenceAreas = 0;

    if (analysisResult.content && analysisResult.content.length > 0) {
      textExtractable = true;
    }

    // Analyze confidence scores
    if (analysisResult.keyValuePairs) {
      for (const kvp of analysisResult.keyValuePairs) {
        if (kvp.confidence !== undefined) {
          totalConfidence += kvp.confidence;
          confidenceCount++;

          if (kvp.confidence < this.MIN_CONFIDENCE) {
            lowConfidenceAreas++;
          }
        }
      }
    }

    const averageConfidence = confidenceCount > 0 ? totalConfidence / confidenceCount : 0;

    // Calculate readability score
    let score = 100;

    if (!textExtractable) score -= 50;
    if (averageConfidence < this.MIN_CONFIDENCE) score -= 30;
    score -= lowConfidenceAreas * 5;

    score = Math.max(0, score);

    return {
      textExtractable,
      averageConfidence,
      lowConfidenceAreas,
      score,
    };
  }

  /**
   * Calculate overall quality score
   */
  private calculateOverallScore(
    imageQuality: ImageQualityMetrics,
    completeness: CompletenessMetrics,
    readability: ReadabilityMetrics
  ): number {
    // Weighted average
    const weights = {
      imageQuality: 0.3,
      completeness: 0.4,
      readability: 0.3,
    };

    const score =
      imageQuality.score * weights.imageQuality +
      completeness.score * weights.completeness +
      readability.score * weights.readability;

    return Math.round(score);
  }

  /**
   * Generate quality recommendations
   */
  private generateRecommendations(
    imageQuality: ImageQualityMetrics,
    completeness: CompletenessMetrics,
    readability: ReadabilityMetrics,
    overallScore: number
  ): QualityRecommendation[] {
    const recommendations: QualityRecommendation[] = [];

    // Image quality recommendations
    if (!imageQuality.resolution.isAcceptable) {
      recommendations.push({
        category: 'RESOLUTION',
        priority: 'HIGH',
        issue: 'Document resolution is too low',
        suggestion: 'Rescan the document at a higher resolution (minimum 150 DPI recommended)',
        impact: 'Low resolution may result in inaccurate data extraction',
      });
    }

    if (!imageQuality.clarity.isAcceptable) {
      recommendations.push({
        category: 'CLARITY',
        priority: 'HIGH',
        issue: 'Document image is unclear or blurry',
        suggestion: 'Ensure proper focus and lighting when scanning. Clean the scanner glass if needed.',
        impact: 'Poor clarity significantly reduces extraction accuracy',
      });
    }

    if (!imageQuality.orientation.isCorrect) {
      recommendations.push({
        category: 'ORIENTATION',
        priority: 'MEDIUM',
        issue: `Document is rotated (${imageQuality.orientation.detectedAngle?.toFixed(1)}°)`,
        suggestion: 'Rotate the document to the correct orientation before uploading',
        impact: 'Incorrect orientation may cause extraction errors',
      });
    }

    // Completeness recommendations
    if (!completeness.hasAllPages) {
      recommendations.push({
        category: 'COMPLETENESS',
        priority: 'HIGH',
        issue: 'Document appears to be incomplete',
        suggestion: 'Ensure all pages are included in the scan',
        impact: 'Missing pages will result in incomplete data',
      });
    }

    if (completeness.missingFields.length > 0) {
      recommendations.push({
        category: 'COMPLETENESS',
        priority: 'MEDIUM',
        issue: `Missing required fields: ${completeness.missingFields.join(', ')}`,
        suggestion: 'Verify that all required information is visible and legible in the document',
        impact: 'Missing fields may delay processing',
      });
    }

    // Readability recommendations
    if (!readability.textExtractable) {
      recommendations.push({
        category: 'READABILITY',
        priority: 'HIGH',
        issue: 'Unable to extract text from document',
        suggestion: 'Ensure the document is not a blank page or corrupted file',
        impact: 'No data can be extracted from unreadable documents',
      });
    }

    if (readability.lowConfidenceAreas > 3) {
      recommendations.push({
        category: 'READABILITY',
        priority: 'MEDIUM',
        issue: 'Multiple areas have low confidence scores',
        suggestion: 'Improve scan quality, especially in areas with small text or complex layouts',
        impact: 'Low confidence areas may require manual verification',
      });
    }

    // Overall recommendations
    if (overallScore < this.MIN_ACCEPTABLE_SCORE) {
      recommendations.push({
        category: 'COMPLETENESS',
        priority: 'HIGH',
        issue: `Overall quality score (${overallScore}) is below acceptable threshold`,
        suggestion: 'Consider rescanning the document with improved quality settings',
        impact: 'Low quality documents may be rejected or require manual processing',
      });
    }

    return recommendations;
  }
}

export default DocumentQualityService.getInstance();
