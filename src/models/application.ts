/**
 * Application Data Models
 * Defines TypeScript interfaces for application management system
 */

/**
 * Application status enum
 */
export enum ApplicationStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  PENDING_DOCUMENTS = 'PENDING_DOCUMENTS',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  DEFERRED = 'DEFERRED',
}

/**
 * Fraud flag interface
 */
export interface FraudFlag {
  type: 'DUPLICATE_EIN' | 'SUSPICIOUS_DOCUMENT' | 'DATA_MISMATCH' | 'PATTERN_ANOMALY';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
  evidence: any;
}

/**
 * Decision interface
 */
export interface Decision {
  decision: 'APPROVED' | 'REJECTED' | 'DEFERRED';
  amount?: number;
  justification: string;
  overrideReason?: string;
  decidedBy: string;
  decidedAt: Date;
}

/**
 * Application interface
 */
export interface Application {
  id: string;
  applicantId: string;
  programType: string;
  requestedAmount: number;
  status: ApplicationStatus;
  eligibilityScore?: number;
  missingDocuments: string[];
  fraudFlags: FraudFlag[];
  assignedTo?: string;
  submittedAt?: Date;
  reviewedAt?: Date;
  decidedAt?: Date;
  decision?: Decision;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create application request
 */
export interface CreateApplicationRequest {
  applicantId: string;
  programType: string;
  requestedAmount: number;
}

/**
 * Update application request
 */
export interface UpdateApplicationRequest {
  requestedAmount?: number;
  status?: ApplicationStatus;
  assignedTo?: string;
  decision?: Decision;
}

/**
 * Application with applicant details
 */
export interface ApplicationWithApplicant extends Application {
  applicant: {
    businessName: string;
    ein: string;
    email: string;
    phone: string;
  };
}
