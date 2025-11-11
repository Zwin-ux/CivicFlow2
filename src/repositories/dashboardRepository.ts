/**
 * Dashboard Repository
 * Data access layer for dashboard operations
 */

import { QueryResult } from 'pg';
import database from '../config/database';
import logger from '../utils/logger';
import { ApplicationStatus } from '../models/application';

export interface ApplicationSummary {
  id: string;
  applicantName: string;
  programType: string;
  status: ApplicationStatus;
  submittedAt: Date | null;
  slaDeadline: Date | null;
  slaStatus: 'ON_TRACK' | 'AT_RISK' | 'BREACHED';
  riskScore: number;
  fraudFlags: any[];
  assignedTo: string | null;
  requestedAmount: number;
  eligibilityScore: number | null;
}

export interface PipelineView {
  status: ApplicationStatus;
  applications: ApplicationSummary[];
  count: number;
}

class DashboardRepository {
  /**
   * Get pipeline view grouped by status
   */
  async getPipelineView(filters?: {
    programType?: string;
    assignedTo?: string;
  }): Promise<PipelineView[]> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (filters?.programType) {
      conditions.push(`a.program_type = $${paramIndex++}`);
      values.push(filters.programType);
    }

    if (filters?.assignedTo) {
      conditions.push(`a.assigned_to = $${paramIndex++}`);
      values.push(filters.assignedTo);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT 
        a.id,
        a.program_type,
        a.status,
        a.submitted_at,
        a.sla_deadline,
        a.assigned_to,
        a.requested_amount,
        a.eligibility_score,
        a.fraud_flags,
        ap.business_name as applicant_name
      FROM applications a
      INNER JOIN applicants ap ON a.applicant_id = ap.id
      ${whereClause}
      ORDER BY a.submitted_at DESC NULLS LAST, a.created_at DESC
    `;

    try {
      const result: QueryResult = await database.query(query, values);
      
      // Group by status
      const grouped = new Map<ApplicationStatus, ApplicationSummary[]>();
      
      for (const row of result.rows) {
        const status = row.status as ApplicationStatus;
        if (!grouped.has(status)) {
          grouped.set(status, []);
        }
        
        const summary = this.mapRowToApplicationSummary(row);
        grouped.get(status)!.push(summary);
      }

      // Convert to PipelineView array
      const pipelineViews: PipelineView[] = [];
      for (const [status, applications] of grouped.entries()) {
        pipelineViews.push({
          status,
          applications,
          count: applications.length,
        });
      }

      return pipelineViews;
    } catch (error) {
      logger.error('Failed to get pipeline view', { error, filters });
      throw new Error('Failed to get pipeline view');
    }
  }

  /**
   * Get queue view (my queue or unassigned)
   */
  async getQueueView(filters: {
    view: 'my-queue' | 'unassigned';
    userId?: string;
    page: number;
    limit: number;
  }): Promise<{ applications: ApplicationSummary[]; total: number }> {
    const offset = (filters.page - 1) * filters.limit;
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Filter by view type
    if (filters.view === 'my-queue') {
      if (!filters.userId) {
        throw new Error('userId is required for my-queue view');
      }
      conditions.push(`a.assigned_to = $${paramIndex++}`);
      values.push(filters.userId);
    } else if (filters.view === 'unassigned') {
      conditions.push(`a.assigned_to IS NULL`);
    }

    // Only show active applications (not final states)
    conditions.push(`a.status NOT IN ('APPROVED', 'REJECTED')`);

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // Get applications
    const query = `
      SELECT 
        a.id,
        a.program_type,
        a.status,
        a.submitted_at,
        a.sla_deadline,
        a.assigned_to,
        a.requested_amount,
        a.eligibility_score,
        a.fraud_flags,
        ap.business_name as applicant_name
      FROM applications a
      INNER JOIN applicants ap ON a.applicant_id = ap.id
      ${whereClause}
      ORDER BY a.submitted_at DESC NULLS LAST, a.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    values.push(filters.limit, offset);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM applications a
      ${whereClause}
    `;

    try {
      const [applicationsResult, countResult] = await Promise.all([
        database.query(query, values),
        database.query(countQuery, values.slice(0, -2)), // Exclude limit and offset
      ]);

      const applications = applicationsResult.rows.map(row =>
        this.mapRowToApplicationSummary(row)
      );
      const total = parseInt(countResult.rows[0].total, 10);

      return { applications, total };
    } catch (error) {
      logger.error('Failed to get queue view', { error, filters });
      throw new Error('Failed to get queue view');
    }
  }

  /**
   * Claim an unassigned application
   */
  async claimApplication(applicationId: string, userId: string): Promise<void> {
    const query = `
      UPDATE applications
      SET 
        assigned_to = $1,
        assigned_at = NOW(),
        updated_at = NOW()
      WHERE id = $2 AND assigned_to IS NULL
      RETURNING id
    `;

    try {
      const result: QueryResult = await database.query(query, [userId, applicationId]);
      
      if (result.rows.length === 0) {
        throw new Error('Application not found or already assigned');
      }
    } catch (error) {
      logger.error('Failed to claim application', { error, applicationId, userId });
      throw error;
    }
  }

  /**
   * Get SLA analytics
   */
  async getSLAAnalytics(filters?: {
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    breachedApplications: ApplicationSummary[];
    atRiskApplications: ApplicationSummary[];
    averageProcessingTime: Record<string, number>;
    bottlenecks: Array<{
      stage: ApplicationStatus;
      averageTimeInStage: number;
      applicationCount: number;
      threshold: number;
    }>;
  }> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (filters?.startDate) {
      conditions.push(`a.submitted_at >= $${paramIndex++}`);
      values.push(filters.startDate);
    }

    if (filters?.endDate) {
      conditions.push(`a.submitted_at <= $${paramIndex++}`);
      values.push(filters.endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get breached and at-risk applications
    const applicationsQuery = `
      SELECT 
        a.id,
        a.program_type,
        a.status,
        a.submitted_at,
        a.sla_deadline,
        a.assigned_to,
        a.requested_amount,
        a.eligibility_score,
        a.fraud_flags,
        ap.business_name as applicant_name
      FROM applications a
      INNER JOIN applicants ap ON a.applicant_id = ap.id
      ${whereClause}
      ${conditions.length > 0 ? 'AND' : 'WHERE'} a.sla_deadline IS NOT NULL
      ORDER BY a.sla_deadline ASC
    `;

    try {
      const result: QueryResult = await database.query(applicationsQuery, values);
      
      const breachedApplications: ApplicationSummary[] = [];
      const atRiskApplications: ApplicationSummary[] = [];

      for (const row of result.rows) {
        const summary = this.mapRowToApplicationSummary(row);
        
        if (summary.slaStatus === 'BREACHED') {
          breachedApplications.push(summary);
        } else if (summary.slaStatus === 'AT_RISK') {
          atRiskApplications.push(summary);
        }
      }

      // Calculate average processing time per stage
      const avgTimeQuery = `
        SELECT 
          status,
          AVG(EXTRACT(EPOCH FROM (COALESCE(decided_at, NOW()) - submitted_at)) / 3600) as avg_hours
        FROM applications
        ${whereClause}
        ${conditions.length > 0 ? 'AND' : 'WHERE'} submitted_at IS NOT NULL
        GROUP BY status
      `;

      const avgTimeResult: QueryResult = await database.query(avgTimeQuery, values);
      const averageProcessingTime: Record<string, number> = {};
      
      for (const row of avgTimeResult.rows) {
        averageProcessingTime[row.status] = parseFloat(row.avg_hours);
      }

      // Identify bottlenecks (stages with high average time)
      const bottlenecks = Object.entries(averageProcessingTime)
        .map(([stage, avgTime]) => ({
          stage: stage as ApplicationStatus,
          averageTimeInStage: avgTime,
          applicationCount: result.rows.filter(r => r.status === stage).length,
          threshold: 48, // 48 hours threshold
        }))
        .filter(b => b.averageTimeInStage > b.threshold)
        .sort((a, b) => b.averageTimeInStage - a.averageTimeInStage);

      return {
        breachedApplications,
        atRiskApplications,
        averageProcessingTime,
        bottlenecks,
      };
    } catch (error) {
      logger.error('Failed to get SLA analytics', { error, filters });
      throw new Error('Failed to get SLA analytics');
    }
  }

  /**
   * Map database row to ApplicationSummary
   */
  private mapRowToApplicationSummary(row: any): ApplicationSummary {
    const slaDeadline = row.sla_deadline ? new Date(row.sla_deadline) : null;
    const now = new Date();
    
    let slaStatus: 'ON_TRACK' | 'AT_RISK' | 'BREACHED' = 'ON_TRACK';
    
    if (slaDeadline) {
      const timeRemaining = slaDeadline.getTime() - now.getTime();
      const totalTime = slaDeadline.getTime() - (row.submitted_at ? new Date(row.submitted_at).getTime() : now.getTime());
      const percentRemaining = timeRemaining / totalTime;
      
      if (timeRemaining < 0) {
        slaStatus = 'BREACHED';
      } else if (percentRemaining < 0.2) {
        slaStatus = 'AT_RISK';
      }
    }

    return {
      id: row.id,
      applicantName: row.applicant_name,
      programType: row.program_type,
      status: row.status as ApplicationStatus,
      submittedAt: row.submitted_at ? new Date(row.submitted_at) : null,
      slaDeadline,
      slaStatus,
      riskScore: row.fraud_flags ? row.fraud_flags.length * 20 : 0,
      fraudFlags: row.fraud_flags || [],
      assignedTo: row.assigned_to,
      requestedAmount: parseFloat(row.requested_amount),
      eligibilityScore: row.eligibility_score ? parseFloat(row.eligibility_score) : null,
    };
  }
}

export default new DashboardRepository();
