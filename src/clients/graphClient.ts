/**
 * Microsoft Graph API Client
 * Handles authentication and API calls to Microsoft Graph for Teams integration
 * Implements OAuth 2.0 client credentials flow
 */

import { Client } from '@microsoft/microsoft-graph-client';
import { ClientSecretCredential } from '@azure/identity';
import 'isomorphic-fetch';
import config from '../config';
import logger from '../utils/logger';
import CircuitBreaker from 'opossum';
import { createCircuitBreaker } from '../utils/circuitBreaker';

export interface GraphClientConfig {
  clientId: string;
  clientSecret: string;
  tenantId: string;
}

export interface ChannelInfo {
  teamId: string;
  channelId: string;
  channelName: string;
  webUrl: string;
}

export interface MessageResponse {
  id: string;
  webUrl: string;
  createdDateTime: string;
}

class GraphClient {
  private client: Client | null = null;
  private initialized: boolean = false;
  private credential: ClientSecretCredential | null = null;
  private circuitBreaker: CircuitBreaker<[() => Promise<any>], any>;

  constructor() {
    this.initialize();
    
    // Create circuit breaker for Graph API calls
    this.circuitBreaker = createCircuitBreaker(
      async (apiCall: () => Promise<any>) => await apiCall(),
      {
        timeout: 30000, // 30 seconds
        errorThresholdPercentage: 50,
        resetTimeout: 60000, // 1 minute
        rollingCountTimeout: 30000,
        name: 'GraphAPIService',
      }
    );

    // Fallback for circuit breaker
    this.circuitBreaker.fallback(async () => {
      logger.warn('Graph API circuit breaker open, operation will be retried later');
      throw new Error('Microsoft Graph API temporarily unavailable');
    });
  }

  /**
   * Initialize Microsoft Graph client with OAuth 2.0 credentials
   */
  private initialize(): void {
    try {
      const { clientId, clientSecret, tenantId } = config.teams;

      // Check if credentials are configured
      if (!clientId || !clientSecret || !tenantId) {
        logger.warn('Microsoft Teams credentials not configured. Teams integration will be disabled.');
        this.initialized = false;
        return;
      }

      // Create credential using Azure Identity library
      this.credential = new ClientSecretCredential(
        tenantId,
        clientId,
        clientSecret
      );

      // Initialize Graph client with authentication provider
      this.client = Client.initWithMiddleware({
        authProvider: {
          getAccessToken: async () => {
            if (!this.credential) {
              throw new Error('Credential not initialized');
            }
            const token = await this.credential.getToken([
              'https://graph.microsoft.com/.default',
            ]);
            return token?.token || '';
          },
        },
      });

      this.initialized = true;
      logger.info('Microsoft Graph client initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Microsoft Graph client', { error });
      this.initialized = false;
    }
  }

  /**
   * Check if client is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get access token for Microsoft Graph API
   */
  async getAccessToken(): Promise<string> {
    if (!this.credential) {
      throw new Error('Microsoft Graph client not initialized');
    }

    const token = await this.credential.getToken([
      'https://graph.microsoft.com/.default',
    ]);

    if (!token) {
      throw new Error('Failed to acquire access token');
    }

    return token.token;
  }

  /**
   * Create a Teams channel
   * @param teamId - Microsoft Teams team ID
   * @param channelName - Name for the new channel
   * @param description - Channel description
   */
  async createChannel(
    teamId: string,
    channelName: string,
    description?: string
  ): Promise<ChannelInfo> {
    if (!this.initialized || !this.client) {
      throw new Error('Microsoft Graph client not initialized');
    }

    logger.info('Creating Teams channel', { teamId, channelName });

    const apiCall = async () => {
      const channel = {
        displayName: channelName,
        description: description || `Channel for ${channelName}`,
        membershipType: 'standard',
      };

      const response = await this.client!
        .api(`/teams/${teamId}/channels`)
        .post(channel);

      return {
        teamId,
        channelId: response.id,
        channelName: response.displayName,
        webUrl: response.webUrl,
      };
    };

    return await this.circuitBreaker.fire(apiCall);
  }

  /**
   * Get a Teams channel by ID
   * @param teamId - Microsoft Teams team ID
   * @param channelId - Channel ID
   */
  async getChannel(teamId: string, channelId: string): Promise<ChannelInfo> {
    if (!this.initialized || !this.client) {
      throw new Error('Microsoft Graph client not initialized');
    }

    const apiCall = async () => {
      const response = await this.client!
        .api(`/teams/${teamId}/channels/${channelId}`)
        .get();

      return {
        teamId,
        channelId: response.id,
        channelName: response.displayName,
        webUrl: response.webUrl,
      };
    };

    return await this.circuitBreaker.fire(apiCall);
  }

  /**
   * Post a message to a Teams channel
   * @param teamId - Microsoft Teams team ID
   * @param channelId - Channel ID
   * @param message - Message content (can include Adaptive Card)
   */
  async postMessageToChannel(
    teamId: string,
    channelId: string,
    message: any
  ): Promise<MessageResponse> {
    if (!this.initialized || !this.client) {
      throw new Error('Microsoft Graph client not initialized');
    }

    logger.info('Posting message to Teams channel', { teamId, channelId });

    const apiCall = async () => {
      const response = await this.client!
        .api(`/teams/${teamId}/channels/${channelId}/messages`)
        .post(message);

      return {
        id: response.id,
        webUrl: response.webUrl,
        createdDateTime: response.createdDateTime,
      };
    };

    return await this.circuitBreaker.fire(apiCall);
  }

  /**
   * Update an existing message in a Teams channel
   * @param teamId - Microsoft Teams team ID
   * @param channelId - Channel ID
   * @param messageId - Message ID to update
   * @param message - Updated message content
   */
  async updateMessage(
    teamId: string,
    channelId: string,
    messageId: string,
    message: any
  ): Promise<void> {
    if (!this.initialized || !this.client) {
      throw new Error('Microsoft Graph client not initialized');
    }

    logger.info('Updating Teams message', { teamId, channelId, messageId });

    const apiCall = async () => {
      await this.client!
        .api(`/teams/${teamId}/channels/${channelId}/messages/${messageId}`)
        .patch(message);
    };

    await this.circuitBreaker.fire(apiCall);
  }

  /**
   * Create a group chat
   * @param members - Array of user IDs to include in the chat
   * @param topic - Chat topic/name
   */
  async createGroupChat(members: string[], topic: string): Promise<string> {
    if (!this.initialized || !this.client) {
      throw new Error('Microsoft Graph client not initialized');
    }

    logger.info('Creating Teams group chat', { memberCount: members.length, topic });

    const apiCall = async () => {
      const chat = {
        chatType: 'group',
        topic,
        members: members.map((userId) => ({
          '@odata.type': '#microsoft.graph.aadUserConversationMember',
          roles: ['owner'],
          'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${userId}')`,
        })),
      };

      const response = await this.client!.api('/chats').post(chat);
      return response.id;
    };

    return await this.circuitBreaker.fire(apiCall);
  }

  /**
   * Send a message to a chat
   * @param chatId - Chat ID
   * @param message - Message content
   */
  async sendChatMessage(chatId: string, message: any): Promise<MessageResponse> {
    if (!this.initialized || !this.client) {
      throw new Error('Microsoft Graph client not initialized');
    }

    logger.info('Sending message to Teams chat', { chatId });

    const apiCall = async () => {
      const response = await this.client!
        .api(`/chats/${chatId}/messages`)
        .post(message);

      return {
        id: response.id,
        webUrl: response.webUrl,
        createdDateTime: response.createdDateTime,
      };
    };

    return await this.circuitBreaker.fire(apiCall);
  }

  /**
   * Create an online meeting
   * @param subject - Meeting subject
   * @param startDateTime - Meeting start time
   * @param endDateTime - Meeting end time
   */
  async createOnlineMeeting(
    subject: string,
    startDateTime: Date,
    endDateTime: Date
  ): Promise<any> {
    if (!this.initialized || !this.client) {
      throw new Error('Microsoft Graph client not initialized');
    }

    logger.info('Creating Teams online meeting', { subject });

    const apiCall = async () => {
      const meeting = {
        subject,
        startDateTime: startDateTime.toISOString(),
        endDateTime: endDateTime.toISOString(),
      };

      const response = await this.client!
        .api('/me/onlineMeetings')
        .post(meeting);

      return response;
    };

    return await this.circuitBreaker.fire(apiCall);
  }

  /**
   * Get user information by Azure AD Object ID
   * @param userId - Azure AD Object ID
   */
  async getUserInfo(userId: string): Promise<any> {
    if (!this.initialized || !this.client) {
      throw new Error('Microsoft Graph client not initialized');
    }

    const apiCall = async () => {
      const response = await this.client!.api(`/users/${userId}`).get();
      return response;
    };

    return await this.circuitBreaker.fire(apiCall);
  }

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus() {
    return {
      name: this.circuitBreaker.name,
      state: this.circuitBreaker.opened
        ? 'OPEN'
        : this.circuitBreaker.halfOpen
        ? 'HALF_OPEN'
        : 'CLOSED',
      stats: this.circuitBreaker.stats,
    };
  }
}

export default new GraphClient();
