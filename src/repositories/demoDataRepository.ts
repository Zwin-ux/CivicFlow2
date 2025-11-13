import demoDataGenerator, {
  DemoApplication,
  DemoDocument,
  DemoAIAnalysis,
  DemoAnomaly,
  DemoUserProfile,
} from '../services/demoDataGenerator';
import logger from '../utils/logger';

/**
 * In-memory repository for demo data
 * Data is generated on-demand and cached per session
 */
class DemoDataRepository {
  private sessionData: Map<string, {
    applications: DemoApplication[];
    userProfiles: DemoUserProfile[];
    createdAt: Date;
  }> = new Map();

  /**
   * Get or create demo data for a session
   */
  getSessionData(sessionId: string): {
    applications: DemoApplication[];
    userProfiles: DemoUserProfile[];
  } {
    // Check if data exists for this session
    if (this.sessionData.has(sessionId)) {
      const data = this.sessionData.get(sessionId)!;
      return {
        applications: data.applications,
        userProfiles: data.userProfiles,
      };
    }

    // Generate new demo data
    const applications = demoDataGenerator.generateApplications(10);
    const userProfiles = demoDataGenerator.generateUserProfiles();

    // Add AI analysis to some documents
    applications.forEach(app => {
      app.documents.forEach(doc => {
        if (Math.random() > 0.3) { // 70% of documents have AI analysis
          const analysis = demoDataGenerator.generateAIAnalysis(doc.id, doc.documentType);
          doc.qualityScore = analysis.qualityScore;
          doc.extractedData = analysis.extractedData;
        }
      });
    });

    // Cache the data
    this.sessionData.set(sessionId, {
      applications,
      userProfiles,
      createdAt: new Date(),
    });

    logger.info('Generated demo data for session', { sessionId, applicationCount: applications.length });

    return { applications, userProfiles };
  }

  /**
   * Get all applications for a session
   */
  getApplications(sessionId: string, filters?: {
    status?: string;
    programType?: string;
    minRiskScore?: number;
    maxRiskScore?: number;
  }): DemoApplication[] {
    const { applications } = this.getSessionData(sessionId);

    if (!filters) {
      return applications;
    }

    return applications.filter(app => {
      if (filters.status && app.status !== filters.status) return false;
      if (filters.programType && app.programType !== filters.programType) return false;
      if (filters.minRiskScore && app.riskScore && app.riskScore < filters.minRiskScore) return false;
      if (filters.maxRiskScore && app.riskScore && app.riskScore > filters.maxRiskScore) return false;
      return true;
    });
  }

  /**
   * Get a single application by ID
   */
  getApplication(sessionId: string, applicationId: string): DemoApplication | null {
    const { applications } = this.getSessionData(sessionId);
    return applications.find(app => app.id === applicationId) || null;
  }

  /**
   * Get documents for an application
   */
  getDocuments(sessionId: string, applicationId: string): DemoDocument[] {
    const application = this.getApplication(sessionId, applicationId);
    return application?.documents || [];
  }

  /**
   * Get a single document by ID
   */
  getDocument(sessionId: string, documentId: string): DemoDocument | null {
    const { applications } = this.getSessionData(sessionId);
    
    for (const app of applications) {
      const doc = app.documents.find(d => d.id === documentId);
      if (doc) return doc;
    }
    
    return null;
  }

  /**
   * Get AI analysis for a document
   */
  getAIAnalysis(sessionId: string, documentId: string): DemoAIAnalysis | null {
    const document = this.getDocument(sessionId, documentId);
    
    if (!document) return null;

    // Generate AI analysis if not already present
    return demoDataGenerator.generateAIAnalysis(documentId, document.documentType);
  }

  /**
   * Get anomalies for an application
   */
  getAnomalies(sessionId: string, applicationId: string): DemoAnomaly[] {
    const application = this.getApplication(sessionId, applicationId);
    return application?.anomalies || [];
  }

  /**
   * Get user profiles
   */
  getUserProfiles(sessionId: string): DemoUserProfile[] {
    const { userProfiles } = this.getSessionData(sessionId);
    return userProfiles;
  }

  /**
   * Get user profile by role
   */
  getUserProfile(sessionId: string, role: string): DemoUserProfile | null {
    const profiles = this.getUserProfiles(sessionId);
    return profiles.find(p => p.role === role) || null;
  }

  /**
   * Simulate document upload (returns a new demo document)
   */
  simulateDocumentUpload(
    sessionId: string,
    applicationId: string,
    documentType: string,
    fileName: string
  ): DemoDocument {
    const { applications } = this.getSessionData(sessionId);
    const application = applications.find(app => app.id === applicationId);

    if (!application) {
      throw new Error('Application not found');
    }

    const newDocument: DemoDocument = {
      id: `demo-doc-${Date.now()}`,
      applicationId,
      documentType,
      fileName,
      fileSize: Math.floor(Math.random() * 5000000) + 100000,
      mimeType: fileName.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
      uploadedAt: new Date(),
      status: 'PROCESSING',
      qualityScore: undefined,
      extractedData: undefined,
      thumbnailUrl: `/demo/thumbnails/${documentType.toLowerCase()}.png`,
    };

    // Add to application
    application.documents.push(newDocument);

    // Simulate processing delay
    setTimeout(() => {
      newDocument.status = 'PROCESSED';
      const analysis = demoDataGenerator.generateAIAnalysis(newDocument.id, documentType);
      newDocument.qualityScore = analysis.qualityScore;
      newDocument.extractedData = analysis.extractedData;
    }, 2000);

    logger.info('Simulated document upload', { sessionId, applicationId, documentType });

    return newDocument;
  }

  /**
   * Simulate application status change
   */
  updateApplicationStatus(
    sessionId: string,
    applicationId: string,
    newStatus: string
  ): DemoApplication | null {
    const application = this.getApplication(sessionId, applicationId);

    if (!application) {
      return null;
    }

    application.status = newStatus;

    logger.info('Updated demo application status', { sessionId, applicationId, newStatus });

    return application;
  }

  /**
   * Simulate anomaly review
   */
  reviewAnomaly(
    sessionId: string,
    anomalyId: string,
    status: string,
    _notes?: string
  ): DemoAnomaly | null {
    // Parameter intentionally unused in demo implementation
    void _notes;
    const { applications } = this.getSessionData(sessionId);

    for (const app of applications) {
      if (app.anomalies) {
        const anomaly = app.anomalies.find(a => a.id === anomalyId);
        if (anomaly) {
          anomaly.status = status;
          logger.info('Reviewed demo anomaly', { sessionId, anomalyId, status });
          return anomaly;
        }
      }
    }

    return null;
  }

  /**
   * Reset session data (for demo reset)
   */
  resetSessionData(sessionId: string): void {
    this.sessionData.delete(sessionId);
    logger.info('Reset demo data for session', { sessionId });
  }

  /**
   * Clean up old session data (called periodically)
   */
  cleanupOldSessions(maxAgeMinutes: number = 60): number {
    const now = new Date();
    let cleanedCount = 0;

    for (const [sessionId, data] of this.sessionData.entries()) {
      const ageMinutes = (now.getTime() - data.createdAt.getTime()) / 60000;
      
      if (ageMinutes > maxAgeMinutes) {
        this.sessionData.delete(sessionId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info('Cleaned up old demo session data', { cleanedCount });
    }

    return cleanedCount;
  }

  /**
   * Get statistics about cached demo data
   */
  getStats(): {
    sessionCount: number;
    totalApplications: number;
    totalDocuments: number;
    memoryUsageEstimate: string;
  } {
    let totalApplications = 0;
    let totalDocuments = 0;

    for (const data of this.sessionData.values()) {
      totalApplications += data.applications.length;
      data.applications.forEach(app => {
        totalDocuments += app.documents.length;
      });
    }

    // Rough estimate of memory usage
    const estimatedBytes = this.sessionData.size * 100000; // ~100KB per session
    const memoryUsageEstimate = `${(estimatedBytes / 1024 / 1024).toFixed(2)} MB`;

    return {
      sessionCount: this.sessionData.size,
      totalApplications,
      totalDocuments,
      memoryUsageEstimate,
    };
  }
}

export default new DemoDataRepository();
