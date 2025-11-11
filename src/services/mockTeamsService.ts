/**
 * Mock Teams Service
 * Simulates Microsoft Teams integration for MVP demo mode
 * Logs Teams notifications to console instead of actually posting
 */

import logger from '../utils/logger';
import { Application } from '../models/application';
import { CardType, MeetingInfo } from '../models/teams';

interface MockTeamsMessage {
  timestamp: Date;
  programType: string;
  cardType: CardType;
  applicationId: string;
  messageId: string;
  action?: string;
}

class MockTeamsService {
  private messageLog: MockTeamsMessage[] = [];
  private meetingLog: Array<{
    timestamp: Date;
    applicationId: string;
    subject: string;
    meetingId: string;
  }> = [];

  /**
   * Post Adaptive Card to Teams channel (mocked)
   * Logs notification details to console and returns success
   * @param programType - Program type
   * @param cardType - Type of card to post
   * @param application - Application data
   * @param additionalData - Additional data for card generation
   * @returns Mock message ID
   */
  async postAdaptiveCard(
    programType: string,
    cardType: CardType,
    application: Application,
    additionalData?: any
  ): Promise<string> {
    const messageId = `mock-teams-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const timestamp = new Date();

    // Log to console with formatting
    console.log('\n' + '='.repeat(60));
    console.log('📢 MOCK TEAMS SERVICE - Adaptive Card Posted');
    console.log('='.repeat(60));
    console.log(`Program Type: ${programType}`);
    console.log(`Card Type: ${cardType}`);
    console.log(`Application ID: ${application.id}`);
    console.log(`Applicant ID: ${application.applicantId}`);
    console.log(`Status: ${application.status}`);
    console.log(`Message ID: ${messageId}`);
    console.log(`Timestamp: ${timestamp.toISOString()}`);
    
    if (additionalData) {
      console.log('-'.repeat(60));
      console.log('Additional Data:');
      console.log(JSON.stringify(additionalData, null, 2));
    }
    
    console.log('='.repeat(60) + '\n');

    // Log to application logger
    logger.info('Mock Teams card posted', {
      programType,
      cardType,
      applicationId: application.id,
      messageId,
      status: application.status,
    });

    // Store in memory log
    this.messageLog.push({
      timestamp,
      programType,
      cardType,
      applicationId: application.id,
      messageId,
    });

    // Keep only last 100 messages in memory
    if (this.messageLog.length > 100) {
      this.messageLog.shift();
    }

    return messageId;
  }

  /**
   * Update existing Adaptive Card in Teams (mocked)
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
    const timestamp = new Date();

    // Find existing message
    const existingMessage = this.messageLog.find(
      m => m.applicationId === applicationId && m.cardType === cardType
    );

    // Log to console with formatting
    console.log('\n' + '='.repeat(60));
    console.log('🔄 MOCK TEAMS SERVICE - Adaptive Card Updated');
    console.log('='.repeat(60));
    console.log(`Application ID: ${applicationId}`);
    console.log(`Card Type: ${cardType}`);
    console.log(`Applicant ID: ${application.applicantId}`);
    console.log(`Status: ${application.status}`);
    console.log(`Original Message ID: ${existingMessage?.messageId || 'Not found'}`);
    console.log(`Timestamp: ${timestamp.toISOString()}`);
    
    if (additionalData) {
      console.log('-'.repeat(60));
      console.log('Update Data:');
      console.log(JSON.stringify(additionalData, null, 2));
    }
    
    console.log('='.repeat(60) + '\n');

    // Log to application logger
    logger.info('Mock Teams card updated', {
      applicationId,
      cardType,
      status: application.status,
      actionTaken: additionalData?.actionTaken,
      found: !!existingMessage,
    });

    // Update message log if found
    if (existingMessage) {
      existingMessage.action = additionalData?.actionTaken || 'updated';
    }
  }

  /**
   * Create Teams meeting (mocked)
   * @param applicationId - Application ID
   * @param subject - Meeting subject
   * @param _participants - Array of participant user IDs
   * @param startDateTime - Meeting start time
   * @param endDateTime - Meeting end time
   * @returns Mock meeting information
   */
  async createMeeting(
    applicationId: string,
    subject: string,
    _participants: string[],
    startDateTime: Date,
    endDateTime: Date
  ): Promise<MeetingInfo> {
    const meetingId = `mock-meeting-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const joinUrl = `https://teams.microsoft.com/mock-meeting/${meetingId}`;
    const timestamp = new Date();

    // Log to console with formatting
    console.log('\n' + '='.repeat(60));
    console.log('📅 MOCK TEAMS SERVICE - Meeting Created');
    console.log('='.repeat(60));
    console.log(`Application ID: ${applicationId}`);
    console.log(`Subject: ${subject}`);
    console.log(`Meeting ID: ${meetingId}`);
    console.log(`Join URL: ${joinUrl}`);
    console.log(`Start: ${startDateTime.toISOString()}`);
    console.log(`End: ${endDateTime.toISOString()}`);
    console.log(`Timestamp: ${timestamp.toISOString()}`);
    console.log('='.repeat(60) + '\n');

    // Log to application logger
    logger.info('Mock Teams meeting created', {
      applicationId,
      subject,
      meetingId,
      startDateTime,
      endDateTime,
    });

    // Store in memory log
    this.meetingLog.push({
      timestamp,
      applicationId,
      subject,
      meetingId,
    });

    // Keep only last 50 meetings in memory
    if (this.meetingLog.length > 50) {
      this.meetingLog.shift();
    }

    return {
      id: meetingId,
      joinUrl,
      subject,
      startDateTime,
      endDateTime,
    };
  }

  /**
   * Ensure Teams channel exists (mocked)
   * @param programType - Program type
   * @param teamId - Microsoft Teams team ID
   * @returns Mock channel information
   */
  async ensureChannel(
    programType: string,
    teamId?: string
  ): Promise<{ teamId: string; channelId: string; channelName: string }> {
    const mockTeamId = teamId || `mock-team-${programType}`;
    const mockChannelId = `mock-channel-${programType}`;
    const channelName = this.generateChannelName(programType);

    console.log('\n' + '='.repeat(60));
    console.log('🔧 MOCK TEAMS SERVICE - Channel Ensured');
    console.log('='.repeat(60));
    console.log(`Program Type: ${programType}`);
    console.log(`Team ID: ${mockTeamId}`);
    console.log(`Channel ID: ${mockChannelId}`);
    console.log(`Channel Name: ${channelName}`);
    console.log('='.repeat(60) + '\n');

    logger.info('Mock Teams channel ensured', {
      programType,
      teamId: mockTeamId,
      channelId: mockChannelId,
      channelName,
    });

    return {
      teamId: mockTeamId,
      channelId: mockChannelId,
      channelName,
    };
  }

  /**
   * Generate channel name from program type
   * @param programType - Program type
   * @returns Formatted channel name
   */
  private generateChannelName(programType: string): string {
    return programType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ') + ' - Applications';
  }

  /**
   * Get message log
   * Returns recent Teams messages sent through mock service
   * @param limit - Maximum number of messages to return
   * @returns Array of message log entries
   */
  getMessageLog(limit: number = 50): MockTeamsMessage[] {
    return this.messageLog.slice(-limit);
  }

  /**
   * Get meeting log
   * Returns recent Teams meetings created through mock service
   * @param limit - Maximum number of meetings to return
   * @returns Array of meeting log entries
   */
  getMeetingLog(limit: number = 50): Array<{
    timestamp: Date;
    applicationId: string;
    subject: string;
    meetingId: string;
  }> {
    return this.meetingLog.slice(-limit);
  }

  /**
   * Clear message log
   */
  clearMessageLog(): void {
    this.messageLog = [];
    logger.info('Mock Teams message log cleared');
  }

  /**
   * Clear meeting log
   */
  clearMeetingLog(): void {
    this.meetingLog = [];
    logger.info('Mock Teams meeting log cleared');
  }

  /**
   * Get message count
   * @returns Number of messages sent through mock service
   */
  getMessageCount(): number {
    return this.messageLog.length;
  }

  /**
   * Get meeting count
   * @returns Number of meetings created through mock service
   */
  getMeetingCount(): number {
    return this.meetingLog.length;
  }

  /**
   * Check if service is enabled (always true for mock)
   * @returns True
   */
  isEnabled(): boolean {
    return true;
  }

  /**
   * Invalidate channel cache (no-op for mock)
   * @param programType - Program type
   */
  async invalidateChannelCache(programType: string): Promise<void> {
    logger.debug('Mock Teams channel cache invalidation (no-op)', { programType });
  }
}

export default new MockTeamsService();
