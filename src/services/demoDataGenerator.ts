import { v4 as uuidv4 } from 'uuid';

/**
 * Service to generate realistic demo data for demo mode
 */

export interface DemoApplication {
  id: string;
  applicantId: string;
  programType: string;
  status: string;
  submittedAt: Date;
  applicantName: string;
  businessName: string;
  requestedAmount: number;
  riskScore?: number;
  qualityScore?: number;
  documents: DemoDocument[];
  aiAnalysis?: DemoAIAnalysis;
  anomalies?: DemoAnomaly[];
}

export interface DemoDocument {
  id: string;
  applicationId: string;
  documentType: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: Date;
  status: string;
  qualityScore?: number;
  extractedData?: any;
  thumbnailUrl?: string;
}

export interface DemoAIAnalysis {
  documentId: string;
  qualityScore: number;
  extractedData: any;
  summary: string;
  recommendations: string[];
  confidence: number;
  processingTime: number;
}

export interface DemoAnomaly {
  id: string;
  applicationId: string;
  documentId?: string;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  confidence: number;
  status: string;
}

export interface DemoUserProfile {
  id: string;
  role: 'APPLICANT' | 'REVIEWER' | 'APPROVER' | 'ADMIN';
  name: string;
  email: string;
  applications?: DemoApplication[];
}

class DemoDataGenerator {
  /**
   * Generate sample applications with complete data
   */
  generateApplications(count: number = 5): DemoApplication[] {
    const applications: DemoApplication[] = [];
    const statuses = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'];
    const programTypes = ['MICRO_GRANT', 'SMALL_BUSINESS_LOAN', 'STARTUP_GRANT', 'EXPANSION_LOAN'];

    for (let i = 0; i < count; i++) {
      const appId = uuidv4();
      const applicantId = uuidv4();
      const status = statuses[i % statuses.length];
      const programType = programTypes[i % programTypes.length];

      const application: DemoApplication = {
        id: appId,
        applicantId,
        programType,
        status,
        submittedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Last 30 days
        applicantName: this.generateName(),
        businessName: this.generateBusinessName(),
        requestedAmount: Math.floor(Math.random() * 500000) + 10000,
        riskScore: Math.floor(Math.random() * 100),
        qualityScore: Math.floor(Math.random() * 30) + 70, // 70-100
        documents: this.generateDocuments(appId, 3 + Math.floor(Math.random() * 3)),
        aiAnalysis: undefined,
        anomalies: [],
      };

      // Add anomalies for some applications
      if (application.riskScore && application.riskScore > 70) {
        application.anomalies = this.generateAnomalies(appId, 1 + Math.floor(Math.random() * 2));
      }

      applications.push(application);
    }

    return applications;
  }

  /**
   * Generate sample documents
   */
  generateDocuments(applicationId: string, count: number): DemoDocument[] {
    const documents: DemoDocument[] = [];
    const documentTypes = [
      'BUSINESS_LICENSE',
      'TAX_RETURN',
      'BANK_STATEMENT',
      'IDENTITY_DOCUMENT',
      'PROOF_OF_ADDRESS',
      'FINANCIAL_STATEMENT',
      'BUSINESS_PLAN',
    ];

    for (let i = 0; i < count; i++) {
      const docType = documentTypes[i % documentTypes.length];
      documents.push({
        id: uuidv4(),
        applicationId,
        documentType: docType,
        fileName: `${docType.toLowerCase()}_${Date.now()}.pdf`,
        fileSize: Math.floor(Math.random() * 5000000) + 100000, // 100KB - 5MB
        mimeType: 'application/pdf',
        uploadedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Last 7 days
        status: 'PROCESSED',
        qualityScore: Math.floor(Math.random() * 30) + 70,
        extractedData: this.generateExtractedData(docType),
        thumbnailUrl: `/demo/thumbnails/${docType.toLowerCase()}.png`,
      });
    }

    return documents;
  }

  /**
   * Generate pre-computed AI analysis results
   */
  generateAIAnalysis(documentId: string, documentType: string): DemoAIAnalysis {
    const qualityScore = Math.floor(Math.random() * 30) + 70;
    
    return {
      documentId,
      qualityScore,
      extractedData: this.generateExtractedData(documentType),
      summary: this.generateSummary(documentType),
      recommendations: this.generateRecommendations(qualityScore),
      confidence: 0.85 + Math.random() * 0.14, // 0.85 - 0.99
      processingTime: Math.floor(Math.random() * 5000) + 2000, // 2-7 seconds
    };
  }

  /**
   * Generate sample anomalies
   */
  generateAnomalies(applicationId: string, count: number): DemoAnomaly[] {
    const anomalies: DemoAnomaly[] = [];
    const types = [
      'IMAGE_MANIPULATION',
      'INCONSISTENT_DATA',
      'MISSING_INFORMATION',
      'SUSPICIOUS_PATTERN',
      'DOCUMENT_MISMATCH',
    ];
    const severities: Array<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'> = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

    for (let i = 0; i < count; i++) {
      const type = types[i % types.length];
      const severity = severities[Math.floor(Math.random() * severities.length)];

      anomalies.push({
        id: uuidv4(),
        applicationId,
        documentId: uuidv4(),
        type,
        severity,
        description: this.generateAnomalyDescription(type, severity),
        confidence: 0.75 + Math.random() * 0.24, // 0.75 - 0.99
        status: 'PENDING',
      });
    }

    return anomalies;
  }

  /**
   * Generate demo user profiles for different roles
   */
  generateUserProfiles(): DemoUserProfile[] {
    return [
      {
        id: uuidv4(),
        role: 'APPLICANT',
        name: 'John Smith',
        email: 'john.smith@demo.local',
      },
      {
        id: uuidv4(),
        role: 'REVIEWER',
        name: 'Sarah Johnson',
        email: 'sarah.johnson@demo.local',
      },
      {
        id: uuidv4(),
        role: 'APPROVER',
        name: 'Michael Chen',
        email: 'michael.chen@demo.local',
      },
      {
        id: uuidv4(),
        role: 'ADMIN',
        name: 'Emily Davis',
        email: 'emily.davis@demo.local',
      },
    ];
  }

  /**
   * Generate extracted data based on document type
   */
  private generateExtractedData(documentType: string): any {
    switch (documentType) {
      case 'BUSINESS_LICENSE':
        return {
          businessName: this.generateBusinessName(),
          licenseNumber: `BL-${Math.floor(Math.random() * 1000000)}`,
          issueDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
          expiryDate: new Date(Date.now() + Math.random() * 365 * 24 * 60 * 60 * 1000),
          businessType: 'LLC',
        };

      case 'TAX_RETURN':
        return {
          taxYear: new Date().getFullYear() - 1,
          grossIncome: Math.floor(Math.random() * 500000) + 50000,
          netIncome: Math.floor(Math.random() * 200000) + 20000,
          taxPaid: Math.floor(Math.random() * 50000) + 5000,
        };

      case 'BANK_STATEMENT':
        return {
          accountNumber: `****${Math.floor(Math.random() * 10000)}`,
          statementDate: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
          openingBalance: Math.floor(Math.random() * 100000) + 10000,
          closingBalance: Math.floor(Math.random() * 100000) + 10000,
          transactions: Math.floor(Math.random() * 50) + 10,
        };

      case 'IDENTITY_DOCUMENT':
        return {
          fullName: this.generateName(),
          documentNumber: `ID-${Math.floor(Math.random() * 10000000)}`,
          dateOfBirth: new Date(1970 + Math.random() * 40, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28)),
          expiryDate: new Date(Date.now() + Math.random() * 5 * 365 * 24 * 60 * 60 * 1000),
        };

      case 'PROOF_OF_ADDRESS':
        return {
          address: this.generateAddress(),
          documentDate: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
          documentType: 'Utility Bill',
        };

      case 'FINANCIAL_STATEMENT':
        return {
          statementDate: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000),
          totalAssets: Math.floor(Math.random() * 1000000) + 100000,
          totalLiabilities: Math.floor(Math.random() * 500000) + 50000,
          netWorth: Math.floor(Math.random() * 500000) + 50000,
        };

      default:
        return {
          documentType,
          processedAt: new Date(),
        };
    }
  }

  /**
   * Generate document summary
   */
  private generateSummary(documentType: string): string {
    const summaries: Record<string, string> = {
      BUSINESS_LICENSE: 'Valid business license for a registered LLC. License is current and in good standing. Business has been operating for 3 years.',
      TAX_RETURN: 'Tax return shows consistent revenue growth over the past year. Net income is positive with all tax obligations met on time.',
      BANK_STATEMENT: 'Bank statement shows healthy cash flow with regular deposits. Average balance maintained above minimum requirements.',
      IDENTITY_DOCUMENT: 'Valid government-issued identification document. All information is clearly visible and matches application data.',
      PROOF_OF_ADDRESS: 'Recent utility bill confirming current residential address. Document is less than 90 days old.',
      FINANCIAL_STATEMENT: 'Financial statement shows positive net worth with assets exceeding liabilities. Business is financially stable.',
      BUSINESS_PLAN: 'Comprehensive business plan outlining growth strategy, market analysis, and financial projections for the next 3 years.',
    };

    return summaries[documentType] || 'Document has been analyzed and key information extracted successfully.';
  }

  /**
   * Generate recommendations based on quality score
   */
  private generateRecommendations(qualityScore: number): string[] {
    if (qualityScore >= 90) {
      return ['Document quality is excellent', 'All required information is present', 'No additional documents needed'];
    } else if (qualityScore >= 75) {
      return ['Document quality is good', 'Consider providing additional supporting documents', 'Some minor details could be clearer'];
    } else {
      return [
        'Document quality could be improved',
        'Please provide a higher resolution scan',
        'Some information is difficult to read',
        'Additional verification documents recommended',
      ];
    }
  }

  /**
   * Generate anomaly description
   */
  private generateAnomalyDescription(type: string, severity: string): string {
    const descriptions: Record<string, Record<string, string>> = {
      IMAGE_MANIPULATION: {
        LOW: 'Minor compression artifacts detected in document image',
        MEDIUM: 'Possible image editing detected - requires manual review',
        HIGH: 'Significant image manipulation indicators found',
        CRITICAL: 'Document appears to be digitally altered - immediate review required',
      },
      INCONSISTENT_DATA: {
        LOW: 'Minor discrepancy in dates across documents',
        MEDIUM: 'Inconsistent business name formatting detected',
        HIGH: 'Significant data mismatch between documents',
        CRITICAL: 'Critical inconsistency in financial figures - verification required',
      },
      MISSING_INFORMATION: {
        LOW: 'Optional field not provided',
        MEDIUM: 'Some supporting documentation missing',
        HIGH: 'Required information not found in document',
        CRITICAL: 'Critical required documents missing from application',
      },
      SUSPICIOUS_PATTERN: {
        LOW: 'Unusual but explainable transaction pattern',
        MEDIUM: 'Transaction pattern requires additional context',
        HIGH: 'Suspicious financial activity detected',
        CRITICAL: 'High-risk pattern detected - escalate for fraud review',
      },
      DOCUMENT_MISMATCH: {
        LOW: 'Minor formatting differences between documents',
        MEDIUM: 'Document dates do not align with application timeline',
        HIGH: 'Significant mismatch between document and application data',
        CRITICAL: 'Document appears to belong to different entity',
      },
    };

    return descriptions[type]?.[severity] || 'Anomaly detected requiring review';
  }

  /**
   * Generate random name
   */
  private generateName(): string {
    const firstNames = ['John', 'Sarah', 'Michael', 'Emily', 'David', 'Jessica', 'Robert', 'Jennifer', 'William', 'Lisa'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
    
    return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
  }

  /**
   * Generate random business name
   */
  private generateBusinessName(): string {
    const prefixes = ['Tech', 'Global', 'Smart', 'Green', 'Blue', 'Prime', 'Elite', 'Pro', 'Metro', 'Urban'];
    const suffixes = ['Solutions', 'Services', 'Enterprises', 'Industries', 'Group', 'Partners', 'Consulting', 'Systems', 'Ventures', 'Corp'];
    
    return `${prefixes[Math.floor(Math.random() * prefixes.length)]} ${suffixes[Math.floor(Math.random() * suffixes.length)]}`;
  }

  /**
   * Generate random address
   */
  private generateAddress(): string {
    const streetNumbers = Math.floor(Math.random() * 9999) + 1;
    const streets = ['Main St', 'Oak Ave', 'Maple Dr', 'Park Blvd', 'Washington St', 'Lake Rd', 'Hill St', 'River Ave'];
    const cities = ['Springfield', 'Riverside', 'Fairview', 'Georgetown', 'Clinton', 'Madison', 'Salem', 'Franklin'];
    const states = ['CA', 'NY', 'TX', 'FL', 'IL', 'PA', 'OH', 'GA'];
    const zipCode = Math.floor(Math.random() * 90000) + 10000;

    return `${streetNumbers} ${streets[Math.floor(Math.random() * streets.length)]}, ${cities[Math.floor(Math.random() * cities.length)]}, ${states[Math.floor(Math.random() * states.length)]} ${zipCode}`;
  }
}

export default new DemoDataGenerator();
