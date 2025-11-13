/**
 * Risk Assessment Engine
 * Calculates risk scores for loan applications based on multiple factors
 * Implements risk scoring algorithm, escalation logic, and evidence collection
 */

import imageManipulationDetector from './imageManipulationDetector';
import inconsistencyDetector from './inconsistencyDetector';
import aiAnalysisRepository from '../repositories/aiAnalysisRepository';
import documentRepository from '../repositories/documentRepository';
import applicationRepository from '../repositories/applicationRepository';
import logger from '../utils/logger';

export interface RiskScore {
  overall: number; // 0-100
  factors: RiskFactor[];
  recommendation: 'APPROVE' | 'REJECT' | 'REQUEST_MORE_INFO' | 'ESCALATE';
  confidence: number;
  escalationRequired: boolean;
  escalationReason?: string;
}

export interface RiskFactor {
  category: RiskCategory;
  score: number; // 0-100
  weight: number; // 0-1
  description: string;
  evidence: string[];
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export enum RiskCategory {
  DOCUMENT_QUALITY = 'DOCUMENT_QUALITY',
  IMAGE_MANIPULATION = 'IMAGE_MANIPULATION',
  DATA_INCONSISTENCY = 'DATA_INCONSISTENCY',
  MISSING_INFORMATION = 'MISSING_INFORMATION',
  ANOMALY_DETECTION = 'ANOMALY_DETECTION',
  EXTRACTION_CONFIDENCE = 'EXTRACTION_CONFIDENCE',
  HISTORICAL_PATTERNS = 'HISTORICAL_PATTERNS',
}

export interface RiskAssessmentOptions {
  includeHistoricalData?: boolean;
  detailedAnalysis?: boolean;
  skipCache?: boolean;
}

export interface EscalationCriteria {
  riskThreshold: number;
  criticalFactorCount: number;
  highFactorCount: number;
  specificCategories: RiskCategory[];
}

class RiskAssessmentEngine {
  private static instance: RiskAssessmentEngine;

  // Risk factor weights (must sum to 1.0)
  private readonly WEIGHTS = {
    DOCUMENT_QUALITY: 0.20,
    IMAGE_MANIPULATION: 0.25,
    DATA_INCONSISTENCY: 0.25,
    MISSING_INFORMATION: 0.10,
    ANOMALY_DETECTION: 0.15,
    EXTRACTION_CONFIDENCE: 0.05,
  };

  // Escalation thresholds
  private readonly ESCALATION_CRITERIA: EscalationCriteria = {
    riskThreshold: 70,
    criticalFactorCount: 1,
    highFactorCount: 3,
    specificCategories: [
      RiskCategory.IMAGE_MANIPULATION,
      RiskCategory.DATA_INCONSISTENCY,
    ],
  };

  private constructor() {}

  public static getInstance(): RiskAssessmentEngine {
    if (!RiskAssessmentEngine.instance) {
      RiskAssessmentEngine.instance = new RiskAssessmentEngine();
    }
    return RiskAssessmentEngine.instance;
  }

  /**
   * Calculate risk score for an application
   */
  async calculateRiskScore(
    applicationId: string,
    _options: RiskAssessmentOptions = {}
  ): Promise<RiskScore> {
    try {
      // Mark _options as used to satisfy linter when caller doesn't pass options
      void _options;

      logger.info('Starting risk assessment', { applicationId });

      // Get application
      const application = await applicationRepository.findById(applicationId);
      if (!application) {
        throw new Error(`Application not found: ${applicationId}`);
      }

      // Get all documents for the application
      const documents = await documentRepository.findByApplicationId(applicationId);

      if (documents.length === 0) {
        logger.warn('No documents found for risk assessment', { applicationId });
        return this.createMinimalRiskScore('No documents available for assessment');
      }

      // Collect risk factors
      const riskFactors: RiskFactor[] = [];

      // 1. Document Quality Assessment
      const qualityFactor = await this.assessDocumentQuality(documents);
      riskFactors.push(qualityFactor);

      // 2. Image Manipulation Detection
      const manipulationFactor = await this.assessImageManipulation(documents);
      riskFactors.push(manipulationFactor);

      // 3. Data Inconsistency Detection
      const inconsistencyFactor = await this.assessDataInconsistency(applicationId);
      riskFactors.push(inconsistencyFactor);

      // 4. Missing Information Assessment
      const missingInfoFactor = await this.assessMissingInformation(application, documents);
      riskFactors.push(missingInfoFactor);

      // 5. Anomaly Detection
      const anomalyFactor = await this.assessAnomalies(documents);
      riskFactors.push(anomalyFactor);

      // 6. Extraction Confidence
      const confidenceFactor = await this.assessExtractionConfidence(documents);
      riskFactors.push(confidenceFactor);

      // Calculate overall risk score
      const overall = this.calculateOverallRiskScore(riskFactors);

      // Determine recommendation
      const recommendation = this.determineRecommendation(overall, riskFactors);

      // Check escalation criteria
      const { escalationRequired, escalationReason } = this.checkEscalation(overall, riskFactors);

      // Calculate confidence in the assessment
      const confidence = this.calculateAssessmentConfidence(riskFactors);

      const riskScore: RiskScore = {
        overall,
        factors: riskFactors,
        recommendation,
        confidence,
        escalationRequired,
        escalationReason,
      };

      // Log evidence for audit trail
      await this.logRiskAssessment(applicationId, riskScore);

      logger.info('Risk assessment completed', {
        applicationId,
        overall,
        recommendation,
        escalationRequired,
      });

      return riskScore;
    } catch (error: any) {
      logger.error('Risk assessment failed', {
        applicationId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Assess document quality
   */
  private async assessDocumentQuality(documents: any[]): Promise<RiskFactor> {
    const evidence: string[] = [];
    let totalQuality = 0;
    let documentCount = 0;

    for (const document of documents) {
      try {
        const analysis = await aiAnalysisRepository.findLatestByDocumentId(document.id);
        if (analysis) {
          totalQuality += analysis.qualityScore;
          documentCount++;

          if (analysis.qualityScore < 70) {
            evidence.push(`Document ${document.id}: Low quality score (${analysis.qualityScore})`);
          }
        }
      } catch (error) {
        logger.warn('Failed to get quality score', { documentId: document.id });
      }
    }

    const avgQuality = documentCount > 0 ? totalQuality / documentCount : 100;
    const riskScore = 100 - avgQuality; // Invert: low quality = high risk

    let severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (riskScore >= 50) severity = 'CRITICAL';
    else if (riskScore >= 30) severity = 'HIGH';
    else if (riskScore >= 15) severity = 'MEDIUM';

    return {
      category: RiskCategory.DOCUMENT_QUALITY,
      score: riskScore,
      weight: this.WEIGHTS.DOCUMENT_QUALITY,
      description: `Average document quality: ${avgQuality.toFixed(1)}%`,
      evidence,
      severity,
    };
  }

  /**
   * Assess image manipulation risk
   */
  private async assessImageManipulation(documents: any[]): Promise<RiskFactor> {
    const evidence: string[] = [];
    let totalManipulationScore = 0;
    let documentCount = 0;

    for (const document of documents) {
      try {
        // Only check image/PDF documents
        if (document.mimeType?.includes('image') || document.mimeType?.includes('pdf')) {
          const result = await imageManipulationDetector.detectManipulation(document.id);

          if (result.isManipulated) {
            totalManipulationScore += result.confidence * 100;
            documentCount++;

            evidence.push(
              `Document ${document.id}: Manipulation detected (${(result.confidence * 100).toFixed(1)}% confidence)`
            );

            result.indicators.forEach(indicator => {
              evidence.push(`  - ${indicator.type}: ${indicator.description}`);
            });
          } else {
            documentCount++;
          }
        }
      } catch (error: any) {
        logger.warn('Failed to check image manipulation', {
          documentId: document.id,
          error: error.message,
        });
      }
    }

    const avgManipulationScore = documentCount > 0 ? totalManipulationScore / documentCount : 0;

    let severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (avgManipulationScore >= 70) severity = 'CRITICAL';
    else if (avgManipulationScore >= 50) severity = 'HIGH';
    else if (avgManipulationScore >= 30) severity = 'MEDIUM';

    return {
      category: RiskCategory.IMAGE_MANIPULATION,
      score: avgManipulationScore,
      weight: this.WEIGHTS.IMAGE_MANIPULATION,
      description: evidence.length > 0
        ? `Potential manipulation detected in ${evidence.length} document(s)`
        : 'No manipulation detected',
      evidence,
      severity,
    };
  }

  /**
   * Assess data inconsistency risk
   */
  private async assessDataInconsistency(applicationId: string): Promise<RiskFactor> {
    const evidence: string[] = [];
    let riskScore = 0;

    try {
      const result = await inconsistencyDetector.detectInconsistencies(applicationId);

      riskScore = result.overallRiskScore;

      result.inconsistencies.forEach(inconsistency => {
        evidence.push(
          `${inconsistency.type}: ${inconsistency.description} (${inconsistency.severity})`
        );
      });
    } catch (error: any) {
      logger.warn('Failed to detect inconsistencies', {
        applicationId,
        error: error.message,
      });
    }

    let severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (riskScore >= 70) severity = 'CRITICAL';
    else if (riskScore >= 50) severity = 'HIGH';
    else if (riskScore >= 30) severity = 'MEDIUM';

    return {
      category: RiskCategory.DATA_INCONSISTENCY,
      score: riskScore,
      weight: this.WEIGHTS.DATA_INCONSISTENCY,
      description: evidence.length > 0
        ? `${evidence.length} inconsistency(ies) detected`
        : 'No inconsistencies detected',
      evidence,
      severity,
    };
  }

  /**
   * Assess missing information risk
   */
  private async assessMissingInformation(application: any, documents: any[]): Promise<RiskFactor> {
    const evidence: string[] = [];
    let riskScore = 0;

    // Check for missing required documents
    const missingDocs = application.missingDocuments || [];
    if (missingDocs.length > 0) {
      riskScore += missingDocs.length * 15; // 15 points per missing document
      evidence.push(`${missingDocs.length} required document(s) missing`);
      missingDocs.forEach((doc: string) => evidence.push(`  - ${doc}`));
    }

    // Check for incomplete document analysis
    for (const document of documents) {
      const analysis = await aiAnalysisRepository.findLatestByDocumentId(document.id);
      if (!analysis) {
        riskScore += 10;
        evidence.push(`Document ${document.id}: No AI analysis available`);
      } else if (analysis.extractedData && Object.keys(analysis.extractedData).length === 0) {
        riskScore += 5;
        evidence.push(`Document ${document.id}: No data extracted`);
      }
    }

    riskScore = Math.min(100, riskScore);

    let severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (riskScore >= 60) severity = 'HIGH';
    else if (riskScore >= 40) severity = 'MEDIUM';

    return {
      category: RiskCategory.MISSING_INFORMATION,
      score: riskScore,
      weight: this.WEIGHTS.MISSING_INFORMATION,
      description: evidence.length > 0
        ? 'Missing or incomplete information detected'
        : 'All required information present',
      evidence,
      severity,
    };
  }

  /**
   * Assess anomalies
   */
  private async assessAnomalies(documents: any[]): Promise<RiskFactor> {
    const evidence: string[] = [];
    let totalAnomalyScore = 0;
    let documentCount = 0;

    for (const document of documents) {
      try {
        const analysis = await aiAnalysisRepository.findLatestByDocumentId(document.id);
        if (analysis && analysis.anomalies && analysis.anomalies.length > 0) {
          documentCount++;

          const criticalAnomalies = analysis.anomalies.filter(
            (a: any) => a.severity === 'CRITICAL' || a.severity === 'HIGH'
          );

          if (criticalAnomalies.length > 0) {
            totalAnomalyScore += criticalAnomalies.length * 25;
            evidence.push(`Document ${document.id}: ${criticalAnomalies.length} critical anomaly(ies)`);

            criticalAnomalies.forEach((anomaly: any) => {
              evidence.push(`  - ${anomaly.type}: ${anomaly.description}`);
            });
          }
        }
      } catch (error) {
        logger.warn('Failed to check anomalies', { documentId: document.id });
      }
    }

    const avgAnomalyScore = documentCount > 0 ? totalAnomalyScore / documentCount : 0;
    const riskScore = Math.min(100, avgAnomalyScore);

    let severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (riskScore >= 70) severity = 'CRITICAL';
    else if (riskScore >= 50) severity = 'HIGH';
    else if (riskScore >= 30) severity = 'MEDIUM';

    return {
      category: RiskCategory.ANOMALY_DETECTION,
      score: riskScore,
      weight: this.WEIGHTS.ANOMALY_DETECTION,
      description: evidence.length > 0
        ? `Anomalies detected in ${documentCount} document(s)`
        : 'No significant anomalies detected',
      evidence,
      severity,
    };
  }

  /**
   * Assess extraction confidence
   */
  private async assessExtractionConfidence(documents: any[]): Promise<RiskFactor> {
    const evidence: string[] = [];
    let totalConfidence = 0;
    let documentCount = 0;

    for (const document of documents) {
      try {
        const analysis = await aiAnalysisRepository.findLatestByDocumentId(document.id);
        if (analysis) {
          totalConfidence += analysis.confidence;
          documentCount++;

          if (analysis.confidence < 0.7) {
            evidence.push(
              `Document ${document.id}: Low confidence (${(analysis.confidence * 100).toFixed(1)}%)`
            );
          }
        }
      } catch (error) {
        logger.warn('Failed to get extraction confidence', { documentId: document.id });
      }
    }

    const avgConfidence = documentCount > 0 ? totalConfidence / documentCount : 1;
    const riskScore = (1 - avgConfidence) * 100; // Invert: low confidence = high risk

    let severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (riskScore >= 40) severity = 'HIGH';
    else if (riskScore >= 25) severity = 'MEDIUM';

    return {
      category: RiskCategory.EXTRACTION_CONFIDENCE,
      score: riskScore,
      weight: this.WEIGHTS.EXTRACTION_CONFIDENCE,
      description: `Average extraction confidence: ${(avgConfidence * 100).toFixed(1)}%`,
      evidence,
      severity,
    };
  }

  /**
   * Calculate overall risk score from factors
   */
  private calculateOverallRiskScore(factors: RiskFactor[]): number {
    let weightedSum = 0;
    let totalWeight = 0;

    for (const factor of factors) {
      weightedSum += factor.score * factor.weight;
      totalWeight += factor.weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * Determine recommendation based on risk score
   */
  private determineRecommendation(
    overallScore: number,
    factors: RiskFactor[]
  ): 'APPROVE' | 'REJECT' | 'REQUEST_MORE_INFO' | 'ESCALATE' {
    // Check for critical factors
    const criticalFactors = factors.filter(f => f.severity === 'CRITICAL');
    if (criticalFactors.length > 0) {
      return 'ESCALATE';
    }

    // Check for high-risk factors
    const highFactors = factors.filter(f => f.severity === 'HIGH');
    if (highFactors.length >= 2) {
      return 'ESCALATE';
    }

    // Score-based recommendations
    if (overallScore >= 70) {
      return 'REJECT';
    } else if (overallScore >= 50) {
      return 'ESCALATE';
    } else if (overallScore >= 30) {
      return 'REQUEST_MORE_INFO';
    } else {
      return 'APPROVE';
    }
  }

  /**
   * Check if escalation is required
   */
  private checkEscalation(
    overallScore: number,
    factors: RiskFactor[]
  ): { escalationRequired: boolean; escalationReason?: string } {
    const reasons: string[] = [];

    // Check overall risk threshold
    if (overallScore >= this.ESCALATION_CRITERIA.riskThreshold) {
      reasons.push(`Overall risk score (${overallScore.toFixed(1)}) exceeds threshold`);
    }

    // Check critical factor count
    const criticalCount = factors.filter(f => f.severity === 'CRITICAL').length;
    if (criticalCount >= this.ESCALATION_CRITERIA.criticalFactorCount) {
      reasons.push(`${criticalCount} critical risk factor(s) detected`);
    }

    // Check high factor count
    const highCount = factors.filter(f => f.severity === 'HIGH').length;
    if (highCount >= this.ESCALATION_CRITERIA.highFactorCount) {
      reasons.push(`${highCount} high-severity risk factor(s) detected`);
    }

    // Check specific categories
    for (const category of this.ESCALATION_CRITERIA.specificCategories) {
      const factor = factors.find(f => f.category === category);
      if (factor && (factor.severity === 'CRITICAL' || factor.severity === 'HIGH')) {
        reasons.push(`High risk in ${category} category`);
      }
    }

    return {
      escalationRequired: reasons.length > 0,
      escalationReason: reasons.length > 0 ? reasons.join('; ') : undefined,
    };
  }

  /**
   * Calculate confidence in the risk assessment
   */
  private calculateAssessmentConfidence(factors: RiskFactor[]): number {
    // Confidence is based on:
    // 1. Number of factors analyzed
    // 2. Amount of evidence collected
    // 3. Consistency of severity levels

    const factorCount = factors.length;
    const evidenceCount = factors.reduce((sum, f) => sum + f.evidence.length, 0);

    let confidence = 0.5; // Base confidence

    // More factors = higher confidence
    confidence += Math.min(0.3, factorCount * 0.05);

    // More evidence = higher confidence
    confidence += Math.min(0.2, evidenceCount * 0.02);

    return Math.min(1, confidence);
  }

  /**
   * Log risk assessment for audit trail
   */
  private async logRiskAssessment(applicationId: string, riskScore: RiskScore): Promise<void> {
    try {
      logger.info('Risk assessment audit log', {
        applicationId,
        overallScore: riskScore.overall,
        recommendation: riskScore.recommendation,
        escalationRequired: riskScore.escalationRequired,
        factors: riskScore.factors.map(f => ({
          category: f.category,
          score: f.score,
          severity: f.severity,
          evidenceCount: f.evidence.length,
        })),
      });
    } catch (error: any) {
      logger.error('Failed to log risk assessment', {
        applicationId,
        error: error.message,
      });
    }
  }

  /**
   * Create minimal risk score when no data available
   */
  private createMinimalRiskScore(reason: string): RiskScore {
    return {
      overall: 50,
      factors: [],
      recommendation: 'REQUEST_MORE_INFO',
      confidence: 0.3,
      escalationRequired: false,
      escalationReason: reason,
    };
  }
}

export default RiskAssessmentEngine.getInstance();
