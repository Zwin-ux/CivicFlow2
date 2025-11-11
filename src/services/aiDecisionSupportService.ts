/**
 * AI Decision Support Service
 * Provides AI-assisted decision recommendations for loan applications
 * Generates approval/rejection recommendations with supporting evidence
 */

import llmClient from '../clients/llmClient';
import aiCacheService from './aiCacheService';
import applicationRepository from '../repositories/applicationRepository';
import documentRepository from '../repositories/documentRepository';
import aiAnalysisRepository from '../repositories/aiAnalysisRepository';
import anomalyRepository from '../repositories/anomalyRepository';
import documentSummarizationService from './documentSummarizationService';
import riskAssessmentEngine from './riskAssessmentEngine';
import logger from '../utils/logger';
import database from '../config/database';
import {
  DECISION_SUPPORT_TEMPLATE,
  fillTemplate,
  sanitizeLLMResponse,
  extractConfidenceScore,
} from '../utils/promptTemplates';

export interface DecisionRecommendation {
  applicationId: string;
  recommendation: 'APPROVE' | 'REJECT' | 'REQUEST_MORE_INFO';
  confidence: number; // 0-1
  supportingEvidence: Evidence[];
  riskFactors: RiskFactor[];
  positiveFactors: PositiveFactor[];
  policyViolations: PolicyViolation[];
  complianceIssues: ComplianceIssue[];
  conditionsForApproval: string[];
  specificConcerns: string[];
  generatedAt: Date;
  processingTime: number;
}

export interface Evidence {
  category: 'FINANCIAL' | 'DOCUMENTATION' | 'COMPLIANCE' | 'RISK' | 'QUALIFICATIONS';
  description: string;
  impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  confidence: number;
  sourceDocuments: string[];
}

export interface RiskFactor {
  factor: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  mitigation?: string;
}

export interface PositiveFactor {
  factor: string;
  strength: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
}

export interface PolicyViolation {
  policy: string;
  violation: string;
  severity: 'MINOR' | 'MAJOR' | 'CRITICAL';
  recommendation: string;
}

export interface ComplianceIssue {
  requirement: string;
  issue: string;
  status: 'RESOLVED' | 'PENDING' | 'UNRESOLVED';
  resolution?: string;
}

export interface HumanOverride {
  applicationId: string;
  aiRecommendation: 'APPROVE' | 'REJECT' | 'REQUEST_MORE_INFO';
  humanDecision: 'APPROVE' | 'REJECT' | 'REQUEST_MORE_INFO';
  overrideReason: string;
  overriddenBy: string;
  overriddenAt: Date;
  aiConfidence: number;
}

export interface DecisionSupportOptions {
  includeDetailedAnalysis?: boolean;
  forceRefresh?: boolean;
}

class AIDecisionSupportService {
  private static instance: AIDecisionSupportService;

  private constructor() {}

  public static getInstance(): AIDecisionSupportService {
    if (!AIDecisionSupportService.instance) {
      AIDecisionSupportService.instance = new AIDecisionSupportService();
    }
    return AIDecisionSupportService.instance;
  }

  /**
   * Generate decision recommendation for an application
   */
  async generateDecisionRecommendation(
    applicationId: string,
    options: DecisionSupportOptions = {}
  ): Promise<DecisionRecommendation> {
    const startTime = Date.now();

    try {
      logger.info('Generating decision recommendation', { applicationId, options });

      // Check cache first
      if (!options.forceRefresh) {
        const cachedDecision = await aiCacheService.getDecisionSupport(applicationId);
        if (cachedDecision) {
          logger.info('Returning cached decision recommendation', { applicationId });
          return cachedDecision;
        }
      }

      // Get application
      const application = await applicationRepository.findById(applicationId);
      if (!application) {
        throw new Error(`Application not found: ${applicationId}`);
      }

      // Gather all necessary data
      const documents = await documentRepository.findByApplicationId(applicationId);
      const anomalies = await anomalyRepository.findByApplicationId(applicationId);

      // Get document quality assessments
      const documentQuality = await this.assessDocumentQuality(documents);

      // Get risk assessment
      const riskAssessment = await riskAssessmentEngine.calculateRiskScore(applicationId);

      // Get application summary
      let applicationSummary;
      try {
        applicationSummary = await documentSummarizationService.summarizeApplication(
          applicationId
        );
      } catch (error) {
        logger.warn('Failed to get application summary, continuing without it', {
          applicationId,
          error,
        });
        applicationSummary = null;
      }

      // Perform financial analysis
      const financialAnalysis = await this.performFinancialAnalysis(documents);

      // Generate AI recommendation using LLM
      const aiRecommendation = await this.generateAIRecommendation(
        application,
        documents,
        anomalies,
        riskAssessment,
        documentQuality,
        financialAnalysis,
        applicationSummary
      );

      // Extract supporting evidence
      const supportingEvidence = this.extractSupportingEvidence(
        aiRecommendation,
        riskAssessment,
        documentQuality,
        financialAnalysis
      );

      // Identify policy violations
      const policyViolations = this.identifyPolicyViolations(
        application,
        anomalies,
        riskAssessment
      );

      // Identify compliance issues
      const complianceIssues = this.identifyComplianceIssues(application, documents);

      // Extract risk and positive factors
      const riskFactors = this.extractRiskFactors(riskAssessment, anomalies);
      const positiveFactors = this.extractPositiveFactors(
        application,
        documentQuality,
        financialAnalysis
      );

      // Generate conditions for approval
      const conditionsForApproval = this.generateConditionsForApproval(
        aiRecommendation.recommendation,
        policyViolations,
        complianceIssues
      );

      // Generate specific concerns
      const specificConcerns = this.generateSpecificConcerns(
        riskFactors,
        policyViolations,
        complianceIssues
      );

      const processingTime = Date.now() - startTime;

      const decision: DecisionRecommendation = {
        applicationId,
        recommendation: aiRecommendation.recommendation,
        confidence: aiRecommendation.confidence,
        supportingEvidence,
        riskFactors,
        positiveFactors,
        policyViolations,
        complianceIssues,
        conditionsForApproval,
        specificConcerns,
        generatedAt: new Date(),
        processingTime,
      };

      // Cache the result
      await aiCacheService.cacheDecisionSupport(applicationId, decision);

      logger.info('Decision recommendation generated', {
        applicationId,
        recommendation: decision.recommendation,
        confidence: decision.confidence,
        processingTime,
      });

      return decision;
    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      logger.error('Failed to generate decision recommendation', {
        applicationId,
        processingTime,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Track human override of AI recommendation
   */
  async trackHumanOverride(override: HumanOverride): Promise<void> {
    try {
      logger.info('Tracking human override', {
        applicationId: override.applicationId,
        aiRecommendation: override.aiRecommendation,
        humanDecision: override.humanDecision,
      });

      // Store override in database for model improvement
      const query = `
        INSERT INTO ai_decision_overrides (
          application_id,
          ai_recommendation,
          human_decision,
          override_reason,
          overridden_by,
          overridden_at,
          ai_confidence
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;

      const values = [
        override.applicationId,
        override.aiRecommendation,
        override.humanDecision,
        override.overrideReason,
        override.overriddenBy,
        override.overriddenAt,
        override.aiConfidence,
      ];

      await database.query(query, values);

      logger.info('Human override tracked successfully', {
        applicationId: override.applicationId,
      });
    } catch (error: any) {
      logger.error('Failed to track human override', {
        applicationId: override.applicationId,
        error: error.message,
      });
      // Don't throw - this is for analytics only
    }
  }

  /**
   * Get override statistics for model improvement
   */
  async getOverrideStatistics(startDate?: Date, endDate?: Date): Promise<any> {
    try {
      let query = `
        SELECT 
          ai_recommendation,
          human_decision,
          COUNT(*) as count,
          AVG(ai_confidence) as avg_confidence
        FROM ai_decision_overrides
        WHERE 1=1
      `;

      const values: any[] = [];

      if (startDate) {
        values.push(startDate);
        query += ` AND overridden_at >= $${values.length}`;
      }

      if (endDate) {
        values.push(endDate);
        query += ` AND overridden_at <= $${values.length}`;
      }

      query += ` GROUP BY ai_recommendation, human_decision`;

      const result = await database.query(query, values);

      return result.rows;
    } catch (error: any) {
      logger.error('Failed to get override statistics', { error: error.message });
      return [];
    }
  }

  /**
   * Assess document quality
   */
  private async assessDocumentQuality(documents: any[]): Promise<any> {
    const qualityAssessments = [];

    for (const document of documents) {
      try {
        const analysis = await aiAnalysisRepository.findLatestByDocumentId(document.id);
        if (analysis) {
          qualityAssessments.push({
            documentId: document.id,
            documentType: document.documentType,
            qualityScore: analysis.qualityScore,
            confidence: analysis.confidence,
          });
        }
      } catch (error) {
        // Skip if analysis not found
        continue;
      }
    }

    const avgQuality =
      qualityAssessments.length > 0
        ? qualityAssessments.reduce((sum, qa) => sum + qa.qualityScore, 0) /
          qualityAssessments.length
        : 0;

    return {
      assessments: qualityAssessments,
      averageQuality: avgQuality,
      lowQualityCount: qualityAssessments.filter((qa) => qa.qualityScore < 70).length,
    };
  }

  /**
   * Perform financial analysis
   */
  private async performFinancialAnalysis(documents: any[]): Promise<any> {
    // Extract financial data from documents
    const financialData: any = {
      revenue: null,
      expenses: null,
      netIncome: null,
      assets: null,
      liabilities: null,
      cashFlow: null,
      debtToIncomeRatio: null,
    };

    for (const document of documents) {
      try {
        const analysis = await aiAnalysisRepository.findLatestByDocumentId(document.id);
        if (analysis && analysis.extractedData) {
          // Extract financial entities
          const entities = analysis.extractedData.entities || [];
          for (const entity of entities) {
            if (entity.type === 'MONEY') {
              // Simple heuristic - in real system, would be more sophisticated
              const context = entity.value.toLowerCase();
              if (context.includes('revenue') || context.includes('income')) {
                financialData.revenue = entity.value;
              }
            }
          }
        }
      } catch (error) {
        continue;
      }
    }

    return {
      data: financialData,
      isComplete: Object.values(financialData).some((v) => v !== null),
      healthScore: this.calculateFinancialHealthScore(financialData),
    };
  }

  /**
   * Calculate financial health score
   */
  private calculateFinancialHealthScore(financialData: any): number {
    // Simplified scoring - in real system would be more sophisticated
    let score = 50; // Base score

    if (financialData.revenue) score += 10;
    if (financialData.netIncome) score += 10;
    if (financialData.assets) score += 10;
    if (financialData.cashFlow) score += 10;

    return Math.min(100, score);
  }

  /**
   * Generate AI recommendation using LLM
   */
  private async generateAIRecommendation(
    application: any,
    documents: any[],
    anomalies: any[],
    riskAssessment: any,
    documentQuality: any,
    financialAnalysis: any,
    applicationSummary: any
  ): Promise<{ recommendation: 'APPROVE' | 'REJECT' | 'REQUEST_MORE_INFO'; confidence: number }> {
    try {
      // Prepare application details
      const applicationDetails = `
        Application ID: ${application.id}
        Program Type: ${application.programType || 'N/A'}
        Status: ${application.status}
        Submitted: ${application.submittedAt || 'Not submitted'}
        Documents: ${documents.length}
      `;

      // Prepare financial analysis
      const financialAnalysisText = `
        Financial Health Score: ${financialAnalysis.healthScore}/100
        Data Completeness: ${financialAnalysis.isComplete ? 'Complete' : 'Incomplete'}
      `;

      // Prepare document quality
      const documentQualityText = `
        Average Quality Score: ${documentQuality.averageQuality.toFixed(1)}/100
        Low Quality Documents: ${documentQuality.lowQualityCount}
        Total Documents: ${documents.length}
      `;

      // Prepare anomalies and risks
      const anomaliesText = `
        Total Anomalies: ${anomalies.length}
        Critical Anomalies: ${anomalies.filter((a) => a.severity === 'CRITICAL').length}
        Risk Score: ${riskAssessment.overall}/100
        Risk Level: ${riskAssessment.recommendation}
      `;

      // Prepare program requirements (simplified)
      const programRequirements = `
        Standard lending criteria apply
        Minimum credit requirements
        Debt-to-income ratio limits
        Collateral requirements
      `;

      // Fill template
      const userPrompt = fillTemplate(DECISION_SUPPORT_TEMPLATE.userPromptTemplate, {
        applicationDetails,
        financialAnalysis: financialAnalysisText,
        documentQuality: documentQualityText,
        anomaliesAndRisks: anomaliesText,
        programRequirements,
      });

      // Generate recommendation
      const result = await llmClient.complete(userPrompt, {
        systemPrompt: DECISION_SUPPORT_TEMPLATE.systemPrompt,
        maxTokens: 1000,
        temperature: 0.2, // Lower temperature for more consistent decisions
      });

      const sanitizedResponse = sanitizeLLMResponse(result.content);

      // Parse recommendation
      const recommendation = this.parseRecommendation(sanitizedResponse);
      const confidence = extractConfidenceScore(sanitizedResponse);

      return { recommendation, confidence };
    } catch (error: any) {
      logger.error('Failed to generate AI recommendation', {
        applicationId: application.id,
        error: error.message,
      });

      // Fallback to rule-based recommendation
      return this.generateRuleBasedRecommendation(riskAssessment, documentQuality, anomalies);
    }
  }

  /**
   * Parse recommendation from LLM response
   */
  private parseRecommendation(
    response: string
  ): 'APPROVE' | 'REJECT' | 'REQUEST_MORE_INFO' {
    const responseLower = response.toLowerCase();

    if (responseLower.includes('approve') && !responseLower.includes('not approve')) {
      return 'APPROVE';
    }

    if (responseLower.includes('reject')) {
      return 'REJECT';
    }

    return 'REQUEST_MORE_INFO';
  }

  /**
   * Generate rule-based recommendation (fallback)
   */
  private generateRuleBasedRecommendation(
    riskAssessment: any,
    documentQuality: any,
    anomalies: any[]
  ): { recommendation: 'APPROVE' | 'REJECT' | 'REQUEST_MORE_INFO'; confidence: number } {
    const criticalAnomalies = anomalies.filter((a) => a.severity === 'CRITICAL').length;

    if (criticalAnomalies > 0 || riskAssessment.overall > 80) {
      return { recommendation: 'REJECT', confidence: 0.85 };
    }

    if (riskAssessment.overall > 60 || documentQuality.averageQuality < 60) {
      return { recommendation: 'REQUEST_MORE_INFO', confidence: 0.75 };
    }

    if (riskAssessment.overall < 40 && documentQuality.averageQuality > 80) {
      return { recommendation: 'APPROVE', confidence: 0.8 };
    }

    return { recommendation: 'REQUEST_MORE_INFO', confidence: 0.7 };
  }

  /**
   * Extract supporting evidence
   */
  private extractSupportingEvidence(
    aiRecommendation: any,
    riskAssessment: any,
    documentQuality: any,
    financialAnalysis: any
  ): Evidence[] {
    const evidence: Evidence[] = [];

    // Financial evidence
    evidence.push({
      category: 'FINANCIAL',
      description: `Financial health score: ${financialAnalysis.healthScore}/100`,
      impact: financialAnalysis.healthScore > 70 ? 'POSITIVE' : 'NEGATIVE',
      confidence: 0.8,
      sourceDocuments: [],
    });

    // Documentation evidence
    evidence.push({
      category: 'DOCUMENTATION',
      description: `Average document quality: ${documentQuality.averageQuality.toFixed(1)}/100`,
      impact: documentQuality.averageQuality > 70 ? 'POSITIVE' : 'NEGATIVE',
      confidence: 0.85,
      sourceDocuments: [],
    });

    // Risk evidence
    evidence.push({
      category: 'RISK',
      description: `Overall risk score: ${riskAssessment.overall}/100`,
      impact: riskAssessment.overall < 50 ? 'POSITIVE' : 'NEGATIVE',
      confidence: 0.9,
      sourceDocuments: [],
    });

    return evidence;
  }

  /**
   * Identify policy violations
   */
  private identifyPolicyViolations(
    application: any,
    anomalies: any[],
    riskAssessment: any
  ): PolicyViolation[] {
    const violations: PolicyViolation[] = [];

    // Check for critical anomalies
    const criticalAnomalies = anomalies.filter((a) => a.severity === 'CRITICAL');
    if (criticalAnomalies.length > 0) {
      violations.push({
        policy: 'Document Integrity',
        violation: `${criticalAnomalies.length} critical anomalies detected`,
        severity: 'CRITICAL',
        recommendation: 'Reject application or request document resubmission',
      });
    }

    // Check risk score
    if (riskAssessment.overall > 80) {
      violations.push({
        policy: 'Risk Threshold',
        violation: 'Risk score exceeds acceptable threshold',
        severity: 'MAJOR',
        recommendation: 'Reject or require additional collateral',
      });
    }

    return violations;
  }

  /**
   * Identify compliance issues
   */
  private identifyComplianceIssues(application: any, documents: any[]): ComplianceIssue[] {
    const issues: ComplianceIssue[] = [];

    // Check for required documents (simplified)
    const requiredTypes = ['TAX_RETURN', 'BANK_STATEMENT', 'BUSINESS_LICENSE'];
    const submittedTypes = new Set(documents.map((d) => d.documentType));

    for (const requiredType of requiredTypes) {
      if (!submittedTypes.has(requiredType)) {
        issues.push({
          requirement: `${requiredType} Required`,
          issue: `Missing ${requiredType}`,
          status: 'UNRESOLVED',
        });
      }
    }

    return issues;
  }

  /**
   * Extract risk factors
   */
  private extractRiskFactors(riskAssessment: any, anomalies: any[]): RiskFactor[] {
    const factors: RiskFactor[] = [];

    // Add risk factors from assessment
    if (riskAssessment.factors) {
      for (const factor of riskAssessment.factors) {
        factors.push({
          factor: factor.category,
          severity: this.mapScoreToSeverity(factor.score),
          description: factor.description,
          mitigation: factor.evidence.join('; '),
        });
      }
    }

    // Add anomaly-based risk factors
    const highAnomalies = anomalies.filter((a) => a.severity === 'HIGH' || a.severity === 'CRITICAL');
    for (const anomaly of highAnomalies.slice(0, 3)) {
      factors.push({
        factor: anomaly.anomalyType,
        severity: anomaly.severity,
        description: anomaly.description,
      });
    }

    return factors;
  }

  /**
   * Extract positive factors
   */
  private extractPositiveFactors(
    application: any,
    documentQuality: any,
    financialAnalysis: any
  ): PositiveFactor[] {
    const factors: PositiveFactor[] = [];

    if (documentQuality.averageQuality > 80) {
      factors.push({
        factor: 'High Quality Documentation',
        strength: 'HIGH',
        description: `Average document quality score of ${documentQuality.averageQuality.toFixed(1)}/100`,
      });
    }

    if (financialAnalysis.healthScore > 70) {
      factors.push({
        factor: 'Strong Financial Health',
        strength: 'HIGH',
        description: `Financial health score of ${financialAnalysis.healthScore}/100`,
      });
    }

    return factors;
  }

  /**
   * Generate conditions for approval
   */
  private generateConditionsForApproval(
    recommendation: string,
    policyViolations: PolicyViolation[],
    complianceIssues: ComplianceIssue[]
  ): string[] {
    const conditions: string[] = [];

    if (recommendation === 'APPROVE') {
      // Add conditions based on minor issues
      const minorViolations = policyViolations.filter((v) => v.severity === 'MINOR');
      for (const violation of minorViolations) {
        conditions.push(violation.recommendation);
      }

      // Add conditions for pending compliance issues
      const pendingIssues = complianceIssues.filter((i) => i.status === 'PENDING');
      for (const issue of pendingIssues) {
        conditions.push(`Resolve ${issue.requirement}`);
      }
    }

    return conditions;
  }

  /**
   * Generate specific concerns
   */
  private generateSpecificConcerns(
    riskFactors: RiskFactor[],
    policyViolations: PolicyViolation[],
    complianceIssues: ComplianceIssue[]
  ): string[] {
    const concerns: string[] = [];

    // Add high severity risk factors
    const highRisks = riskFactors.filter((rf) => rf.severity === 'HIGH' || rf.severity === 'CRITICAL');
    concerns.push(...highRisks.map((rf) => rf.description));

    // Add major policy violations
    const majorViolations = policyViolations.filter((v) => v.severity === 'MAJOR' || v.severity === 'CRITICAL');
    concerns.push(...majorViolations.map((v) => v.violation));

    // Add unresolved compliance issues
    const unresolvedIssues = complianceIssues.filter((i) => i.status === 'UNRESOLVED');
    concerns.push(...unresolvedIssues.map((i) => i.issue));

    return concerns.slice(0, 5); // Limit to top 5 concerns
  }

  /**
   * Map score to severity
   */
  private mapScoreToSeverity(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (score >= 80) return 'CRITICAL';
    if (score >= 60) return 'HIGH';
    if (score >= 40) return 'MEDIUM';
    return 'LOW';
  }
}

export default AIDecisionSupportService.getInstance();
