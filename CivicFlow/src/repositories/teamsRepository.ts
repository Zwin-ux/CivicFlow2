/**
 * Teams Repository
 * Implements repository pattern for Teams integration data persistence
 */

import { QueryResult } from 'pg';
import database from '../config/database';
import logger from '../utils/logger';
import {
  TeamsChannelConfig,
  TeamsMessage,
  NotificationRules,
  CardType,
} from '../models/teams';

class TeamsRepository {
  /**
   * Create a new Teams channel configuration
   * @param config - Channel configuration data
   * @returns Created configuration
   */
  async createChannelConfig(
    config: Omit<TeamsChannelConfig, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<TeamsChannelConfig> {
    const query = `
      INSERT INTO teams_channels (
        program_type,
        team_id,
        channel_id,
        channel_name,
        notification_rules,
        is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING 
        id,
        program_type,
        team_id,
        channel_id,
        channel_name,
        notification_rules,
        is_active,
        created_at,
        updated_at
    `;

    const values = [
      config.programType,
      config.teamId,
      config.channelId,
      config.channelName,
      JSON.stringify(config.notificationRules),
      config.isActive,
    ];

    try {
      const result: QueryResult = await database.query(query, values);
      return this.mapRowToChannelConfig(result.rows[0]);
    } catch (error) {
      logger.error('Failed to create Teams channel configuration', { error, config });
      throw new Error('Failed to create Teams channel configuration');
    }
  }

  /**
   * Find Teams channel configuration by program type
   * @param programType - Program type
   * @returns Channel configuration or null if not found
   */
  async findChannelConfigByProgramType(
    programType: string
  ): Promise<TeamsChannelConfig | null> {
    const query = `
      SELECT 
        id,
        program_type,
        team_id,
        channel_id,
        channel_name,
        notification_rules,
        is_active,
        created_at,
        updated_at
      FROM teams_channels
      WHERE program_type = $1 AND is_active = true
    `;

    try {
      const result: QueryResult = await database.query(query, [programType]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToChannelConfig(result.rows[0]);
    } catch (error) {
      logger.error('Failed to find Teams channel configuration', { error, programType });
      throw new Error('Failed to find Teams channel configuration');
    }
  }

  /**
   * Find Teams channel configuration by ID
   * @param id - Configuration ID
   * @returns Channel configuration or null if not found
   */
  async findChannelConfigById(id: string): Promise<TeamsChannelConfig | null> {
    const query = `
      SELECT 
        id,
        program_type,
        team_id,
        channel_id,
        channel_name,
        notification_rules,
        is_active,
        created_at,
        updated_at
      FROM teams_channels
      WHERE id = $1
    `;

    try {
      const result: QueryResult = await database.query(query, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToChannelConfig(result.rows[0]);
    } catch (error) {
      logger.error('Failed to find Teams channel configuration by ID', { error, id });
      throw new Error('Failed to find Teams channel configuration by ID');
    }
  }

  /**
   * Find all active Teams channel configurations
   * @returns Array of channel configurations
   */
  async findAllActiveChannelConfigs(): Promise<TeamsChannelConfig[]> {
    const query = `
      SELECT 
        id,
        program_type,
        team_id,
        channel_id,
        channel_name,
        notification_rules,
        is_active,
        created_at,
        updated_at
      FROM teams_channels
      WHERE is_active = true
      ORDER BY program_type ASC
    `;

    try {
      const result: QueryResult = await database.query(query);
      return result.rows.map(row => this.mapRowToChannelConfig(row));
    } catch (error) {
      logger.error('Failed to find active Teams channel configurations', { error });
      throw new Error('Failed to find active Teams channel configurations');
    }
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
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.teamId !== undefined) {
      updateFields.push(`team_id = $${paramIndex++}`);
      values.push(updates.teamId);
    }

    if (updates.channelId !== undefined) {
      updateFields.push(`channel_id = $${paramIndex++}`);
      values.push(updates.channelId);
    }

    if (updates.channelName !== undefined) {
      updateFields.push(`channel_name = $${paramIndex++}`);
      values.push(updates.channelName);
    }

    if (updates.notificationRules !== undefined) {
      updateFields.push(`notification_rules = $${paramIndex++}`);
      values.push(JSON.stringify(updates.notificationRules));
    }

    if (updates.isActive !== undefined) {
      updateFields.push(`is_active = $${paramIndex++}`);
      values.push(updates.isActive);
    }

    // Always update the updated_at timestamp
    updateFields.push(`updated_at = NOW()`);

    if (updateFields.length === 1) {
      // Only updated_at was set, nothing to update
      const existing = await this.findChannelConfigById(id);
      if (!existing) {
        throw new Error('Teams channel configuration not found');
      }
      return existing;
    }

    values.push(id);

    const query = `
      UPDATE teams_channels
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING 
        id,
        program_type,
        team_id,
        channel_id,
        channel_name,
        notification_rules,
        is_active,
        created_at,
        updated_at
    `;

    try {
      const result: QueryResult = await database.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('Teams channel configuration not found');
      }

      return this.mapRowToChannelConfig(result.rows[0]);
    } catch (error) {
      logger.error('Failed to update Teams channel configuration', { error, id, updates });
      throw new Error('Failed to update Teams channel configuration');
    }
  }

  /**
   * Delete Teams channel configuration
   * @param id - Configuration ID
   */
  async deleteChannelConfig(id: string): Promise<void> {
    const query = 'DELETE FROM teams_channels WHERE id = $1';

    try {
      await database.query(query, [id]);
    } catch (error) {
      logger.error('Failed to delete Teams channel configuration', { error, id });
      throw new Error('Failed to delete Teams channel configuration');
    }
  }

  /**
   * Create a Teams message record
   * @param message - Message data
   * @returns Created message record
   */
  async createMessage(
    message: Omit<TeamsMessage, 'id' | 'postedAt' | 'updatedAt'>
  ): Promise<TeamsMessage> {
    const query = `
      INSERT INTO teams_messages (
        application_id,
        message_id,
        channel_id,
        card_type
      )
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (application_id, card_type)
      DO UPDATE SET
        message_id = EXCLUDED.message_id,
        channel_id = EXCLUDED.channel_id,
        updated_at = NOW()
      RETURNING 
        id,
        application_id,
        message_id,
        channel_id,
        card_type,
        posted_at,
        updated_at
    `;

    const values = [
      message.applicationId,
      message.messageId,
      message.channelId,
      message.cardType,
    ];

    try {
      const result: QueryResult = await database.query(query, values);
      return this.mapRowToMessage(result.rows[0]);
    } catch (error) {
      logger.error('Failed to create Teams message record', { error, message });
      throw new Error('Failed to create Teams message record');
    }
  }

  /**
   * Find Teams message by application ID and card type
   * @param applicationId - Application ID
   * @param cardType - Card type
   * @returns Message record or null if not found
   */
  async findMessageByApplicationAndType(
    applicationId: string,
    cardType: CardType
  ): Promise<TeamsMessage | null> {
    const query = `
      SELECT 
        id,
        application_id,
        message_id,
        channel_id,
        card_type,
        posted_at,
        updated_at
      FROM teams_messages
      WHERE application_id = $1 AND card_type = $2
    `;

    try {
      const result: QueryResult = await database.query(query, [applicationId, cardType]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToMessage(result.rows[0]);
    } catch (error) {
      logger.error('Failed to find Teams message', { error, applicationId, cardType });
      throw new Error('Failed to find Teams message');
    }
  }

  /**
   * Find all Teams messages for an application
   * @param applicationId - Application ID
   * @returns Array of message records
   */
  async findMessagesByApplicationId(applicationId: string): Promise<TeamsMessage[]> {
    const query = `
      SELECT 
        id,
        application_id,
        message_id,
        channel_id,
        card_type,
        posted_at,
        updated_at
      FROM teams_messages
      WHERE application_id = $1
      ORDER BY posted_at DESC
    `;

    try {
      const result: QueryResult = await database.query(query, [applicationId]);
      return result.rows.map(row => this.mapRowToMessage(row));
    } catch (error) {
      logger.error('Failed to find Teams messages by application ID', { error, applicationId });
      throw new Error('Failed to find Teams messages by application ID');
    }
  }

  /**
   * Update Teams message
   * @param id - Message ID
   * @param messageId - New Teams message ID
   * @returns Updated message record
   */
  async updateMessage(id: string, messageId: string): Promise<TeamsMessage> {
    const query = `
      UPDATE teams_messages
      SET 
        message_id = $1,
        updated_at = NOW()
      WHERE id = $2
      RETURNING 
        id,
        application_id,
        message_id,
        channel_id,
        card_type,
        posted_at,
        updated_at
    `;

    try {
      const result: QueryResult = await database.query(query, [messageId, id]);

      if (result.rows.length === 0) {
        throw new Error('Teams message not found');
      }

      return this.mapRowToMessage(result.rows[0]);
    } catch (error) {
      logger.error('Failed to update Teams message', { error, id, messageId });
      throw new Error('Failed to update Teams message');
    }
  }

  /**
   * Delete Teams message record
   * @param id - Message ID
   */
  async deleteMessage(id: string): Promise<void> {
    const query = 'DELETE FROM teams_messages WHERE id = $1';

    try {
      await database.query(query, [id]);
    } catch (error) {
      logger.error('Failed to delete Teams message', { error, id });
      throw new Error('Failed to delete Teams message');
    }
  }

  /**
   * Delete all Teams messages for an application
   * @param applicationId - Application ID
   */
  async deleteMessagesByApplicationId(applicationId: string): Promise<void> {
    const query = 'DELETE FROM teams_messages WHERE application_id = $1';

    try {
      await database.query(query, [applicationId]);
    } catch (error) {
      logger.error('Failed to delete Teams messages by application ID', { error, applicationId });
      throw new Error('Failed to delete Teams messages by application ID');
    }
  }

  /**
   * Map database row to TeamsChannelConfig object
   * @param row - Database row
   * @returns TeamsChannelConfig object
   */
  private mapRowToChannelConfig(row: any): TeamsChannelConfig {
    return {
      id: row.id,
      programType: row.program_type,
      teamId: row.team_id,
      channelId: row.channel_id,
      channelName: row.channel_name,
      notificationRules: row.notification_rules as NotificationRules,
      isActive: row.is_active,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  /**
   * Map database row to TeamsMessage object
   * @param row - Database row
   * @returns TeamsMessage object
   */
  private mapRowToMessage(row: any): TeamsMessage {
    return {
      id: row.id,
      applicationId: row.application_id,
      messageId: row.message_id,
      channelId: row.channel_id,
      cardType: row.card_type as CardType,
      postedAt: new Date(row.posted_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

export default new TeamsRepository();
