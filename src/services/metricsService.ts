/**
 * Metrics Service
 * Business logic layer for performance monitoring and metrics tracking
 */

import metricsRepository from '../repositories/metricsRepository';
import auditLogRepository from '../repositories/auditLogRepository';
import documentRepository from '../repositories/documentRepository';
import {
  ClassificationValidation,
  ClassificationAccuracyMetrics,
  ProcessingTimeMetrics,
  PrivacyBreachAlert,
  PrivacyBreachDetectionResult,
  PerformanceMetricsSummary,
  MetricsFilters,
} from '../models/metrics';
import logger from '../utils/logger';
import emailClient from '../clients/emailClient';

class MetricsService {
  private readonly ACCURACY_THRESHOLD = 95; // 95% accuracy threshold
  private readonly BASELINE_PROCESSING_TIME = 100; // 100 hours baseline

  /**
   * Record a manual validation of document classification
   * @param documentId - Document ID
   * @param actualType - Actual document type determined by staff
   * @param validatedBy - User ID who validated
   * @returns Created validation record
   */
  async recordClassificationValidation(
    documentId: string,
    actualType: string,
    validatedBy: string
  ): Promise<ClassificationValidation> {
    try {
      // Get the document to retrieve predicted type and confidence
      const document = await documentRepository.findById(documentId);
      if (!document) {
        throw new Error('Document not found');
      }

      if (!document.documentType) {
        throw new Error('Document has not been classified yet');
      }

      const validation = await metricsRepository.createClassificationValidation({
        documentId,
        predictedType: document.documentType,
        actualType,
        confidenceScore: document.classificationConfidence || 0,
        isCorrect: document.documentType === actualType,
        validatedBy,
      });

      logger.info('Classification validation recorded', {
        documentId,
        predictedType: document.documentType,
        actualType,
        isCorrect: validation.isCorrect,
      });

      // Check if accuracy has fallen below threshold
      await this.checkAccuracyThreshold();

      return validation;
    } catch (error) {
      logger.error('Failed to record classification validation', { error, documentId, actualType });
      throw error;
    }
  }

  /**
   * Get classification accuracy metrics
   * @param filters - Date and program filters
   * @returns Classification accuracy metrics
   */
  async getClassificationAccuracyMetrics(
    filters: MetricsFilters = {}
  ): Promise<ClassificationAccuracyMetrics> {
    try {
      return await metricsRepository.getClassificationAccuracyMetrics(filters);
    } catch (error) {
      logger.error('Failed to get classification accuracy metrics', { error, filters });
      throw error;
    }
  }

  /**
   * Get processing time metrics
   * @param filters - Date and program filters
   * @returns Processing time metrics
   */
  async getProcessingTimeMetrics(filters: MetricsFilters = {}): Promise<ProcessingTimeMetrics> {
    try {
      return await metricsRepository.getProcessingTimeMetrics(filters);
    } catch (error) {
      logger.error('Failed to get processing time metrics', { error, filters });
      throw error;
    }
  }

  /**
   * Detect privacy breaches based on audit log patterns
   * @returns Privacy breach detection result
   */
  async detectPrivacyBreaches(): Promise<PrivacyBreachDetectionResult> {
    try {
      const alerts: PrivacyBreachAlert[] = [];
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Get recent audit logs
      const recentLogs = await auditLogRepository.find({
        startDate: oneDayAgo,
        limit: 10000,
        offset: 0,
      });

      // Analyze patterns
      const userAccessCounts: Record<string, number> = {};
      const failedAccessAttempts: Record<string, number> = {};
      const unauthorizedAttempts: Record<string, { count: number; actions: string[] }> = {};

      for (const log of recentLogs.logs) {
        // Count access by user
        userAccessCounts[log.performedBy] = (userAccessCounts[log.performedBy] || 0) + 1;

        // Count failed access attempts
        if (log.actionType.includes('FAILED') || log.actionType.includes('DENIED')) {
          failedAccessAttempts[log.performedBy] = (failedAccessAttempts[log.performedBy] || 0) + 1;
        }

        // Track unauthorized access attempts
        if (log.actionType.includes('UNAUTHORIZED')) {
          if (!unauthorizedAttempts[log.performedBy]) {
            unauthorizedAttempts[log.performedBy] = { count: 0, actions: [] };
          }
          unauthorizedAttempts[log.performedBy].count++;
          unauthorizedAttempts[log.performedBy].actions.push(log.actionType);
        }
      }

      // Detect excessive access (more than 1000 requests in 24 hours)
      for (const [userId, count] of Object.entries(userAccessCounts)) {
        if (count > 1000) {
          const alert = await metricsRepository.createPrivacyBreachAlert({
            alertType: 'EXCESSIVE_ACCESS',
            severity: 'HIGH',
            userId,
            description: `User ${userId} made ${count} requests in the last 24 hours`,
            evidence: {
              requestCount: count,
              period: '24 hours',
              threshold: 1000,
            },
          });
          alerts.push(alert);

          // Send immediate alert to administrators
          await this.sendAdministratorAlert(alert);
        }
      }

      // Detect multiple failed access attempts (more than 10 in 24 hours)
      for (const [userId, count] of Object.entries(failedAccessAttempts)) {
        if (count > 10) {
          const alert = await metricsRepository.createPrivacyBreachAlert({
            alertType: 'MULTIPLE_FAILED_ATTEMPTS',
            severity: 'MEDIUM',
            userId,
            description: `User ${userId} had ${count} failed access attempts in the last 24 hours`,
            evidence: {
              failedAttempts: count,
              period: '24 hours',
              threshold: 10,
            },
          });
          alerts.push(alert);

          // Send alert to administrators
          await this.sendAdministratorAlert(alert);
        }
      }

      // Detect unauthorized access attempts (any count is concerning)
      for (const [userId, data] of Object.entries(unauthorizedAttempts)) {
        if (data.count > 0) {
          const alert = await metricsRepository.createPrivacyBreachAlert({
            alertType: 'UNAUTHORIZED_ACCESS',
            severity: data.count > 5 ? 'CRITICAL' : 'HIGH',
            userId,
            description: `User ${userId} attempted ${data.count} unauthorized access operations`,
            evidence: {
              attemptCount: data.count,
              actions: data.actions,
              period: '24 hours',
            },
          });
          alerts.push(alert);

          // Send immediate alert to administrators
          await this.sendAdministratorAlert(alert);
        }
      }

      // Get alert counts by severity
      const alertCounts = await metricsRepository.getAlertCountsBySeverity(oneDayAgo);

      return {
        alerts,
        totalAlerts: alerts.length,
        criticalAlerts: alertCounts.CRITICAL || 0,
        highAlerts: alertCounts.HIGH || 0,
        mediumAlerts: alertCounts.MEDIUM || 0,
        lowAlerts: alertCounts.LOW || 0,
        detectionPeriod: {
          startDate: oneDayAgo,
          endDate: new Date(),
        },
      };
    } catch (error) {
      logger.error('Failed to detect privacy breaches', { error });
      throw error;
    }
  }

  /**
   * Get unresolved privacy breach alerts
   * @param limit - Maximum number of alerts to return
   * @returns Array of alerts
   */
  async getUnresolvedAlerts(limit: number = 100): Promise<PrivacyBreachAlert[]> {
    try {
      return await metricsRepository.getUnresolvedAlerts(limit);
    } catch (error) {
      logger.error('Failed to get unresolved alerts', { error });
      throw error;
    }
  }

  /**
   * Acknowledge a privacy breach alert
   * @param alertId - Alert ID
   * @param acknowledgedBy - User ID
   * @returns Updated alert
   */
  async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<PrivacyBreachAlert> {
    try {
      return await metricsRepository.acknowledgeAlert(alertId, acknowledgedBy);
    } catch (error) {
      logger.error('Failed to acknowledge alert', { error, alertId });
      throw error;
    }
  }

  /**
   * Resolve a privacy breach alert
   * @param alertId - Alert ID
   * @param resolvedBy - User ID
   * @param notes - Resolution notes
   * @returns Updated alert
   */
  async resolveAlert(
    alertId: string,
    resolvedBy: string,
    notes?: string
  ): Promise<PrivacyBreachAlert> {
    try {
      return await metricsRepository.resolveAlert(alertId, resolvedBy, notes);
    } catch (error) {
      logger.error('Failed to resolve alert', { error, alertId });
      throw error;
    }
  }

  /**
   * Get comprehensive performance metrics summary
   * @param filters - Date and program filters
   * @returns Performance metrics summary
   */
  async getPerformanceMetricsSummary(
    filters: MetricsFilters = {}
  ): Promise<PerformanceMetricsSummary> {
    try {
      const [classificationAccuracy, processingTime, privacyBreaches] = await Promise.all([
        this.getClassificationAccuracyMetrics(filters),
        this.getProcessingTimeMetrics(filters),
        this.detectPrivacyBreaches(),
      ]);

      return {
        classificationAccuracy,
        processingTime,
        privacyBreaches,
        generatedAt: new Date(),
      };
    } catch (error) {
      logger.error('Failed to get performance metrics summary', { error, filters });
      throw error;
    }
  }

  /**
   * Check if classification accuracy has fallen below threshold
   * @private
   */
  private async checkAccuracyThreshold(): Promise<void> {
    try {
      // Check accuracy for the last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const metrics = await metricsRepository.getClassificationAccuracyMetrics({
        startDate: thirtyDaysAgo,
      });

      if (metrics.totalValidations >= 10 && metrics.accuracyPercentage < this.ACCURACY_THRESHOLD) {
        logger.warn('Classification accuracy below threshold', {
          accuracy: metrics.accuracyPercentage,
          threshold: this.ACCURACY_THRESHOLD,
          totalValidations: metrics.totalValidations,
        });

        // Send alert to administrators
        await this.sendAccuracyAlert(metrics);
      }
    } catch (error) {
      logger.error('Failed to check accuracy threshold', { error });
      // Don't throw - this is a background check
    }
  }

  /**
   * Send accuracy alert to administrators
   * @private
   */
  private async sendAccuracyAlert(metrics: ClassificationAccuracyMetrics): Promise<void> {
    try {
      const subject = '⚠️ Document Classification Accuracy Alert';
      const body = `
        <h2>Classification Accuracy Below Threshold</h2>
        <p>The document classification accuracy has fallen below the required ${this.ACCURACY_THRESHOLD}% threshold.</p>
        
        <h3>Current Metrics:</h3>
        <ul>
          <li><strong>Accuracy:</strong> ${metrics.accuracyPercentage.toFixed(2)}%</li>
          <li><strong>Total Validations:</strong> ${metrics.totalValidations}</li>
          <li><strong>Correct Predictions:</strong> ${metrics.correctPredictions}</li>
          <li><strong>Average Confidence:</strong> ${metrics.averageConfidence.toFixed(2)}</li>
        </ul>
        
        <h3>Accuracy by Document Type:</h3>
        <ul>
          ${Object.entries(metrics.byDocumentType)
            .map(
              ([type, data]) =>
                `<li><strong>${type}:</strong> ${data.accuracy.toFixed(2)}% (${data.correct}/${data.total})</li>`
            )
            .join('')}
        </ul>
        
        <p>Please review the classification model and consider retraining or adjusting confidence thresholds.</p>
      `;

      // Get administrator emails from environment or config
      const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
      
      for (const email of adminEmails) {
        await emailClient.sendEmail({
          to: email.trim(),
          subject,
          html: body,
          text: body.replace(/<[^>]*>/g, ''), // Strip HTML for text version
        });
      }

      logger.info('Accuracy alert sent to administrators', {
        accuracy: metrics.accuracyPercentage,
        recipients: adminEmails.length,
      });
    } catch (error) {
      logger.error('Failed to send accuracy alert', { error });
      // Don't throw - alert failure shouldn't break the main flow
    }
  }

  /**
   * Send privacy breach alert to administrators
   * @private
   */
  private async sendAdministratorAlert(alert: PrivacyBreachAlert): Promise<void> {
    try {
      const subject = `🚨 Privacy Breach Alert: ${alert.alertType}`;
      const body = `
        <h2>Privacy Breach Detected</h2>
        <p><strong>Severity:</strong> ${alert.severity}</p>
        <p><strong>Alert Type:</strong> ${alert.alertType}</p>
        <p><strong>User ID:</strong> ${alert.userId}</p>
        <p><strong>Description:</strong> ${alert.description}</p>
        <p><strong>Detected At:</strong> ${alert.detectedAt.toISOString()}</p>
        
        <h3>Evidence:</h3>
        <pre>${JSON.stringify(alert.evidence, null, 2)}</pre>
        
        <p>Please review this alert immediately and take appropriate action.</p>
        <p><a href="${process.env.APP_URL || 'http://localhost:3000'}/admin/alerts/${alert.id}">View Alert Details</a></p>
      `;

      // Get administrator emails from environment or config
      const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
      
      for (const email of adminEmails) {
        await emailClient.sendEmail({
          to: email.trim(),
          subject,
          html: body,
          text: body.replace(/<[^>]*>/g, ''), // Strip HTML for text version
        });
      }

      logger.info('Privacy breach alert sent to administrators', {
        alertId: alert.id,
        severity: alert.severity,
        recipients: adminEmails.length,
      });
    } catch (error) {
      logger.error('Failed to send administrator alert', { error, alertId: alert.id });
      // Don't throw - alert failure shouldn't break the main flow
    }
  }
}

export default new MetricsService();
