/**
 * Webhook Service
 * Handles Microsoft Teams webhook processing
 * Includes user authentication, authorization, and action handling
 */

import userRepository from '../repositories/userRepository';
import auditLogRepository from '../repositories/auditLogRepository';
import applicationService from './applicationService';
import teamsIntegrationService from './teamsIntegrationService';
import redisClient from '../config/redis';
import logger from '../utils/logger';
import { User, UserRole } from '../models/user';
import { EntityType } from '../models/auditLog';
import { Application } from '../models/application';

/**
 * Webhook processing result
 */
export interface WebhookProcessingResult {
  success: boolean;
  message?: string;
  error?: string;
  userId?: string;
  userRole?: UserRole;
  application?: Application;
}

/**
 * Action handler result
 */
export interface ActionHandlerResult {
  success: boolean;
  message: string;
  application?: Application;
  error?: string;
}

class WebhookService {
  // Redis keys for webhook metrics
  private readonly WEBHOOK_METRICS_PREFIX = 'webhook:metrics:';
  private readonly WEBHOOK_FAILURES_PREFIX = 'webhook:failures:';
  private readonly FAILURE_ALERT_THRESHOLD = 5; // Alert after 5 failures in 5 minutes
  private readonly FAILURE_WINDOW = 300; // 5 minutes in seconds

  /**
   * Map Teams AAD Object ID to system user
   * @param aadObjectId - Azure Active Directory Object ID
   * @param teamsUserName - Teams user display name (for logging)
   * @returns User or null if not found
   */
  async mapTeamsUserToSystemUser(
    aadObjectId: string,
    teamsUserName: string
  ): Promise<User | null> {
    try {
      const user = await userRepository.findByAadObjectId(aadObjectId);

      if (!user) {
        logger.warn('Teams user not mapped to system user', {
          aadObjectId,
          teamsUserName,
        });

        // Log unmapped user attempt
        await auditLogRepository.create({
          actionType: 'TEAMS_USER_NOT_MAPPED',
          entityType: EntityType.APPLICATION,
          entityId: 'WEBHOOK',
          performedBy: 'SYSTEM',
          details: {
            aadObjectId,
            teamsUserName,
            reason: 'No system user found with this AAD Object ID',
          },
        });

        return null;
      }

      // Check if user is active
      if (!user.isActive) {
        logger.warn('Inactive user attempted Teams action', {
          userId: user.id,
          aadObjectId,
          teamsUserName,
        });

        await auditLogRepository.create({
          actionType: 'INACTIVE_USER_TEAMS_ACTION',
          entityType: EntityType.APPLICATION,
          entityId: 'WEBHOOK',
          performedBy: user.id,
          details: {
            aadObjectId,
            teamsUserName,
            reason: 'User account is inactive',
          },
        });

        return null;
      }

      logger.info('Teams user mapped to system user', {
        userId: user.id,
        userRole: user.role,
        aadObjectId,
        teamsUserName,
      });

      return user;
    } catch (error) {
      logger.error('Failed to map Teams user to system user', {
        error,
        aadObjectId,
        teamsUserName,
      });
      throw error;
    }
  }

  /**
   * Verify user has required role for action
   * @param user - System user
   * @param action - Action being performed
   * @param applicationId - Application ID
   * @returns True if authorized
   */
  async verifyUserAuthorization(
    user: User,
    action: string,
    applicationId: string
  ): Promise<{ authorized: boolean; reason?: string }> {
    try {
      // Define required roles for each action
      const actionRoleMap: Record<string, UserRole[]> = {
        APPROVE: ['Approver', 'Administrator'],
        REJECT: ['Approver', 'Administrator'],
        DEFER: ['Approver', 'Administrator'],
        REQUEST_INFO: ['Reviewer', 'Approver', 'Administrator'],
        CLAIM: ['Reviewer', 'Approver', 'Administrator'],
        ADD_NOTE: ['Reviewer', 'Approver', 'Administrator'],
      };

      const requiredRoles = actionRoleMap[action];

      if (!requiredRoles) {
        logger.warn('Unknown action type in webhook', {
          action,
          userId: user.id,
          applicationId,
        });

        return {
          authorized: false,
          reason: `Unknown action type: ${action}`,
        };
      }

      // Check if user has required role
      if (!requiredRoles.includes(user.role)) {
        logger.warn('User lacks required role for Teams action', {
          userId: user.id,
          userRole: user.role,
          requiredRoles,
          action,
          applicationId,
        });

        // Log unauthorized attempt
        await auditLogRepository.create({
          actionType: 'UNAUTHORIZED_TEAMS_ACTION',
          entityType: EntityType.APPLICATION,
          entityId: applicationId,
          performedBy: user.id,
          details: {
            action,
            userRole: user.role,
            requiredRoles,
            reason: 'User does not have required role for this action',
          },
        });

        return {
          authorized: false,
          reason: `This action requires one of the following roles: ${requiredRoles.join(', ')}. Your role is: ${user.role}`,
        };
      }

      logger.info('User authorized for Teams action', {
        userId: user.id,
        userRole: user.role,
        action,
        applicationId,
      });

      return { authorized: true };
    } catch (error) {
      logger.error('Failed to verify user authorization', {
        error,
        userId: user.id,
        action,
        applicationId,
      });
      throw error;
    }
  }

  /**
   * Log webhook request for audit trail
   * @param action - Action performed
   * @param applicationId - Application ID
   * @param userId - User ID who performed the action
   * @param teamsUserId - Teams user ID
   * @param success - Whether the action succeeded
   * @param processingTime - Time taken to process in milliseconds
   * @param errorMessage - Error message if failed
   */
  async logWebhookRequest(
    action: string,
    applicationId: string,
    userId: string,
    teamsUserId: string,
    success: boolean,
    processingTime: number,
    errorMessage?: string
  ): Promise<void> {
    try {
      // Log to audit log
      await auditLogRepository.create({
        actionType: success ? 'TEAMS_WEBHOOK_PROCESSED' : 'TEAMS_WEBHOOK_FAILED',
        entityType: EntityType.APPLICATION,
        entityId: applicationId,
        performedBy: userId,
        details: {
          action,
          teamsUserId,
          success,
          processingTime,
          errorMessage,
          timestamp: new Date().toISOString(),
        },
      });

      // Track metrics in Redis
      await this.trackWebhookMetrics(action, success, processingTime);

      // Track failures and alert if threshold exceeded
      if (!success) {
        await this.trackWebhookFailure(action, applicationId, errorMessage);
      }
    } catch (error) {
      logger.error('Failed to log webhook request', {
        error,
        action,
        applicationId,
        userId,
      });
      // Don't throw - logging failure shouldn't break webhook processing
    }
  }

  /**
   * Track webhook metrics in Redis
   * @param action - Action performed
   * @param success - Whether the action succeeded
   * @param processingTime - Time taken to process in milliseconds
   */
  private async trackWebhookMetrics(
    action: string,
    success: boolean,
    processingTime: number
  ): Promise<void> {
    try {
      const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const metricsKey = `${this.WEBHOOK_METRICS_PREFIX}${date}:${action}`;

      // Increment counters
      await redisClient.hincrby(metricsKey, 'total', 1);
      if (success) {
        await redisClient.hincrby(metricsKey, 'success', 1);
      } else {
        await redisClient.hincrby(metricsKey, 'failure', 1);
      }

      // Track processing time (store sum for average calculation)
      await redisClient.hincrby(metricsKey, 'totalProcessingTime', processingTime);

      // Set expiry to 30 days
      await redisClient.expire(metricsKey, 30 * 24 * 60 * 60);

      logger.debug('Webhook metrics tracked', {
        action,
        success,
        processingTime,
        date,
      });
    } catch (error) {
      logger.error('Failed to track webhook metrics', {
        error,
        action,
        success,
        processingTime,
      });
      // Don't throw - metrics tracking failure shouldn't break webhook processing
    }
  }

  /**
   * Track webhook failure and alert if threshold exceeded
   * @param action - Action that failed
   * @param applicationId - Application ID
   * @param errorMessage - Error message
   */
  private async trackWebhookFailure(
    action: string,
    applicationId: string,
    errorMessage?: string
  ): Promise<void> {
    try {
      const failureKey = `${this.WEBHOOK_FAILURES_PREFIX}${action}`;
      const timestamp = Date.now();

      // Add failure to sorted set with timestamp as score
      await redisClient.zadd(failureKey, timestamp, `${timestamp}:${applicationId}`);

      // Remove failures older than the window
      const cutoffTime = timestamp - (this.FAILURE_WINDOW * 1000);
      await redisClient.zremrangebyscore(failureKey, 0, cutoffTime);

      // Set expiry
      await redisClient.expire(failureKey, this.FAILURE_WINDOW);

      // Count recent failures
      const recentFailures = await redisClient.zcount(failureKey, cutoffTime, timestamp);

      logger.debug('Webhook failure tracked', {
        action,
        applicationId,
        recentFailures,
        threshold: this.FAILURE_ALERT_THRESHOLD,
      });

      // Alert if threshold exceeded
      if (recentFailures >= this.FAILURE_ALERT_THRESHOLD) {
        await this.alertAdministratorsOnRepeatedFailures(action, recentFailures, errorMessage);
      }
    } catch (error) {
      logger.error('Failed to track webhook failure', {
        error,
        action,
        applicationId,
      });
      // Don't throw - failure tracking shouldn't break webhook processing
    }
  }

  /**
   * Alert administrators on repeated webhook failures
   * @param action - Action that is failing
   * @param failureCount - Number of recent failures
   * @param lastError - Last error message
   */
  private async alertAdministratorsOnRepeatedFailures(
    action: string,
    failureCount: number,
    lastError?: string
  ): Promise<void> {
    try {
      // Check if we've already alerted recently (prevent spam)
      const alertKey = `${this.WEBHOOK_FAILURES_PREFIX}alert:${action}`;
      const alreadyAlerted = await redisClient.get(alertKey);

      if (alreadyAlerted) {
        logger.debug('Alert already sent for repeated webhook failures', {
          action,
          failureCount,
        });
        return;
      }

      // Set alert flag with 15-minute expiry
      await redisClient.set(alertKey, '1', 15 * 60);

      // Log critical alert
      logger.error('CRITICAL: Repeated webhook failures detected', {
        action,
        failureCount,
        threshold: this.FAILURE_ALERT_THRESHOLD,
        window: `${this.FAILURE_WINDOW} seconds`,
        lastError,
        timestamp: new Date().toISOString(),
      });

      // Create audit log entry for the alert
      await auditLogRepository.create({
        actionType: 'WEBHOOK_FAILURE_ALERT',
        entityType: EntityType.APPLICATION,
        entityId: 'SYSTEM',
        performedBy: 'SYSTEM',
        details: {
          action,
          failureCount,
          threshold: this.FAILURE_ALERT_THRESHOLD,
          window: this.FAILURE_WINDOW,
          lastError,
          severity: 'CRITICAL',
          timestamp: new Date().toISOString(),
        },
      });

      logger.info('Administrator alert created for repeated webhook failures', {
        action,
        failureCount,
      });
    } catch (error) {
      logger.error('Failed to alert administrators on repeated failures', {
        error,
        action,
        failureCount,
      });
      // Don't throw - alerting failure shouldn't break webhook processing
    }
  }

  /**
   * Get webhook metrics for a specific action and date range
   * @param action - Action to get metrics for
   * @param startDate - Start date (YYYY-MM-DD)
   * @param endDate - End date (YYYY-MM-DD)
   * @returns Webhook metrics
   */
  async getWebhookMetrics(
    action: string,
    startDate: string,
    endDate: string
  ): Promise<{
    action: string;
    dateRange: { start: string; end: string };
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    successRate: number;
    averageProcessingTime: number;
  }> {
    try {
      let totalRequests = 0;
      let successfulRequests = 0;
      let failedRequests = 0;
      let totalProcessingTime = 0;

      // Iterate through date range
      const start = new Date(startDate);
      const end = new Date(endDate);
      const currentDate = new Date(start);

      while (currentDate <= end) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const metricsKey = `${this.WEBHOOK_METRICS_PREFIX}${dateStr}:${action}`;

        const metrics = await redisClient.hgetall(metricsKey);

        if (metrics && Object.keys(metrics).length > 0) {
          totalRequests += parseInt(metrics.total || '0', 10);
          successfulRequests += parseInt(metrics.success || '0', 10);
          failedRequests += parseInt(metrics.failure || '0', 10);
          totalProcessingTime += parseInt(metrics.totalProcessingTime || '0', 10);
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;
      const averageProcessingTime = totalRequests > 0 ? totalProcessingTime / totalRequests : 0;

      return {
        action,
        dateRange: { start: startDate, end: endDate },
        totalRequests,
        successfulRequests,
        failedRequests,
        successRate: Math.round(successRate * 100) / 100,
        averageProcessingTime: Math.round(averageProcessingTime * 100) / 100,
      };
    } catch (error) {
      logger.error('Failed to get webhook metrics', {
        error,
        action,
        startDate,
        endDate,
      });
      throw error;
    }
  }

  /**
   * Handle APPROVE action
   * @param applicationId - Application ID
   * @param user - User performing the action
   * @param additionalData - Additional data from webhook
   * @returns Action result
   */
  async handleApproveAction(
    applicationId: string,
    user: User,
    additionalData?: any
  ): Promise<ActionHandlerResult> {
    try {
      logger.info('Processing APPROVE action', {
        applicationId,
        userId: user.id,
        userRole: user.role,
      });

      // Get the application to determine approved amount
      const application = await applicationService.getApplication(applicationId, user.id);

      // Submit approval decision
      const updatedApplication = await applicationService.submitDecision(
        applicationId,
        {
          decision: 'APPROVED',
          amount: additionalData?.amount || application.requestedAmount,
          justification: additionalData?.justification || 'Approved via Microsoft Teams',
          overrideReason: additionalData?.overrideReason,
        },
        user.id,
        user.role
      );

      logger.info('APPROVE action completed', {
        applicationId,
        userId: user.id,
        approvedAmount: updatedApplication.decision?.amount,
      });

      return {
        success: true,
        message: `Application approved by ${user.firstName} ${user.lastName}`,
        application: updatedApplication,
      };
    } catch (error: any) {
      logger.error('Failed to handle APPROVE action', {
        error: error.message,
        applicationId,
        userId: user.id,
      });

      return {
        success: false,
        message: 'Failed to approve application',
        error: error.message,
      };
    }
  }

  /**
   * Handle REJECT action
   * @param applicationId - Application ID
   * @param user - User performing the action
   * @param additionalData - Additional data from webhook
   * @returns Action result
   */
  async handleRejectAction(
    applicationId: string,
    user: User,
    additionalData?: any
  ): Promise<ActionHandlerResult> {
    try {
      logger.info('Processing REJECT action', {
        applicationId,
        userId: user.id,
        userRole: user.role,
      });

      // Submit rejection decision
      const updatedApplication = await applicationService.submitDecision(
        applicationId,
        {
          decision: 'REJECTED',
          justification: additionalData?.justification || 'Rejected via Microsoft Teams',
          overrideReason: additionalData?.overrideReason,
        },
        user.id,
        user.role
      );

      logger.info('REJECT action completed', {
        applicationId,
        userId: user.id,
      });

      return {
        success: true,
        message: `Application rejected by ${user.firstName} ${user.lastName}`,
        application: updatedApplication,
      };
    } catch (error: any) {
      logger.error('Failed to handle REJECT action', {
        error: error.message,
        applicationId,
        userId: user.id,
      });

      return {
        success: false,
        message: 'Failed to reject application',
        error: error.message,
      };
    }
  }

  /**
   * Handle DEFER action
   * @param applicationId - Application ID
   * @param user - User performing the action
   * @param additionalData - Additional data from webhook
   * @returns Action result
   */
  async handleDeferAction(
    applicationId: string,
    user: User,
    additionalData?: any
  ): Promise<ActionHandlerResult> {
    try {
      logger.info('Processing DEFER action', {
        applicationId,
        userId: user.id,
        userRole: user.role,
      });

      // Submit deferral decision
      const updatedApplication = await applicationService.submitDecision(
        applicationId,
        {
          decision: 'DEFERRED',
          justification: additionalData?.justification || 'Deferred via Microsoft Teams',
          overrideReason: additionalData?.overrideReason,
        },
        user.id,
        user.role
      );

      logger.info('DEFER action completed', {
        applicationId,
        userId: user.id,
      });

      return {
        success: true,
        message: `Application deferred by ${user.firstName} ${user.lastName}`,
        application: updatedApplication,
      };
    } catch (error: any) {
      logger.error('Failed to handle DEFER action', {
        error: error.message,
        applicationId,
        userId: user.id,
      });

      return {
        success: false,
        message: 'Failed to defer application',
        error: error.message,
      };
    }
  }

  /**
   * Handle REQUEST_INFO action
   * @param applicationId - Application ID
   * @param user - User performing the action
   * @param additionalData - Additional data from webhook
   * @returns Action result
   */
  async handleRequestInfoAction(
    applicationId: string,
    user: User,
    additionalData?: any
  ): Promise<ActionHandlerResult> {
    try {
      logger.info('Processing REQUEST_INFO action', {
        applicationId,
        userId: user.id,
        userRole: user.role,
      });

      // Update application status to PENDING_DOCUMENTS
      const updatedApplication = await applicationService.updateApplication(
        applicationId,
        {
          status: 'PENDING_DOCUMENTS' as any,
        },
        user.id
      );

      // Log the request for more information
      await auditLogRepository.create({
        actionType: 'MORE_INFO_REQUESTED',
        entityType: EntityType.APPLICATION,
        entityId: applicationId,
        performedBy: user.id,
        details: {
          requestedBy: `${user.firstName} ${user.lastName}`,
          requestedVia: 'Microsoft Teams',
          message: additionalData?.message || 'Additional information requested',
          timestamp: new Date().toISOString(),
        },
      });

      logger.info('REQUEST_INFO action completed', {
        applicationId,
        userId: user.id,
      });

      return {
        success: true,
        message: `Additional information requested by ${user.firstName} ${user.lastName}`,
        application: updatedApplication,
      };
    } catch (error: any) {
      logger.error('Failed to handle REQUEST_INFO action', {
        error: error.message,
        applicationId,
        userId: user.id,
      });

      return {
        success: false,
        message: 'Failed to request additional information',
        error: error.message,
      };
    }
  }

  /**
   * Handle CLAIM action
   * @param applicationId - Application ID
   * @param user - User performing the action
   * @returns Action result
   */
  async handleClaimAction(
    applicationId: string,
    user: User
  ): Promise<ActionHandlerResult> {
    try {
      logger.info('Processing CLAIM action', {
        applicationId,
        userId: user.id,
        userRole: user.role,
      });

      // Assign application to user
      const updatedApplication = await applicationService.updateApplication(
        applicationId,
        {
          assignedTo: user.id,
        },
        user.id
      );

      logger.info('CLAIM action completed', {
        applicationId,
        userId: user.id,
      });

      return {
        success: true,
        message: `Application claimed by ${user.firstName} ${user.lastName}`,
        application: updatedApplication,
      };
    } catch (error: any) {
      logger.error('Failed to handle CLAIM action', {
        error: error.message,
        applicationId,
        userId: user.id,
      });

      return {
        success: false,
        message: 'Failed to claim application',
        error: error.message,
      };
    }
  }

  /**
   * Process webhook action
   * Routes to appropriate action handler and updates Adaptive Card
   * @param action - Action to perform
   * @param applicationId - Application ID
   * @param user - User performing the action
   * @param additionalData - Additional data from webhook
   * @param messageId - Teams message ID to update
   * @returns Processing result
   */
  async processWebhookAction(
    action: string,
    applicationId: string,
    user: User,
    additionalData?: any,
    messageId?: string
  ): Promise<WebhookProcessingResult> {
    try {
      let result: ActionHandlerResult;

      // Route to appropriate action handler
      switch (action) {
        case 'APPROVE':
          result = await this.handleApproveAction(applicationId, user, additionalData);
          break;

        case 'REJECT':
          result = await this.handleRejectAction(applicationId, user, additionalData);
          break;

        case 'DEFER':
          result = await this.handleDeferAction(applicationId, user, additionalData);
          break;

        case 'REQUEST_INFO':
          result = await this.handleRequestInfoAction(applicationId, user, additionalData);
          break;

        case 'CLAIM':
          result = await this.handleClaimAction(applicationId, user);
          break;

        default:
          logger.warn('Unknown action type', { action, applicationId, userId: user.id });
          return {
            success: false,
            error: `Unknown action type: ${action}`,
          };
      }

      // If action succeeded and we have an updated application, update the Adaptive Card
      if (result.success && result.application && messageId) {
        try {
          await teamsIntegrationService.updateAdaptiveCard(
            applicationId,
            'DECISION_READY',
            result.application,
            {
              actionTaken: action,
              actionBy: `${user.firstName} ${user.lastName}`,
              actionAt: new Date(),
            }
          );

          logger.info('Adaptive Card updated after action', {
            applicationId,
            action,
            userId: user.id,
          });
        } catch (cardError: any) {
          // Log error but don't fail the webhook - the action was successful
          logger.error('Failed to update Adaptive Card after action', {
            error: cardError.message,
            applicationId,
            action,
            userId: user.id,
          });
        }
      }

      return {
        success: result.success,
        message: result.message,
        error: result.error,
        userId: user.id,
        userRole: user.role,
        application: result.application,
      };
    } catch (error: any) {
      logger.error('Failed to process webhook action', {
        error: error.message,
        action,
        applicationId,
        userId: user.id,
      });

      return {
        success: false,
        error: error.message || 'Failed to process action',
      };
    }
  }
}

export default new WebhookService();
