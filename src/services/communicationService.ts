/**
 * Communication Service
 * Business logic layer for communication operations
 */

import communicationRepository from '../repositories/communicationRepository';
import emailTemplateRepository from '../repositories/emailTemplateRepository';
import auditLogRepository from '../repositories/auditLogRepository';
import pool from '../config/database';
import emailClient from '../clients/emailClient';
import templateRenderer from '../utils/templateRenderer';
import messageQueue from '../utils/messageQueue';
import logger from '../utils/logger';
import {
  Communication,
  CommunicationType,
  CommunicationStatus,
  EmailTemplateType,
  EmailTemplateData,
  StaffSummary,
} from '../models/communication';
import { ApplicationStatus, FraudFlag } from '../models/application';
import { EntityType } from '../models/auditLog';

class CommunicationService {
  private readonly EMAIL_QUEUE = 'email_queue';

  /**
   * Send application notification to applicant
   * @param applicationId - Application ID
   * @param templateType - Email template type
   * @returns Communication record
   */
  async sendApplicationNotification(
    applicationId: string,
    templateType: EmailTemplateType
  ): Promise<Communication> {
    try {
      // Get application with applicant details
      const application = await this.getApplicationWithApplicant(applicationId);
      if (!application) {
        throw new Error('Application not found');
      }

      // Get email template
      const template = await emailTemplateRepository.findByType(templateType);
      if (!template) {
        throw new Error(`Email template not found: ${templateType}`);
      }

      // Prepare template data
      const templateData: EmailTemplateData = {
        applicantName: `${application.applicant.ownerFirstName} ${application.applicant.ownerLastName}`,
        businessName: application.applicant.businessName,
        applicationId: application.id,
        programType: application.programType,
        requestedAmount: application.requestedAmount,
        status: application.status,
        missingDocuments: application.missingDocuments,
        eligibilityScore: application.eligibilityScore,
      };

      // Add decision-specific data
      if (application.decision) {
        templateData.decision = application.decision.decision;
        templateData.decisionReason = application.decision.justification;
        templateData.approvedAmount = application.decision.amount;
      }

      // Render email content
      const subject = templateRenderer.renderSubject(template.subject, templateData);
      const bodyHtml = templateRenderer.renderHtml(template.bodyHtml, templateData);
      const bodyText = templateRenderer.renderText(template.bodyText, templateData);

      // Create communication record
      const communication = await communicationRepository.create({
        applicationId: application.id,
        recipient: application.applicant.email,
        type: CommunicationType.EMAIL,
        templateType,
        subject,
        body: bodyText,
        metadata: {
          htmlBody: bodyHtml,
        },
      });

      // Queue email for sending
      await messageQueue.enqueue(this.EMAIL_QUEUE, {
        communicationId: communication.id,
        to: application.applicant.email,
        subject,
        html: bodyHtml,
        text: bodyText,
      });

      // Log communication action
      await auditLogRepository.create({
        actionType: 'COMMUNICATION_CREATED',
        entityType: EntityType.COMMUNICATION,
        entityId: communication.id,
        performedBy: 'SYSTEM',
        details: {
          applicationId: application.id,
          recipient: application.applicant.email,
          templateType,
        },
      });

      logger.info('Application notification queued', {
        communicationId: communication.id,
        applicationId: application.id,
        templateType,
      });

      return communication;
    } catch (error) {
      logger.error('Failed to send application notification', {
        error,
        applicationId,
        templateType,
      });
      throw error;
    }
  }

  /**
   * Generate and send staff summary
   * @param applicationId - Application ID
   * @param staffEmail - Staff member email
   * @returns Communication record
   */
  async sendStaffSummary(applicationId: string, staffEmail: string): Promise<Communication> {
    try {
      // Generate staff summary
      const summary = await this.generateStaffSummary(applicationId);

      // Get email template
      const template = await emailTemplateRepository.findByType(EmailTemplateType.STAFF_SUMMARY);
      if (!template) {
        throw new Error('Staff summary template not found');
      }

      // Prepare template data
      const templateData: EmailTemplateData = {
        ...summary,
        staffSummary: summary,
      };

      // Render email content
      const subject = templateRenderer.renderSubject(template.subject, templateData);
      const bodyHtml = templateRenderer.renderHtml(template.bodyHtml, templateData);
      const bodyText = templateRenderer.renderText(template.bodyText, templateData);

      // Create communication record
      const communication = await communicationRepository.create({
        applicationId,
        recipient: staffEmail,
        type: CommunicationType.EMAIL,
        templateType: EmailTemplateType.STAFF_SUMMARY,
        subject,
        body: bodyText,
        metadata: {
          htmlBody: bodyHtml,
          summary,
        },
      });

      // Queue email for sending
      await messageQueue.enqueue(this.EMAIL_QUEUE, {
        communicationId: communication.id,
        to: staffEmail,
        subject,
        html: bodyHtml,
        text: bodyText,
      });

      // Log communication action
      await auditLogRepository.create({
        actionType: 'STAFF_SUMMARY_SENT',
        entityType: EntityType.COMMUNICATION,
        entityId: communication.id,
        performedBy: 'SYSTEM',
        details: {
          applicationId,
          recipient: staffEmail,
        },
      });

      logger.info('Staff summary queued', {
        communicationId: communication.id,
        applicationId,
        staffEmail,
      });

      return communication;
    } catch (error) {
      logger.error('Failed to send staff summary', { error, applicationId, staffEmail });
      throw error;
    }
  }

  /**
   * Generate staff summary for application
   * @param applicationId - Application ID
   * @returns Staff summary
   */
  async generateStaffSummary(applicationId: string): Promise<StaffSummary> {
    try {
      const application = await this.getApplicationWithApplicant(applicationId);
      if (!application) {
        throw new Error('Application not found');
      }

      // Determine recommended action
      const recommendedAction = this.determineRecommendedAction(application);

      // Generate reasoning
      const reasoning = this.generateReasoning(application);

      const summary: StaffSummary = {
        applicationId: application.id,
        applicantName: `${application.applicant.ownerFirstName} ${application.applicant.ownerLastName}`,
        businessName: application.applicant.businessName,
        programType: application.programType,
        requestedAmount: application.requestedAmount,
        eligibilityScore: application.eligibilityScore,
        missingDocuments: application.missingDocuments,
        fraudFlags: application.fraudFlags.map((flag: FraudFlag) => ({
          type: flag.type,
          severity: flag.severity,
          description: flag.description,
        })),
        recommendedAction,
        reasoning,
        submittedAt: application.submittedAt,
      };

      return summary;
    } catch (error) {
      logger.error('Failed to generate staff summary', { error, applicationId });
      throw error;
    }
  }

  /**
   * Process email queue
   * Processes pending emails from the queue
   */
  async processEmailQueue(): Promise<void> {
    try {
      const queueLength = await messageQueue.getQueueLength(this.EMAIL_QUEUE);
      if (queueLength === 0) {
        return;
      }

      logger.info('Processing email queue', { queueLength });

      // Process up to 10 emails at a time
      const batchSize = Math.min(queueLength, 10);
      for (let i = 0; i < batchSize; i++) {
        const message = await messageQueue.dequeue(this.EMAIL_QUEUE);
        if (!message) {
          break;
        }

        try {
          await this.sendEmail(message.data);
          await messageQueue.complete(this.EMAIL_QUEUE, message.id);
        } catch (error) {
          logger.error('Failed to send email from queue', { error, messageId: message.id });
          await messageQueue.retry(this.EMAIL_QUEUE, message);
        }
      }
    } catch (error) {
      logger.error('Failed to process email queue', { error });
      throw error;
    }
  }

  /**
   * Send email
   * @param emailData - Email data from queue
   */
  private async sendEmail(emailData: any): Promise<void> {
    try {
      const { communicationId, to, subject, html, text } = emailData;

      // Send email via email client
      const result = await emailClient.sendEmail({
        to,
        subject,
        html,
        text,
      });

      // Update communication status
      if (result.success) {
        await communicationRepository.updateStatus(
          communicationId,
          CommunicationStatus.SENT,
          new Date()
        );

        logger.info('Email sent successfully', { communicationId, to });
      } else {
        await communicationRepository.updateStatus(
          communicationId,
          CommunicationStatus.FAILED,
          undefined,
          result.error
        );

        logger.error('Email sending failed', { communicationId, to, error: result.error });
      }
    } catch (error) {
      logger.error('Failed to send email', { error, emailData });
      throw error;
    }
  }

  /**
   * Get communication history for application
   * @param applicationId - Application ID
   * @returns Array of communications
   */
  async getCommunicationHistory(applicationId: string): Promise<Communication[]> {
    try {
      return await communicationRepository.findByApplicationId(applicationId);
    } catch (error) {
      logger.error('Failed to get communication history', { error, applicationId });
      throw error;
    }
  }

  /**
   * Get communication by ID
   * @param communicationId - Communication ID
   * @returns Communication or null
   */
  async getCommunication(communicationId: string): Promise<Communication | null> {
    try {
      return await communicationRepository.findById(communicationId);
    } catch (error) {
      logger.error('Failed to get communication', { error, communicationId });
      throw error;
    }
  }

  /**
   * Get application with applicant details
   * @param applicationId - Application ID
   * @returns Application with applicant or null
   */
  private async getApplicationWithApplicant(applicationId: string): Promise<any | null> {
    try {
      const result = await pool.query(
        `SELECT 
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
          ap.email,
          ap.phone,
          ap.owner_first_name,
          ap.owner_last_name
        FROM applications a
        JOIN applicants ap ON a.applicant_id = ap.id
        WHERE a.id = $1`,
        [applicationId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
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
        applicant: {
          businessName: row.business_name,
          ein: row.ein,
          email: row.email,
          phone: row.phone,
          ownerFirstName: row.owner_first_name,
          ownerLastName: row.owner_last_name,
        },
      };
    } catch (error) {
      logger.error('Failed to get application with applicant', { error, applicationId });
      throw error;
    }
  }

  /**
   * Determine recommended action for application
   * @param application - Application with applicant
   * @returns Recommended action
   */
  private determineRecommendedAction(
    application: any
  ): 'APPROVE' | 'REJECT' | 'REQUEST_INFO' {
    // If missing documents, request more info
    if (application.missingDocuments.length > 0) {
      return 'REQUEST_INFO';
    }

    // If high severity fraud flags, recommend rejection
    const highSeverityFlags = application.fraudFlags.filter(
      (flag: FraudFlag) => flag.severity === 'HIGH'
    );
    if (highSeverityFlags.length > 0) {
      return 'REJECT';
    }

    // If eligibility score is available
    if (application.eligibilityScore !== undefined) {
      if (application.eligibilityScore >= 70) {
        return 'APPROVE';
      } else if (application.eligibilityScore < 50) {
        return 'REJECT';
      } else {
        return 'REQUEST_INFO';
      }
    }

    // Default to requesting more info
    return 'REQUEST_INFO';
  }

  /**
   * Generate reasoning for recommended action
   * @param application - Application with applicant
   * @returns Array of reasoning strings
   */
  private generateReasoning(application: any): string[] {
    const reasoning: string[] = [];

    // Eligibility score reasoning
    if (application.eligibilityScore !== undefined) {
      reasoning.push(`Eligibility score: ${application.eligibilityScore}/100`);
      if (application.eligibilityScore >= 70) {
        reasoning.push('Score meets approval threshold');
      } else if (application.eligibilityScore < 50) {
        reasoning.push('Score below minimum threshold');
      } else {
        reasoning.push('Score in borderline range, requires manual review');
      }
    } else {
      reasoning.push('Eligibility score not yet calculated');
    }

    // Missing documents reasoning
    if (application.missingDocuments.length > 0) {
      reasoning.push(
        `Missing ${application.missingDocuments.length} required document(s)`
      );
    } else {
      reasoning.push('All required documents submitted');
    }

    // Fraud flags reasoning
    if (application.fraudFlags.length > 0) {
      const highSeverity = application.fraudFlags.filter(
        (flag: FraudFlag) => flag.severity === 'HIGH'
      ).length;
      const mediumSeverity = application.fraudFlags.filter(
        (flag: FraudFlag) => flag.severity === 'MEDIUM'
      ).length;
      const lowSeverity = application.fraudFlags.filter(
        (flag: FraudFlag) => flag.severity === 'LOW'
      ).length;

      if (highSeverity > 0) {
        reasoning.push(`${highSeverity} high-severity fraud flag(s) detected`);
      }
      if (mediumSeverity > 0) {
        reasoning.push(`${mediumSeverity} medium-severity fraud flag(s) detected`);
      }
      if (lowSeverity > 0) {
        reasoning.push(`${lowSeverity} low-severity fraud flag(s) detected`);
      }
    } else {
      reasoning.push('No fraud flags detected');
    }

    return reasoning;
  }
}

export default new CommunicationService();
