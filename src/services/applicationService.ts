/**
 * Application Service
 * Business logic layer for application operations
 */

import applicationRepository from '../repositories/applicationRepository';
import programRuleRepository from '../repositories/programRuleRepository';
import documentRepository from '../repositories/documentRepository';
import auditLogRepository from '../repositories/auditLogRepository';
import redisClient from '../config/redis';
import logger from '../utils/logger';
import {
  Application,
  ApplicationStatus,
  CreateApplicationRequest,
  UpdateApplicationRequest,
  FraudFlag,
} from '../models/application';
import { EligibilityResult, CriterionResult, ProgramRule } from '../models/programRule';
import { EntityType } from '../models/auditLog';
import { EventEmitter } from 'events';

class ApplicationService extends EventEmitter {
  private readonly CACHE_TTL = 3600; // 1 hour cache for program rules
  private readonly CACHE_PREFIX = 'program_rule:';

  // Valid status transitions
  private readonly STATUS_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
    [ApplicationStatus.DRAFT]: [ApplicationStatus.SUBMITTED],
    [ApplicationStatus.SUBMITTED]: [
      ApplicationStatus.UNDER_REVIEW,
      ApplicationStatus.PENDING_DOCUMENTS,
      ApplicationStatus.REJECTED,
    ],
    [ApplicationStatus.UNDER_REVIEW]: [
      ApplicationStatus.APPROVED,
      ApplicationStatus.REJECTED,
      ApplicationStatus.DEFERRED,
      ApplicationStatus.PENDING_DOCUMENTS,
    ],
    [ApplicationStatus.PENDING_DOCUMENTS]: [
      ApplicationStatus.SUBMITTED,
      ApplicationStatus.UNDER_REVIEW,
    ],
    [ApplicationStatus.APPROVED]: [],
    [ApplicationStatus.REJECTED]: [],
    [ApplicationStatus.DEFERRED]: [ApplicationStatus.UNDER_REVIEW],
  };

  /**
   * Create a new application
   * @param data - Application creation data
   * @param createdBy - User ID who created the application
   * @returns Created application
   */
  async createApplication(
    data: CreateApplicationRequest,
    createdBy: string
  ): Promise<Application> {
    try {
      // Validate requested amount is positive
      if (data.requestedAmount <= 0) {
        throw new Error('Requested amount must be greater than zero');
      }

      // Verify program type exists
      const programRule = await this.getProgramRule(data.programType);
      if (!programRule) {
        throw new Error(`Invalid program type: ${data.programType}`);
      }

      // Validate requested amount against program rules
      if (programRule.rules.fundingRange) {
        const { min, max } = programRule.rules.fundingRange;
        if (data.requestedAmount < min || data.requestedAmount > max) {
          throw new Error(
            `Requested amount must be between $${min} and $${max} for ${programRule.programName}`
          );
        }
      }

      // Create application
      const application = await applicationRepository.create(data);

      // Log creation action
      await auditLogRepository.create({
        actionType: 'APPLICATION_CREATED',
        entityType: EntityType.APPLICATION,
        entityId: application.id,
        performedBy: createdBy,
        details: {
          applicantId: data.applicantId,
          programType: data.programType,
          requestedAmount: data.requestedAmount,
        },
      });

      logger.info('Application created successfully', {
        applicationId: application.id,
        applicantId: data.applicantId,
        programType: data.programType,
      });

      return application;
    } catch (error) {
      logger.error('Failed to create application', { error, data });
      throw error;
    }
  }

  /**
   * Get application by ID
   * @param id - Application ID
   * @param requestedBy - User ID requesting the application
   * @returns Application
   */
  async getApplication(id: string, requestedBy: string): Promise<Application> {
    try {
      const application = await applicationRepository.findById(id);
      if (!application) {
        throw new Error('Application not found');
      }

      // Log access action
      await auditLogRepository.create({
        actionType: 'APPLICATION_ACCESSED',
        entityType: EntityType.APPLICATION,
        entityId: id,
        performedBy: requestedBy,
        details: {
          status: application.status,
        },
      });

      return application;
    } catch (error) {
      logger.error('Failed to get application', { error, id });
      throw error;
    }
  }

  /**
   * Update application
   * @param id - Application ID
   * @param data - Update data
   * @param updatedBy - User ID who updated the application
   * @returns Updated application
   */
  async updateApplication(
    id: string,
    data: UpdateApplicationRequest,
    updatedBy: string
  ): Promise<Application> {
    try {
      const existing = await applicationRepository.findById(id);
      if (!existing) {
        throw new Error('Application not found');
      }

      // Validate status transition if status is being updated
      if (data.status && data.status !== existing.status) {
        this.validateStatusTransition(existing.status, data.status);
      }

      // Update application
      const application = await applicationRepository.update(id, data);

      // Log update action
      await auditLogRepository.create({
        actionType: 'APPLICATION_UPDATED',
        entityType: EntityType.APPLICATION,
        entityId: id,
        performedBy: updatedBy,
        details: {
          updates: data,
          previousStatus: existing.status,
          newStatus: application.status,
        },
      });

      // Emit status change event if status changed
      if (data.status && data.status !== existing.status) {
        this.emit('statusChanged', {
          applicationId: id,
          previousStatus: existing.status,
          newStatus: data.status,
          application,
        });
      }

      logger.info('Application updated successfully', {
        applicationId: id,
        updates: data,
      });

      return application;
    } catch (error) {
      logger.error('Failed to update application', { error, id, data });
      throw error;
    }
  }

  /**
   * Submit application for review
   * @param id - Application ID
   * @param submittedBy - User ID who submitted the application
   * @returns Updated application
   */
  async submitApplication(id: string, submittedBy: string): Promise<Application> {
    try {
      const application = await applicationRepository.findById(id);
      if (!application) {
        throw new Error('Application not found');
      }

      // Validate current status
      if (application.status !== ApplicationStatus.DRAFT) {
        throw new Error('Only draft applications can be submitted');
      }

      // Check for missing documents
      const missingDocs = await this.detectMissingDocuments(id);
      
      // Update status
      let newStatus = ApplicationStatus.SUBMITTED;
      if (missingDocs.length > 0) {
        newStatus = ApplicationStatus.PENDING_DOCUMENTS;
        await applicationRepository.updateMissingDocuments(id, missingDocs);
      }

      const updatedApplication = await applicationRepository.updateStatus(id, newStatus);

      // Calculate eligibility score
      const eligibilityResult = await this.calculateEligibility(id);
      await applicationRepository.updateEligibilityScore(id, eligibilityResult.score);

      // Log submission action
      await auditLogRepository.create({
        actionType: 'APPLICATION_SUBMITTED',
        entityType: EntityType.APPLICATION,
        entityId: id,
        performedBy: submittedBy,
        confidenceScore: eligibilityResult.confidenceScore,
        details: {
          eligibilityScore: eligibilityResult.score,
          passed: eligibilityResult.passed,
          missingDocuments: missingDocs,
        },
      });

      // Emit status change event
      this.emit('statusChanged', {
        applicationId: id,
        previousStatus: ApplicationStatus.DRAFT,
        newStatus,
        application: updatedApplication,
      });

      logger.info('Application submitted successfully', {
        applicationId: id,
        status: newStatus,
        eligibilityScore: eligibilityResult.score,
      });

      return updatedApplication;
    } catch (error) {
      logger.error('Failed to submit application', { error, id });
      throw error;
    }
  }

  /**
   * Calculate eligibility score for an application
   * @param id - Application ID
   * @returns Eligibility result
   */
  async calculateEligibility(id: string): Promise<EligibilityResult> {
    try {
      const application = await applicationRepository.findById(id);
      if (!application) {
        throw new Error('Application not found');
      }

      // Get program rules
      const programRule = await this.getProgramRule(application.programType);
      if (!programRule) {
        throw new Error(`Program rules not found for ${application.programType}`);
      }

      // Get documents for the application
      const documents = await documentRepository.findByApplicationId(id);

      // Build application data for evaluation
      const applicationData = await this.buildApplicationData(application, documents);

      // Evaluate eligibility criteria
      const criteriaResults: CriterionResult[] = [];
      let totalScore = 0;
      let totalWeight = 0;

      for (const criterion of programRule.rules.eligibilityCriteria) {
        const result = this.evaluateCriterion(criterion, applicationData);
        criteriaResults.push(result);
        
        if (result.passed) {
          totalScore += result.pointsEarned;
        }
        totalWeight += criterion.weight;
      }

      // Calculate final score as percentage
      const score = totalWeight > 0 ? (totalScore / totalWeight) * 100 : 0;
      const passed = score >= programRule.rules.passingScore;

      // Generate reasons
      const reasons = criteriaResults
        .filter(r => !r.passed)
        .map(r => r.description);

      // Calculate confidence score based on data completeness
      const confidenceScore = this.calculateConfidenceScore(documents, criteriaResults);

      const result: EligibilityResult = {
        score: Math.round(score * 100) / 100,
        passed,
        reasons,
        programRulesApplied: [programRule.programName],
        confidenceScore,
        criteriaResults,
      };

      // Log eligibility calculation
      await auditLogRepository.create({
        actionType: 'ELIGIBILITY_CALCULATED',
        entityType: EntityType.APPLICATION,
        entityId: id,
        performedBy: 'SYSTEM',
        confidenceScore,
        details: {
          score: result.score,
          passed: result.passed,
          programType: application.programType,
          criteriaResults: criteriaResults.map(r => ({
            field: r.field,
            passed: r.passed,
            pointsEarned: r.pointsEarned,
          })),
        },
      });

      logger.info('Eligibility calculated successfully', {
        applicationId: id,
        score: result.score,
        passed: result.passed,
        confidenceScore,
      });

      return result;
    } catch (error) {
      logger.error('Failed to calculate eligibility', { error, id });
      throw error;
    }
  }

  /**
   * Detect missing documents for an application
   * @param id - Application ID
   * @returns Array of missing document types
   */
  async detectMissingDocuments(id: string): Promise<string[]> {
    try {
      const application = await applicationRepository.findById(id);
      if (!application) {
        throw new Error('Application not found');
      }

      // Get program rules
      const programRule = await this.getProgramRule(application.programType);
      if (!programRule) {
        throw new Error(`Program rules not found for ${application.programType}`);
      }

      // Get uploaded documents
      const documents = await documentRepository.findByApplicationId(id);
      const uploadedTypes = new Set(
        documents
          .filter(d => d.documentType)
          .map(d => d.documentType as string)
      );

      // Find missing required documents
      const requiredDocuments = programRule.rules.requiredDocuments;
      const missingDocuments = requiredDocuments.filter(
        docType => !uploadedTypes.has(docType)
      );

      logger.info('Missing documents detected', {
        applicationId: id,
        requiredDocuments,
        uploadedTypes: Array.from(uploadedTypes),
        missingDocuments,
      });

      return missingDocuments;
    } catch (error) {
      logger.error('Failed to detect missing documents', { error, id });
      throw error;
    }
  }

  /**
   * Update application fraud flags
   * @param id - Application ID
   * @param fraudFlags - Array of fraud flags
   * @param updatedBy - User ID who updated the flags
   * @returns Updated application
   */
  async updateFraudFlags(
    id: string,
    fraudFlags: FraudFlag[],
    updatedBy: string
  ): Promise<Application> {
    try {
      const application = await applicationRepository.updateFraudFlags(id, fraudFlags);

      // Log fraud flag update
      await auditLogRepository.create({
        actionType: 'FRAUD_FLAGS_UPDATED',
        entityType: EntityType.APPLICATION,
        entityId: id,
        performedBy: updatedBy,
        details: {
          fraudFlags: fraudFlags.map(f => ({
            type: f.type,
            severity: f.severity,
            description: f.description,
          })),
        },
      });

      logger.info('Fraud flags updated', {
        applicationId: id,
        flagCount: fraudFlags.length,
      });

      return application;
    } catch (error) {
      logger.error('Failed to update fraud flags', { error, id });
      throw error;
    }
  }

  /**
   * Get staff review queue with filtering and sorting
   * @param filters - Filter criteria
   * @param requestedBy - User ID requesting the queue
   * @returns Paginated list of applications with metadata
   */
  async getReviewQueue(
    filters: {
      staffMemberId?: string;
      status?: ApplicationStatus[];
      programType?: string;
      sortBy?: 'submittedAt' | 'eligibilityScore';
      sortOrder?: 'ASC' | 'DESC';
      page?: number;
      pageSize?: number;
    },
    requestedBy: string
  ): Promise<{
    applications: any[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  }> {
    try {
      const page = filters.page || 1;
      const pageSize = filters.pageSize || 50;
      const offset = (page - 1) * pageSize;

      // Get applications
      const applications = await applicationRepository.findForReviewQueue({
        staffMemberId: filters.staffMemberId,
        status: filters.status,
        programType: filters.programType,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        limit: pageSize,
        offset,
      });

      // Get total count
      const total = await applicationRepository.countForReviewQueue({
        staffMemberId: filters.staffMemberId,
        status: filters.status,
        programType: filters.programType,
      });

      const totalPages = Math.ceil(total / pageSize);

      // Log queue access
      await auditLogRepository.create({
        actionType: 'REVIEW_QUEUE_ACCESSED',
        entityType: EntityType.APPLICATION,
        entityId: 'QUEUE',
        performedBy: requestedBy,
        details: {
          filters,
          resultCount: applications.length,
        },
      });

      logger.info('Review queue accessed', {
        requestedBy,
        filters,
        resultCount: applications.length,
        total,
      });

      return {
        applications,
        pagination: {
          page,
          pageSize,
          total,
          totalPages,
        },
      };
    } catch (error) {
      logger.error('Failed to get review queue', { error, filters });
      throw error;
    }
  }

  /**
   * Submit a decision for an application
   * @param id - Application ID
   * @param decision - Decision data
   * @param decidedBy - User ID who made the decision
   * @param userRole - Role of the user making the decision
   * @returns Updated application
   */
  async submitDecision(
    id: string,
    decision: {
      decision: 'APPROVED' | 'REJECTED' | 'DEFERRED';
      amount?: number;
      justification: string;
      overrideReason?: string;
    },
    decidedBy: string,
    userRole: string
  ): Promise<Application> {
    try {
      // AUTHORIZATION CHECK: Only Approver and Administrator roles can make final decisions
      if (userRole !== 'Approver' && userRole !== 'Administrator') {
        // Log unauthorized attempt
        await auditLogRepository.create({
          actionType: 'UNAUTHORIZED_DECISION_ATTEMPT',
          entityType: EntityType.APPLICATION,
          entityId: id,
          performedBy: decidedBy,
          details: {
            userRole,
            attemptedDecision: decision.decision,
            reason: 'User does not have Approver or Administrator role',
          },
        });

        logger.warn('Unauthorized decision attempt', {
          applicationId: id,
          userId: decidedBy,
          userRole,
          decision: decision.decision,
        });

        throw new Error('Only Approver or Administrator roles can make final funding decisions');
      }

      // Get the application
      const application = await applicationRepository.findById(id);
      if (!application) {
        throw new Error('Application not found');
      }

      // Validate application is in a reviewable state
      const reviewableStatuses = [
        ApplicationStatus.SUBMITTED,
        ApplicationStatus.UNDER_REVIEW,
        ApplicationStatus.PENDING_DOCUMENTS,
        ApplicationStatus.DEFERRED,
      ];

      if (!reviewableStatuses.includes(application.status)) {
        throw new Error(
          `Cannot make decision on application with status ${application.status}`
        );
      }

      // Validate justification is provided
      if (!decision.justification || decision.justification.trim().length === 0) {
        throw new Error('Justification is required for all decisions');
      }

      // Validate justification has minimum length
      if (decision.justification.trim().length < 10) {
        throw new Error('Justification must be at least 10 characters long');
      }

      // Validate amount for approved decisions
      if (decision.decision === 'APPROVED') {
        if (!decision.amount || decision.amount <= 0) {
          throw new Error('Approved amount must be greater than zero');
        }
        if (decision.amount > application.requestedAmount) {
          throw new Error('Approved amount cannot exceed requested amount');
        }
      }

      // Validate override reason if eligibility score was overridden
      if (application.eligibilityScore !== undefined) {
        const scoreIndicatesApproval = application.eligibilityScore >= 70; // Assuming 70 is passing
        const decisionIsApproval = decision.decision === 'APPROVED';

        if (scoreIndicatesApproval !== decisionIsApproval && !decision.overrideReason) {
          throw new Error(
            'Override reason is required when decision differs from automated eligibility score'
          );
        }
      }

      // Determine new status based on decision
      let newStatus: ApplicationStatus;
      switch (decision.decision) {
        case 'APPROVED':
          newStatus = ApplicationStatus.APPROVED;
          break;
        case 'REJECTED':
          newStatus = ApplicationStatus.REJECTED;
          break;
        case 'DEFERRED':
          newStatus = ApplicationStatus.DEFERRED;
          break;
      }

      // Create decision object
      const decisionData: UpdateApplicationRequest = {
        status: newStatus,
        decision: {
          decision: decision.decision,
          amount: decision.amount,
          justification: decision.justification,
          overrideReason: decision.overrideReason,
          decidedBy,
          decidedAt: new Date(),
        },
      };

      // Update application
      const updatedApplication = await applicationRepository.update(id, decisionData);

      // Calculate confidence score for the decision
      const confidenceScore = this.calculateDecisionConfidenceScore(
        application,
        decision
      );

      // Log decision with staff member ID and timestamp
      await auditLogRepository.create({
        actionType: 'DECISION_SUBMITTED',
        entityType: EntityType.APPLICATION,
        entityId: id,
        performedBy: decidedBy,
        confidenceScore,
        details: {
          decision: decision.decision,
          amount: decision.amount,
          justification: decision.justification,
          overrideReason: decision.overrideReason,
          previousStatus: application.status,
          newStatus,
          eligibilityScore: application.eligibilityScore,
          userRole,
          timestamp: new Date().toISOString(),
        },
      });

      // For approved decisions, log explicit approval for fund disbursement
      if (decision.decision === 'APPROVED') {
        await auditLogRepository.create({
          actionType: 'FUND_DISBURSEMENT_AUTHORIZED',
          entityType: EntityType.APPLICATION,
          entityId: id,
          performedBy: decidedBy,
          confidenceScore,
          details: {
            approvedAmount: decision.amount,
            requestedAmount: application.requestedAmount,
            staffMemberId: decidedBy,
            userRole,
            justification: decision.justification,
            timestamp: new Date().toISOString(),
            requiresManualDisbursement: true, // Prevent automatic disbursement
          },
        });

        logger.info('Fund disbursement authorized - requires manual processing', {
          applicationId: id,
          approvedAmount: decision.amount,
          decidedBy,
          userRole,
        });
      }

      // Emit decision event for communication service
      this.emit('decisionMade', {
        applicationId: id,
        decision: decision.decision,
        application: updatedApplication,
      });

      logger.info('Decision submitted successfully', {
        applicationId: id,
        decision: decision.decision,
        decidedBy,
        userRole,
        amount: decision.amount,
      });

      return updatedApplication;
    } catch (error) {
      logger.error('Failed to submit decision', { error, id, decision });
      throw error;
    }
  }

  /**
   * Calculate confidence score for a decision
   * @param application - Application
   * @param decision - Decision data
   * @returns Confidence score (0-100)
   */
  private calculateDecisionConfidenceScore(
    application: Application,
    decision: { decision: string; overrideReason?: string }
  ): number {
    let score = 100;

    // Reduce confidence if decision overrides automated score
    if (decision.overrideReason) {
      score -= 20;
    }

    // Reduce confidence if there are fraud flags
    if (application.fraudFlags && application.fraudFlags.length > 0) {
      const highSeverityFlags = application.fraudFlags.filter(
        f => f.severity === 'HIGH'
      ).length;
      score -= highSeverityFlags * 15;
      score -= (application.fraudFlags.length - highSeverityFlags) * 5;
    }

    // Reduce confidence if documents are missing
    if (application.missingDocuments && application.missingDocuments.length > 0) {
      score -= application.missingDocuments.length * 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get program rule with caching
   * @param programType - Program type
   * @returns Program rule or null
   */
  private async getProgramRule(programType: string): Promise<ProgramRule | null> {
    const cacheKey = `${this.CACHE_PREFIX}${programType}`;

    try {
      // Try to get from cache
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Get from database
      const programRule = await programRuleRepository.findActiveByProgramType(programType);
      
      if (programRule) {
        // Cache the result
        await redisClient.set(cacheKey, JSON.stringify(programRule), this.CACHE_TTL);
      }

      return programRule;
    } catch (error) {
      logger.error('Failed to get program rule', { error, programType });
      // If cache fails, still try to get from database
      return await programRuleRepository.findActiveByProgramType(programType);
    }
  }

  /**
   * Validate status transition
   * @param currentStatus - Current status
   * @param newStatus - New status
   * @throws Error if transition is invalid
   */
  private validateStatusTransition(
    currentStatus: ApplicationStatus,
    newStatus: ApplicationStatus
  ): void {
    const allowedTransitions = this.STATUS_TRANSITIONS[currentStatus];
    
    if (!allowedTransitions.includes(newStatus)) {
      throw new Error(
        `Invalid status transition from ${currentStatus} to ${newStatus}`
      );
    }
  }

  /**
   * Build application data for eligibility evaluation
   * @param application - Application
   * @param documents - Application documents
   * @returns Application data object
   */
  private async buildApplicationData(
    application: Application,
    documents: any[]
  ): Promise<Record<string, any>> {
    // Extract data from documents
    const extractedData: Record<string, any> = {};
    
    for (const doc of documents) {
      if (doc.extractedData) {
        Object.assign(extractedData, doc.extractedData);
      }
    }

    // Build application data
    return {
      requestedAmount: application.requestedAmount,
      programType: application.programType,
      hasValidEIN: documents.some(d => d.documentType === 'EIN_VERIFICATION'),
      ...extractedData,
    };
  }

  /**
   * Evaluate a single eligibility criterion
   * @param criterion - Eligibility criterion
   * @param data - Application data
   * @returns Criterion result
   */
  private evaluateCriterion(
    criterion: any,
    data: Record<string, any>
  ): CriterionResult {
    const actualValue = data[criterion.field];
    const expectedValue = criterion.value;
    const operator = criterion.operator;

    let passed = false;

    // Evaluate based on operator
    switch (operator) {
      case '>=':
        passed = actualValue !== undefined && actualValue >= expectedValue;
        break;
      case '<=':
        passed = actualValue !== undefined && actualValue <= expectedValue;
        break;
      case '==':
        passed = actualValue === expectedValue;
        break;
      case '!=':
        passed = actualValue !== expectedValue;
        break;
      case '>':
        passed = actualValue !== undefined && actualValue > expectedValue;
        break;
      case '<':
        passed = actualValue !== undefined && actualValue < expectedValue;
        break;
      default:
        passed = false;
    }

    return {
      field: criterion.field,
      description: criterion.description,
      passed,
      actualValue,
      expectedValue,
      operator,
      weight: criterion.weight,
      pointsEarned: passed ? criterion.weight : 0,
    };
  }

  /**
   * Calculate confidence score based on data completeness
   * @param documents - Application documents
   * @param criteriaResults - Criteria evaluation results
   * @returns Confidence score (0-100)
   */
  private calculateConfidenceScore(
    documents: any[],
    criteriaResults: CriterionResult[]
  ): number {
    let score = 100;

    // Reduce confidence for documents requiring manual review
    const manualReviewCount = documents.filter(d => d.requiresManualReview).length;
    score -= manualReviewCount * 10;

    // Reduce confidence for missing data in criteria
    const missingDataCount = criteriaResults.filter(
      r => r.actualValue === undefined || r.actualValue === null
    ).length;
    score -= missingDataCount * 15;

    // Reduce confidence for low classification confidence
    const lowConfidenceDocs = documents.filter(
      d => d.classificationConfidence && d.classificationConfidence < 80
    ).length;
    score -= lowConfidenceDocs * 5;

    return Math.max(0, Math.min(100, score));
  }
}

export default new ApplicationService();
