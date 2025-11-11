/**
 * Teams Integration Service
 * Core service for Microsoft Teams integration
 * Handles channel management, message posting, and webhook processing
 */

import graphClient from '../clients/graphClient';
import teamsRepository from '../repositories/teamsRepository';
import redisClient from '../config/redis';
import logger from '../utils/logger';
import { Application } from '../models/application';
import {
  TeamsChannelConfig,
  CardType,
  MeetingInfo,
  NotificationRules,
} from '../models/teams';
import {
  createAdaptiveCard,
  wrapCardInMessage,
} from '../utils/adaptiveCardFactory';

// Redis cache keys
const CHANNEL_CACHE_PREFIX = 'teams:channel:';
const CHANNEL_CACHE_TTL = 3600; // 1 hour

class TeamsIntegrationService {
  /**
   * Ensure Teams channel exists for program type
   * Creates channel if it doesn't exist, or retrieves from cache/database
   * @param programType - Program type
   * @param teamId - Microsoft Teams team ID (required if creating new channel)
   * @returns Channel information
   */
  async ensureChannel(
    programType: string,
    teamId?: string
  ): Promise<{ teamId: string; channelId: string; channelName: string }> {
    try {
      // Check if Graph client is initialized
      if (!graphClient.isInitialized()) {
        throw new Error('Microsoft Graph client not initialized. Teams integration is disabled.');
      }

      // Check Redis cache first
      const cacheKey = `${CHANNEL_CACHE_PREFIX}${programType}`;
      const cachedData = await redisClient.get(cacheKey);

      if (cachedData) {
        logger.debug('Teams channel found in cache', { programType });
        return JSON.parse(cachedData);
      }

      // Check database
      const config = await teamsRepository.findChannelConfigByProgramType(programType);

      if (config) {
        logger.debug('Teams channel found in database', { programType });
        
        // Verify channel still exists in Teams
        try {
          await graphClient.getChannel(config.teamId, config.channelId);
          
          // Cache the result
          await redisClient.set(
            cacheKey,
            JSON.stringify({
              teamId: config.teamId,
              channelId: config.channelId,
              channelName: config.channelName,
            }),
            CHANNEL_CACHE_TTL
          );

          return {
            teamId: config.teamId,
            channelId: config.channelId,
            channelName: config.channelName,
          };
        } catch (error) {
          logger.warn('Cached channel no longer exists in Teams, will recreate', {
            programType,
            error,
          });
          // Channel was deleted in Teams, remove from database
          await teamsRepository.deleteChannelConfig(config.id);
        }
      }

      // Channel doesn't exist, create it
      if (!teamId) {
        throw new Error(
          `Teams channel not configured for program type: ${programType}. Team ID required to create new channel.`
        );
      }

      logger.info('Creating new Teams channel', { programType, teamId });

      const channelName = this.generateChannelName(programType);
      const channelInfo = await graphClient.createChannel(
        teamId,
        channelName,
        `Channel for ${programType} loan applications`
      );

      // Save to database
      await teamsRepository.createChannelConfig({
        programType,
        teamId: channelInfo.teamId,
        channelId: channelInfo.channelId,
        channelName: channelInfo.channelName,
        notificationRules: {
          NEW_SUBMISSION: true,
          SLA_WARNING: true,
          DECISION_READY: true,
          DOCUMENTS_RECEIVED: true,
          FRAUD_DETECTED: true,
        },
        isActive: true,
      });

      // Cache the result
      await redisClient.set(
        cacheKey,
        JSON.stringify({
          teamId: channelInfo.teamId,
          channelId: channelInfo.channelId,
          channelName: channelInfo.channelName,
        }),
        CHANNEL_CACHE_TTL
      );

      logger.info('Teams channel created successfully', {
        programType,
        channelId: channelInfo.channelId,
      });

      return {
        teamId: channelInfo.teamId,
        channelId: channelInfo.channelId,
        channelName: channelInfo.channelName,
      };
    } catch (error) {
      logger.error('Failed to ensure Teams channel', { error, programType });
      throw error;
    }
  }

  /**
   * Generate channel name from program type
   * @param programType - Program type
   * @returns Formatted channel name
   */
  private generateChannelName(programType: string): string {
    // Convert SMALL_BUSINESS_LOAN to "Small Business Loan"
    return programType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ') + ' - Applications';
  }

  /**
   * Post Adaptive Card to Teams channel
   * @param programType - Program type
   * @param cardType - Type of card to post
   * @param application - Application data
   * @param additionalData - Additional data for card generation
   * @returns Message ID
   */
  async postAdaptiveCard(
    programType: string,
    cardType: CardType,
    application: Application,
    additionalData?: any
  ): Promise<string> {
    try {
      if (!graphClient.isInitialized()) {
        logger.warn('Teams integration disabled, skipping card post');
        return '';
      }

      // Get channel configuration
      const config = await teamsRepository.findChannelConfigByProgramType(programType);

      if (!config) {
        logger.warn('No Teams channel configured for program type', { programType });
        return '';
      }

      // Check if this event type should trigger a notification
      const eventKey = this.getNotificationEventKey(cardType);
      if (eventKey && config.notificationRules[eventKey] === false) {
        logger.debug('Notification disabled for event type', { programType, cardType });
        return '';
      }

      // Ensure channel exists
      const channelInfo = await this.ensureChannel(programType);

      // Generate Adaptive Card
      const card = createAdaptiveCard(cardType, application, additionalData);

      // Wrap card in Teams message format
      const message = wrapCardInMessage(card);

      // Post message to Teams
      const response = await graphClient.postMessageToChannel(
        channelInfo.teamId,
        channelInfo.channelId,
        message
      );

      // Store message record in database
      await teamsRepository.createMessage({
        applicationId: application.id,
        messageId: response.id,
        channelId: channelInfo.channelId,
        cardType,
      });

      logger.info('Adaptive Card posted to Teams', {
        applicationId: application.id,
        cardType,
        messageId: response.id,
      });

      return response.id;
    } catch (error) {
      logger.error('Failed to post Adaptive Card to Teams', {
        error,
        programType,
        cardType,
        applicationId: application.id,
      });
      throw error;
    }
  }

  /**
   * Update existing Adaptive Card in Teams
   * @param applicationId - Application ID
   * @param cardType - Type of card to update
   * @param application - Updated application data
   * @param additionalData - Additional data for card generation
   */
  async updateAdaptiveCard(
    applicationId: string,
    cardType: CardType,
    application: Application,
    additionalData?: any
  ): Promise<void> {
    try {
      if (!graphClient.isInitialized()) {
        logger.warn('Teams integration disabled, skipping card update');
        return;
      }

      // Find existing message
      const message = await teamsRepository.findMessageByApplicationAndType(
        applicationId,
        cardType
      );

      if (!message) {
        logger.warn('No existing Teams message found to update', { applicationId, cardType });
        return;
      }

      // Get channel configuration
      const config = await teamsRepository.findChannelConfigByProgramType(application.programType);

      if (!config) {
        logger.warn('No Teams channel configured for program type', {
          programType: application.programType,
        });
        return;
      }

      // Add action completion indicator if action was taken
      const cardData = { ...additionalData };
      if (additionalData?.actionTaken && additionalData?.actionBy && additionalData?.actionAt) {
        cardData.actionCompleted = {
          action: additionalData.actionTaken,
          completedBy: additionalData.actionBy,
          completedAt: additionalData.actionAt,
        };
      }

      // Generate updated Adaptive Card
      const card = createAdaptiveCard(cardType, application, cardData);

      // Wrap card in Teams message format
      const updatedMessage = wrapCardInMessage(card);

      // Update message in Teams
      await graphClient.updateMessage(
        config.teamId,
        message.channelId,
        message.messageId,
        updatedMessage
      );

      // Update the message record in database
      await teamsRepository.updateMessage(message.id, message.messageId);

      logger.info('Adaptive Card updated in Teams', {
        applicationId,
        cardType,
        messageId: message.messageId,
        actionTaken: additionalData?.actionTaken,
      });
    } catch (error) {
      logger.error('Failed to update Adaptive Card in Teams', {
        error,
        applicationId,
        cardType,
      });
      throw error;
    }
  }

  /**
   * Create Teams meeting for application huddle
   * @param applicationId - Application ID
   * @param subject - Meeting subject
   * @param _participants - Array of participant user IDs (reserved for future use)
   * @param startDateTime - Meeting start time
   * @param endDateTime - Meeting end time
   * @returns Meeting information
   */
  async createMeeting(
    applicationId: string,
    subject: string,
    _participants: string[],
    startDateTime: Date,
    endDateTime: Date
  ): Promise<MeetingInfo> {
    try {
      if (!graphClient.isInitialized()) {
        throw new Error('Microsoft Graph client not initialized');
      }

      const meeting = await graphClient.createOnlineMeeting(
        subject,
        startDateTime,
        endDateTime
      );

      logger.info('Teams meeting created', {
        applicationId,
        meetingId: meeting.id,
      });

      return {
        id: meeting.id,
        joinUrl: meeting.joinWebUrl,
        subject: meeting.subject,
        startDateTime: new Date(meeting.startDateTime),
        endDateTime: new Date(meeting.endDateTime),
      };
    } catch (error) {
      logger.error('Failed to create Teams meeting', {
        error,
        applicationId,
      });
      throw error;
    }
  }

  /**
   * Invalidate channel cache for program type
   * @param programType - Program type
   */
  async invalidateChannelCache(programType: string): Promise<void> {
    try {
      const cacheKey = `${CHANNEL_CACHE_PREFIX}${programType}`;
      await redisClient.del(cacheKey);
      logger.debug('Channel cache invalidated', { programType });
    } catch (error) {
      logger.error('Failed to invalidate channel cache', { error, programType });
    }
  }

  /**
   * Get notification event key from card type
   * @param cardType - Card type
   * @returns Notification event key
   */
  private getNotificationEventKey(
    cardType: CardType
  ): keyof NotificationRules | null {
    switch (cardType) {
      case 'SUBMISSION':
        return 'NEW_SUBMISSION';
      case 'SLA_WARNING':
        return 'SLA_WARNING';
      case 'DECISION_READY':
        return 'DECISION_READY';
      case 'STATUS_UPDATE':
        return 'STATUS_CHANGED';
      default:
        return null;
    }
  }

  /**
   * Get Teams channel configuration for program type
   * @param programType - Program type
   * @returns Channel configuration or null
   */
  async getChannelConfig(programType: string): Promise<TeamsChannelConfig | null> {
    return await teamsRepository.findChannelConfigByProgramType(programType);
  }

  /**
   * Update Teams channel configuration
   * @param id - Configuration ID
   * @param updates - Fields to update
   * @returns Updated configuration
   */
  async updateChannelConfig(
    id: string,
    updates: Partial<Omit<TeamsChannelConfig, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<TeamsChannelConfig> {
    const config = await teamsRepository.updateChannelConfig(id, updates);
    
    // Invalidate cache
    await this.invalidateChannelCache(config.programType);
    
    return config;
  }

  /**
   * Get all active Teams channel configurations
   * @returns Array of channel configurations
   */
  async getAllChannelConfigs(): Promise<TeamsChannelConfig[]> {
    return await teamsRepository.findAllActiveChannelConfigs();
  }

  /**
   * Check if Teams integration is enabled
   * @returns True if enabled
   */
  isEnabled(): boolean {
    return graphClient.isInitialized();
  }
}

export default new TeamsIntegrationService();
