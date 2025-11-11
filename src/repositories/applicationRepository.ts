/**
 * Application Repository
 * Implements repository pattern for application persistence and retrieval
 */

import { QueryResult } from 'pg';
import database from '../config/database';
import logger from '../utils/logger';
import {
  Application,
  ApplicationStatus,
  CreateApplicationRequest,
  UpdateApplicationRequest,
  FraudFlag,
} from '../models/application';

class ApplicationRepository {
  /**
   * Create a new application
   * @param data - Application creation data
   * @returns Created application
   */
  async create(data: CreateApplicationRequest): Promise<Application> {
    const query = `
      INSERT INTO applications (
        applicant_id,
        program_type,
        requested_amount,
        status
      )
      VALUES ($1, $2, $3, $4)
      RETURNING 
        id,
        applicant_id,
        program_type,
        requested_amount,
        status,
        eligibility_score,
        missing_documents,
        fraud_flags,
        assigned_to,
        submitted_at,
        reviewed_at,
        decided_at,
        decision,
        created_at,
        updated_at
    `;

    const values = [
      data.applicantId,
      data.programType,
      data.requestedAmount,
      ApplicationStatus.DRAFT,
    ];

    try {
      const result: QueryResult = await database.query(query, values);
      return this.mapRowToApplication(result.rows[0]);
    } catch (error) {
      logger.error('Failed to create application', { error, data });
      throw new Error('Failed to create application');
    }
  }

  /**
   * Find application by ID
   * @param id - Application ID
   * @returns Application or null if not found
   */
  async findById(id: string): Promise<Application | null> {
    const query = `
      SELECT 
        id,
        applicant_id,
        program_type,
        requested_amount,
        status,
        eligibility_score,
        missing_documents,
        fraud_flags,
        assigned_to,
        submitted_at,
        reviewed_at,
        decided_at,
        decision,
        created_at,
        updated_at
      FROM applications
      WHERE id = $1
    `;

    try {
      const result: QueryResult = await database.query(query, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToApplication(result.rows[0]);
    } catch (error) {
      logger.error('Failed to find application by ID', { error, id });
      throw new Error('Failed to find application by ID');
    }
  }

  /**
   * Find applications by applicant ID
   * @param applicantId - Applicant ID
   * @returns Array of applications
   */
  async findByApplicantId(applicantId: string): Promise<Application[]> {
    const query = `
      SELECT 
        id,
        applicant_id,
        program_type,
        requested_amount,
        status,
        eligibility_score,
        missing_documents,
        fraud_flags,
        assigned_to,
        submitted_at,
        reviewed_at,
        decided_at,
        decision,
        created_at,
        updated_at
      FROM applications
      WHERE applicant_id = $1
      ORDER BY created_at DESC
    `;

    try {
      const result: QueryResult = await database.query(query, [applicantId]);
      return result.rows.map(row => this.mapRowToApplication(row));
    } catch (error) {
      logger.error('Failed to find applications by applicant ID', { error, applicantId });
      throw new Error('Failed to find applications by applicant ID');
    }
  }

  /**
   * Update application
   * @param id - Application ID
   * @param data - Update data
   * @returns Updated application
   */
  async update(id: string, data: UpdateApplicationRequest): Promise<Application> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.requestedAmount !== undefined) {
      updates.push(`requested_amount = $${paramIndex++}`);
      values.push(data.requestedAmount);
    }

    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(data.status);
    }

    if (data.assignedTo !== undefined) {
      updates.push(`assigned_to = $${paramIndex++}`);
      values.push(data.assignedTo);
    }

    if (data.decision !== undefined) {
      updates.push(`decision = $${paramIndex++}`);
      values.push(JSON.stringify(data.decision));
      updates.push(`decided_at = NOW()`);
    }

    // Always update the updated_at timestamp
    updates.push(`updated_at = NOW()`);

    if (updates.length === 1) {
      // Only updated_at was set, nothing to update
      const existing = await this.findById(id);
      if (!existing) {
        throw new Error('Application not found');
      }
      return existing;
    }

    values.push(id);

    const query = `
      UPDATE applications
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING 
        id,
        applicant_id,
        program_type,
        requested_amount,
        status,
        eligibility_score,
        missing_documents,
        fraud_flags,
        assigned_to,
        submitted_at,
        reviewed_at,
        decided_at,
        decision,
        created_at,
        updated_at
    `;

    try {
      const result: QueryResult = await database.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('Application not found');
      }

      return this.mapRowToApplication(result.rows[0]);
    } catch (error) {
      logger.error('Failed to update application', { error, id, data });
      throw new Error('Failed to update application');
    }
  }

  /**
   * Update application status
   * @param id - Application ID
   * @param status - New status
   * @returns Updated application
   */
  async updateStatus(id: string, status: ApplicationStatus): Promise<Application> {
    const updates: string[] = [`status = $1`, `updated_at = NOW()`];
    
    // Set timestamp fields based on status
    if (status === ApplicationStatus.SUBMITTED) {
      updates.push(`submitted_at = NOW()`);
    } else if (status === ApplicationStatus.UNDER_REVIEW) {
      updates.push(`reviewed_at = NOW()`);
    }

    const query = `
      UPDATE applications
      SET ${updates.join(', ')}
      WHERE id = $2
      RETURNING 
        id,
        applicant_id,
        program_type,
        requested_amount,
        status,
        eligibility_score,
        missing_documents,
        fraud_flags,
        assigned_to,
        submitted_at,
        reviewed_at,
        decided_at,
        decision,
        created_at,
        updated_at
    `;

    try {
      const result: QueryResult = await database.query(query, [status, id]);

      if (result.rows.length === 0) {
        throw new Error('Application not found');
      }

      return this.mapRowToApplication(result.rows[0]);
    } catch (error) {
      logger.error('Failed to update application status', { error, id, status });
      throw new Error('Failed to update application status');
    }
  }

  /**
   * Update eligibility score
   * @param id - Application ID
   * @param score - Eligibility score
   * @returns Updated application
   */
  async updateEligibilityScore(id: string, score: number): Promise<Application> {
    const query = `
      UPDATE applications
      SET 
        eligibility_score = $1,
        updated_at = NOW()
      WHERE id = $2
      RETURNING 
        id,
        applicant_id,
        program_type,
        requested_amount,
        status,
        eligibility_score,
        missing_documents,
        fraud_flags,
        assigned_to,
        submitted_at,
        reviewed_at,
        decided_at,
        decision,
        created_at,
        updated_at
    `;

    try {
      const result: QueryResult = await database.query(query, [score, id]);

      if (result.rows.length === 0) {
        throw new Error('Application not found');
      }

      return this.mapRowToApplication(result.rows[0]);
    } catch (error) {
      logger.error('Failed to update eligibility score', { error, id, score });
      throw new Error('Failed to update eligibility score');
    }
  }

  /**
   * Update missing documents
   * @param id - Application ID
   * @param missingDocuments - Array of missing document types
   * @returns Updated application
   */
  async updateMissingDocuments(id: string, missingDocuments: string[]): Promise<Application> {
    const query = `
      UPDATE applications
      SET 
        missing_documents = $1,
        updated_at = NOW()
      WHERE id = $2
      RETURNING 
        id,
        applicant_id,
        program_type,
        requested_amount,
        status,
        eligibility_score,
        missing_documents,
        fraud_flags,
        assigned_to,
        submitted_at,
        reviewed_at,
        decided_at,
        decision,
        created_at,
        updated_at
    `;

    try {
      const result: QueryResult = await database.query(query, [
        JSON.stringify(missingDocuments),
        id,
      ]);

      if (result.rows.length === 0) {
        throw new Error('Application not found');
      }

      return this.mapRowToApplication(result.rows[0]);
    } catch (error) {
      logger.error('Failed to update missing documents', { error, id, missingDocuments });
      throw new Error('Failed to update missing documents');
    }
  }

  /**
   * Update fraud flags
   * @param id - Application ID
   * @param fraudFlags - Array of fraud flags
   * @returns Updated application
   */
  async updateFraudFlags(id: string, fraudFlags: FraudFlag[]): Promise<Application> {
    const query = `
      UPDATE applications
      SET 
        fraud_flags = $1,
        updated_at = NOW()
      WHERE id = $2
      RETURNING 
        id,
        applicant_id,
        program_type,
        requested_amount,
        status,
        eligibility_score,
        missing_documents,
        fraud_flags,
        assigned_to,
        submitted_at,
        reviewed_at,
        decided_at,
        decision,
        created_at,
        updated_at
    `;

    try {
      const result: QueryResult = await database.query(query, [
        JSON.stringify(fraudFlags),
        id,
      ]);

      if (result.rows.length === 0) {
        throw new Error('Application not found');
      }

      return this.mapRowToApplication(result.rows[0]);
    } catch (error) {
      logger.error('Failed to update fraud flags', { error, id, fraudFlags });
      throw new Error('Failed to update fraud flags');
    }
  }

  /**
   * Delete application
   * @param id - Application ID
   */
  async delete(id: string): Promise<void> {
    const query = 'DELETE FROM applications WHERE id = $1';

    try {
      await database.query(query, [id]);
    } catch (error) {
      logger.error('Failed to delete application', { error, id });
      throw new Error('Failed to delete application');
    }
  }

  /**
   * Find applications by status
   * @param status - Application status
   * @param limit - Maximum number of applications to return
   * @returns Array of applications
   */
  async findByStatus(status: ApplicationStatus, limit: number = 50): Promise<Application[]> {
    const query = `
      SELECT 
        id,
        applicant_id,
        program_type,
        requested_amount,
        status,
        eligibility_score,
        missing_documents,
        fraud_flags,
        assigned_to,
        submitted_at,
        reviewed_at,
        decided_at,
        decision,
        created_at,
        updated_at
      FROM applications
      WHERE status = $1
      ORDER BY submitted_at DESC NULLS LAST, created_at DESC
      LIMIT $2
    `;

    try {
      const result: QueryResult = await database.query(query, [status, limit]);
      return result.rows.map(row => this.mapRowToApplication(row));
    } catch (error) {
      logger.error('Failed to find applications by status', { error, status });
      throw new Error('Failed to find applications by status');
    }
  }

  /**
   * Find applications for staff review queue with filtering and sorting
   * @param filters - Filter criteria
   * @returns Array of applications with applicant details
   */
  async findForReviewQueue(filters: {
    staffMemberId?: string;
    status?: ApplicationStatus[];
    programType?: string;
    sortBy?: 'submittedAt' | 'eligibilityScore';
    sortOrder?: 'ASC' | 'DESC';
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Filter by assigned staff member
    if (filters.staffMemberId) {
      conditions.push(`a.assigned_to = $${paramIndex++}`);
      values.push(filters.staffMemberId);
    }

    // Filter by status (default to review-eligible statuses)
    const statusFilter = filters.status || [
      ApplicationStatus.SUBMITTED,
      ApplicationStatus.UNDER_REVIEW,
      ApplicationStatus.PENDING_DOCUMENTS,
      ApplicationStatus.DEFERRED,
    ];
    conditions.push(`a.status = ANY($${paramIndex++})`);
    values.push(statusFilter);

    // Filter by program type
    if (filters.programType) {
      conditions.push(`a.program_type = $${paramIndex++}`);
      values.push(filters.programType);
    }

    // Build WHERE clause
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Build ORDER BY clause
    const sortBy = filters.sortBy || 'submittedAt';
    const sortOrder = filters.sortOrder || 'DESC';
    let orderByClause = '';
    
    if (sortBy === 'submittedAt') {
      orderByClause = `ORDER BY a.submitted_at ${sortOrder} NULLS LAST, a.created_at ${sortOrder}`;
    } else if (sortBy === 'eligibilityScore') {
      orderByClause = `ORDER BY a.eligibility_score ${sortOrder} NULLS LAST, a.submitted_at DESC NULLS LAST`;
    }

    // Pagination
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    const query = `
      SELECT 
        a.id,
        a.applicant_id,
        a.program_type,
        a.requested_amount,
        a.status,
        a.eligibility_score,
        a.missing_documents,
        a.fraud_flags,
        a.assigned_to,
        a.submitted_at,
        a.reviewed_at,
        a.decided_at,
        a.decision,
        a.created_at,
        a.updated_at,
        ap.business_name,
        ap.ein,
        ap.contact_info
      FROM applications a
      INNER JOIN applicants ap ON a.applicant_id = ap.id
      ${whereClause}
      ${orderByClause}
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    values.push(limit, offset);

    try {
      const result: QueryResult = await database.query(query, values);
      return result.rows.map(row => ({
        ...this.mapRowToApplication(row),
        applicant: {
          businessName: row.business_name,
          ein: row.ein,
          email: row.contact_info?.email,
          phone: row.contact_info?.phone,
        },
      }));
    } catch (error) {
      logger.error('Failed to find applications for review queue', { error, filters });
      throw new Error('Failed to find applications for review queue');
    }
  }

  /**
   * Count applications for review queue with filtering
   * @param filters - Filter criteria
   * @returns Total count
   */
  async countForReviewQueue(filters: {
    staffMemberId?: string;
    status?: ApplicationStatus[];
    programType?: string;
  }): Promise<number> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Filter by assigned staff member
    if (filters.staffMemberId) {
      conditions.push(`assigned_to = $${paramIndex++}`);
      values.push(filters.staffMemberId);
    }

    // Filter by status (default to review-eligible statuses)
    const statusFilter = filters.status || [
      ApplicationStatus.SUBMITTED,
      ApplicationStatus.UNDER_REVIEW,
      ApplicationStatus.PENDING_DOCUMENTS,
      ApplicationStatus.DEFERRED,
    ];
    conditions.push(`status = ANY($${paramIndex++})`);
    values.push(statusFilter);

    // Filter by program type
    if (filters.programType) {
      conditions.push(`program_type = $${paramIndex++}`);
      values.push(filters.programType);
    }

    // Build WHERE clause
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT COUNT(*) as total
      FROM applications
      ${whereClause}
    `;

    try {
      const result: QueryResult = await database.query(query, values);
      return parseInt(result.rows[0].total, 10);
    } catch (error) {
      logger.error('Failed to count applications for review queue', { error, filters });
      throw new Error('Failed to count applications for review queue');
    }
  }

  /**
   * Map database row to Application object
   * @param row - Database row
   * @returns Application object
   */
  private mapRowToApplication(row: any): Application {
    return {
      id: row.id,
      applicantId: row.applicant_id,
      programType: row.program_type,
      requestedAmount: parseFloat(row.requested_amount),
      status: row.status as ApplicationStatus,
      eligibilityScore: row.eligibility_score ? parseFloat(row.eligibility_score) : undefined,
      missingDocuments: row.missing_documents || [],
      fraudFlags: row.fraud_flags || [],
      assignedTo: row.assigned_to || undefined,
      submittedAt: row.submitted_at ? new Date(row.submitted_at) : undefined,
      reviewedAt: row.reviewed_at ? new Date(row.reviewed_at) : undefined,
      decidedAt: row.decided_at ? new Date(row.decided_at) : undefined,
      decision: row.decision || undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

export default new ApplicationRepository();
