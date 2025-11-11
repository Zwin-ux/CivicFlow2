/**
 * Communication Repository
 * Data access layer for communications
 */

import pool from '../config/database';
import {
  Communication,
  CommunicationType,
  CommunicationStatus,
  EmailTemplateType,
  CreateCommunicationRequest,
} from '../models/communication';
import logger from '../utils/logger';

class CommunicationRepository {
  /**
   * Create communication record
   * @param communication - Communication data
   * @returns Created communication
   */
  async create(communication: CreateCommunicationRequest): Promise<Communication> {
    try {
      const result = await pool.query(
        `INSERT INTO communications (
          application_id,
          recipient,
          type,
          template_type,
          subject,
          body,
          status,
          metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING 
          id,
          application_id as "applicationId",
          recipient,
          type,
          template_type as "templateType",
          subject,
          body,
          status,
          sent_at as "sentAt",
          failure_reason as "failureReason",
          metadata,
          created_at as "createdAt",
          updated_at as "updatedAt"`,
        [
          communication.applicationId,
          communication.recipient,
          communication.type,
          communication.templateType || null,
          communication.subject || null,
          communication.body,
          CommunicationStatus.PENDING,
          communication.metadata ? JSON.stringify(communication.metadata) : null,
        ]
      );

      return result.rows[0];
    } catch (error) {
      logger.error('Error creating communication', { error, communication });
      throw error;
    }
  }

  /**
   * Find communication by ID
   * @param id - Communication ID
   * @returns Communication or null
   */
  async findById(id: string): Promise<Communication | null> {
    try {
      const result = await pool.query(
        `SELECT 
          id,
          application_id as "applicationId",
          recipient,
          type,
          template_type as "templateType",
          subject,
          body,
          status,
          sent_at as "sentAt",
          failure_reason as "failureReason",
          metadata,
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM communications
        WHERE id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Error finding communication by ID', { error, id });
      throw error;
    }
  }

  /**
   * Find all communications for an application
   * @param applicationId - Application ID
   * @returns Array of communications
   */
  async findByApplicationId(applicationId: string): Promise<Communication[]> {
    try {
      const result = await pool.query(
        `SELECT 
          id,
          application_id as "applicationId",
          recipient,
          type,
          template_type as "templateType",
          subject,
          body,
          status,
          sent_at as "sentAt",
          failure_reason as "failureReason",
          metadata,
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM communications
        WHERE application_id = $1
        ORDER BY created_at DESC`,
        [applicationId]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error finding communications by application ID', { error, applicationId });
      throw error;
    }
  }

  /**
   * Find communications by recipient
   * @param recipient - Recipient email or phone
   * @param limit - Maximum number of results
   * @returns Array of communications
   */
  async findByRecipient(recipient: string, limit: number = 50): Promise<Communication[]> {
    try {
      const result = await pool.query(
        `SELECT 
          id,
          application_id as "applicationId",
          recipient,
          type,
          template_type as "templateType",
          subject,
          body,
          status,
          sent_at as "sentAt",
          failure_reason as "failureReason",
          metadata,
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM communications
        WHERE recipient = $1
        ORDER BY created_at DESC
        LIMIT $2`,
        [recipient, limit]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error finding communications by recipient', { error, recipient });
      throw error;
    }
  }

  /**
   * Update communication status
   * @param id - Communication ID
   * @param status - New status
   * @param sentAt - Sent timestamp (optional)
   * @param failureReason - Failure reason (optional)
   * @returns Updated communication
   */
  async updateStatus(
    id: string,
    status: CommunicationStatus,
    sentAt?: Date,
    failureReason?: string
  ): Promise<Communication> {
    try {
      const result = await pool.query(
        `UPDATE communications
        SET 
          status = $1,
          sent_at = COALESCE($2, sent_at),
          failure_reason = $3
        WHERE id = $4
        RETURNING 
          id,
          application_id as "applicationId",
          recipient,
          type,
          template_type as "templateType",
          subject,
          body,
          status,
          sent_at as "sentAt",
          failure_reason as "failureReason",
          metadata,
          created_at as "createdAt",
          updated_at as "updatedAt"`,
        [status, sentAt || null, failureReason || null, id]
      );

      if (result.rows.length === 0) {
        throw new Error('Communication not found');
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Error updating communication status', { error, id, status });
      throw error;
    }
  }

  /**
   * Find pending communications
   * @param limit - Maximum number of results
   * @returns Array of pending communications
   */
  async findPending(limit: number = 100): Promise<Communication[]> {
    try {
      const result = await pool.query(
        `SELECT 
          id,
          application_id as "applicationId",
          recipient,
          type,
          template_type as "templateType",
          subject,
          body,
          status,
          sent_at as "sentAt",
          failure_reason as "failureReason",
          metadata,
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM communications
        WHERE status = $1
        ORDER BY created_at ASC
        LIMIT $2`,
        [CommunicationStatus.PENDING, limit]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error finding pending communications', { error });
      throw error;
    }
  }

  /**
   * Get communication statistics for an application
   * @param applicationId - Application ID
   * @returns Communication statistics
   */
  async getStatsByApplicationId(applicationId: string): Promise<{
    total: number;
    sent: number;
    failed: number;
    pending: number;
  }> {
    try {
      const result = await pool.query(
        `SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'SENT') as sent,
          COUNT(*) FILTER (WHERE status = 'FAILED') as failed,
          COUNT(*) FILTER (WHERE status = 'PENDING') as pending
        FROM communications
        WHERE application_id = $1`,
        [applicationId]
      );

      return {
        total: parseInt(result.rows[0].total),
        sent: parseInt(result.rows[0].sent),
        failed: parseInt(result.rows[0].failed),
        pending: parseInt(result.rows[0].pending),
      };
    } catch (error) {
      logger.error('Error getting communication stats', { error, applicationId });
      throw error;
    }
  }
}

export default new CommunicationRepository();
