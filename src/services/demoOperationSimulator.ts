import { v4 as uuidv4 } from 'uuid';
import demoDataGenerator from './demoDataGenerator';
import logger from '../utils/logger';

/**
 * Demo Operation Simulator Service
 * Simulates all operations in demo mode without persisting data to the database
 */

export interface SimulatedUploadResult {
  document: any;
  processingTime: number;
  success: boolean;
}

export interface SimulatedAnalysisResult {
  analysis: any;
  processingTime: number;
  success: boolean;
}

export interface SimulatedWorkflowResult {
  application: any;
  processingTime: number;
  success: boolean;
  message: string;
}

export interface SimulatedDecisionResult {
  application: any;
  decision: any;
  processingTime: number;
  success: boolean;
  notifications: string[];
}

class DemoOperationSimulator {
  /**
   * Simulate document upload without storage
   * Returns a mock document object with realistic metadata
   */
  async simulateDocumentUpload(
    applicationId: string,
    file: {
      originalname: string;
      mimetype: string;
      size: number;
    }
  ): Promise<SimulatedUploadResult> {
    // Simulate upload delay (500ms - 2s based on file size)
    const baseDelay = 500;
    const sizeDelay = Math.min((file.size / 1024 / 1024) * 500, 1500); // 500ms per MB, max 1.5s
    const processingTime = baseDelay + sizeDelay;

    await this.delay(processingTime);

    // Generate mock document
    const document = {
      id: uuidv4(),
      applicationId,
      fileName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      documentType: this.inferDocumentType(file.originalname),
      status: 'UPLOADED',
      uploadedAt: new Date(),
      uploadedBy: 'demo-user',
      storageKey: `demo/${uuidv4()}/${file.originalname}`, // Not actually stored
      metadata: {
        isDemo: true,
        simulatedUpload: true,
      },
    };

    logger.info('Simulated document upload', {
      documentId: document.id,
      fileName: file.originalname,
      processingTime,
    });

    return {
      document,
      processingTime,
      success: true,
    };
  }

  /**
   * Mock AI analysis with pre-computed results
   * Simulates the full AI analysis pipeline
   */
  async simulateAIAnalysis(
    documentId: string,
    documentType: string
  ): Promise<SimulatedAnalysisResult> {
    // Simulate realistic AI processing delay (2-7 seconds)
    const processingTime = 2000 + Math.random() * 5000;
    await this.delay(processingTime);

    // Generate pre-computed AI analysis
    const analysis = demoDataGenerator.generateAIAnalysis(documentId, documentType);

    // Add additional simulation metadata
    const simulatedAnalysis = {
      ...analysis,
      id: uuidv4(),
      documentId,
      documentType,
      analyzedAt: new Date(),
      aiProvider: 'Azure AI Document Intelligence (Demo)',
      modelVersion: 'demo-v1.0',
      metadata: {
        isDemo: true,
        simulatedAnalysis: true,
      },
    };

    logger.info('Simulated AI analysis', {
      documentId,
      documentType,
      qualityScore: analysis.qualityScore,
      processingTime,
    });

    return {
      analysis: simulatedAnalysis,
      processingTime,
      success: true,
    };
  }

  /**
   * Simulate approval/rejection workflows
   * Mimics the full decision workflow without database updates
   */
  async simulateApprovalWorkflow(
    applicationId: string,
    decision: 'APPROVED' | 'REJECTED' | 'DEFERRED',
    justification: string,
    approvedAmount?: number
  ): Promise<SimulatedDecisionResult> {
    // Simulate workflow processing delay (1-3 seconds)
    const processingTime = 1000 + Math.random() * 2000;
    await this.delay(processingTime);

    // Generate decision record
    const decisionRecord = {
      id: uuidv4(),
      applicationId,
      decision,
      justification,
      approvedAmount: decision === 'APPROVED' ? approvedAmount : null,
      decidedBy: 'demo-approver',
      decidedAt: new Date(),
      metadata: {
        isDemo: true,
        simulatedDecision: true,
      },
    };

    // Update application status based on decision
    const statusMap = {
      APPROVED: 'APPROVED',
      REJECTED: 'REJECTED',
      DEFERRED: 'DEFERRED',
    };

    const updatedApplication = {
      id: applicationId,
      status: statusMap[decision],
      decision: decisionRecord,
      updatedAt: new Date(),
      metadata: {
        isDemo: true,
      },
    };

    // Simulate notifications that would be sent
    const notifications: string[] = [];
    
    if (decision === 'APPROVED') {
      notifications.push('Email notification sent to applicant: Application approved');
      notifications.push('Teams notification sent to loan operations team');
      notifications.push('Webhook triggered for downstream systems');
    } else if (decision === 'REJECTED') {
      notifications.push('Email notification sent to applicant: Application rejected');
      notifications.push('Teams notification sent to review team');
    } else {
      notifications.push('Email notification sent to applicant: Additional information required');
      notifications.push('Teams notification sent to assigned reviewer');
    }

    logger.info('Simulated approval workflow', {
      applicationId,
      decision,
      processingTime,
      notificationCount: notifications.length,
    });

    return {
      application: updatedApplication,
      decision: decisionRecord,
      processingTime,
      success: true,
      notifications,
    };
  }

  /**
   * Simulate application submission workflow
   */
  async simulateApplicationSubmission(
    applicationId: string
  ): Promise<SimulatedWorkflowResult> {
    // Simulate submission processing (500ms - 1.5s)
    const processingTime = 500 + Math.random() * 1000;
    await this.delay(processingTime);

    const application = {
      id: applicationId,
      status: 'SUBMITTED',
      submittedAt: new Date(),
      metadata: {
        isDemo: true,
        simulatedSubmission: true,
      },
    };

    logger.info('Simulated application submission', {
      applicationId,
      processingTime,
    });

    return {
      application,
      processingTime,
      success: true,
      message: 'Application submitted successfully (demo mode)',
    };
  }

  /**
   * Simulate document classification
   */
  async simulateDocumentClassification(
    documentId: string,
    fileName: string
  ): Promise<SimulatedWorkflowResult> {
    // Simulate classification delay (1-2 seconds)
    const processingTime = 1000 + Math.random() * 1000;
    await this.delay(processingTime);

    const documentType = this.inferDocumentType(fileName);
    const confidence = 0.85 + Math.random() * 0.14; // 0.85 - 0.99

    const classification = {
      documentId,
      documentType,
      confidence,
      classifiedAt: new Date(),
      metadata: {
        isDemo: true,
        simulatedClassification: true,
      },
    };

    logger.info('Simulated document classification', {
      documentId,
      documentType,
      confidence,
      processingTime,
    });

    return {
      application: classification,
      processingTime,
      success: true,
      message: `Document classified as ${documentType}`,
    };
  }

  /**
   * Simulate data extraction
   */
  async simulateDataExtraction(
    documentId: string,
    documentType: string
  ): Promise<SimulatedWorkflowResult> {
    // Simulate extraction delay (2-4 seconds)
    const processingTime = 2000 + Math.random() * 2000;
    await this.delay(processingTime);

    const extractedData = demoDataGenerator['generateExtractedData'](documentType);

    const extraction = {
      documentId,
      documentType,
      extractedData,
      extractedAt: new Date(),
      confidence: 0.90 + Math.random() * 0.09, // 0.90 - 0.99
      metadata: {
        isDemo: true,
        simulatedExtraction: true,
      },
    };

    logger.info('Simulated data extraction', {
      documentId,
      documentType,
      fieldCount: Object.keys(extractedData).length,
      processingTime,
    });

    return {
      application: extraction,
      processingTime,
      success: true,
      message: 'Data extracted successfully',
    };
  }

  /**
   * Simulate batch document processing
   */
  async simulateBatchProcessing(
    documentIds: string[],
    operationType: 'ANALYSIS' | 'CLASSIFICATION' | 'EXTRACTION'
  ): Promise<{
    jobId: string;
    status: string;
    totalDocuments: number;
    estimatedCompletionTime: number;
  }> {
    const jobId = uuidv4();
    const documentCount = documentIds.length;
    
    // Calculate estimated time based on operation and document count
    const timePerDocument = {
      ANALYSIS: 3000,
      CLASSIFICATION: 1500,
      EXTRACTION: 2500,
    };

    const estimatedCompletionTime = documentCount * timePerDocument[operationType];

    logger.info('Simulated batch processing job created', {
      jobId,
      operationType,
      documentCount,
      estimatedCompletionTime,
    });

    return {
      jobId,
      status: 'PROCESSING',
      totalDocuments: documentCount,
      estimatedCompletionTime,
    };
  }

  /**
   * Simulate anomaly detection
   */
  async simulateAnomalyDetection(
    applicationId: string,
    documentIds: string[]
  ): Promise<{
    anomalies: any[];
    riskScore: number;
    processingTime: number;
  }> {
    // Simulate anomaly detection delay (3-5 seconds)
    const processingTime = 3000 + Math.random() * 2000;
    await this.delay(processingTime);

    // Generate random anomalies (0-3)
    const anomalyCount = Math.floor(Math.random() * 4);
    const anomalies = demoDataGenerator.generateAnomalies(applicationId, anomalyCount);

    // Calculate risk score based on anomalies
    const riskScore = anomalies.length > 0
      ? Math.min(30 + (anomalies.length * 20) + Math.random() * 20, 100)
      : Math.random() * 30;

    logger.info('Simulated anomaly detection', {
      applicationId,
      documentCount: documentIds.length,
      anomalyCount,
      riskScore,
      processingTime,
    });

    return {
      anomalies,
      riskScore: Math.round(riskScore),
      processingTime,
    };
  }

  /**
   * Simulate eligibility calculation
   */
  async simulateEligibilityCalculation(
    applicationId: string,
    programType: string
  ): Promise<{
    eligibilityScore: number;
    factors: any[];
    recommendation: string;
    processingTime: number;
  }> {
    // Simulate calculation delay (1-2 seconds)
    const processingTime = 1000 + Math.random() * 1000;
    await this.delay(processingTime);

    // Generate eligibility score (60-95)
    const eligibilityScore = 60 + Math.random() * 35;

    // Generate factors
    const factors = [
      {
        name: 'Credit Score',
        score: 70 + Math.random() * 30,
        weight: 0.3,
      },
      {
        name: 'Business History',
        score: 60 + Math.random() * 40,
        weight: 0.25,
      },
      {
        name: 'Financial Stability',
        score: 65 + Math.random() * 35,
        weight: 0.25,
      },
      {
        name: 'Document Completeness',
        score: 75 + Math.random() * 25,
        weight: 0.2,
      },
    ];

    // Generate recommendation
    const recommendation = eligibilityScore >= 80
      ? 'RECOMMEND_APPROVAL'
      : eligibilityScore >= 65
      ? 'RECOMMEND_REVIEW'
      : 'RECOMMEND_REJECTION';

    logger.info('Simulated eligibility calculation', {
      applicationId,
      programType,
      eligibilityScore: Math.round(eligibilityScore),
      recommendation,
      processingTime,
    });

    return {
      eligibilityScore: Math.round(eligibilityScore),
      factors,
      recommendation,
      processingTime,
    };
  }

  /**
   * Add realistic delays for operations
   * Simulates network latency and processing time
   */
  private async delay(ms: number): Promise<void> {
    // Add small random variance (±10%)
    const variance = ms * 0.1;
    const actualDelay = ms + (Math.random() * variance * 2 - variance);
    
    return new Promise(resolve => setTimeout(resolve, actualDelay));
  }

  /**
   * Infer document type from filename
   */
  private inferDocumentType(fileName: string): string {
    const lowerName = fileName.toLowerCase();

    if (lowerName.includes('license')) return 'BUSINESS_LICENSE';
    if (lowerName.includes('tax') || lowerName.includes('1040') || lowerName.includes('w2')) return 'TAX_RETURN';
    if (lowerName.includes('bank') || lowerName.includes('statement')) return 'BANK_STATEMENT';
    if (lowerName.includes('id') || lowerName.includes('passport') || lowerName.includes('driver')) return 'IDENTITY_DOCUMENT';
    if (lowerName.includes('address') || lowerName.includes('utility') || lowerName.includes('bill')) return 'PROOF_OF_ADDRESS';
    if (lowerName.includes('financial') || lowerName.includes('balance')) return 'FINANCIAL_STATEMENT';
    if (lowerName.includes('business') && lowerName.includes('plan')) return 'BUSINESS_PLAN';
    if (lowerName.includes('incorporation') || lowerName.includes('articles')) return 'INCORPORATION_DOCUMENTS';
    if (lowerName.includes('lease') || lowerName.includes('deed')) return 'PROPERTY_DOCUMENTS';

    return 'OTHER';
  }

  /**
   * Simulate notification sending
   */
  async simulateNotification(
    type: 'EMAIL' | 'TEAMS' | 'WEBHOOK',
    recipient: string,
    notificationMessage: string
  ): Promise<{
    success: boolean;
    messageId: string;
    sentAt: Date;
  }> {
    // Simulate notification delay (100-500ms)
    await this.delay(100 + Math.random() * 400);

    const messageId = uuidv4();

    logger.info('Simulated notification', {
      type,
      recipient,
      messageId,
      messageLength: notificationMessage.length,
    });

    return {
      success: true,
      messageId,
      sentAt: new Date(),
    };
  }

  /**
   * Simulate webhook trigger
   */
  async simulateWebhook(
    url: string,
    event: string,
    webhookPayload: any
  ): Promise<{
    success: boolean;
    statusCode: number;
    responseTime: number;
  }> {
    // Simulate webhook delay (200-800ms)
    const responseTime = 200 + Math.random() * 600;
    await this.delay(responseTime);

    logger.info('Simulated webhook', {
      url,
      event,
      responseTime,
      payloadSize: JSON.stringify(webhookPayload).length,
    });

    return {
      success: true,
      statusCode: 200,
      responseTime,
    };
  }
}

export default new DemoOperationSimulator();
