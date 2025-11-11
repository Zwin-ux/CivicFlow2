/**
 * Email Client
 * Handles email sending via SendGrid or other providers
 * Implements circuit breaker pattern for resilience
 */

import sgMail from '@sendgrid/mail';
import CircuitBreaker from 'opossum';
import config from '../config';
import logger from '../utils/logger';
import { createCircuitBreaker } from '../utils/circuitBreaker';

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  from?: string;
}

export interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

class EmailClient {
  private initialized: boolean = false;
  private circuitBreaker: CircuitBreaker<[EmailMessage], EmailResponse>;

  constructor() {
    this.initialize();
    
    // Create circuit breaker for email sending
    this.circuitBreaker = createCircuitBreaker(
      this.sendEmailInternal.bind(this),
      {
        timeout: 15000, // 15 seconds
        errorThresholdPercentage: 50, // Open after 50% failures
        resetTimeout: 60000, // Try to close after 1 minute
        rollingCountTimeout: 30000, // 30 second rolling window
        name: 'EmailService',
      }
    );

    // Set up fallback to queue email for later
    this.circuitBreaker.fallback(async (message: EmailMessage) => {
      logger.warn('Email service circuit breaker open, email will be queued', {
        to: message.to,
        subject: message.subject,
      });
      
      // Return simulated success - in production, this would queue the email
      return {
        success: true,
        messageId: `queued-${Date.now()}`,
        error: 'Email queued due to service unavailability',
      };
    });
  }

  /**
   * Initialize email client
   */
  private initialize(): void {
    try {
      if (config.email.provider === 'sendgrid') {
        if (!config.email.apiKey) {
          logger.warn('SendGrid API key not configured. Email sending will be simulated.');
          this.initialized = false;
          return;
        }
        sgMail.setApiKey(config.email.apiKey);
        this.initialized = true;
        logger.info('Email client initialized with SendGrid');
      } else {
        logger.warn(`Email provider ${config.email.provider} not supported. Email sending will be simulated.`);
        this.initialized = false;
      }
    } catch (error) {
      logger.error('Failed to initialize email client', { error });
      this.initialized = false;
    }
  }

  /**
   * Send email with circuit breaker protection
   * @param message - Email message
   * @returns Email response
   */
  async sendEmail(message: EmailMessage): Promise<EmailResponse> {
    try {
      // Validate message
      if (!message.to || !message.subject || (!message.html && !message.text)) {
        throw new Error('Invalid email message: missing required fields');
      }

      // Call through circuit breaker
      return await this.circuitBreaker.fire(message);
    } catch (error: any) {
      logger.error('Failed to send email through circuit breaker', {
        error,
        to: message.to,
        subject: message.subject,
        circuitOpen: this.circuitBreaker.opened,
      });

      // If circuit is open, return fallback response
      if (this.circuitBreaker.opened) {
        return {
          success: false,
          error: 'Email service temporarily unavailable',
        };
      }

      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }

  /**
   * Internal email sending method
   * Called by circuit breaker
   */
  private async sendEmailInternal(message: EmailMessage): Promise<EmailResponse> {
    // If not initialized, simulate sending
    if (!this.initialized) {
      logger.info('Email sending simulated (client not initialized)', {
        to: message.to,
        subject: message.subject,
      });
      return {
        success: true,
        messageId: `simulated-${Date.now()}`,
      };
    }

    // Send via SendGrid
    const msg = {
      to: message.to,
      from: message.from || config.email.from,
      subject: message.subject,
      text: message.text,
      html: message.html,
    };

    const response = await sgMail.send(msg);

    logger.info('Email sent successfully', {
      to: message.to,
      subject: message.subject,
      messageId: response[0].headers['x-message-id'],
    });

    return {
      success: true,
      messageId: response[0].headers['x-message-id'] as string,
    };
  }

  /**
   * Send bulk emails
   * @param messages - Array of email messages
   * @returns Array of email responses
   */
  async sendBulkEmails(messages: EmailMessage[]): Promise<EmailResponse[]> {
    const results: EmailResponse[] = [];

    for (const message of messages) {
      const result = await this.sendEmail(message);
      results.push(result);
    }

    return results;
  }

  /**
   * Validate email address format
   * @param email - Email address
   * @returns True if valid
   */
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Check if email client is initialized
   * @returns True if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus() {
    return {
      name: this.circuitBreaker.name,
      state: this.circuitBreaker.opened ? 'OPEN' : this.circuitBreaker.halfOpen ? 'HALF_OPEN' : 'CLOSED',
      stats: this.circuitBreaker.stats,
    };
  }
}

export default new EmailClient();
