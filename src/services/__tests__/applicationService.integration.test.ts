/**
 * Application Service Integration Tests
 * Tests complete application submission workflow, eligibility scoring, and state transitions
 */

import applicationService from '../applicationService';
import applicationRepository from '../../repositories/applicationRepository';
import programRuleRepository from '../../repositories/programRuleRepository';
import documentRepository from '../../repositories/documentRepository';
import auditLogRepository from '../../repositories/auditLogRepository';
import redisClient from '../../config/redis';
import { ApplicationStatus } from '../../models/application';
import { DocumentType } from '../../models/document';

// Mock dependencies
jest.mock('../../repositories/applicationRepository');
jest.mock('../../repositories/programRuleRepository');
jest.mock('../../repositories/documentRepository');
jest.mock('../../repositories/auditLogRepository');
jest.mock('../../config/redis');
jest.mock('../../utils/logger');

describe('ApplicationService Integration Tests', () => {
  const mockUserId = 'user-123';
  const mockApplicantId = 'applicant-456';
  const mockApplicationId = 'app-789';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Redis client
    (redisClient.get as jest.Mock).mockResolvedValue(null);
    (redisClient.set as jest.Mock).mockResolvedValue('OK');
    
    // Mock audit log creation
    (auditLogRepository.create as jest.Mock).mockResolvedValue({});
  });

  describe('Complete Application Submission Workflow', () => {
    it('should successfully submit a complete application with all required documents', async () => {
      // Setup: Create application
      const mockApplication = {
        id: mockApplicationId,
        applicantId: mockApplicantId,
        programType: 'MICRO_LOAN',
        requestedAmount: 25000,
        status: ApplicationStatus.DRAFT,
        missingDocuments: [],
        fraudFlags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockProgramRule = {
        id: 'rule-1',
        programType: 'MICRO_LOAN',
        programName: 'Micro Business Loan Program',
        version: 1,
        rules: {
          fundingRange: { min: 5000, max: 50000 },
          requiredDocuments: ['W9', 'EIN_VERIFICATION', 'BANK_STATEMENT'],
          eligibilityCriteria: [
            {
              field: 'requestedAmount',
              operator: '<=',
              value: 50000,
              description: 'Requested amount must not exceed $50,000',
              weight: 30,
            },
            {
              field: 'hasValidEIN',
              operator: '==',
              value: true,
              description: 'Must have valid EIN verification',
              weight: 40,
            },
          ],
          passingScore: 70,
        },
        activeFrom: new Date(),
        activeTo: null,
      };

      const mockDocuments = [
        {
          id: 'doc-1',
          applicationId: mockApplicationId,
          documentType: DocumentType.W9,
          classificationConfidence: 95,
          requiresManualReview: false,
          extractedData: { ein: '12-3456789', businessName: 'Test Business' },
        },
        {
          id: 'doc-2',
          applicationId: mockApplicationId,
          documentType: DocumentType.EIN_VERIFICATION,
          classificationConfidence: 98,
          requiresManualReview: false,
          extractedData: {},
        },
        {
          id: 'doc-3',
          applicationId: mockApplicationId,
          documentType: DocumentType.BANK_STATEMENT,
          classificationConfidence: 92,
          requiresManualReview: false,
          extractedData: { balance: 10000 },
        },
      ];

      // Mock repository responses
      (applicationRepository.findById as jest.Mock).mockResolvedValue(mockApplication);
      (programRuleRepository.findActiveByProgramType as jest.Mock).mockResolvedValue(mockProgramRule);
      (documentRepository.findByApplicationId as jest.Mock).mockResolvedValue(mockDocuments);
      (applicationRepository.updateStatus as jest.Mock).mockResolvedValue({
        ...mockApplication,
        status: ApplicationStatus.SUBMITTED,
        submittedAt: new Date(),
      });
      (applicationRepository.updateEligibilityScore as jest.Mock).mockResolvedValue(mockApplication);
      (applicationRepository.updateMissingDocuments as jest.Mock).mockResolvedValue(mockApplication);

      // Execute: Submit application
      const result = await applicationService.submitApplication(mockApplicationId, mockUserId);

      // Verify: Application was submitted successfully
      expect(result.status).toBe(ApplicationStatus.SUBMITTED);
      expect(applicationRepository.updateStatus).toHaveBeenCalledWith(
        mockApplicationId,
        ApplicationStatus.SUBMITTED
      );
      expect(applicationRepository.updateEligibilityScore).toHaveBeenCalled();
      expect(auditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: 'APPLICATION_SUBMITTED',
          entityId: mockApplicationId,
          performedBy: mockUserId,
        })
      );
    });

    it('should flag application as PENDING_DOCUMENTS when required documents are missing', async () => {
      const mockApplication = {
        id: mockApplicationId,
        applicantId: mockApplicantId,
        programType: 'MICRO_LOAN',
        requestedAmount: 25000,
        status: ApplicationStatus.DRAFT,
        missingDocuments: [],
        fraudFlags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockProgramRule = {
        id: 'rule-1',
        programType: 'MICRO_LOAN',
        programName: 'Micro Business Loan Program',
        version: 1,
        rules: {
          fundingRange: { min: 5000, max: 50000 },
          requiredDocuments: ['W9', 'EIN_VERIFICATION', 'BANK_STATEMENT'],
          eligibilityCriteria: [],
          passingScore: 70,
        },
        activeFrom: new Date(),
        activeTo: null,
      };

      // Only W9 document uploaded, missing EIN_VERIFICATION and BANK_STATEMENT
      const mockDocuments = [
        {
          id: 'doc-1',
          applicationId: mockApplicationId,
          documentType: DocumentType.W9,
          classificationConfidence: 95,
          requiresManualReview: false,
          extractedData: { ein: '12-3456789' },
        },
      ];

      (applicationRepository.findById as jest.Mock).mockResolvedValue(mockApplication);
      (programRuleRepository.findActiveByProgramType as jest.Mock).mockResolvedValue(mockProgramRule);
      (documentRepository.findByApplicationId as jest.Mock).mockResolvedValue(mockDocuments);
      (applicationRepository.updateStatus as jest.Mock).mockResolvedValue({
        ...mockApplication,
        status: ApplicationStatus.PENDING_DOCUMENTS,
      });
      (applicationRepository.updateMissingDocuments as jest.Mock).mockResolvedValue(mockApplication);
      (applicationRepository.updateEligibilityScore as jest.Mock).mockResolvedValue(mockApplication);

      const result = await applicationService.submitApplication(mockApplicationId, mockUserId);

      expect(result.status).toBe(ApplicationStatus.PENDING_DOCUMENTS);
      expect(applicationRepository.updateMissingDocuments).toHaveBeenCalledWith(
        mockApplicationId,
        expect.arrayContaining(['EIN_VERIFICATION', 'BANK_STATEMENT'])
      );
    });

    it('should calculate eligibility score during submission', async () => {
      const mockApplication = {
        id: mockApplicationId,
        applicantId: mockApplicantId,
        programType: 'MICRO_LOAN',
        requestedAmount: 25000,
        status: ApplicationStatus.DRAFT,
        missingDocuments: [],
        fraudFlags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockProgramRule = {
        id: 'rule-1',
        programType: 'MICRO_LOAN',
        programName: 'Micro Business Loan Program',
        version: 1,
        rules: {
          fundingRange: { min: 5000, max: 50000 },
          requiredDocuments: ['W9'],
          eligibilityCriteria: [
            {
              field: 'requestedAmount',
              operator: '<=',
              value: 50000,
              description: 'Amount within limit',
              weight: 100,
            },
          ],
          passingScore: 70,
        },
        activeFrom: new Date(),
        activeTo: null,
      };

      const mockDocuments = [
        {
          id: 'doc-1',
          applicationId: mockApplicationId,
          documentType: DocumentType.W9,
          classificationConfidence: 95,
          requiresManualReview: false,
          extractedData: {},
        },
      ];

      (applicationRepository.findById as jest.Mock).mockResolvedValue(mockApplication);
      (programRuleRepository.findActiveByProgramType as jest.Mock).mockResolvedValue(mockProgramRule);
      (documentRepository.findByApplicationId as jest.Mock).mockResolvedValue(mockDocuments);
      (applicationRepository.updateStatus as jest.Mock).mockResolvedValue(mockApplication);
      (applicationRepository.updateMissingDocuments as jest.Mock).mockResolvedValue(mockApplication);
      (applicationRepository.updateEligibilityScore as jest.Mock).mockResolvedValue(mockApplication);

      await applicationService.submitApplication(mockApplicationId, mockUserId);

      expect(applicationRepository.updateEligibilityScore).toHaveBeenCalledWith(
        mockApplicationId,
        expect.any(Number)
      );
      expect(auditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: 'ELIGIBILITY_CALCULATED',
        })
      );
    });
  });

  describe('Eligibility Scoring with Various Program Rules', () => {
    it('should pass eligibility when all criteria are met', async () => {
      const mockApplication = {
        id: mockApplicationId,
        applicantId: mockApplicantId,
        programType: 'MICRO_LOAN',
        requestedAmount: 25000,
        status: ApplicationStatus.SUBMITTED,
        missingDocuments: [],
        fraudFlags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockProgramRule = {
        id: 'rule-1',
        programType: 'MICRO_LOAN',
        programName: 'Micro Business Loan Program',
        version: 1,
        rules: {
          fundingRange: { min: 5000, max: 50000 },
          requiredDocuments: ['W9'],
          eligibilityCriteria: [
            {
              field: 'requestedAmount',
              operator: '<=',
              value: 50000,
              description: 'Amount within limit',
              weight: 50,
            },
            {
              field: 'hasValidEIN',
              operator: '==',
              value: true,
              description: 'Valid EIN required',
              weight: 50,
            },
          ],
          passingScore: 70,
        },
        activeFrom: new Date(),
        activeTo: null,
      };

      const mockDocuments = [
        {
          id: 'doc-1',
          applicationId: mockApplicationId,
          documentType: DocumentType.EIN_VERIFICATION,
          classificationConfidence: 95,
          requiresManualReview: false,
          extractedData: { ein: '12-3456789' },
        },
      ];

      (applicationRepository.findById as jest.Mock).mockResolvedValue(mockApplication);
      (programRuleRepository.findActiveByProgramType as jest.Mock).mockResolvedValue(mockProgramRule);
      (documentRepository.findByApplicationId as jest.Mock).mockResolvedValue(mockDocuments);

      const result = await applicationService.calculateEligibility(mockApplicationId);

      expect(result.score).toBe(100);
      expect(result.passed).toBe(true);
      expect(result.reasons).toHaveLength(0);
      expect(result.programRulesApplied).toContain('Micro Business Loan Program');
    });

    it('should fail eligibility when criteria are not met', async () => {
      const mockApplication = {
        id: mockApplicationId,
        applicantId: mockApplicantId,
        programType: 'MICRO_LOAN',
        requestedAmount: 75000, // Exceeds limit
        status: ApplicationStatus.SUBMITTED,
        missingDocuments: [],
        fraudFlags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockProgramRule = {
        id: 'rule-1',
        programType: 'MICRO_LOAN',
        programName: 'Micro Business Loan Program',
        version: 1,
        rules: {
          fundingRange: { min: 5000, max: 50000 },
          requiredDocuments: ['W9'],
          eligibilityCriteria: [
            {
              field: 'requestedAmount',
              operator: '<=',
              value: 50000,
              description: 'Amount must not exceed $50,000',
              weight: 100,
            },
          ],
          passingScore: 70,
        },
        activeFrom: new Date(),
        activeTo: null,
      };

      const mockDocuments: any[] = [];

      (applicationRepository.findById as jest.Mock).mockResolvedValue(mockApplication);
      (programRuleRepository.findActiveByProgramType as jest.Mock).mockResolvedValue(mockProgramRule);
      (documentRepository.findByApplicationId as jest.Mock).mockResolvedValue(mockDocuments);

      const result = await applicationService.calculateEligibility(mockApplicationId);

      expect(result.score).toBe(0);
      expect(result.passed).toBe(false);
      expect(result.reasons).toContain('Amount must not exceed $50,000');
    });

    it('should calculate partial score when some criteria pass and others fail', async () => {
      const mockApplication = {
        id: mockApplicationId,
        applicantId: mockApplicantId,
        programType: 'MICRO_LOAN',
        requestedAmount: 25000,
        status: ApplicationStatus.SUBMITTED,
        missingDocuments: [],
        fraudFlags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockProgramRule = {
        id: 'rule-1',
        programType: 'MICRO_LOAN',
        programName: 'Micro Business Loan Program',
        version: 1,
        rules: {
          fundingRange: { min: 5000, max: 50000 },
          requiredDocuments: ['W9'],
          eligibilityCriteria: [
            {
              field: 'requestedAmount',
              operator: '<=',
              value: 50000,
              description: 'Amount within limit',
              weight: 60,
            },
            {
              field: 'hasValidEIN',
              operator: '==',
              value: true,
              description: 'Valid EIN required',
              weight: 40,
            },
          ],
          passingScore: 70,
        },
        activeFrom: new Date(),
        activeTo: null,
      };

      // No EIN verification document
      const mockDocuments: any[] = [];

      (applicationRepository.findById as jest.Mock).mockResolvedValue(mockApplication);
      (programRuleRepository.findActiveByProgramType as jest.Mock).mockResolvedValue(mockProgramRule);
      (documentRepository.findByApplicationId as jest.Mock).mockResolvedValue(mockDocuments);

      const result = await applicationService.calculateEligibility(mockApplicationId);

      expect(result.score).toBe(60); // Only first criterion passed
      expect(result.passed).toBe(false); // Below 70% threshold
      expect(result.reasons).toContain('Valid EIN required');
    });

    it('should handle multiple eligibility criteria with different operators', async () => {
      const mockApplication = {
        id: mockApplicationId,
        applicantId: mockApplicantId,
        programType: 'ADVANCED_LOAN',
        requestedAmount: 30000,
        status: ApplicationStatus.SUBMITTED,
        missingDocuments: [],
        fraudFlags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockProgramRule = {
        id: 'rule-2',
        programType: 'ADVANCED_LOAN',
        programName: 'Advanced Business Loan',
        version: 1,
        rules: {
          fundingRange: { min: 10000, max: 100000 },
          requiredDocuments: ['W9', 'BANK_STATEMENT'],
          eligibilityCriteria: [
            {
              field: 'requestedAmount',
              operator: '>=',
              value: 10000,
              description: 'Minimum amount $10,000',
              weight: 25,
            },
            {
              field: 'requestedAmount',
              operator: '<=',
              value: 100000,
              description: 'Maximum amount $100,000',
              weight: 25,
            },
            {
              field: 'balance',
              operator: '>',
              value: 5000,
              description: 'Bank balance must exceed $5,000',
              weight: 50,
            },
          ],
          passingScore: 75,
        },
        activeFrom: new Date(),
        activeTo: null,
      };

      const mockDocuments = [
        {
          id: 'doc-1',
          applicationId: mockApplicationId,
          documentType: DocumentType.BANK_STATEMENT,
          classificationConfidence: 90,
          requiresManualReview: false,
          extractedData: { balance: 15000 },
        },
      ];

      (applicationRepository.findById as jest.Mock).mockResolvedValue(mockApplication);
      (programRuleRepository.findActiveByProgramType as jest.Mock).mockResolvedValue(mockProgramRule);
      (documentRepository.findByApplicationId as jest.Mock).mockResolvedValue(mockDocuments);

      const result = await applicationService.calculateEligibility(mockApplicationId);

      expect(result.score).toBe(100);
      expect(result.passed).toBe(true);
      expect(result.criteriaResults).toHaveLength(3);
      expect(result.criteriaResults?.every(c => c.passed)).toBe(true);
    });

    it('should reduce confidence score when documents require manual review', async () => {
      const mockApplication = {
        id: mockApplicationId,
        applicantId: mockApplicantId,
        programType: 'MICRO_LOAN',
        requestedAmount: 25000,
        status: ApplicationStatus.SUBMITTED,
        missingDocuments: [],
        fraudFlags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockProgramRule = {
        id: 'rule-1',
        programType: 'MICRO_LOAN',
        programName: 'Micro Business Loan Program',
        version: 1,
        rules: {
          fundingRange: { min: 5000, max: 50000 },
          requiredDocuments: ['W9'],
          eligibilityCriteria: [
            {
              field: 'requestedAmount',
              operator: '<=',
              value: 50000,
              description: 'Amount within limit',
              weight: 100,
            },
          ],
          passingScore: 70,
        },
        activeFrom: new Date(),
        activeTo: null,
      };

      const mockDocuments = [
        {
          id: 'doc-1',
          applicationId: mockApplicationId,
          documentType: DocumentType.W9,
          classificationConfidence: 65, // Low confidence
          requiresManualReview: true,
          extractedData: {},
        },
      ];

      (applicationRepository.findById as jest.Mock).mockResolvedValue(mockApplication);
      (programRuleRepository.findActiveByProgramType as jest.Mock).mockResolvedValue(mockProgramRule);
      (documentRepository.findByApplicationId as jest.Mock).mockResolvedValue(mockDocuments);

      const result = await applicationService.calculateEligibility(mockApplicationId);

      expect(result.confidenceScore).toBeLessThan(100);
      expect(auditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: 'ELIGIBILITY_CALCULATED',
          confidenceScore: expect.any(Number),
        })
      );
    });
  });

  describe('State Machine Transitions and Validation', () => {
    it('should allow valid transition from DRAFT to SUBMITTED', async () => {
      const mockApplication = {
        id: mockApplicationId,
        applicantId: mockApplicantId,
        programType: 'MICRO_LOAN',
        requestedAmount: 25000,
        status: ApplicationStatus.DRAFT,
        missingDocuments: [],
        fraudFlags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (applicationRepository.findById as jest.Mock).mockResolvedValue(mockApplication);
      (applicationRepository.update as jest.Mock).mockResolvedValue({
        ...mockApplication,
        status: ApplicationStatus.SUBMITTED,
      });

      const result = await applicationService.updateApplication(
        mockApplicationId,
        { status: ApplicationStatus.SUBMITTED },
        mockUserId
      );

      expect(result.status).toBe(ApplicationStatus.SUBMITTED);
      expect(auditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: 'APPLICATION_UPDATED',
          details: expect.objectContaining({
            previousStatus: ApplicationStatus.DRAFT,
            newStatus: ApplicationStatus.SUBMITTED,
          }),
        })
      );
    });

    it('should allow valid transition from SUBMITTED to UNDER_REVIEW', async () => {
      const mockApplication = {
        id: mockApplicationId,
        applicantId: mockApplicantId,
        programType: 'MICRO_LOAN',
        requestedAmount: 25000,
        status: ApplicationStatus.SUBMITTED,
        missingDocuments: [],
        fraudFlags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (applicationRepository.findById as jest.Mock).mockResolvedValue(mockApplication);
      (applicationRepository.update as jest.Mock).mockResolvedValue({
        ...mockApplication,
        status: ApplicationStatus.UNDER_REVIEW,
      });

      const result = await applicationService.updateApplication(
        mockApplicationId,
        { status: ApplicationStatus.UNDER_REVIEW },
        mockUserId
      );

      expect(result.status).toBe(ApplicationStatus.UNDER_REVIEW);
    });

    it('should allow valid transition from UNDER_REVIEW to APPROVED', async () => {
      const mockApplication = {
        id: mockApplicationId,
        applicantId: mockApplicantId,
        programType: 'MICRO_LOAN',
        requestedAmount: 25000,
        status: ApplicationStatus.UNDER_REVIEW,
        missingDocuments: [],
        fraudFlags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (applicationRepository.findById as jest.Mock).mockResolvedValue(mockApplication);
      (applicationRepository.update as jest.Mock).mockResolvedValue({
        ...mockApplication,
        status: ApplicationStatus.APPROVED,
      });

      const result = await applicationService.updateApplication(
        mockApplicationId,
        { status: ApplicationStatus.APPROVED },
        mockUserId
      );

      expect(result.status).toBe(ApplicationStatus.APPROVED);
    });

    it('should reject invalid transition from DRAFT to APPROVED', async () => {
      const mockApplication = {
        id: mockApplicationId,
        applicantId: mockApplicantId,
        programType: 'MICRO_LOAN',
        requestedAmount: 25000,
        status: ApplicationStatus.DRAFT,
        missingDocuments: [],
        fraudFlags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (applicationRepository.findById as jest.Mock).mockResolvedValue(mockApplication);

      await expect(
        applicationService.updateApplication(
          mockApplicationId,
          { status: ApplicationStatus.APPROVED },
          mockUserId
        )
      ).rejects.toThrow('Invalid status transition from DRAFT to APPROVED');

      expect(applicationRepository.update).not.toHaveBeenCalled();
    });

    it('should reject invalid transition from APPROVED to any other status', async () => {
      const mockApplication = {
        id: mockApplicationId,
        applicantId: mockApplicantId,
        programType: 'MICRO_LOAN',
        requestedAmount: 25000,
        status: ApplicationStatus.APPROVED,
        missingDocuments: [],
        fraudFlags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (applicationRepository.findById as jest.Mock).mockResolvedValue(mockApplication);

      await expect(
        applicationService.updateApplication(
          mockApplicationId,
          { status: ApplicationStatus.UNDER_REVIEW },
          mockUserId
        )
      ).rejects.toThrow('Invalid status transition from APPROVED to UNDER_REVIEW');
    });

    it('should allow transition from PENDING_DOCUMENTS to SUBMITTED', async () => {
      const mockApplication = {
        id: mockApplicationId,
        applicantId: mockApplicantId,
        programType: 'MICRO_LOAN',
        requestedAmount: 25000,
        status: ApplicationStatus.PENDING_DOCUMENTS,
        missingDocuments: ['EIN_VERIFICATION'],
        fraudFlags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (applicationRepository.findById as jest.Mock).mockResolvedValue(mockApplication);
      (applicationRepository.update as jest.Mock).mockResolvedValue({
        ...mockApplication,
        status: ApplicationStatus.SUBMITTED,
      });

      const result = await applicationService.updateApplication(
        mockApplicationId,
        { status: ApplicationStatus.SUBMITTED },
        mockUserId
      );

      expect(result.status).toBe(ApplicationStatus.SUBMITTED);
    });

    it('should allow transition from DEFERRED to UNDER_REVIEW', async () => {
      const mockApplication = {
        id: mockApplicationId,
        applicantId: mockApplicantId,
        programType: 'MICRO_LOAN',
        requestedAmount: 25000,
        status: ApplicationStatus.DEFERRED,
        missingDocuments: [],
        fraudFlags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (applicationRepository.findById as jest.Mock).mockResolvedValue(mockApplication);
      (applicationRepository.update as jest.Mock).mockResolvedValue({
        ...mockApplication,
        status: ApplicationStatus.UNDER_REVIEW,
      });

      const result = await applicationService.updateApplication(
        mockApplicationId,
        { status: ApplicationStatus.UNDER_REVIEW },
        mockUserId
      );

      expect(result.status).toBe(ApplicationStatus.UNDER_REVIEW);
    });

    it('should emit statusChanged event when status changes', async () => {
      const mockApplication = {
        id: mockApplicationId,
        applicantId: mockApplicantId,
        programType: 'MICRO_LOAN',
        requestedAmount: 25000,
        status: ApplicationStatus.SUBMITTED,
        missingDocuments: [],
        fraudFlags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedApplication = {
        ...mockApplication,
        status: ApplicationStatus.UNDER_REVIEW,
      };

      (applicationRepository.findById as jest.Mock).mockResolvedValue(mockApplication);
      (applicationRepository.update as jest.Mock).mockResolvedValue(updatedApplication);

      const eventSpy = jest.fn();
      applicationService.on('statusChanged', eventSpy);

      await applicationService.updateApplication(
        mockApplicationId,
        { status: ApplicationStatus.UNDER_REVIEW },
        mockUserId
      );

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          applicationId: mockApplicationId,
          previousStatus: ApplicationStatus.SUBMITTED,
          newStatus: ApplicationStatus.UNDER_REVIEW,
          application: updatedApplication,
        })
      );

      applicationService.removeListener('statusChanged', eventSpy);
    });
  });

  describe('Application Creation and Validation', () => {
    it('should create application with valid data', async () => {
      const createRequest = {
        applicantId: mockApplicantId,
        programType: 'MICRO_LOAN',
        requestedAmount: 25000,
      };

      const mockProgramRule = {
        id: 'rule-1',
        programType: 'MICRO_LOAN',
        programName: 'Micro Business Loan Program',
        version: 1,
        rules: {
          fundingRange: { min: 5000, max: 50000 },
          requiredDocuments: ['W9'],
          eligibilityCriteria: [],
          passingScore: 70,
        },
        activeFrom: new Date(),
        activeTo: null,
      };

      const mockApplication = {
        id: mockApplicationId,
        ...createRequest,
        status: ApplicationStatus.DRAFT,
        missingDocuments: [],
        fraudFlags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (programRuleRepository.findActiveByProgramType as jest.Mock).mockResolvedValue(mockProgramRule);
      (applicationRepository.create as jest.Mock).mockResolvedValue(mockApplication);

      const result = await applicationService.createApplication(createRequest, mockUserId);

      expect(result.id).toBe(mockApplicationId);
      expect(result.status).toBe(ApplicationStatus.DRAFT);
      expect(applicationRepository.create).toHaveBeenCalledWith(createRequest);
      expect(auditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: 'APPLICATION_CREATED',
          performedBy: mockUserId,
        })
      );
    });

    it('should reject application with invalid program type', async () => {
      const createRequest = {
        applicantId: mockApplicantId,
        programType: 'INVALID_PROGRAM',
        requestedAmount: 25000,
      };

      (programRuleRepository.findActiveByProgramType as jest.Mock).mockResolvedValue(null);

      await expect(
        applicationService.createApplication(createRequest, mockUserId)
      ).rejects.toThrow('Invalid program type: INVALID_PROGRAM');

      expect(applicationRepository.create).not.toHaveBeenCalled();
    });

    it('should reject application with amount below minimum', async () => {
      const createRequest = {
        applicantId: mockApplicantId,
        programType: 'MICRO_LOAN',
        requestedAmount: 1000, // Below minimum
      };

      const mockProgramRule = {
        id: 'rule-1',
        programType: 'MICRO_LOAN',
        programName: 'Micro Business Loan Program',
        version: 1,
        rules: {
          fundingRange: { min: 5000, max: 50000 },
          requiredDocuments: ['W9'],
          eligibilityCriteria: [],
          passingScore: 70,
        },
        activeFrom: new Date(),
        activeTo: null,
      };

      (programRuleRepository.findActiveByProgramType as jest.Mock).mockResolvedValue(mockProgramRule);

      await expect(
        applicationService.createApplication(createRequest, mockUserId)
      ).rejects.toThrow('Requested amount must be between');

      expect(applicationRepository.create).not.toHaveBeenCalled();
    });

    it('should reject application with amount above maximum', async () => {
      const createRequest = {
        applicantId: mockApplicantId,
        programType: 'MICRO_LOAN',
        requestedAmount: 75000, // Above maximum
      };

      const mockProgramRule = {
        id: 'rule-1',
        programType: 'MICRO_LOAN',
        programName: 'Micro Business Loan Program',
        version: 1,
        rules: {
          fundingRange: { min: 5000, max: 50000 },
          requiredDocuments: ['W9'],
          eligibilityCriteria: [],
          passingScore: 70,
        },
        activeFrom: new Date(),
        activeTo: null,
      };

      (programRuleRepository.findActiveByProgramType as jest.Mock).mockResolvedValue(mockProgramRule);

      await expect(
        applicationService.createApplication(createRequest, mockUserId)
      ).rejects.toThrow('Requested amount must be between');
    });

    it('should reject application with zero or negative amount', async () => {
      const createRequest = {
        applicantId: mockApplicantId,
        programType: 'MICRO_LOAN',
        requestedAmount: 0,
      };

      await expect(
        applicationService.createApplication(createRequest, mockUserId)
      ).rejects.toThrow('Requested amount must be greater than zero');
    });
  });

  describe('Missing Document Detection', () => {
    it('should detect all missing required documents', async () => {
      const mockApplication = {
        id: mockApplicationId,
        applicantId: mockApplicantId,
        programType: 'MICRO_LOAN',
        requestedAmount: 25000,
        status: ApplicationStatus.DRAFT,
        missingDocuments: [],
        fraudFlags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockProgramRule = {
        id: 'rule-1',
        programType: 'MICRO_LOAN',
        programName: 'Micro Business Loan Program',
        version: 1,
        rules: {
          fundingRange: { min: 5000, max: 50000 },
          requiredDocuments: ['W9', 'EIN_VERIFICATION', 'BANK_STATEMENT'],
          eligibilityCriteria: [],
          passingScore: 70,
        },
        activeFrom: new Date(),
        activeTo: null,
      };

      const mockDocuments: any[] = []; // No documents uploaded

      (applicationRepository.findById as jest.Mock).mockResolvedValue(mockApplication);
      (programRuleRepository.findActiveByProgramType as jest.Mock).mockResolvedValue(mockProgramRule);
      (documentRepository.findByApplicationId as jest.Mock).mockResolvedValue(mockDocuments);

      const result = await applicationService.detectMissingDocuments(mockApplicationId);

      expect(result).toEqual(['W9', 'EIN_VERIFICATION', 'BANK_STATEMENT']);
    });

    it('should return empty array when all documents are present', async () => {
      const mockApplication = {
        id: mockApplicationId,
        applicantId: mockApplicantId,
        programType: 'MICRO_LOAN',
        requestedAmount: 25000,
        status: ApplicationStatus.DRAFT,
        missingDocuments: [],
        fraudFlags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockProgramRule = {
        id: 'rule-1',
        programType: 'MICRO_LOAN',
        programName: 'Micro Business Loan Program',
        version: 1,
        rules: {
          fundingRange: { min: 5000, max: 50000 },
          requiredDocuments: ['W9', 'EIN_VERIFICATION'],
          eligibilityCriteria: [],
          passingScore: 70,
        },
        activeFrom: new Date(),
        activeTo: null,
      };

      const mockDocuments = [
        {
          id: 'doc-1',
          applicationId: mockApplicationId,
          documentType: DocumentType.W9,
        },
        {
          id: 'doc-2',
          applicationId: mockApplicationId,
          documentType: DocumentType.EIN_VERIFICATION,
        },
      ];

      (applicationRepository.findById as jest.Mock).mockResolvedValue(mockApplication);
      (programRuleRepository.findActiveByProgramType as jest.Mock).mockResolvedValue(mockProgramRule);
      (documentRepository.findByApplicationId as jest.Mock).mockResolvedValue(mockDocuments);

      const result = await applicationService.detectMissingDocuments(mockApplicationId);

      expect(result).toEqual([]);
    });
  });
});
