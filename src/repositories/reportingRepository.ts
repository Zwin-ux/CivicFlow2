/**
 * Reporting Repository
 * Implements repository pattern for reporting queries and aggregations
 */

import { QueryResult } from 'pg';
import database from '../config/database';
import logger from '../utils/logger';
import { ApplicationStatus } from '../models/application';
import {
  DashboardFilters,
  TimeSeriesData,
  ReportFilters,
  EligibilityReportEntry,
  MissingDocumentsEntry,
  ComplianceSummaryData,
} from '../models/reporting';

class ReportingRepository {
  /**
   * Get total application count
   * @param filters - Dashboard filters
   * @returns Total count
   */
  async getTotalApplications(filters: DashboardFilters): Promise<number> {
    const { whereClause, values } = this.buildWhereClause(filters);

    const query = `
      SELECT COUNT(*) as count
      FROM applications
      ${whereClause}
    `;

    try {
      const result: QueryResult = await database.query(query, values);
      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      logger.error('Failed to get total applications', { error, filters });
      throw new Error('Failed to get total applications');
    }
  }

  /**
   * Get approval rate
   * @param filters - Dashboard filters
   * @returns Approval rate as percentage
   */
  async getApprovalRate(filters: DashboardFilters): Promise<number> {
    const { whereClause, values } = this.buildWhereClause(filters);

    const query = `
      SELECT 
        COUNT(*) FILTER (WHERE decision->>'decision' = 'APPROVED') as approved,
        COUNT(*) FILTER (WHERE decision IS NOT NULL) as total_decided
      FROM applications
      ${whereClause}
    `;

    try {
      const result: QueryResult = await database.query(query, values);
      const approved = parseInt(result.rows[0].approved, 10);
      const totalDecided = parseInt(result.rows[0].total_decided, 10);

      if (totalDecided === 0) {
        return 0;
      }

      return (approved / totalDecided) * 100;
    } catch (error) {
      logger.error('Failed to get approval rate', { error, filters });
      throw new Error('Failed to get approval rate');
    }
  }

  /**
   * Get average processing time in hours
   * @param filters - Dashboard filters
   * @returns Average processing time
   */
  async getAverageProcessingTime(filters: DashboardFilters): Promise<number> {
    const { whereClause, values } = this.buildWhereClause(filters);

    const query = `
      SELECT 
        AVG(EXTRACT(EPOCH FROM (decided_at - submitted_at)) / 3600) as avg_hours
      FROM applications
      ${whereClause}
      AND submitted_at IS NOT NULL
      AND decided_at IS NOT NULL
    `;

    try {
      const result: QueryResult = await database.query(query, values);
      const avgHours = result.rows[0].avg_hours;
      return avgHours ? parseFloat(avgHours) : 0;
    } catch (error) {
      logger.error('Failed to get average processing time', { error, filters });
      throw new Error('Failed to get average processing time');
    }
  }

  /**
   * Get document classification accuracy
   * @param filters - Dashboard filters
   * @returns Classification accuracy as percentage
   */
  async getDocumentClassificationAccuracy(filters: DashboardFilters): Promise<number> {
    const whereConditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (filters.startDate) {
      whereConditions.push(`cv.validated_at >= $${paramIndex}`);
      values.push(filters.startDate);
      paramIndex++;
    }

    if (filters.endDate) {
      whereConditions.push(`cv.validated_at <= $${paramIndex}`);
      values.push(filters.endDate);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';

    // Use classification_validations table if available, otherwise fall back to confidence scores
    const query = `
      SELECT 
        CASE 
          WHEN COUNT(*) > 0 THEN 
            (SUM(CASE WHEN is_correct THEN 1 ELSE 0 END)::FLOAT / COUNT(*)) * 100
          ELSE 
            (SELECT AVG(classification_confidence) FROM documents WHERE classification_confidence IS NOT NULL)
        END as accuracy
      FROM classification_validations cv
      ${whereClause}
    `;

    try {
      const result: QueryResult = await database.query(query, values);
      const accuracy = result.rows[0].accuracy;
      return accuracy ? parseFloat(accuracy) : 0;
    } catch (error) {
      logger.error('Failed to get document classification accuracy', { error, filters });
      throw new Error('Failed to get document classification accuracy');
    }
  }

  /**
   * Get applications by status
   * @param filters - Dashboard filters
   * @returns Count by status
   */
  async getApplicationsByStatus(
    filters: DashboardFilters
  ): Promise<Record<ApplicationStatus, number>> {
    const { whereClause, values } = this.buildWhereClause(filters);

    const query = `
      SELECT 
        status,
        COUNT(*) as count
      FROM applications
      ${whereClause}
      GROUP BY status
    `;

    try {
      const result: QueryResult = await database.query(query, values);

      // Initialize all statuses with 0
      const statusCounts: Record<ApplicationStatus, number> = {
        [ApplicationStatus.DRAFT]: 0,
        [ApplicationStatus.SUBMITTED]: 0,
        [ApplicationStatus.UNDER_REVIEW]: 0,
        [ApplicationStatus.PENDING_DOCUMENTS]: 0,
        [ApplicationStatus.APPROVED]: 0,
        [ApplicationStatus.REJECTED]: 0,
        [ApplicationStatus.DEFERRED]: 0,
      };

      // Fill in actual counts
      result.rows.forEach(row => {
        statusCounts[row.status as ApplicationStatus] = parseInt(row.count, 10);
      });

      return statusCounts;
    } catch (error) {
      logger.error('Failed to get applications by status', { error, filters });
      throw new Error('Failed to get applications by status');
    }
  }

  /**
   * Get trends over time
   * @param filters - Dashboard filters
   * @returns Time series data
   */
  async getTrendsOverTime(filters: DashboardFilters): Promise<TimeSeriesData[]> {
    const { whereClause, values } = this.buildWhereClause(filters);

    const query = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as value
      FROM applications
      ${whereClause}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 30
    `;

    try {
      const result: QueryResult = await database.query(query, values);

      return result.rows.map(row => ({
        date: row.date,
        value: parseInt(row.value, 10),
        label: 'Applications',
      }));
    } catch (error) {
      logger.error('Failed to get trends over time', { error, filters });
      throw new Error('Failed to get trends over time');
    }
  }

  /**
   * Get eligibility report data
   * @param filters - Report filters
   * @returns Eligibility report entries
   */
  async getEligibilityReportData(filters: ReportFilters): Promise<EligibilityReportEntry[]> {
    const { whereClause, values } = this.buildWhereClause(filters, 'a');

    const query = `
      SELECT 
        a.id,
        ap.business_name as applicant_name,
        a.eligibility_score,
        a.decision->>'decision' as decision,
        a.decision->>'decidedBy' as decided_by,
        a.decided_at,
        a.program_type
      FROM applications a
      INNER JOIN applicants ap ON a.applicant_id = ap.id
      ${whereClause}
      AND a.decision IS NOT NULL
      ORDER BY a.decided_at DESC
    `;

    try {
      const result: QueryResult = await database.query(query, values);

      return result.rows.map(row => ({
        id: row.id,
        applicantName: row.applicant_name,
        eligibilityScore: row.eligibility_score ? parseFloat(row.eligibility_score) : 0,
        decision: row.decision || 'PENDING',
        decidedBy: row.decided_by || 'SYSTEM',
        decidedAt: new Date(row.decided_at),
        programRules: [row.program_type], // Simplified - could be enhanced
      }));
    } catch (error) {
      logger.error('Failed to get eligibility report data', { error, filters });
      throw new Error('Failed to get eligibility report data');
    }
  }

  /**
   * Get missing documents data
   * @param filters - Report filters
   * @returns Missing documents entries
   */
  async getMissingDocumentsData(filters: ReportFilters): Promise<MissingDocumentsEntry[]> {
    const { whereClause, values } = this.buildWhereClause(filters, 'a');

    const query = `
      SELECT 
        a.id as application_id,
        ap.business_name as applicant_name,
        a.program_type,
        a.missing_documents,
        a.submitted_at
      FROM applications a
      INNER JOIN applicants ap ON a.applicant_id = ap.id
      ${whereClause}
      AND jsonb_array_length(a.missing_documents) > 0
      ORDER BY a.submitted_at DESC
    `;

    try {
      const result: QueryResult = await database.query(query, values);

      return result.rows.map(row => ({
        applicationId: row.application_id,
        applicantName: row.applicant_name,
        programType: row.program_type,
        missingDocuments: row.missing_documents || [],
        submittedAt: new Date(row.submitted_at),
      }));
    } catch (error) {
      logger.error('Failed to get missing documents data', { error, filters });
      throw new Error('Failed to get missing documents data');
    }
  }

  /**
   * Get compliance summary data
   * @param filters - Report filters
   * @returns Compliance summary data
   */
  async getComplianceSummaryData(filters: ReportFilters): Promise<ComplianceSummaryData> {
    const { whereClause, values } = this.buildWhereClause(filters);

    const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE decision->>'decision' = 'APPROVED') as approved,
        COUNT(*) FILTER (WHERE decision->>'decision' = 'REJECTED') as rejected,
        COUNT(*) FILTER (WHERE status IN ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'PENDING_DOCUMENTS')) as pending,
        AVG(EXTRACT(EPOCH FROM (decided_at - submitted_at)) / 3600) FILTER (WHERE decided_at IS NOT NULL AND submitted_at IS NOT NULL) as avg_hours,
        COUNT(*) FILTER (WHERE jsonb_array_length(fraud_flags) > 0) as fraud_count
      FROM applications
      ${whereClause}
    `;

    try {
      const result: QueryResult = await database.query(query, values);
      const row = result.rows[0];

      // Get document classification accuracy
      const accuracyQuery = `
        SELECT AVG(d.classification_confidence) as avg_confidence
        FROM documents d
        INNER JOIN applications a ON d.application_id = a.id
        ${whereClause.replace('WHERE', 'WHERE')}
        AND d.classification_confidence IS NOT NULL
      `;
      const accuracyResult: QueryResult = await database.query(accuracyQuery, values);
      const accuracy = accuracyResult.rows[0].avg_confidence
        ? parseFloat(accuracyResult.rows[0].avg_confidence)
        : 0;

      // Get program breakdown
      const programQuery = `
        SELECT 
          program_type,
          COUNT(*) as count,
          COUNT(*) FILTER (WHERE decision->>'decision' = 'APPROVED') as approved
        FROM applications
        ${whereClause}
        GROUP BY program_type
      `;
      const programResult: QueryResult = await database.query(programQuery, values);

      const programBreakdown = programResult.rows.map(pRow => ({
        programType: pRow.program_type,
        count: parseInt(pRow.count, 10),
        approvalRate:
          parseInt(pRow.count, 10) > 0
            ? (parseInt(pRow.approved, 10) / parseInt(pRow.count, 10)) * 100
            : 0,
      }));

      return {
        reportPeriod: {
          startDate: filters.startDate || new Date(0),
          endDate: filters.endDate || new Date(),
        },
        totalApplications: parseInt(row.total, 10),
        approvedApplications: parseInt(row.approved, 10),
        rejectedApplications: parseInt(row.rejected, 10),
        pendingApplications: parseInt(row.pending, 10),
        averageProcessingTime: row.avg_hours ? parseFloat(row.avg_hours) : 0,
        documentClassificationAccuracy: accuracy,
        fraudDetectionCount: parseInt(row.fraud_count, 10),
        programBreakdown,
      };
    } catch (error) {
      logger.error('Failed to get compliance summary data', { error, filters });
      throw new Error('Failed to get compliance summary data');
    }
  }

  /**
   * Build WHERE clause from filters
   * @param filters - Filters
   * @param tableAlias - Table alias (optional)
   * @returns WHERE clause and values
   */
  private buildWhereClause(
    filters: DashboardFilters | ReportFilters,
    tableAlias?: string
  ): { whereClause: string; values: any[] } {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    const prefix = tableAlias ? `${tableAlias}.` : '';

    if (filters.startDate) {
      conditions.push(`${prefix}created_at >= $${paramIndex++}`);
      values.push(filters.startDate);
    }

    if (filters.endDate) {
      conditions.push(`${prefix}created_at <= $${paramIndex++}`);
      values.push(filters.endDate);
    }

    if (filters.programType) {
      conditions.push(`${prefix}program_type = $${paramIndex++}`);
      values.push(filters.programType);
    }

    if (filters.status) {
      conditions.push(`${prefix}status = $${paramIndex++}`);
      values.push(filters.status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    return { whereClause, values };
  }
}

export default new ReportingRepository();
