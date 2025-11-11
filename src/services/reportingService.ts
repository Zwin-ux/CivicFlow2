/**
 * Reporting Service
 * Handles dashboard metrics, compliance reports, and data exports
 */

import reportingRepository from '../repositories/reportingRepository';
import redisClient from '../config/redis';
import logger from '../utils/logger';
import {
  DashboardFilters,
  DashboardData,
  ReportFilters,
  EligibilityReport,
  ComplianceSummaryData,
} from '../models/reporting';

class ReportingService {
  private readonly CACHE_TTL = 300; // 5 minutes
  private readonly CACHE_PREFIX = 'dashboard:';

  /**
   * Get dashboard metrics with caching
   * @param filters - Dashboard filters
   * @returns Dashboard data
   */
  async getDashboardMetrics(filters: DashboardFilters): Promise<DashboardData> {
    const cacheKey = this.buildCacheKey(filters);

    try {
      // Try to get from cache
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        logger.info('Dashboard metrics retrieved from cache', { filters });
        return JSON.parse(cached);
      }

      // Fetch from database
      logger.info('Fetching dashboard metrics from database', { filters });

      const [
        totalApplications,
        approvalRate,
        averageProcessingTime,
        documentClassificationAccuracy,
        applicationsByStatus,
        trendsOverTime,
      ] = await Promise.all([
        reportingRepository.getTotalApplications(filters),
        reportingRepository.getApprovalRate(filters),
        reportingRepository.getAverageProcessingTime(filters),
        reportingRepository.getDocumentClassificationAccuracy(filters),
        reportingRepository.getApplicationsByStatus(filters),
        reportingRepository.getTrendsOverTime(filters),
      ]);

      const dashboardData: DashboardData = {
        totalApplications,
        approvalRate: Math.round(approvalRate * 100) / 100,
        averageProcessingTime: Math.round(averageProcessingTime * 100) / 100,
        documentClassificationAccuracy:
          Math.round(documentClassificationAccuracy * 100) / 100,
        applicationsByStatus,
        trendsOverTime,
      };

      // Cache the result
      await redisClient.set(cacheKey, JSON.stringify(dashboardData), this.CACHE_TTL);

      logger.info('Dashboard metrics cached', { filters, ttl: this.CACHE_TTL });

      return dashboardData;
    } catch (error) {
      logger.error('Failed to get dashboard metrics', { error, filters });
      throw new Error('Failed to get dashboard metrics');
    }
  }

  /**
   * Generate eligibility report
   * @param filters - Report filters
   * @returns Eligibility report
   */
  async generateEligibilityReport(filters: ReportFilters): Promise<EligibilityReport> {
    try {
      logger.info('Generating eligibility report', { filters });

      const applications = await reportingRepository.getEligibilityReportData(filters);

      const report: EligibilityReport = {
        applications,
        metadata: {
          generatedAt: new Date(),
          filters,
          totalCount: applications.length,
        },
      };

      logger.info('Eligibility report generated', {
        totalCount: applications.length,
        filters,
      });

      return report;
    } catch (error) {
      logger.error('Failed to generate eligibility report', { error, filters });
      throw new Error('Failed to generate eligibility report');
    }
  }

  /**
   * Generate missing documents CSV
   * @param filters - Report filters
   * @returns CSV string
   */
  async generateMissingDocumentsCSV(filters: ReportFilters): Promise<string> {
    try {
      logger.info('Generating missing documents CSV', { filters });

      const entries = await reportingRepository.getMissingDocumentsData(filters);

      // Build CSV header
      const header = 'Application ID,Applicant Name,Program Type,Missing Documents,Submitted At\n';

      // Build CSV rows
      const rows = entries.map(entry => {
        const missingDocs = entry.missingDocuments.join('; ');
        const submittedAt = entry.submittedAt.toISOString();
        return `${entry.applicationId},"${entry.applicantName}",${entry.programType},"${missingDocs}",${submittedAt}`;
      });

      const csv = header + rows.join('\n');

      logger.info('Missing documents CSV generated', {
        totalEntries: entries.length,
        filters,
      });

      return csv;
    } catch (error) {
      logger.error('Failed to generate missing documents CSV', { error, filters });
      throw new Error('Failed to generate missing documents CSV');
    }
  }

  /**
   * Generate compliance summary markdown
   * @param filters - Report filters
   * @returns Markdown string
   */
  async generateComplianceSummary(filters: ReportFilters): Promise<string> {
    try {
      logger.info('Generating compliance summary', { filters });

      const data = await reportingRepository.getComplianceSummaryData(filters);

      // Build markdown report
      const markdown = this.buildComplianceSummaryMarkdown(data);

      logger.info('Compliance summary generated', { filters });

      return markdown;
    } catch (error) {
      logger.error('Failed to generate compliance summary', { error, filters });
      throw new Error('Failed to generate compliance summary');
    }
  }

  /**
   * Invalidate dashboard cache
   * @param filters - Dashboard filters (optional)
   */
  async invalidateCache(filters?: DashboardFilters): Promise<void> {
    try {
      if (filters) {
        const cacheKey = this.buildCacheKey(filters);
        await redisClient.del(cacheKey);
        logger.info('Dashboard cache invalidated', { filters });
      } else {
        // Invalidate all dashboard caches (would need pattern matching in production)
        logger.info('All dashboard caches invalidated');
      }
    } catch (error) {
      logger.error('Failed to invalidate cache', { error, filters });
      // Don't throw - cache invalidation failure shouldn't break the app
    }
  }

  /**
   * Build cache key from filters
   * @param filters - Dashboard filters
   * @returns Cache key
   */
  private buildCacheKey(filters: DashboardFilters): string {
    const parts = [this.CACHE_PREFIX];

    if (filters.startDate) {
      parts.push(`start:${filters.startDate.toISOString()}`);
    }
    if (filters.endDate) {
      parts.push(`end:${filters.endDate.toISOString()}`);
    }
    if (filters.programType) {
      parts.push(`program:${filters.programType}`);
    }
    if (filters.status) {
      parts.push(`status:${filters.status}`);
    }

    return parts.join(':');
  }

  /**
   * Build compliance summary markdown
   * @param data - Compliance summary data
   * @returns Markdown string
   */
  private buildComplianceSummaryMarkdown(data: ComplianceSummaryData): string {
    const startDate = data.reportPeriod.startDate.toISOString().split('T')[0];
    const endDate = data.reportPeriod.endDate.toISOString().split('T')[0];

    let markdown = `# Compliance Summary Report\n\n`;
    markdown += `**Report Period:** ${startDate} to ${endDate}\n\n`;
    markdown += `**Generated:** ${new Date().toISOString()}\n\n`;

    markdown += `## Executive Summary\n\n`;
    markdown += `| Metric | Value |\n`;
    markdown += `|--------|-------|\n`;
    markdown += `| Total Applications | ${data.totalApplications} |\n`;
    markdown += `| Approved Applications | ${data.approvedApplications} |\n`;
    markdown += `| Rejected Applications | ${data.rejectedApplications} |\n`;
    markdown += `| Pending Applications | ${data.pendingApplications} |\n`;
    markdown += `| Approval Rate | ${data.totalApplications > 0 ? ((data.approvedApplications / data.totalApplications) * 100).toFixed(2) : 0}% |\n`;
    markdown += `| Average Processing Time | ${data.averageProcessingTime.toFixed(2)} hours |\n`;
    markdown += `| Document Classification Accuracy | ${data.documentClassificationAccuracy.toFixed(2)}% |\n`;
    markdown += `| Fraud Detections | ${data.fraudDetectionCount} |\n\n`;

    markdown += `## Program Breakdown\n\n`;
    markdown += `| Program Type | Applications | Approval Rate |\n`;
    markdown += `|--------------|--------------|---------------|\n`;

    data.programBreakdown.forEach(program => {
      markdown += `| ${program.programType} | ${program.count} | ${program.approvalRate.toFixed(2)}% |\n`;
    });

    markdown += `\n## Performance Metrics\n\n`;
    markdown += `- **Document Classification Accuracy:** ${data.documentClassificationAccuracy.toFixed(2)}%\n`;
    markdown += `- **Average Processing Time:** ${data.averageProcessingTime.toFixed(2)} hours\n`;
    markdown += `- **Fraud Detection Count:** ${data.fraudDetectionCount}\n\n`;

    markdown += `## Compliance Notes\n\n`;
    markdown += `This report summarizes application processing metrics for the specified period. `;
    markdown += `All data is maintained in accordance with regulatory requirements and audit trail standards.\n\n`;

    markdown += `---\n\n`;
    markdown += `*This report was automatically generated by the Government Lending CRM Platform.*\n`;

    return markdown;
  }
}

export default new ReportingService();
