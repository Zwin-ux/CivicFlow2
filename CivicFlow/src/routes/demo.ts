import express, { Request, Response } from 'express';
import demoModeService from '../services/demoModeService';
import demoDataRepository from '../repositories/demoDataRepository';
import demoAnalyticsService from '../services/demoAnalyticsService';
import demoOperationSimulator from '../services/demoOperationSimulator';
import { requireDemoMode, trackDemoInteraction } from '../middleware/demoMode';
import logger from '../utils/logger';

const router = express.Router();

/**
 * Start a new demo session
 * POST /api/v1/demo/start
 */
router.post('/start', async (req: Request, res: Response) => {
  try {
    const { userRole } = req.body;

    if (!userRole || !['APPLICANT', 'REVIEWER', 'APPROVER', 'ADMIN'].includes(userRole)) {
      res.status(400).json({
        error: {
          code: 'INVALID_ROLE',
          message: 'Invalid user role. Must be APPLICANT, REVIEWER, APPROVER, or ADMIN',
        },
      });
      return;
    }

    // Get client info
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    // Create demo session
    const session = await demoModeService.createSession({
      userRole,
      ipAddress,
      userAgent,
    });

    logger.info('Demo session started', {
      sessionId: session.sessionId,
      userRole,
      ipAddress,
    });

    res.status(201).json({
      sessionId: session.sessionId,
      userRole: session.userRole,
      expiresAt: session.expiresAt,
      message: 'Demo session created successfully',
    });
  } catch (error) {
    logger.error('Error starting demo session', { error });
    res.status(500).json({
      error: {
        code: 'DEMO_START_FAILED',
        message: 'Failed to start demo session',
      },
    });
  }
});

/**
 * Reset demo session
 * POST /api/v1/demo/reset
 */
router.post('/reset', requireDemoMode, async (req: Request, res: Response) => {
  try {
    const sessionId = req.demoSession!.sessionId;

    // Reset session in database
    await demoModeService.resetSession(sessionId);

    // Reset demo data
    demoDataRepository.resetSessionData(sessionId);

    logger.info('Demo session reset', { sessionId });

    res.json({
      message: 'Demo session reset successfully',
    });
  } catch (error) {
    logger.error('Error resetting demo session', { error });
    res.status(500).json({
      error: {
        code: 'DEMO_RESET_FAILED',
        message: 'Failed to reset demo session',
      },
    });
  }
});

/**
 * End demo session
 * POST /api/v1/demo/end
 */
router.post('/end', requireDemoMode, async (req: Request, res: Response) => {
  try {
    const sessionId = req.demoSession!.sessionId;

    // End session
    await demoModeService.endSession(sessionId);

    // Clean up demo data
    demoDataRepository.resetSessionData(sessionId);

    logger.info('Demo session ended', { sessionId });

    res.json({
      message: 'Demo session ended successfully',
    });
  } catch (error) {
    logger.error('Error ending demo session', { error });
    res.status(500).json({
      error: {
        code: 'DEMO_END_FAILED',
        message: 'Failed to end demo session',
      },
    });
  }
});

/**
 * Get demo applications
 * GET /api/v1/demo/applications
 */
router.get(
  '/applications',
  requireDemoMode,
  trackDemoInteraction('view_applications'),
  async (req: Request, res: Response) => {
    try {
      const sessionId = req.demoSession!.sessionId;
      const { status, programType, minRiskScore, maxRiskScore } = req.query;

      const applications = demoDataRepository.getApplications(sessionId, {
        status: status as string,
        programType: programType as string,
        minRiskScore: minRiskScore ? parseInt(minRiskScore as string) : undefined,
        maxRiskScore: maxRiskScore ? parseInt(maxRiskScore as string) : undefined,
      });

      res.json({
        applications,
        count: applications.length,
      });
    } catch (error) {
      logger.error('Error getting demo applications', { error });
      res.status(500).json({
        error: {
          code: 'DEMO_DATA_ERROR',
          message: 'Failed to retrieve demo applications',
        },
      });
    }
  }
);

/**
 * Get single demo application
 * GET /api/v1/demo/applications/:id
 */
router.get(
  '/applications/:id',
  requireDemoMode,
  trackDemoInteraction('view_application'),
  async (req: Request, res: Response) => {
    try {
      const sessionId = req.demoSession!.sessionId;
      const { id } = req.params;

      const application = demoDataRepository.getApplication(sessionId, id);

      if (!application) {
        res.status(404).json({
          error: {
            code: 'APPLICATION_NOT_FOUND',
            message: 'Application not found',
          },
        });
        return;
      }

      res.json(application);
    } catch (error) {
      logger.error('Error getting demo application', { error });
      res.status(500).json({
        error: {
          code: 'DEMO_DATA_ERROR',
          message: 'Failed to retrieve demo application',
        },
      });
    }
  }
);

/**
 * Simulate document upload
 * POST /api/v1/demo/simulate-upload
 */
router.post(
  '/simulate-upload',
  requireDemoMode,
  trackDemoInteraction('upload_document'),
  async (req: Request, res: Response) => {
    try {
      const sessionId = req.demoSession!.sessionId;
      const { applicationId, documentType, fileName } = req.body;

      if (!applicationId || !documentType || !fileName) {
        res.status(400).json({
          error: {
            code: 'INVALID_REQUEST',
            message: 'applicationId, documentType, and fileName are required',
          },
        });
        return;
      }

      // Simulate upload with realistic delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      const document = demoDataRepository.simulateDocumentUpload(
        sessionId,
        applicationId,
        documentType,
        fileName
      );

      res.status(201).json({
        document,
        message: 'Document upload simulated successfully',
      });
    } catch (error) {
      logger.error('Error simulating document upload', { error });
      res.status(500).json({
        error: {
          code: 'UPLOAD_SIMULATION_FAILED',
          message: 'Failed to simulate document upload',
        },
      });
    }
  }
);

/**
 * Simulate AI analysis
 * POST /api/v1/demo/simulate-analysis/:documentId
 */
router.post(
  '/simulate-analysis/:documentId',
  requireDemoMode,
  trackDemoInteraction('analyze_document'),
  async (req: Request, res: Response) => {
    try {
      const sessionId = req.demoSession!.sessionId;
      const { documentId } = req.params;

      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));

      const analysis = demoDataRepository.getAIAnalysis(sessionId, documentId);

      if (!analysis) {
        res.status(404).json({
          error: {
            code: 'DOCUMENT_NOT_FOUND',
            message: 'Document not found',
          },
        });
        return;
      }

      res.json({
        analysis,
        message: 'AI analysis completed',
      });
    } catch (error) {
      logger.error('Error simulating AI analysis', { error });
      res.status(500).json({
        error: {
          code: 'ANALYSIS_SIMULATION_FAILED',
          message: 'Failed to simulate AI analysis',
        },
      });
    }
  }
);

/**
 * Simulate application status change
 * PUT /api/v1/demo/applications/:id/status
 */
router.put(
  '/applications/:id/status',
  requireDemoMode,
  trackDemoInteraction('update_status'),
  async (req: Request, res: Response) => {
    try {
      const sessionId = req.demoSession!.sessionId;
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        res.status(400).json({
          error: {
            code: 'INVALID_REQUEST',
            message: 'status is required',
          },
        });
        return;
      }

      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 500));

      const application = demoDataRepository.updateApplicationStatus(sessionId, id, status);

      if (!application) {
        res.status(404).json({
          error: {
            code: 'APPLICATION_NOT_FOUND',
            message: 'Application not found',
          },
        });
        return;
      }

      res.json({
        application,
        message: 'Application status updated',
      });
    } catch (error) {
      logger.error('Error updating demo application status', { error });
      res.status(500).json({
        error: {
          code: 'STATUS_UPDATE_FAILED',
          message: 'Failed to update application status',
        },
      });
    }
  }
);

/**
 * Get demo session analytics
 * GET /api/v1/demo/analytics
 */
router.get('/analytics', requireDemoMode, async (req: Request, res: Response) => {
  try {
    const sessionId = req.demoSession!.sessionId;

    const analytics = await demoModeService.getSessionAnalytics(sessionId);

    res.json(analytics);
  } catch (error) {
    logger.error('Error getting demo analytics', { error });
    res.status(500).json({
      error: {
        code: 'ANALYTICS_ERROR',
        message: 'Failed to retrieve demo analytics',
      },
    });
  }
});

/**
 * Get demo data statistics (admin only)
 * GET /api/v1/demo/stats
 */
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const stats = demoDataRepository.getStats();
    const activeSessions = await demoModeService.getActiveSessions();

    res.json({
      ...stats,
      activeSessionCount: activeSessions.length,
    });
  } catch (error) {
    logger.error('Error getting demo stats', { error });
    res.status(500).json({
      error: {
        code: 'STATS_ERROR',
        message: 'Failed to retrieve demo statistics',
      },
    });
  }
});

/**
 * Get session report
 * GET /api/v1/demo/reports/session/:sessionId
 */
router.get('/reports/session/:sessionId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;

    const report = await demoAnalyticsService.getSessionReport(sessionId);

    if (!report) {
      res.status(404).json({
        error: {
          code: 'SESSION_NOT_FOUND',
          message: 'Session not found',
        },
      });
      return;
    }

    res.json(report);
  } catch (error) {
    logger.error('Error getting session report', { error });
    res.status(500).json({
      error: {
        code: 'REPORT_ERROR',
        message: 'Failed to retrieve session report',
      },
    });
  }
});

/**
 * Get feature usage analytics
 * GET /api/v1/demo/reports/feature-usage
 */
router.get('/reports/feature-usage', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    const featureUsage = await demoAnalyticsService.getFeatureUsage(start, end);

    res.json({
      features: featureUsage,
      period: {
        startDate: start,
        endDate: end,
      },
    });
  } catch (error) {
    logger.error('Error getting feature usage', { error });
    res.status(500).json({
      error: {
        code: 'ANALYTICS_ERROR',
        message: 'Failed to retrieve feature usage',
      },
    });
  }
});

/**
 * Get conversion metrics
 * GET /api/v1/demo/reports/conversions
 */
router.get('/reports/conversions', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    const metrics = await demoAnalyticsService.getConversionMetrics(start, end);

    res.json({
      metrics,
      period: {
        startDate: start,
        endDate: end,
      },
    });
  } catch (error) {
    logger.error('Error getting conversion metrics', { error });
    res.status(500).json({
      error: {
        code: 'ANALYTICS_ERROR',
        message: 'Failed to retrieve conversion metrics',
      },
    });
  }
});

/**
 * Get daily statistics
 * GET /api/v1/demo/reports/daily-stats
 */
router.get('/reports/daily-stats', async (req: Request, res: Response) => {
  try {
    const { days } = req.query;
    const daysCount = days ? parseInt(days as string) : 30;

    const dailyStats = await demoAnalyticsService.getDailyStats(daysCount);

    res.json({
      stats: dailyStats,
      days: daysCount,
    });
  } catch (error) {
    logger.error('Error getting daily stats', { error });
    res.status(500).json({
      error: {
        code: 'ANALYTICS_ERROR',
        message: 'Failed to retrieve daily statistics',
      },
    });
  }
});

/**
 * Get comprehensive demo report
 * GET /api/v1/demo/reports/comprehensive
 */
router.get('/reports/comprehensive', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    const report = await demoAnalyticsService.generateReport(start, end);

    res.json({
      report,
      generatedAt: new Date(),
      period: {
        startDate: start,
        endDate: end,
      },
    });
  } catch (error) {
    logger.error('Error generating comprehensive report', { error });
    res.status(500).json({
      error: {
        code: 'REPORT_ERROR',
        message: 'Failed to generate comprehensive report',
      },
    });
  }
});

/**
 * Log conversion event
 * POST /api/v1/demo/conversions
 */
router.post('/conversions', requireDemoMode, async (req: Request, res: Response) => {
  try {
    const sessionId = req.demoSession!.sessionId;
    const { conversionType, metadata } = req.body;

    if (!conversionType) {
      res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'conversionType is required',
        },
      });
      return;
    }

    await demoAnalyticsService.logConversion(sessionId, conversionType, metadata);

    res.status(201).json({
      message: 'Conversion logged successfully',
    });
  } catch (error) {
    logger.error('Error logging conversion', { error });
    res.status(500).json({
      error: {
        code: 'CONVERSION_LOG_ERROR',
        message: 'Failed to log conversion',
      },
    });
  }
});

/**
 * Simulate document upload with realistic processing
 * POST /api/v1/demo/operations/upload
 */
router.post(
  '/operations/upload',
  requireDemoMode,
  trackDemoInteraction('simulate_upload'),
  async (req: Request, res: Response) => {
    try {
      const { applicationId, fileName, mimeType, size } = req.body;

      if (!applicationId || !fileName || !mimeType || !size) {
        res.status(400).json({
          error: {
            code: 'INVALID_REQUEST',
            message: 'applicationId, fileName, mimeType, and size are required',
          },
        });
        return;
      }

      const result = await demoOperationSimulator.simulateDocumentUpload(
        applicationId,
        { originalname: fileName, mimetype: mimeType, size }
      );

      res.status(201).json({
        document: result.document,
        processingTime: result.processingTime,
        message: 'Document upload simulated successfully (no data persisted)',
      });
    } catch (error) {
      logger.error('Error simulating document upload', { error });
      res.status(500).json({
        error: {
          code: 'SIMULATION_ERROR',
          message: 'Failed to simulate document upload',
        },
      });
    }
  }
);

/**
 * Simulate AI analysis with pre-computed results
 * POST /api/v1/demo/operations/analyze
 */
router.post(
  '/operations/analyze',
  requireDemoMode,
  trackDemoInteraction('simulate_analysis'),
  async (req: Request, res: Response) => {
    try {
      const { documentId, documentType } = req.body;

      if (!documentId || !documentType) {
        res.status(400).json({
          error: {
            code: 'INVALID_REQUEST',
            message: 'documentId and documentType are required',
          },
        });
        return;
      }

      const result = await demoOperationSimulator.simulateAIAnalysis(
        documentId,
        documentType
      );

      res.status(200).json({
        analysis: result.analysis,
        processingTime: result.processingTime,
        message: 'AI analysis simulated successfully (pre-computed results)',
      });
    } catch (error) {
      logger.error('Error simulating AI analysis', { error });
      res.status(500).json({
        error: {
          code: 'SIMULATION_ERROR',
          message: 'Failed to simulate AI analysis',
        },
      });
    }
  }
);

/**
 * Simulate approval/rejection workflow
 * POST /api/v1/demo/operations/decision
 */
router.post(
  '/operations/decision',
  requireDemoMode,
  trackDemoInteraction('simulate_decision'),
  async (req: Request, res: Response) => {
    try {
      const { applicationId, decision, justification, approvedAmount } = req.body;

      if (!applicationId || !decision || !justification) {
        res.status(400).json({
          error: {
            code: 'INVALID_REQUEST',
            message: 'applicationId, decision, and justification are required',
          },
        });
        return;
      }

      if (!['APPROVED', 'REJECTED', 'DEFERRED'].includes(decision)) {
        res.status(400).json({
          error: {
            code: 'INVALID_DECISION',
            message: 'decision must be APPROVED, REJECTED, or DEFERRED',
          },
        });
        return;
      }

      const result = await demoOperationSimulator.simulateApprovalWorkflow(
        applicationId,
        decision,
        justification,
        approvedAmount
      );

      res.status(200).json({
        application: result.application,
        decision: result.decision,
        notifications: result.notifications,
        processingTime: result.processingTime,
        message: 'Decision workflow simulated successfully (no data persisted)',
      });
    } catch (error) {
      logger.error('Error simulating approval workflow', { error });
      res.status(500).json({
        error: {
          code: 'SIMULATION_ERROR',
          message: 'Failed to simulate approval workflow',
        },
      });
    }
  }
);

/**
 * Simulate application submission
 * POST /api/v1/demo/operations/submit
 */
router.post(
  '/operations/submit',
  requireDemoMode,
  trackDemoInteraction('simulate_submit'),
  async (req: Request, res: Response) => {
    try {
      const { applicationId } = req.body;

      if (!applicationId) {
        res.status(400).json({
          error: {
            code: 'INVALID_REQUEST',
            message: 'applicationId is required',
          },
        });
        return;
      }

      const result = await demoOperationSimulator.simulateApplicationSubmission(
        applicationId
      );

      res.status(200).json({
        application: result.application,
        processingTime: result.processingTime,
        message: result.message,
      });
    } catch (error) {
      logger.error('Error simulating application submission', { error });
      res.status(500).json({
        error: {
          code: 'SIMULATION_ERROR',
          message: 'Failed to simulate application submission',
        },
      });
    }
  }
);

/**
 * Simulate document classification
 * POST /api/v1/demo/operations/classify
 */
router.post(
  '/operations/classify',
  requireDemoMode,
  trackDemoInteraction('simulate_classify'),
  async (req: Request, res: Response) => {
    try {
      const { documentId, fileName } = req.body;

      if (!documentId || !fileName) {
        res.status(400).json({
          error: {
            code: 'INVALID_REQUEST',
            message: 'documentId and fileName are required',
          },
        });
        return;
      }

      const result = await demoOperationSimulator.simulateDocumentClassification(
        documentId,
        fileName
      );

      res.status(200).json({
        classification: result.application,
        processingTime: result.processingTime,
        message: result.message,
      });
    } catch (error) {
      logger.error('Error simulating document classification', { error });
      res.status(500).json({
        error: {
          code: 'SIMULATION_ERROR',
          message: 'Failed to simulate document classification',
        },
      });
    }
  }
);

/**
 * Simulate data extraction
 * POST /api/v1/demo/operations/extract
 */
router.post(
  '/operations/extract',
  requireDemoMode,
  trackDemoInteraction('simulate_extract'),
  async (req: Request, res: Response) => {
    try {
      const { documentId, documentType } = req.body;

      if (!documentId || !documentType) {
        res.status(400).json({
          error: {
            code: 'INVALID_REQUEST',
            message: 'documentId and documentType are required',
          },
        });
        return;
      }

      const result = await demoOperationSimulator.simulateDataExtraction(
        documentId,
        documentType
      );

      res.status(200).json({
        extraction: result.application,
        processingTime: result.processingTime,
        message: result.message,
      });
    } catch (error) {
      logger.error('Error simulating data extraction', { error });
      res.status(500).json({
        error: {
          code: 'SIMULATION_ERROR',
          message: 'Failed to simulate data extraction',
        },
      });
    }
  }
);

/**
 * Simulate batch processing
 * POST /api/v1/demo/operations/batch-process
 */
router.post(
  '/operations/batch-process',
  requireDemoMode,
  trackDemoInteraction('simulate_batch'),
  async (req: Request, res: Response) => {
    try {
      const { documentIds, operationType } = req.body;

      if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
        res.status(400).json({
          error: {
            code: 'INVALID_REQUEST',
            message: 'documentIds must be a non-empty array',
          },
        });
        return;
      }

      if (!operationType || !['ANALYSIS', 'CLASSIFICATION', 'EXTRACTION'].includes(operationType)) {
        res.status(400).json({
          error: {
            code: 'INVALID_OPERATION',
            message: 'operationType must be ANALYSIS, CLASSIFICATION, or EXTRACTION',
          },
        });
        return;
      }

      const result = await demoOperationSimulator.simulateBatchProcessing(
        documentIds,
        operationType
      );

      res.status(202).json({
        job: result,
        message: 'Batch processing job simulated (no actual processing)',
      });
    } catch (error) {
      logger.error('Error simulating batch processing', { error });
      res.status(500).json({
        error: {
          code: 'SIMULATION_ERROR',
          message: 'Failed to simulate batch processing',
        },
      });
    }
  }
);

/**
 * Simulate anomaly detection
 * POST /api/v1/demo/operations/detect-anomalies
 */
router.post(
  '/operations/detect-anomalies',
  requireDemoMode,
  trackDemoInteraction('simulate_anomaly_detection'),
  async (req: Request, res: Response) => {
    try {
      const { applicationId, documentIds } = req.body;

      if (!applicationId || !documentIds || !Array.isArray(documentIds)) {
        res.status(400).json({
          error: {
            code: 'INVALID_REQUEST',
            message: 'applicationId and documentIds (array) are required',
          },
        });
        return;
      }

      const result = await demoOperationSimulator.simulateAnomalyDetection(
        applicationId,
        documentIds
      );

      res.status(200).json({
        anomalies: result.anomalies,
        riskScore: result.riskScore,
        processingTime: result.processingTime,
        message: 'Anomaly detection simulated successfully',
      });
    } catch (error) {
      logger.error('Error simulating anomaly detection', { error });
      res.status(500).json({
        error: {
          code: 'SIMULATION_ERROR',
          message: 'Failed to simulate anomaly detection',
        },
      });
    }
  }
);

/**
 * Simulate eligibility calculation
 * POST /api/v1/demo/operations/calculate-eligibility
 */
router.post(
  '/operations/calculate-eligibility',
  requireDemoMode,
  trackDemoInteraction('simulate_eligibility'),
  async (req: Request, res: Response) => {
    try {
      const { applicationId, programType } = req.body;

      if (!applicationId || !programType) {
        res.status(400).json({
          error: {
            code: 'INVALID_REQUEST',
            message: 'applicationId and programType are required',
          },
        });
        return;
      }

      const result = await demoOperationSimulator.simulateEligibilityCalculation(
        applicationId,
        programType
      );

      res.status(200).json({
        eligibilityScore: result.eligibilityScore,
        factors: result.factors,
        recommendation: result.recommendation,
        processingTime: result.processingTime,
        message: 'Eligibility calculation simulated successfully',
      });
    } catch (error) {
      logger.error('Error simulating eligibility calculation', { error });
      res.status(500).json({
        error: {
          code: 'SIMULATION_ERROR',
          message: 'Failed to simulate eligibility calculation',
        },
      });
    }
  }
);

/**
 * Simulate notification sending
 * POST /api/v1/demo/operations/send-notification
 */
router.post(
  '/operations/send-notification',
  requireDemoMode,
  trackDemoInteraction('simulate_notification'),
  async (req: Request, res: Response) => {
    try {
      const { type, recipient, message } = req.body;

      if (!type || !recipient || !message) {
        res.status(400).json({
          error: {
            code: 'INVALID_REQUEST',
            message: 'type, recipient, and message are required',
          },
        });
        return;
      }

      if (!['EMAIL', 'TEAMS', 'WEBHOOK'].includes(type)) {
        res.status(400).json({
          error: {
            code: 'INVALID_TYPE',
            message: 'type must be EMAIL, TEAMS, or WEBHOOK',
          },
        });
        return;
      }

      const result = await demoOperationSimulator.simulateNotification(
        type,
        recipient,
        message
      );

      res.status(200).json({
        notification: result,
        message: 'Notification simulated successfully (not actually sent)',
      });
    } catch (error) {
      logger.error('Error simulating notification', { error });
      res.status(500).json({
        error: {
          code: 'SIMULATION_ERROR',
          message: 'Failed to simulate notification',
        },
      });
    }
  }
);

export default router;
