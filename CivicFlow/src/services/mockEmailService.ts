/**
 * Mock Email Service
 * Simulates email sending for MVP demo mode
 * Logs email attempts to console instead of actually sending
 */

import logger from '../utils/logger';
import { EmailMessage, EmailResponse } from '../clients/emailClient';

class MockEmailService {
  private emailLog: Array<{
    timestamp: Date;
    to: string;
    subject: string;
    messageId: string;
  }> = [];

  /**
   * Send email (mocked)
   * Logs email details to console and returns success
   * @param message - Email message
   * @returns Email response with simulated success
   */
  async sendEmail(message: EmailMessage): Promise<EmailResponse> {
    const messageId = `mock-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const timestamp = new Date();

    // Log to console with formatting
    console.log('\n' + '='.repeat(60));
    console.log('📧 MOCK EMAIL SERVICE - Email Sent');
    console.log('='.repeat(60));
    console.log(`To: ${message.to}`);
    console.log(`From: ${message.from || 'noreply@example.com'}`);
    console.log(`Subject: ${message.subject}`);
    console.log(`Message ID: ${messageId}`);
    console.log(`Timestamp: ${timestamp.toISOString()}`);
    console.log('-'.repeat(60));
    console.log('Text Content:');
    console.log(message.text.substring(0, 200) + (message.text.length > 200 ? '...' : ''));
    console.log('='.repeat(60) + '\n');

    // Log to application logger
    logger.info('Mock email sent', {
      to: message.to,
      subject: message.subject,
      messageId,
      textLength: message.text.length,
      htmlLength: message.html?.length || 0,
    });

    // Store in memory log
    this.emailLog.push({
      timestamp,
      to: message.to,
      subject: message.subject,
      messageId,
    });

    // Keep only last 100 emails in memory
    if (this.emailLog.length > 100) {
      this.emailLog.shift();
    }

    // Return success response
    return {
      success: true,
      messageId,
    };
  }

  /**
   * Send bulk emails (mocked)
   * @param messages - Array of email messages
   * @returns Array of email responses
   */
  async sendBulkEmails(messages: EmailMessage[]): Promise<EmailResponse[]> {
    console.log('\n' + '='.repeat(60));
    console.log(`📧 MOCK EMAIL SERVICE - Bulk Send (${messages.length} emails)`);
    console.log('='.repeat(60) + '\n');

    const results: EmailResponse[] = [];

    for (const message of messages) {
      const result = await this.sendEmail(message);
      results.push(result);
    }

    logger.info('Mock bulk emails sent', {
      count: messages.length,
      successCount: results.filter(r => r.success).length,
    });

    return results;
  }

  /**
   * Get email log
   * Returns recent emails sent through mock service
   * @param limit - Maximum number of emails to return
   * @returns Array of email log entries
   */
  getEmailLog(limit: number = 50): Array<{
    timestamp: Date;
    to: string;
    subject: string;
    messageId: string;
  }> {
    return this.emailLog.slice(-limit);
  }

  /**
   * Clear email log
   */
  clearEmailLog(): void {
    this.emailLog = [];
    logger.info('Mock email log cleared');
  }

  /**
   * Get email count
   * @returns Number of emails sent through mock service
   */
  getEmailCount(): number {
    return this.emailLog.length;
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
   * Check if service is initialized (always true for mock)
   * @returns True
   */
  isInitialized(): boolean {
    return true;
  }

  /**
   * Get circuit breaker status (mock)
   * @returns Mock circuit breaker status
   */
  getCircuitBreakerStatus() {
    return {
      name: 'MockEmailService',
      state: 'CLOSED',
      stats: {
        fires: this.emailLog.length,
        successes: this.emailLog.length,
        failures: 0,
      },
    };
  }
}

export default new MockEmailService();
