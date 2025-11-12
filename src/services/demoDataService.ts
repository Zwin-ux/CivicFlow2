/**
 * Demo Data Service
 * Provides static seed data for demo mode when database is unavailable
 */

import logger from '../utils/logger';

export interface DemoApplication {
  id: string;
  businessName: string;
  ein: string;
  applicantName: string;
  applicantEmail: string;
  loanAmount: number;
  loanPurpose: string;
  status: string;
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  notes?: string;
}

export interface DemoUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface DemoDocument {
  id: string;
  applicationId: string;
  fileName: string;
  fileType: string;
  uploadedAt: Date;
  status: string;
}

class DemoDataService {
  private static instance: DemoDataService;
  private demoApplications: DemoApplication[] = [];
  private demoUsers: DemoUser[] = [];
  private demoDocuments: DemoDocument[] = [];

  private constructor() {
    this.initializeDemoData();
  }

  public static getInstance(): DemoDataService {
    if (!DemoDataService.instance) {
      DemoDataService.instance = new DemoDataService();
    }
    return DemoDataService.instance;
  }

  private initializeDemoData(): void {
    // Demo users
    this.demoUsers = [
      {
        id: 'demo-user-1',
        email: 'applicant@demo.local',
        name: 'Demo Applicant',
        role: 'Applicant',
      },
      {
        id: 'demo-user-2',
        email: 'reviewer@demo.local',
        name: 'Demo Reviewer',
        role: 'Reviewer',
      },
      {
        id: 'demo-user-3',
        email: 'approver@demo.local',
        name: 'Demo Approver',
        role: 'Approver',
      },
      {
        id: 'demo-user-4',
        email: 'admin@demo.local',
        name: 'Demo Administrator',
        role: 'Administrator',
      },
    ];

    // Demo applications
    this.demoApplications = [
      {
        id: 'demo-app-1',
        businessName: 'Acme Coffee Shop',
        ein: '12-3456789',
        applicantName: 'John Smith',
        applicantEmail: 'john@acmecoffee.com',
        loanAmount: 50000,
        loanPurpose: 'Equipment purchase and renovation',
        status: 'PENDING_REVIEW',
        submittedAt: new Date('2024-01-15T10:30:00Z'),
      },
      {
        id: 'demo-app-2',
        businessName: 'Tech Startup Inc',
        ein: '98-7654321',
        applicantName: 'Jane Doe',
        applicantEmail: 'jane@techstartup.com',
        loanAmount: 100000,
        loanPurpose: 'Working capital and hiring',
        status: 'UNDER_REVIEW',
        submittedAt: new Date('2024-01-10T14:20:00Z'),
        reviewedAt: new Date('2024-01-12T09:15:00Z'),
        reviewedBy: 'demo-user-2',
        notes: 'Strong business plan, good credit history',
      },
      {
        id: 'demo-app-3',
        businessName: 'Green Energy Solutions',
        ein: '45-6789012',
        applicantName: 'Bob Johnson',
        applicantEmail: 'bob@greenenergy.com',
        loanAmount: 250000,
        loanPurpose: 'Solar panel installation equipment',
        status: 'APPROVED',
        submittedAt: new Date('2024-01-05T11:00:00Z'),
        reviewedAt: new Date('2024-01-08T16:30:00Z'),
        reviewedBy: 'demo-user-3',
        notes: 'Excellent project with strong environmental impact',
      },
      {
        id: 'demo-app-4',
        businessName: 'Local Bakery',
        ein: '23-4567890',
        applicantName: 'Sarah Williams',
        applicantEmail: 'sarah@localbakery.com',
        loanAmount: 30000,
        loanPurpose: 'Kitchen equipment upgrade',
        status: 'REJECTED',
        submittedAt: new Date('2024-01-03T08:45:00Z'),
        reviewedAt: new Date('2024-01-06T13:20:00Z'),
        reviewedBy: 'demo-user-2',
        notes: 'Insufficient collateral and credit history concerns',
      },
      {
        id: 'demo-app-5',
        businessName: 'Digital Marketing Agency',
        ein: '67-8901234',
        applicantName: 'Mike Chen',
        applicantEmail: 'mike@digitalmarketing.com',
        loanAmount: 75000,
        loanPurpose: 'Office expansion and software licenses',
        status: 'PENDING_REVIEW',
        submittedAt: new Date('2024-01-18T15:10:00Z'),
      },
    ];

    // Demo documents
    this.demoDocuments = [
      {
        id: 'demo-doc-1',
        applicationId: 'demo-app-1',
        fileName: 'business_plan.pdf',
        fileType: 'application/pdf',
        uploadedAt: new Date('2024-01-15T10:35:00Z'),
        status: 'VERIFIED',
      },
      {
        id: 'demo-doc-2',
        applicationId: 'demo-app-1',
        fileName: 'tax_returns_2023.pdf',
        fileType: 'application/pdf',
        uploadedAt: new Date('2024-01-15T10:36:00Z'),
        status: 'VERIFIED',
      },
      {
        id: 'demo-doc-3',
        applicationId: 'demo-app-2',
        fileName: 'financial_statements.xlsx',
        fileType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        uploadedAt: new Date('2024-01-10T14:25:00Z'),
        status: 'VERIFIED',
      },
      {
        id: 'demo-doc-4',
        applicationId: 'demo-app-3',
        fileName: 'project_proposal.pdf',
        fileType: 'application/pdf',
        uploadedAt: new Date('2024-01-05T11:05:00Z'),
        status: 'VERIFIED',
      },
    ];

    logger.info('Demo data initialized', {
      applications: this.demoApplications.length,
      users: this.demoUsers.length,
      documents: this.demoDocuments.length,
    });
  }

  // Application queries
  public getAllApplications(): DemoApplication[] {
    return [...this.demoApplications];
  }

  public getApplicationById(id: string): DemoApplication | null {
    return this.demoApplications.find(app => app.id === id) || null;
  }

  public getApplicationsByStatus(status: string): DemoApplication[] {
    return this.demoApplications.filter(app => app.status === status);
  }

  public createApplication(data: Partial<DemoApplication>): DemoApplication {
    const newApp: DemoApplication = {
      id: `demo-app-${Date.now()}`,
      businessName: data.businessName || 'New Business',
      ein: data.ein || '00-0000000',
      applicantName: data.applicantName || 'Unknown',
      applicantEmail: data.applicantEmail || 'unknown@demo.local',
      loanAmount: data.loanAmount || 0,
      loanPurpose: data.loanPurpose || 'Not specified',
      status: 'PENDING_REVIEW',
      submittedAt: new Date(),
    };
    
    // In demo mode, we don't persist, just return the mock
    logger.info('Demo application created (not persisted)', { id: newApp.id });
    return newApp;
  }

  public updateApplication(id: string, data: Partial<DemoApplication>): DemoApplication | null {
    const app = this.getApplicationById(id);
    if (!app) return null;

    // Return updated mock (not persisted)
    const updated = { ...app, ...data };
    logger.info('Demo application updated (not persisted)', { id });
    return updated;
  }

  // User queries
  public getAllUsers(): DemoUser[] {
    return [...this.demoUsers];
  }

  public getUserById(id: string): DemoUser | null {
    return this.demoUsers.find(user => user.id === id) || null;
  }

  public getUserByEmail(email: string): DemoUser | null {
    return this.demoUsers.find(user => user.email === email) || null;
  }

  // Document queries
  public getAllDocuments(): DemoDocument[] {
    return [...this.demoDocuments];
  }

  public getDocumentById(id: string): DemoDocument | null {
    return this.demoDocuments.find(doc => doc.id === id) || null;
  }

  public getDocumentsByApplicationId(applicationId: string): DemoDocument[] {
    return this.demoDocuments.filter(doc => doc.applicationId === applicationId);
  }

  public createDocument(data: Partial<DemoDocument>): DemoDocument {
    const newDoc: DemoDocument = {
      id: `demo-doc-${Date.now()}`,
      applicationId: data.applicationId || 'unknown',
      fileName: data.fileName || 'document.pdf',
      fileType: data.fileType || 'application/pdf',
      uploadedAt: new Date(),
      status: 'PENDING',
    };

    logger.info('Demo document created (not persisted)', { id: newDoc.id });
    return newDoc;
  }

  // Statistics
  public getStatistics() {
    const total = this.demoApplications.length;
    const pending = this.demoApplications.filter(app => app.status === 'PENDING_REVIEW').length;
    const underReview = this.demoApplications.filter(app => app.status === 'UNDER_REVIEW').length;
    const approved = this.demoApplications.filter(app => app.status === 'APPROVED').length;
    const rejected = this.demoApplications.filter(app => app.status === 'REJECTED').length;

    const totalLoanAmount = this.demoApplications.reduce((sum, app) => sum + app.loanAmount, 0);
    const approvedLoanAmount = this.demoApplications
      .filter(app => app.status === 'APPROVED')
      .reduce((sum, app) => sum + app.loanAmount, 0);

    return {
      total,
      pending,
      underReview,
      approved,
      rejected,
      totalLoanAmount,
      approvedLoanAmount,
      averageLoanAmount: total > 0 ? totalLoanAmount / total : 0,
    };
  }
}

export default DemoDataService.getInstance();
