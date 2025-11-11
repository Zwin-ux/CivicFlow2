/**
 * Reporting Service Unit Tests
 * Tests for dashboard metrics, report generation, and data formatting
 */

import reportingService from '../reportingService';
import reportingRepository from '../../repositories/reportingRepository';
import redisClient from '../../config/redis';
import { ApplicationStatus } from '../../models/application';
import {
  DashboardFilters,
  DashboardData,
  ReportFilters,
  ComplianceSummaryData,
} from '../../models/reporting';

// Mock dependencies
jest.mock('../../repositories/reportingRepository');
jest.mock('../../config/redis');
jest.mock('../../utils/logger');

describe('ReportingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getDashboardMetrics - Dashboard Metric Calculations', () => {
    const mockFilters: DashboardFilters = {
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      programType: 'MICRO_LOAN',
    };

    it('should calculate dashboard metrics correctly with sample data', async () => {
      const mockTotalApplications = 150;
      const mockApprovalRate = 65.5;
      const mockAvgProcessingTime = 48.75;
      const mockClassificationAccuracy = 96.8;
      const mockApplicationsByStatus = {
        [ApplicationStatus.DRAFT]: 10,
        [ApplicationStatus.SUBMITTED]: 20,
        [ApplicationStatus.UNDER_REVIEW]: 15,
        [ApplicationStatus.PENDING_DOCUMENTS]: 5,
        [ApplicationStatus.APPROVED]: 80,
        [ApplicationStatus.REJECTED]: 15,
        [ApplicationStatus.DEFERRED]: 5,
      };
      const mockTrendsOverTime = [
        { date: '2024-01-15', value: 10, label: 'Applications' },
        { date: '2024-01-16', value: 12, label: 'Applications' },
      ];

      (redisClient.get as jest.Mock).mockResolvedValue(null);
      (reportingRepository.getTotalApplications as jest.Mock).mockResolvedValue(
        mockTotalApplications
      );
      (reportingRepository.getApprovalRate as jest.Mock).mockResolvedValue(mockApprovalRate);
      (reportingRepository.getAverageProcessingTime as jest.Mock).mockResolvedValue(
        mockAvgProcessingTime
      );
      (reportingRepository.getDocumentClassificationAccuracy as jest.Mock).mockResolvedValue(
        mockClassificationAccuracy
      );
      (reportingRepository.getApplicationsByStatus as jest.Mock).mockResolvedValue(
        mockApplicationsByStatus
      );
      (reportingRepository.getTrendsOverTime as jest.Mock).mockResolvedValue(mockTrendsOverTime);
      (redisClient.set as jest.Mock).mockResolvedValue('OK');

      const result = await reportingService.getDashboardMetrics(mockFilters);

      expect(result.totalApplications).toBe(150);
      expect(result.approvalRate).toBe(65.5);
      expect(result.averageProcessingTime).toBe(48.75);
      expect(result.documentClassificationAccuracy).toBe(96.8);
      expect(result.applicationsByStatus).toEqual(mockApplicationsByStatus);
      expect(result.trendsOverTime).toEqual(mockTrendsOverTime);
    });

    it('should round metrics to 2 decimal places', async () => {
      (redisClient.get as jest.Mock).mockResolvedValue(null);
      (reportingRepository.getTotalApplications as jest.Mock).mockResolvedValue(100);
      (reportingRepository.getApprovalRate as jest.Mock).mockResolvedValue(66.66666);
      (reportingRepository.getAverageProcessingTime as jest.Mock).mockResolvedValue(45.12345);
      (reportingRepository.getDocumentClassificationAccuracy as jest.Mock).mockResolvedValue(
        95.98765
      );
      (reportingRepository.getApplicationsByStatus as jest.Mock).mockResolvedValue({
        [ApplicationStatus.DRAFT]: 0,
        [ApplicationStatus.SUBMITTED]: 0,
        [ApplicationStatus.UNDER_REVIEW]: 0,
        [ApplicationStatus.PENDING_DOCUMENTS]: 0,
        [ApplicationStatus.APPROVED]: 0,
        [ApplicationStatus.REJECTED]: 0,
        [ApplicationStatus.DEFERRED]: 0,
      });
      (reportingRepository.getTrendsOverTime as jest.Mock).mockResolvedValue([]);
      (redisClient.set as jest.Mock).mockResolvedValue('OK');

      const result = await reportingService.getDashboardMetrics(mockFilters);

      expect(result.approvalRate).toBe(66.67);
      expect(result.averageProcessingTime).toBe(45.12);
      expect(result.documentClassificationAccuracy).toBe(95.99);
    });

    it('should retrieve metrics from cache when available', async () => {
      const cachedData: DashboardData = {
        totalApplications: 100,
        approvalRate: 70.0,
        averageProcessingTime: 40.0,
        documentClassificationAccuracy: 97.0,
        applicationsByStatus: {
          [ApplicationStatus.DRAFT]: 5,
          [ApplicationStatus.SUBMITTED]: 10,
          [ApplicationStatus.UNDER_REVIEW]: 10,
          [ApplicationStatus.PENDING_DOCUMENTS]: 5,
          [ApplicationStatus.APPROVED]: 60,
          [ApplicationStatus.REJECTED]: 8,
          [ApplicationStatus.DEFERRED]: 2,
        },
        trendsOverTime: [],
      };

      (redisClient.get as jest.Mock).mockResolvedValue(JSON.stringify(cachedData));

      const result = await reportingService.getDashboardMetrics(mockFilters);

      expect(result).toEqual(cachedData);
      expect(reportingRepository.getTotalApplications).not.toHaveBeenCalled();
      expect(redisClient.get).toHaveBeenCalled();
    });

    it('should cache dashboard metrics with 5-minute TTL', async () => {
      (redisClient.get as jest.Mock).mockResolvedValue(null);
      (reportingRepository.getTotalApplications as jest.Mock).mockResolvedValue(50);
      (reportingRepository.getApprovalRate as jest.Mock).mockResolvedValue(60.0);
      (reportingRepository.getAverageProcessingTime as jest.Mock).mockResolvedValue(35.0);
      (reportingRepository.getDocumentClassificationAccuracy as jest.Mock).mockResolvedValue(95.0);
      (reportingRepository.getApplicationsByStatus as jest.Mock).mockResolvedValue({
        [ApplicationStatus.DRAFT]: 0,
        [ApplicationStatus.SUBMITTED]: 0,
        [ApplicationStatus.UNDER_REVIEW]: 0,
        [ApplicationStatus.PENDING_DOCUMENTS]: 0,
        [ApplicationStatus.APPROVED]: 0,
        [ApplicationStatus.REJECTED]: 0,
        [ApplicationStatus.DEFERRED]: 0,
      });
      (reportingRepository.getTrendsOverTime as jest.Mock).mockResolvedValue([]);
      (redisClient.set as jest.Mock).mockResolvedValue('OK');

      await reportingService.getDashboardMetrics(mockFilters);

      expect(redisClient.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        300 // 5 minutes in seconds
      );
    });

    it('should handle empty filters', async () => {
      const emptyFilters: DashboardFilters = {};

      (redisClient.get as jest.Mock).mockResolvedValue(null);
      (reportingRepository.getTotalApplications as jest.Mock).mockResolvedValue(200);
      (reportingRepository.getApprovalRate as jest.Mock).mockResolvedValue(55.0);
      (reportingRepository.getAverageProcessingTime as jest.Mock).mockResolvedValue(50.0);
      (reportingRepository.getDocumentClassificationAccuracy as jest.Mock).mockResolvedValue(94.0);
      (reportingRepository.getApplicationsByStatus as jest.Mock).mockResolvedValue({
        [ApplicationStatus.DRAFT]: 20,
        [ApplicationStatus.SUBMITTED]: 30,
        [ApplicationStatus.UNDER_REVIEW]: 25,
        [ApplicationStatus.PENDING_DOCUMENTS]: 10,
        [ApplicationStatus.APPROVED]: 100,
        [ApplicationStatus.REJECTED]: 10,
        [ApplicationStatus.DEFERRED]: 5,
      });
      (reportingRepository.getTrendsOverTime as jest.Mock).mockResolvedValue([]);
      (redisClient.set as jest.Mock).mockResolvedValue('OK');

      const result = await reportingService.getDashboardMetrics(emptyFilters);

      expect(result.totalApplications).toBe(200);
      expect(reportingRepository.getTotalApplications).toHaveBeenCalledWith(emptyFilters);
    });

    it('should throw error when repository fails', async () => {
      (redisClient.get as jest.Mock).mockResolvedValue(null);
      (reportingRepository.getTotalApplications as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await expect(reportingService.getDashboardMetrics(mockFilters)).rejects.toThrow(
        'Failed to get dashboard metrics'
      );
    });
  });

  describe('generateEligibilityReport - Report Formatting and Data Accuracy', () => {
    const mockFilters: ReportFilters = {
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      programType: 'MICRO_LOAN',
    };

    it('should generate eligibility report with correct structure', async () => {
      const mockApplications = [
        {
          id: 'app-1',
          applicantName: 'Business A LLC',
          eligibilityScore: 85.5,
          decision: 'APPROVED',
          decidedBy: 'staff-123',
          decidedAt: new Date('2024-06-15'),
          programRules: ['MICRO_LOAN'],
        },
        {
          id: 'app-2',
          applicantName: 'Business B Inc',
          eligibilityScore: 45.0,
          decision: 'REJECTED',
          decidedBy: 'staff-456',
          decidedAt: new Date('2024-06-16'),
          programRules: ['MICRO_LOAN'],
        },
      ];

      (reportingRepository.getEligibilityReportData as jest.Mock).mockResolvedValue(
        mockApplications
      );

      const result = await reportingService.generateEligibilityReport(mockFilters);

      expect(result.applications).toEqual(mockApplications);
      expect(result.metadata.totalCount).toBe(2);
      expect(result.metadata.filters).toEqual(mockFilters);
      expect(result.metadata.generatedAt).toBeInstanceOf(Date);
    });

    it('should include all required fields in report entries', async () => {
      const mockApplications = [
        {
          id: 'app-123',
          applicantName: 'Test Business',
          eligibilityScore: 75.0,
          decision: 'APPROVED',
          decidedBy: 'staff-789',
          decidedAt: new Date('2024-07-01'),
          programRules: ['MICRO_LOAN', 'SMALL_BUSINESS'],
        },
      ];

      (reportingRepository.getEligibilityReportData as jest.Mock).mockResolvedValue(
        mockApplications
      );

      const result = await reportingService.generateEligibilityReport(mockFilters);

      const entry = result.applications[0];
      expect(entry).toHaveProperty('id');
      expect(entry).toHaveProperty('applicantName');
      expect(entry).toHaveProperty('eligibilityScore');
      expect(entry).toHaveProperty('decision');
      expect(entry).toHaveProperty('decidedBy');
      expect(entry).toHaveProperty('decidedAt');
      expect(entry).toHaveProperty('programRules');
    });

    it('should handle empty results', async () => {
      (reportingRepository.getEligibilityReportData as jest.Mock).mockResolvedValue([]);

      const result = await reportingService.generateEligibilityReport(mockFilters);

      expect(result.applications).toEqual([]);
      expect(result.metadata.totalCount).toBe(0);
    });

    it('should throw error when repository fails', async () => {
      (reportingRepository.getEligibilityReportData as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await expect(reportingService.generateEligibilityReport(mockFilters)).rejects.toThrow(
        'Failed to generate eligibility report'
      );
    });
  });

  describe('generateMissingDocumentsCSV - CSV Formatting', () => {
    const mockFilters: ReportFilters = {
      status: ApplicationStatus.PENDING_DOCUMENTS,
    };

    it('should generate CSV with correct header and format', async () => {
      const mockEntries = [
        {
          applicationId: 'app-1',
          applicantName: 'Business A LLC',
          programType: 'MICRO_LOAN',
          missingDocuments: ['W-9', 'Bank Statement'],
          submittedAt: new Date('2024-06-15T10:30:00Z'),
        },
        {
          applicationId: 'app-2',
          applicantName: 'Business B Inc',
          programType: 'SMALL_BUSINESS',
          missingDocuments: ['EIN Verification'],
          submittedAt: new Date('2024-06-16T14:45:00Z'),
        },
      ];

      (reportingRepository.getMissingDocumentsData as jest.Mock).mockResolvedValue(mockEntries);

      const result = await reportingService.generateMissingDocumentsCSV(mockFilters);

      expect(result).toContain(
        'Application ID,Applicant Name,Program Type,Missing Documents,Submitted At'
      );
      expect(result).toContain('app-1,"Business A LLC",MICRO_LOAN,"W-9; Bank Statement"');
      expect(result).toContain('app-2,"Business B Inc",SMALL_BUSINESS,"EIN Verification"');
      expect(result).toContain('2024-06-15T10:30:00.000Z');
      expect(result).toContain('2024-06-16T14:45:00.000Z');
    });

    it('should handle multiple missing documents with semicolon separator', async () => {
      const mockEntries = [
        {
          applicationId: 'app-1',
          applicantName: 'Test Business',
          programType: 'MICRO_LOAN',
          missingDocuments: ['W-9', 'Bank Statement', 'EIN Verification', 'Tax Return'],
          submittedAt: new Date('2024-06-15'),
        },
      ];

      (reportingRepository.getMissingDocumentsData as jest.Mock).mockResolvedValue(mockEntries);

      const result = await reportingService.generateMissingDocumentsCSV(mockFilters);

      expect(result).toContain('W-9; Bank Statement; EIN Verification; Tax Return');
    });

    it('should properly escape applicant names with commas', async () => {
      const mockEntries = [
        {
          applicationId: 'app-1',
          applicantName: 'Smith, John & Associates',
          programType: 'MICRO_LOAN',
          missingDocuments: ['W-9'],
          submittedAt: new Date('2024-06-15'),
        },
      ];

      (reportingRepository.getMissingDocumentsData as jest.Mock).mockResolvedValue(mockEntries);

      const result = await reportingService.generateMissingDocumentsCSV(mockFilters);

      expect(result).toContain('"Smith, John & Associates"');
    });

    it('should handle empty results', async () => {
      (reportingRepository.getMissingDocumentsData as jest.Mock).mockResolvedValue([]);

      const result = await reportingService.generateMissingDocumentsCSV(mockFilters);

      expect(result).toBe(
        'Application ID,Applicant Name,Program Type,Missing Documents,Submitted At\n'
      );
    });

    it('should throw error when repository fails', async () => {
      (reportingRepository.getMissingDocumentsData as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await expect(reportingService.generateMissingDocumentsCSV(mockFilters)).rejects.toThrow(
        'Failed to generate missing documents CSV'
      );
    });
  });

  describe('generateComplianceSummary - Markdown Formatting', () => {
    const mockFilters: ReportFilters = {
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
    };

    it('should generate compliance summary with correct markdown structure', async () => {
      const mockData: ComplianceSummaryData = {
        reportPeriod: {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
        },
        totalApplications: 150,
        approvedApplications: 90,
        rejectedApplications: 40,
        pendingApplications: 20,
        averageProcessingTime: 48.5,
        documentClassificationAccuracy: 96.8,
        fraudDetectionCount: 5,
        programBreakdown: [
          { programType: 'MICRO_LOAN', count: 100, approvalRate: 65.0 },
          { programType: 'SMALL_BUSINESS', count: 50, approvalRate: 70.0 },
        ],
      };

      (reportingRepository.getComplianceSummaryData as jest.Mock).mockResolvedValue(mockData);

      const result = await reportingService.generateComplianceSummary(mockFilters);

      expect(result).toContain('# Compliance Summary Report');
      expect(result).toContain('**Report Period:** 2024-01-01 to 2024-12-31');
      expect(result).toContain('## Executive Summary');
      expect(result).toContain('| Total Applications | 150 |');
      expect(result).toContain('| Approved Applications | 90 |');
      expect(result).toContain('| Rejected Applications | 40 |');
      expect(result).toContain('| Pending Applications | 20 |');
    });

    it('should calculate and display approval rate correctly', async () => {
      const mockData: ComplianceSummaryData = {
        reportPeriod: {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
        },
        totalApplications: 100,
        approvedApplications: 65,
        rejectedApplications: 30,
        pendingApplications: 5,
        averageProcessingTime: 40.0,
        documentClassificationAccuracy: 95.0,
        fraudDetectionCount: 2,
        programBreakdown: [],
      };

      (reportingRepository.getComplianceSummaryData as jest.Mock).mockResolvedValue(mockData);

      const result = await reportingService.generateComplianceSummary(mockFilters);

      expect(result).toContain('| Approval Rate | 65.00% |');
    });

    it('should include program breakdown table', async () => {
      const mockData: ComplianceSummaryData = {
        reportPeriod: {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
        },
        totalApplications: 150,
        approvedApplications: 90,
        rejectedApplications: 40,
        pendingApplications: 20,
        averageProcessingTime: 45.0,
        documentClassificationAccuracy: 96.0,
        fraudDetectionCount: 3,
        programBreakdown: [
          { programType: 'MICRO_LOAN', count: 80, approvalRate: 62.5 },
          { programType: 'SMALL_BUSINESS', count: 70, approvalRate: 71.43 },
        ],
      };

      (reportingRepository.getComplianceSummaryData as jest.Mock).mockResolvedValue(mockData);

      const result = await reportingService.generateComplianceSummary(mockFilters);

      expect(result).toContain('## Program Breakdown');
      expect(result).toContain('| MICRO_LOAN | 80 | 62.50% |');
      expect(result).toContain('| SMALL_BUSINESS | 70 | 71.43% |');
    });

    it('should include performance metrics section', async () => {
      const mockData: ComplianceSummaryData = {
        reportPeriod: {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
        },
        totalApplications: 100,
        approvedApplications: 60,
        rejectedApplications: 30,
        pendingApplications: 10,
        averageProcessingTime: 42.75,
        documentClassificationAccuracy: 97.5,
        fraudDetectionCount: 4,
        programBreakdown: [],
      };

      (reportingRepository.getComplianceSummaryData as jest.Mock).mockResolvedValue(mockData);

      const result = await reportingService.generateComplianceSummary(mockFilters);

      expect(result).toContain('## Performance Metrics');
      expect(result).toContain('**Document Classification Accuracy:** 97.50%');
      expect(result).toContain('**Average Processing Time:** 42.75 hours');
      expect(result).toContain('**Fraud Detection Count:** 4');
    });

    it('should handle zero total applications gracefully', async () => {
      const mockData: ComplianceSummaryData = {
        reportPeriod: {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
        },
        totalApplications: 0,
        approvedApplications: 0,
        rejectedApplications: 0,
        pendingApplications: 0,
        averageProcessingTime: 0,
        documentClassificationAccuracy: 0,
        fraudDetectionCount: 0,
        programBreakdown: [],
      };

      (reportingRepository.getComplianceSummaryData as jest.Mock).mockResolvedValue(mockData);

      const result = await reportingService.generateComplianceSummary(mockFilters);

      expect(result).toContain('| Approval Rate | 0% |');
      expect(result).toContain('| Total Applications | 0 |');
    });

    it('should throw error when repository fails', async () => {
      (reportingRepository.getComplianceSummaryData as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await expect(reportingService.generateComplianceSummary(mockFilters)).rejects.toThrow(
        'Failed to generate compliance summary'
      );
    });
  });

  describe('Filter and Date Range Logic', () => {
    it('should apply date range filters correctly', async () => {
      const filters: DashboardFilters = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-06-30'),
      };

      (redisClient.get as jest.Mock).mockResolvedValue(null);
      (reportingRepository.getTotalApplications as jest.Mock).mockResolvedValue(75);
      (reportingRepository.getApprovalRate as jest.Mock).mockResolvedValue(60.0);
      (reportingRepository.getAverageProcessingTime as jest.Mock).mockResolvedValue(45.0);
      (reportingRepository.getDocumentClassificationAccuracy as jest.Mock).mockResolvedValue(95.0);
      (reportingRepository.getApplicationsByStatus as jest.Mock).mockResolvedValue({
        [ApplicationStatus.DRAFT]: 0,
        [ApplicationStatus.SUBMITTED]: 0,
        [ApplicationStatus.UNDER_REVIEW]: 0,
        [ApplicationStatus.PENDING_DOCUMENTS]: 0,
        [ApplicationStatus.APPROVED]: 0,
        [ApplicationStatus.REJECTED]: 0,
        [ApplicationStatus.DEFERRED]: 0,
      });
      (reportingRepository.getTrendsOverTime as jest.Mock).mockResolvedValue([]);
      (redisClient.set as jest.Mock).mockResolvedValue('OK');

      await reportingService.getDashboardMetrics(filters);

      expect(reportingRepository.getTotalApplications).toHaveBeenCalledWith(filters);
      expect(reportingRepository.getApprovalRate).toHaveBeenCalledWith(filters);
    });

    it('should apply program type filter correctly', async () => {
      const filters: DashboardFilters = {
        programType: 'MICRO_LOAN',
      };

      (redisClient.get as jest.Mock).mockResolvedValue(null);
      (reportingRepository.getTotalApplications as jest.Mock).mockResolvedValue(50);
      (reportingRepository.getApprovalRate as jest.Mock).mockResolvedValue(70.0);
      (reportingRepository.getAverageProcessingTime as jest.Mock).mockResolvedValue(40.0);
      (reportingRepository.getDocumentClassificationAccuracy as jest.Mock).mockResolvedValue(96.0);
      (reportingRepository.getApplicationsByStatus as jest.Mock).mockResolvedValue({
        [ApplicationStatus.DRAFT]: 0,
        [ApplicationStatus.SUBMITTED]: 0,
        [ApplicationStatus.UNDER_REVIEW]: 0,
        [ApplicationStatus.PENDING_DOCUMENTS]: 0,
        [ApplicationStatus.APPROVED]: 0,
        [ApplicationStatus.REJECTED]: 0,
        [ApplicationStatus.DEFERRED]: 0,
      });
      (reportingRepository.getTrendsOverTime as jest.Mock).mockResolvedValue([]);
      (redisClient.set as jest.Mock).mockResolvedValue('OK');

      await reportingService.getDashboardMetrics(filters);

      expect(reportingRepository.getTotalApplications).toHaveBeenCalledWith(
        expect.objectContaining({ programType: 'MICRO_LOAN' })
      );
    });

    it('should apply status filter correctly', async () => {
      const filters: DashboardFilters = {
        status: ApplicationStatus.APPROVED,
      };

      (redisClient.get as jest.Mock).mockResolvedValue(null);
      (reportingRepository.getTotalApplications as jest.Mock).mockResolvedValue(80);
      (reportingRepository.getApprovalRate as jest.Mock).mockResolvedValue(100.0);
      (reportingRepository.getAverageProcessingTime as jest.Mock).mockResolvedValue(35.0);
      (reportingRepository.getDocumentClassificationAccuracy as jest.Mock).mockResolvedValue(97.0);
      (reportingRepository.getApplicationsByStatus as jest.Mock).mockResolvedValue({
        [ApplicationStatus.DRAFT]: 0,
        [ApplicationStatus.SUBMITTED]: 0,
        [ApplicationStatus.UNDER_REVIEW]: 0,
        [ApplicationStatus.PENDING_DOCUMENTS]: 0,
        [ApplicationStatus.APPROVED]: 80,
        [ApplicationStatus.REJECTED]: 0,
        [ApplicationStatus.DEFERRED]: 0,
      });
      (reportingRepository.getTrendsOverTime as jest.Mock).mockResolvedValue([]);
      (redisClient.set as jest.Mock).mockResolvedValue('OK');

      await reportingService.getDashboardMetrics(filters);

      expect(reportingRepository.getTotalApplications).toHaveBeenCalledWith(
        expect.objectContaining({ status: ApplicationStatus.APPROVED })
      );
    });

    it('should apply multiple filters simultaneously', async () => {
      const filters: DashboardFilters = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        programType: 'SMALL_BUSINESS',
        status: ApplicationStatus.UNDER_REVIEW,
      };

      (redisClient.get as jest.Mock).mockResolvedValue(null);
      (reportingRepository.getTotalApplications as jest.Mock).mockResolvedValue(25);
      (reportingRepository.getApprovalRate as jest.Mock).mockResolvedValue(0);
      (reportingRepository.getAverageProcessingTime as jest.Mock).mockResolvedValue(0);
      (reportingRepository.getDocumentClassificationAccuracy as jest.Mock).mockResolvedValue(95.0);
      (reportingRepository.getApplicationsByStatus as jest.Mock).mockResolvedValue({
        [ApplicationStatus.DRAFT]: 0,
        [ApplicationStatus.SUBMITTED]: 0,
        [ApplicationStatus.UNDER_REVIEW]: 25,
        [ApplicationStatus.PENDING_DOCUMENTS]: 0,
        [ApplicationStatus.APPROVED]: 0,
        [ApplicationStatus.REJECTED]: 0,
        [ApplicationStatus.DEFERRED]: 0,
      });
      (reportingRepository.getTrendsOverTime as jest.Mock).mockResolvedValue([]);
      (redisClient.set as jest.Mock).mockResolvedValue('OK');

      await reportingService.getDashboardMetrics(filters);

      expect(reportingRepository.getTotalApplications).toHaveBeenCalledWith(filters);
    });
  });

  describe('invalidateCache', () => {
    it('should invalidate cache for specific filters', async () => {
      const filters: DashboardFilters = {
        programType: 'MICRO_LOAN',
      };

      (redisClient.del as jest.Mock).mockResolvedValue(1);

      await reportingService.invalidateCache(filters);

      expect(redisClient.del).toHaveBeenCalled();
    });

    it('should handle cache invalidation without filters', async () => {
      await reportingService.invalidateCache();

      // Should not throw error
      expect(true).toBe(true);
    });

    it('should not throw error when cache invalidation fails', async () => {
      const filters: DashboardFilters = {
        programType: 'MICRO_LOAN',
      };

      (redisClient.del as jest.Mock).mockRejectedValue(new Error('Redis error'));

      // Should not throw
      await expect(reportingService.invalidateCache(filters)).resolves.not.toThrow();
    });
  });
});
