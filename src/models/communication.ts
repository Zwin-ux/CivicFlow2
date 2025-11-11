/**
 * Communication Data Models
 * Defines TypeScript interfaces for communication management system
 */

/**
 * Communication type enum
 */
export enum CommunicationType {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PORTAL_MESSAGE = 'PORTAL_MESSAGE',
}

/**
 * Communication status enum
 */
export enum CommunicationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  BOUNCED = 'BOUNCED',
}

/**
 * Email template type enum
 */
export enum EmailTemplateType {
  APPLICATION_SUBMITTED = 'APPLICATION_SUBMITTED',
  APPLICATION_UNDER_REVIEW = 'APPLICATION_UNDER_REVIEW',
  MISSING_DOCUMENTS = 'MISSING_DOCUMENTS',
  APPLICATION_APPROVED = 'APPLICATION_APPROVED',
  APPLICATION_REJECTED = 'APPLICATION_REJECTED',
  APPLICATION_DEFERRED = 'APPLICATION_DEFERRED',
  STAFF_SUMMARY = 'STAFF_SUMMARY',
}

/**
 * Email template interface
 */
export interface EmailTemplate {
  id: string;
  templateType: EmailTemplateType;
  name: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  variables: string[]; // List of template variables
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Communication interface
 */
export interface Communication {
  id: string;
  applicationId: string;
  recipient: string;
  type: CommunicationType;
  templateType?: EmailTemplateType;
  subject?: string;
  body: string;
  status: CommunicationStatus;
  sentAt?: Date;
  failureReason?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create communication request
 */
export interface CreateCommunicationRequest {
  applicationId: string;
  recipient: string;
  type: CommunicationType;
  templateType?: EmailTemplateType;
  subject?: string;
  body: string;
  metadata?: Record<string, any>;
}

/**
 * Staff summary interface
 */
export interface StaffSummary {
  applicationId: string;
  applicantName: string;
  businessName: string;
  programType: string;
  requestedAmount: number;
  eligibilityScore?: number;
  missingDocuments: string[];
  fraudFlags: Array<{
    type: string;
    severity: string;
    description: string;
  }>;
  recommendedAction: 'APPROVE' | 'REJECT' | 'REQUEST_INFO';
  reasoning: string[];
  submittedAt?: Date;
}

/**
 * Email template data for rendering
 */
export interface EmailTemplateData {
  applicantName?: string;
  businessName?: string;
  applicationId?: string;
  programType?: string;
  requestedAmount?: number;
  status?: string;
  missingDocuments?: string[];
  eligibilityScore?: number;
  decision?: string;
  decisionReason?: string;
  staffSummary?: StaffSummary;
  [key: string]: any;
}
