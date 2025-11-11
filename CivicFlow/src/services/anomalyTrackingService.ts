/**
 * Anomaly Tracking Service
 * Manages anomaly detection workflow, status tracking, and review process
 * Provides high-level operations for anomaly management
 */

import anomalyRepository, {
  AnomalyRecord,
  CreateAnomalyRequest,
  ReviewAnomalyRequest,
  AnomalyStatistics,
} from '../repositories/anomalyRepository';
import imageManipulationDetector from './imageManipulationDetector';
import inconsistencyDetector from './inconsistencyDetector';
import logger from '../utils/logger';

export interface AnomalyWorkflowResult {
  anomaliesCreated: number;
  anomalies: AnomalyRecord[];
  summary: string;
}

export interface ReviewWorkflowResult {
  anomaly: AnomalyRecord;
  auditTrail: AuditEntry[];
}

export interface AuditEntry {
  timestamp: Date;
  action: string;
  performedBy: string;
  details: string;
}

class AnomalyTrackingService {
  private static instance: AnomalyTrackingService;

  private constructor() {}

  public static getInstance(): AnomalyTrackingService {
    if (!AnomalyTrackingService.instance) {
      AnomalyTrackingService.instance = new AnomalyTrackingService();
    }
    return AnomalyTrackingService.instance;
  }

  /**
   * Track anomalies for a document (image manipulation)
   */
  async trackDocumentAnomalies(documentId: string, applicationId: string): Promise<AnomalyWorkflowResult> {
    try {
      logger.info('Tracking document anomalies', { documentId, applicationId });

      // Detect image manipulation
      const manipulationResult = await imageManipulationDetector.detectManipulation(documentId);

      const anomaliesToCreate: CreateAnomalyRequest[] = [];

      // Create anomaly records for each indicator
      if (manipulationResult.isManipulated) {
        for (const indicator of manipulationResult.indicators) {
          anomaliesToCreate.push({
            applicationId,
            documentId,
            anomalyType: indicator.type,
            severity: indicator.severity,
            description: indicator.description,
            evidence: indicator.evidence,
            confidence: manipulationResult.confidence,
          });
        }
      }

      // Create anomaly records
      const anomalies = await anomalyRepository.createBatch(anomaliesToCreate);

      const summary = manipulationResult.isManipulated
        ? `${anomalies.length} manipulation indicator(s) detected with ${(manipulationResult.confidence * 100).toFixed(1)}% confidence`
        : 'No manipulation detected';

      logger.info('Document anomaly tracking completed', {
        documentId,
        anomaliesCreated: anomalies.length,
      });

      return {
        anomaliesCreated: anomalies.length,
        anomalies,
        summary,
      };
    } catch (error: any) {
      logger.error('Failed to track document anomalies', {
        documentId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Track anomalies for an application (inconsistencies)
   */
  async trackApplicationAnomalies(applicationId: string): Promise<AnomalyWorkflowResult> {
    try {
      logger.info('Tracking application anomalies', { applicationId });

      // Detect inconsistencies
      const inconsistencyResult = await inconsistencyDetector.detectInconsistencies(applicationId);

      const anomaliesToCreate: CreateAnomalyRequest[] = [];

      // Create anomaly records for each inconsistency
      for (const inconsistency of inconsistencyResult.inconsistencies) {
        anomaliesToCreate.push({
          applicationId,
          documentId: inconsistency.affectedDocuments[0], // Primary document
          anomalyType: inconsistency.type,
          severity: inconsistency.severity,
          description: inconsistency.description,
          evidence: {
            conflictingValues: inconsistency.conflictingValues,
            evidence: inconsistency.evidence,
            affectedDocuments: inconsistency.affectedDocuments,
          },
          confidence: inconsistency.confidence,
        });
      }

      // Create anomaly records
      const anomalies = await anomalyRepository.createBatch(anomaliesToCreate);

      const summary = inconsistencyResult.inconsistencies.length > 0
        ? `${anomalies.length} inconsistency(ies) detected with risk score ${inconsistencyResult.overallRiskScore.toFixed(1)}`
        : 'No inconsistencies detected';

      logger.info('Application anomaly tracking completed', {
        applicationId,
        anomaliesCreated: anomalies.length,
      });

      return {
        anomaliesCreated: anomalies.length,
        anomalies,
        summary,
      };
    } catch (error: any) {
      logger.error('Failed to track application anomalies', {
        applicationId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get all anomalies for an application
   */
  async getApplicationAnomalies(applicationId: string): Promise<AnomalyRecord[]> {
    try {
      return await anomalyRepository.findByApplicationId(applicationId);
    } catch (error: any) {
      logger.error('Failed to get application anomalies', {
        applicationId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get all anomalies for a document
   */
  async getDocumentAnomalies(documentId: string): Promise<AnomalyRecord[]> {
    try {
      return await anomalyRepository.findByDocumentId(documentId);
    } catch (error: any) {
      logger.error('Failed to get document anomalies', {
        documentId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get pending anomalies requiring review
   */
  async getPendingReviews(limit: number = 50): Promise<AnomalyRecord[]> {
    try {
      return await anomalyRepository.getPendingReviews(limit);
    } catch (error: any) {
      logger.error('Failed to get pending reviews', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Review an anomaly with audit trail
   */
  async reviewAnomaly(
    anomalyId: string,
    reviewData: ReviewAnomalyRequest
  ): Promise<ReviewWorkflowResult> {
    try {
      logger.info('Reviewing anomaly', {
        anomalyId,
        status: reviewData.status,
        reviewedBy: reviewData.reviewedBy,
      });

      // Get original anomaly for audit trail
      const originalAnomaly = await anomalyRepository.findById(anomalyId);
      if (!originalAnomaly) {
        throw new Error(`Anomaly not found: ${anomalyId}`);
      }

      // Update anomaly status
      const updatedAnomaly = await anomalyRepository.review(anomalyId, reviewData);

      // Create audit trail
      const auditTrail: AuditEntry[] = [
        {
          timestamp: new Date(),
          action: 'ANOMALY_REVIEWED',
          performedBy: reviewData.reviewedBy,
          details: `Status changed from ${originalAnomaly.status} to ${reviewData.status}`,
        },
      ];

      if (reviewData.resolutionNotes) {
        auditTrail.push({
          timestamp: new Date(),
          action: 'RESOLUTION_NOTES_ADDED',
          performedBy: reviewData.reviewedBy,
          details: reviewData.resolutionNotes,
        });
      }

      logger.info('Anomaly review completed', {
        anomalyId,
        newStatus: updatedAnomaly.status,
      });

      return {
        anomaly: updatedAnomaly,
        auditTrail,
      };
    } catch (error: any) {
      logger.error('Failed to review anomaly', {
        anomalyId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Bulk review anomalies
   */
  async bulkReview(
    anomalyIds: string[],
    reviewData: ReviewAnomalyRequest
  ): Promise<ReviewWorkflowResult[]> {
    try {
      logger.info('Bulk reviewing anomalies', {
        count: anomalyIds.length,
        status: reviewData.status,
      });

      const results: ReviewWorkflowResult[] = [];

      for (const anomalyId of anomalyIds) {
        try {
          const result = await this.reviewAnomaly(anomalyId, reviewData);
          results.push(result);
        } catch (error: any) {
          logger.warn('Failed to review anomaly in bulk operation', {
            anomalyId,
            error: error.message,
          });
        }
      }

      logger.info('Bulk review completed', {
        total: anomalyIds.length,
        successful: results.length,
        failed: anomalyIds.length - results.length,
      });

      return results;
    } catch (error: any) {
      logger.error('Bulk review failed', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get anomaly statistics
   */
  async getStatistics(applicationId?: string): Promise<AnomalyStatistics> {
    try {
      return await anomalyRepository.getStatistics(applicationId);
    } catch (error: any) {
      logger.error('Failed to get anomaly statistics', {
        applicationId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get critical anomalies requiring immediate attention
   */
  async getCriticalAnomalies(limit: number = 20): Promise<AnomalyRecord[]> {
    try {
      const criticalAnomalies = await anomalyRepository.findBySeverity('CRITICAL', limit);
      const pendingCritical = criticalAnomalies.filter(a => a.status === 'PENDING');

      return pendingCritical;
    } catch (error: any) {
      logger.error('Failed to get critical anomalies', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Generate anomaly report for an application
   */
  async generateAnomalyReport(applicationId: string): Promise<string> {
    try {
      const anomalies = await anomalyRepository.findByApplicationId(applicationId);
      const statistics = await anomalyRepository.getStatistics(applicationId);

      let report = `# Anomaly Report for Application ${applicationId}\n\n`;
      report += `**Generated:** ${new Date().toISOString()}\n\n`;
      report += `## Summary\n\n`;
      report += `- **Total Anomalies:** ${statistics.total}\n`;
      report += `- **Critical:** ${statistics.bySeverity.CRITICAL}\n`;
      report += `- **High:** ${statistics.bySeverity.HIGH}\n`;
      report += `- **Medium:** ${statistics.bySeverity.MEDIUM}\n`;
      report += `- **Low:** ${statistics.bySeverity.LOW}\n\n`;
      report += `- **Pending Review:** ${statistics.byStatus.PENDING}\n`;
      report += `- **Reviewed:** ${statistics.byStatus.REVIEWED}\n`;
      report += `- **Resolved:** ${statistics.byStatus.RESOLVED}\n`;
      report += `- **False Positives:** ${statistics.byStatus.FALSE_POSITIVE}\n\n`;
      report += `- **Average Confidence:** ${(statistics.avgConfidence * 100).toFixed(1)}%\n\n`;

      if (anomalies.length === 0) {
        report += 'No anomalies detected.\n';
        return report;
      }

      // Group by severity
      const bySeverity = {
        CRITICAL: anomalies.filter(a => a.severity === 'CRITICAL'),
        HIGH: anomalies.filter(a => a.severity === 'HIGH'),
        MEDIUM: anomalies.filter(a => a.severity === 'MEDIUM'),
        LOW: anomalies.filter(a => a.severity === 'LOW'),
      };

      for (const [severity, items] of Object.entries(bySeverity)) {
        if (items.length > 0) {
          report += `## ${severity} Severity (${items.length})\n\n`;

          for (const item of items) {
            report += `### ${item.anomalyType}\n`;
            report += `**ID:** ${item.id}\n`;
            report += `**Status:** ${item.status}\n`;
            report += `**Confidence:** ${(item.confidence * 100).toFixed(1)}%\n`;
            report += `**Description:** ${item.description}\n`;

            if (item.documentId) {
              report += `**Document:** ${item.documentId}\n`;
            }

            if (item.reviewedBy) {
              report += `**Reviewed By:** ${item.reviewedBy}\n`;
              report += `**Reviewed At:** ${item.reviewedAt?.toISOString()}\n`;
            }

            if (item.resolutionNotes) {
              report += `**Resolution Notes:** ${item.resolutionNotes}\n`;
            }

            report += '\n';
          }
        }
      }

      return report;
    } catch (error: any) {
      logger.error('Failed to generate anomaly report', {
        applicationId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Auto-resolve false positives based on patterns
   */
  async autoResolveFalsePositives(applicationId: string, reviewedBy: string): Promise<number> {
    try {
      logger.info('Auto-resolving false positives', { applicationId });

      const anomalies = await anomalyRepository.findByApplicationId(applicationId);
      const pendingAnomalies = anomalies.filter(a => a.status === 'PENDING');

      let resolvedCount = 0;

      for (const anomaly of pendingAnomalies) {
        // Auto-resolve low severity anomalies with low confidence
        if (anomaly.severity === 'LOW' && anomaly.confidence < 0.6) {
          await anomalyRepository.review(anomaly.id, {
            status: 'FALSE_POSITIVE',
            reviewedBy,
            resolutionNotes: 'Auto-resolved: Low severity with low confidence',
          });
          resolvedCount++;
        }
      }

      logger.info('Auto-resolve completed', {
        applicationId,
        resolvedCount,
      });

      return resolvedCount;
    } catch (error: any) {
      logger.error('Failed to auto-resolve false positives', {
        applicationId,
        error: error.message,
      });
      throw error;
    }
  }
}

export default AnomalyTrackingService.getInstance();
