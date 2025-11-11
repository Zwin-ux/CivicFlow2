/**
 * Performance Metrics Data Models
 * Defines TypeScript interfaces for performance monitoring and metrics tracking
 */

/**
 * Document classification validation record
 */
export interface ClassificationValidation {
  id: string;
  documentId: string;
  predictedType: string;
  actualType: string;
  confidenceScore: number;
  isCorrect: boolean;
  validatedBy: string;
  validatedAt: Date;
}

/**
 * Classification accuracy metrics
 */
export interface ClassificationAccuracyMetrics {
  totalValidations: number;
  correctPredictions: number;
  accuracyPercentage: number;
  averageConfidence: number;
  byDocumentType: Record<string, {
    total: number;
    correct: number;
    accuracy: number;
  }>;
  period: {
    startDate: Date;
    endDate: Date;
  };
}

/**
 * Application processing time record
 */
export interface ProcessingTimeRecord {
  applicationId: string;
  submittedAt: Date;
  decidedAt: Date;
  processingTimeHours: number;
  status: string;
  programType: string;
}

/**
 * Processing time metrics
 */
export interface ProcessingTimeMetrics {
  averageProcessingTime: number; // in hours
  medianProcessingTime: number;
  minProcessingTime: number;
  maxProcessingTime: number;
  totalApplications: number;
  baselineProcessingTime: number; // manual processing baseline
  reductionPercentage: number;
  byProgramType: Record<string, {
    average: number;
    count: number;
  }>;
  period: {
    startDate: Date;
    endDate: Date;
  };
}

/**
 * Privacy breach alert
 */
export interface PrivacyBreachAlert {
  id: string;
  alertType: 'EXCESSIVE_ACCESS' | 'MULTIPLE_FAILED_ATTEMPTS' | 'UNAUTHORIZED_ACCESS' | 'SUSPICIOUS_PATTERN';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  userId: string;
  description: string;
  evidence: Record<string, any>;
  detectedAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  notes?: string;
}

/**
 * Privacy breach detection result
 */
export interface PrivacyBreachDetectionResult {
  alerts: PrivacyBreachAlert[];
  totalAlerts: number;
  criticalAlerts: number;
  highAlerts: number;
  mediumAlerts: number;
  lowAlerts: number;
  detectionPeriod: {
    startDate: Date;
    endDate: Date;
  };
}

/**
 * Performance metrics summary
 */
export interface PerformanceMetricsSummary {
  classificationAccuracy: ClassificationAccuracyMetrics;
  processingTime: ProcessingTimeMetrics;
  privacyBreaches: PrivacyBreachDetectionResult;
  generatedAt: Date;
}

/**
 * Metrics filters
 */
export interface MetricsFilters {
  startDate?: Date;
  endDate?: Date;
  programType?: string;
}
