/**
 * Message Queue Utility
 * Simple message queue for asynchronous processing using Redis
 */

import redisClient from '../config/redis';
import logger from './logger';

export interface QueueMessage {
  id: string;
  type: string;
  data: any;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
}

class MessageQueue {
  private readonly QUEUE_KEY_PREFIX = 'queue:';
  private readonly PROCESSING_KEY_PREFIX = 'processing:';
  private readonly MAX_ATTEMPTS = 3;
  private readonly RETRY_DELAY = 5000; // 5 seconds

  /**
   * Add message to queue
   * @param queueName - Queue name
   * @param data - Message data
   * @param maxAttempts - Maximum retry attempts
   * @returns Message ID
   */
  async enqueue(queueName: string, data: any, maxAttempts: number = this.MAX_ATTEMPTS): Promise<string> {
    try {
      const messageId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const message: QueueMessage = {
        id: messageId,
        type: queueName,
        data,
        attempts: 0,
        maxAttempts,
        createdAt: new Date(),
      };

      const queueKey = `${this.QUEUE_KEY_PREFIX}${queueName}`;
      await redisClient.rPush(queueKey, JSON.stringify(message));

      logger.debug('Message enqueued', { queueName, messageId });
      return messageId;
    } catch (error) {
      logger.error('Failed to enqueue message', { error, queueName });
      throw error;
    }
  }

  /**
   * Dequeue message from queue
   * @param queueName - Queue name
   * @returns Message or null
   */
  async dequeue(queueName: string): Promise<QueueMessage | null> {
    try {
      const queueKey = `${this.QUEUE_KEY_PREFIX}${queueName}`;
      const messageStr = await redisClient.lPop(queueKey);

      if (!messageStr) {
        return null;
      }

      const message: QueueMessage = JSON.parse(messageStr);
      
      // Move to processing set
      const processingKey = `${this.PROCESSING_KEY_PREFIX}${queueName}`;
      await redisClient.set(
        `${processingKey}:${message.id}`,
        JSON.stringify(message),
        300 // 5 minute expiry
      );

      logger.debug('Message dequeued', { queueName, messageId: message.id });
      return message;
    } catch (error) {
      logger.error('Failed to dequeue message', { error, queueName });
      throw error;
    }
  }

  /**
   * Mark message as completed
   * @param queueName - Queue name
   * @param messageId - Message ID
   */
  async complete(queueName: string, messageId: string): Promise<void> {
    try {
      const processingKey = `${this.PROCESSING_KEY_PREFIX}${queueName}:${messageId}`;
      await redisClient.del(processingKey);
      logger.debug('Message completed', { queueName, messageId });
    } catch (error) {
      logger.error('Failed to complete message', { error, queueName, messageId });
      throw error;
    }
  }

  /**
   * Retry failed message
   * @param queueName - Queue name
   * @param message - Message to retry
   */
  async retry(queueName: string, message: QueueMessage): Promise<void> {
    try {
      message.attempts += 1;

      if (message.attempts >= message.maxAttempts) {
        logger.warn('Message exceeded max attempts, moving to dead letter queue', {
          queueName,
          messageId: message.id,
          attempts: message.attempts,
        });
        await this.moveToDeadLetter(queueName, message);
        return;
      }

      // Re-enqueue with updated attempt count
      const queueKey = `${this.QUEUE_KEY_PREFIX}${queueName}`;
      await redisClient.rPush(queueKey, JSON.stringify(message));

      // Remove from processing
      const processingKey = `${this.PROCESSING_KEY_PREFIX}${queueName}:${message.id}`;
      await redisClient.del(processingKey);

      logger.debug('Message requeued for retry', {
        queueName,
        messageId: message.id,
        attempts: message.attempts,
      });
    } catch (error) {
      logger.error('Failed to retry message', { error, queueName, messageId: message.id });
      throw error;
    }
  }

  /**
   * Move message to dead letter queue
   * @param queueName - Queue name
   * @param message - Failed message
   */
  private async moveToDeadLetter(queueName: string, message: QueueMessage): Promise<void> {
    try {
      const deadLetterKey = `${this.QUEUE_KEY_PREFIX}${queueName}:dead_letter`;
      await redisClient.rPush(deadLetterKey, JSON.stringify(message));

      // Remove from processing
      const processingKey = `${this.PROCESSING_KEY_PREFIX}${queueName}:${message.id}`;
      await redisClient.del(processingKey);

      logger.info('Message moved to dead letter queue', {
        queueName,
        messageId: message.id,
      });
    } catch (error) {
      logger.error('Failed to move message to dead letter queue', {
        error,
        queueName,
        messageId: message.id,
      });
      throw error;
    }
  }

  /**
   * Get queue length
   * @param queueName - Queue name
   * @returns Queue length
   */
  async getQueueLength(queueName: string): Promise<number> {
    try {
      const queueKey = `${this.QUEUE_KEY_PREFIX}${queueName}`;
      return await redisClient.lLen(queueKey);
    } catch (error) {
      logger.error('Failed to get queue length', { error, queueName });
      throw error;
    }
  }

  /**
   * Clear queue
   * @param queueName - Queue name
   */
  async clearQueue(queueName: string): Promise<void> {
    try {
      const queueKey = `${this.QUEUE_KEY_PREFIX}${queueName}`;
      await redisClient.del(queueKey);
      logger.info('Queue cleared', { queueName });
    } catch (error) {
      logger.error('Failed to clear queue', { error, queueName });
      throw error;
    }
  }
}

export default new MessageQueue();
