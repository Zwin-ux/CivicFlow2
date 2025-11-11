/**
 * Data Validator Models
 * Defines TypeScript interfaces for data validation and fraud detection
 */

/**
 * EIN verification result
 */
export interface VerificationResult {
  isValid: boolean;
  source: string;
  matchConfidence: number; // 0-100
  details: Record<string, any>;
  timestamp: Date;
}

/**
 * Contact information validation result
 */
export interface ContactValidationResult {
  isValid: boolean;
  email?: {
    isValid: boolean;
    isDisposable: boolean;
    reason?: string;
  };
  phone?: {
    isValid: boolean;
    countryCode?: string;
    reason?: string;
  };
  address?: {
    isValid: boolean;
    normalized?: string;
    reason?: string;
  };
}

/**
 * Fraud flag types
 */
export enum FraudFlagType {
  DUPLICATE_EIN = 'DUPLICATE_EIN',
  SUSPICIOUS_DOCUMENT = 'SUSPICIOUS_DOCUMENT',
  DATA_MISMATCH = 'DATA_MISMATCH',
  PATTERN_ANOMALY = 'PATTERN_ANOMALY',
}

/**
 * Fraud flag severity levels
 */
export enum FraudSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

/**
 * Individual fraud flag
 */
export interface FraudFlag {
  type: FraudFlagType;
  severity: FraudSeverity;
  description: string;
  evidence: any;
}

/**
 * Fraud analysis result
 */
export interface FraudAnalysis {
  riskScore: number; // 0-100, higher = more suspicious
  flags: FraudFlag[];
  requiresInvestigation: boolean;
}

/**
 * Contact information structure
 */
export interface ContactInfo {
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country?: string;
  };
}
