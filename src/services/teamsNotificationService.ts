/**
 * Teams Notification Service
 * Event-driven service that listens to application events and posts Teams notifications
 */

import applicationService from './applicationService';
import teamsIntegrationService from './teamsIntegrationService';
import teamsRepository from '../repositories/teamsRepository';
import applicationRepository from '../repositories/applicationRepository';
import logger from '../utils/logger';
import { Application } from '../models/application';
import { CardType } from '../models/teams';

/**
 * Application Event Types
 */
export enum ApplicationEventType {
  NEW_SUBMISSION = 'NEW_SUBMISSION',
  SLA_WARNING = 'SLA_WARNING',
  DECISION_READY = 'DECISION_READY',
  DOCUMENTS_RECEIVED = 'DOCUMENTS_RECEIVED',
  FRAUD_DETECTED = 'FRAUD_DETECTED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  DECISION_MADE = 'DECISION_MADE',
}

/**
 * Application Event Data
 */
export interface ApplicationEvent {
  type: ApplicationEventType;
  applicationId: string;
  application: Application;
  metadata?: {
    previousStatus?: string;
    slaDeadline?: Date;
    timeRemaining?: number;
    fraudFlags?: any[];
    documents?: any[];
    decision?: any;
  };
}

class TeamsNotificationService {
  private initialized = false;

  /**
   * Initialize the notification service and subscribe to application events
   */
  initialize(): void {
    if (this.initialized) {
      logger.warn('Teams notification service already initialized');
      return;
    }

    // Check if Teams integration is enabled
    if (!teamsIntegrationService.isEnabled()) {
      logger.info('Teams integration disabled, notification service will not start');
      return;
    }

    // Subscribe to application events
    this.subscribeToEvents();

    this.initialized = true;
    logger.info('Teams notification service initialized successfully');
  }

  /**
   * Subscribe to application service events
   */
  private subscribeToEvents(): void {
    // Listen for status changes
    applicationService.on('statusChanged', async (data: any) => {
      try {
        await this.handleStatusChanged(data);
      } catch (error) {
        logger.error('Error handling statusChanged event', { error, data });
      }
    });

    // Listen for decisions
    applicationService.on('decisionMade', async (data: any) => {
      try {
        await this.handleDecisionMade(data);
      } catch (error) {
        logger.error('Error handling decisionMade event', { error, data });
      }
    });

    logger.info('Subscribed to application events');
  }

  /**
   * Handle status changed event
   * @param data - Event data
   */
  private async handleStatusChanged(data: {
    applicationId: string;
    previousStatus: string;
    newStatus: string;
    application: Application;
  }): Promise<void> {
    const { applicationId, previousStatus, newStatus, application } = data;

    logger.debug('Processing statusChanged event', {
      applicationId,
      previousStatus,
      newStatus,
    });

    // Determine which notification to send based on status change
    if (newStatus === 'SUBMITTED' && previousStatus === 'DRAFT') {
      // New submission
      await this.handleEvent({
        type: ApplicationEventType.NEW_SUBMISSION,
        applicationId,
        application,
      });
    } else if (newStatus === 'PENDING_DOCUMENTS' && previousStatus !== 'PENDING_DOCUMENTS') {
      // Documents requested - could trigger DOCUMENTS_RECEIVED notification later
      logger.debug('Application moved to PENDING_DOCUMENTS', { applicationId });
    } else if (previousStatus === 'PENDING_DOCUMENTS' && newStatus === 'SUBMITTED') {
      // Documents received
      await this.handleEvent({
        type: ApplicationEventType.DOCUMENTS_RECEIVED,
        applicationId,
        application,
      });
    } else {
      // General status update
      await this.handleEvent({
        type: ApplicationEventType.STATUS_CHANGED,
        applicationId,
        application,
        metadata: {
          previousStatus,
        },
      });
    }
  }

  /**
   * Handle decision made event
   * @param data - Event data
   */
  private async handleDecisionMade(data: {
    applicationId: string;
    decision: string;
    application: Application;
  }): Promise<void> {
    const { applicationId, application } = data;

    logger.debug('Processing decisionMade event', {
      applicationId,
      decision: data.decision,
    });

    // Send decision notification
    await this.handleEvent({
      type: ApplicationEventType.DECISION_MADE,
      applicationId,
      application,
      metadata: {
        decision: data.decision,
      },
    });
  }

  /**
   * Handle application event and post notification if configured
   * @param event - Application event
   */
  async handleEvent(event: ApplicationEvent): Promise<void> {
    try {
      const { type, applicationId, application, metadata } = event;

      logger.debug('Handling application event', {
        type,
        applicationId,
        programType: application.programType,
      });

      // Get Teams channel configuration for this program type
      const config = await teamsRepository.findChannelConfigByProgramType(
        application.programType
      );

      if (!config) {
        logger.debug('No Teams channel configured for program type', {
          programType: application.programType,
        });
        return;
      }

      if (!config.isActive) {
        logger.debug('Teams channel configuration is inactive', {
          programType: application.programType,
        });
        return;
      }

      // Check if this event type should trigger a notification
      if (!this.shouldNotify(type, config.notificationRules)) {
        logger.debug('Notification disabled for event type', {
          type,
          programType: application.programType,
        });
        return;
      }

      // Determine card type and post notification
      const cardType = this.getCardType(type);
      if (cardType) {
        await this.postNotification(application, cardType, metadata);
      }
    } catch (error) {
      logger.error('Failed to handle application event', {
        error,
        event,
      });
      // Don't throw - we don't want to break the application flow
    }
  }

  /**
   * Check if notification should be sent for event type
   * @param eventType - Event type
   * @param notificationRules - Notification rules from configuration
   * @returns True if notification should be sent
   */
  private shouldNotify(
    eventType: ApplicationEventType,
    notificationRules: any
  ): boolean {
    // Map event type to notification rule key
    const ruleKey = eventType as string;

    // Check if rule exists and is enabled
    if (notificationRules[ruleKey] === false) {
      return false;
    }

    // Default to true if rule is not explicitly set to false
    return true;
  }

  /**
   * Get card type for event type
   * @param eventType - Event type
   * @returns Card type or null
   */
  private getCardType(eventType: ApplicationEventType): CardType | null {
    switch (eventType) {
      case ApplicationEventType.NEW_SUBMISSION:
        return 'SUBMISSION';
      case ApplicationEventType.SLA_WARNING:
        return 'SLA_WARNING';
      case ApplicationEventType.DECISION_READY:
        return 'DECISION_READY';
      case ApplicationEventType.STATUS_CHANGED:
      case ApplicationEventType.DECISION_MADE:
      case ApplicationEventType.DOCUMENTS_RECEIVED:
        return 'STATUS_UPDATE';
      default:
        return null;
    }
  }

  /**
   * Post notification to Teams with retry logic
   * @param application - Application
   * @param cardType - Card type
   * @param metadata - Additional metadata
   */
  private async postNotification(
    application: Application,
    cardType: CardType,
    metadata?: any
  ): Promise<void> {
    const maxRetries = 3;
    const retryDelays = [1000, 2000, 5000]; // Exponential backoff in milliseconds

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        logger.info('Posting Teams notification', {
          applicationId: application.id,
          programType: application.programType,
          cardType,
          attempt: attempt + 1,
        });

        await teamsIntegrationService.postAdaptiveCard(
          application.programType,
          cardType,
          application,
          metadata
        );

        logger.info('Teams notification posted successfully', {
          applicationId: application.id,
          cardType,
          attempt: attempt + 1,
        });

        return; // Success, exit retry loop
      } catch (error: any) {
        const isLastAttempt = attempt === maxRetries;
        const isRetryableError = this.isRetryableError(error);

        logger.error('Failed to post Teams notification', {
          error: error.message,
          applicationId: application.id,
          cardType,
          attempt: attempt + 1,
          maxRetries: maxRetries + 1,
          isRetryable: isRetryableError,
          willRetry: !isLastAttempt && isRetryableError,
        });

        // If this is the last attempt or error is not retryable, log and give up
        if (isLastAttempt || !isRetryableError) {
          await this.logFailedNotification(application, cardType, error);
          return; // Don't throw - we don't want to break the application flow
        }

        // Wait before retrying
        const delay = retryDelays[attempt];
        logger.debug('Retrying Teams notification after delay', {
          applicationId: application.id,
          delay,
        });
        await this.sleep(delay);
      }
    }
  }

  /**
   * Check if error is retryable
   * @param error - Error object
   * @returns True if error is retryable
   */
  private isRetryableError(error: any): boolean {
    // Retry on network errors, rate limits, and server errors
    if (error.statusCode) {
      // 429 = Rate limit, 5xx = Server errors
      return error.statusCode === 429 || error.statusCode >= 500;
    }

    // Retry on network errors
    if (error.code) {
      const retryableCodes = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED'];
      return retryableCodes.includes(error.code);
    }

    // Default to not retryable
    return false;
  }

  /**
   * Log failed notification for manual review
   * @param application - Application
   * @param cardType - Card type
   * @param error - Error object
   */
  private async logFailedNotification(
    application: Application,
    cardType: CardType,
    error: any
  ): Promise<void> {
    try {
      logger.error('Teams notification failed after all retries', {
        applicationId: application.id,
        programType: application.programType,
        cardType,
        error: error.message,
        stack: error.stack,
      });

      // TODO: Could store failed notifications in database for retry later
      // For now, just log to error log for manual review
    } catch (logError) {
      logger.error('Failed to log notification failure', { logError });
    }
  }

  /**
   * Sleep for specified milliseconds
   * @param ms - Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Manually trigger a notification for an application
   * Useful for testing or manual notifications
   * @param applicationId - Application ID
   * @param eventType - Event type
   */
  async triggerNotification(
    applicationId: string,
    eventType: ApplicationEventType
  ): Promise<void> {
    try {
      const application = await applicationRepository.findById(applicationId);
      if (!application) {
        throw new Error('Application not found');
      }

      await this.handleEvent({
        type: eventType,
        applicationId,
        application,
      });

      logger.info('Manual notification triggered', {
        applicationId,
        eventType,
      });
    } catch (error) {
      logger.error('Failed to trigger manual notification', {
        error,
        applicationId,
        eventType,
      });
      throw error;
    }
  }

  /**
   * Update existing card for an application
   * Called when application status changes or decisions are made
   * @param applicationId - Application ID
   * @param cardType - Type of card to update
   * @param additionalData - Additional data for card update
   */
  async updateCard(
    applicationId: string,
    cardType: CardType,
    additionalData?: any
  ): Promise<void> {
    try {
      const application = await applicationRepository.findById(applicationId);
      if (!application) {
        logger.warn('Application not found for card update', { applicationId });
        return;
      }

      logger.info('Updating Teams card', {
        applicationId,
        cardType,
      });

      await teamsIntegrationService.updateAdaptiveCard(
        applicationId,
        cardType,
        application,
        additionalData
      );

      logger.info('Teams card updated successfully', {
        applicationId,
        cardType,
      });
    } catch (error) {
      logger.error('Failed to update Teams card', {
        error,
        applicationId,
        cardType,
      });
      // Don't throw - we don't want to break the application flow
    }
  }

  /**
   * Check if service is initialized
   * @returns True if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

export default new TeamsNotificationService();
