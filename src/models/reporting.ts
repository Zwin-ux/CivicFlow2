/**
 * Reporting Data Models
 * Defines TypeScript interfaces for reporting and dashboard functionality
 */

import { ApplicationStatus } from './application';

/**
 * Dashboard filters
 */
export interface DashboardFilters {
  startDate?: Date;
  endDate?: Date;
  programType?: string;
  status?: ApplicationStatus;
}

/**
 * Time series data point
 */
export interface TimeSeriesData {
  date: string;
  value: number;
  label?: string;
}

/**
 * Dashboard metrics data
 */
export interface DashboardData {
  totalApplications: number;
  approvalRate: number;
  averageProcessingTime: number; // in hours
  documentClassificationAccuracy: number;
  applicationsByStatus: Record<ApplicationStatus, number>;
  trendsOverTime: TimeSeriesData[];
}

/**
 * Report filters
 */
export interface ReportFilters {
  startDate?: Date;
  endDate?: Date;
  programType?: string;
  status?: ApplicationStatus;
}

/**
 * Eligibility report entry
 */
export interface EligibilityReportEntry {
  id: string;
  applicantName: string;
  eligibilityScore: number;
  decision: string;
  decidedBy: string;
  decidedAt: Date;
  programRules: string[];
}

/**
 * Eligibility report
 */
export interface EligibilityReport {
  applications: EligibilityReportEntry[];
  metadata: {
    generatedAt: Date;
    filters: ReportFilters;
    totalCount: number;
  };
}

/**
 * Missing documents entry
 */
export interface MissingDocumentsEntry {
  applicationId: string;
  applicantName: string;
  programType: string;
  missingDocuments: string[];
  submittedAt: Date;
}

/**
 * Compliance summary data
 */
export interface ComplianceSummaryData {
  reportPeriod: {
    startDate: Date;
    endDate: Date;
  };
  totalApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  pendingApplications: number;
  averageProcessingTime: number;
  documentClassificationAccuracy: number;
  fraudDetectionCount: number;
  programBreakdown: Array<{
    programType: string;
    count: number;
    approvalRate: number;
  }>;
}
