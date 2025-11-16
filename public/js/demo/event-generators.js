/**
 * Event Generators
 * Generates realistic simulated events for demo mode
 * Each generator creates event-specific data with realistic variations
 */

class EventGenerators {
  constructor() {
    // Data pools for generating realistic events
    this.dataPool = {
      businesses: [
        'Acme Manufacturing LLC',
        'TechStart Solutions Inc',
        'Green Valley Organic Farms',
        'Urban Cafe & Bistro',
        'Precision Auto Repair Shop',
        'Bright Future Daycare Center',
        'Mountain View Construction Co',
        'Coastal Seafood Market',
        'Digital Marketing Pros',
        'Riverside Medical Clinic',
        'Elite Fitness Studio',
        'Artisan Bakery & Pastries',
        'Smart Home Solutions',
        'Eco-Friendly Cleaning Services',
        'Premier Landscaping Group',
        'Innovation Tech Consulting',
        'Family Dental Practice',
        'Gourmet Food Truck',
        'Pet Paradise Grooming',
        'Vintage Clothing Boutique'
      ],
      
      applicantFirstNames: [
        'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer',
        'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Barbara',
        'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah',
        'Charles', 'Karen', 'Christopher', 'Nancy', 'Daniel', 'Lisa',
        'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra'
      ],
      
      applicantLastNames: [
        'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia',
        'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez',
        'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore',
        'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White',
        'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson'
      ],
      
      industries: [
        'Manufacturing',
        'Technology',
        'Agriculture',
        'Food & Beverage',
        'Automotive',
        'Healthcare',
        'Construction',
        'Retail',
        'Professional Services',
        'Education',
        'Hospitality',
        'Real Estate'
      ],
      
      loanPurposes: [
        'Equipment purchase and installation',
        'Working capital and inventory',
        'Business expansion and renovation',
        'Technology upgrades and software',
        'Hiring and training new staff',
        'Marketing and advertising campaign',
        'Debt consolidation and refinancing',
        'Real estate acquisition',
        'Research and development',
        'Franchise fee and startup costs'
      ],
      
      cities: [
        'Springfield', 'Riverside', 'Fairview', 'Georgetown', 'Clinton',
        'Madison', 'Salem', 'Franklin', 'Bristol', 'Arlington',
        'Lexington', 'Ashland', 'Burlington', 'Manchester', 'Oxford'
      ],
      
      states: [
        'CA', 'NY', 'TX', 'FL', 'IL', 'PA', 'OH', 'GA', 'NC', 'MI',
        'NJ', 'VA', 'WA', 'AZ', 'MA', 'TN', 'IN', 'MO', 'MD', 'WI'
      ]
    };
    
    // Counter for generating unique IDs
    this.applicationCounter = 1000 + Math.floor(Math.random() * 9000);
    
    console.log('[Event Generators] Initialized');
  }
  
  /**
   * Generate a new application submission event
   * Creates realistic application data with proper business context
   * @returns {Object} New application event data
   */
  generateNewApplication() {
    // Generate unique application ID
    this.applicationCounter++;
    const applicationId = `APP-${Date.now()}-${this.applicationCounter}`;
    
    // Select random business and applicant
    const businessName = this.selectRandom(this.dataPool.businesses);
    const firstName = this.selectRandom(this.dataPool.applicantFirstNames);
    const lastName = this.selectRandom(this.dataPool.applicantLastNames);
    const applicantName = `${firstName} ${lastName}`;
    
    // Generate email from business name
    const emailPrefix = businessName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 15);
    const applicantEmail = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${emailPrefix}.com`;
    
    // Generate loan amount (realistic distribution)
    // Most loans are in the $25k-$150k range, with some larger ones
    const loanAmount = this.generateRealisticLoanAmount();
    
    // Select industry and loan purpose
    const industry = this.selectRandom(this.dataPool.industries);
    const loanPurpose = this.selectRandom(this.dataPool.loanPurposes);
    
    // Generate business location
    const city = this.selectRandom(this.dataPool.cities);
    const state = this.selectRandom(this.dataPool.states);
    const location = `${city}, ${state}`;
    
    // Generate EIN (Employer Identification Number)
    const ein = this.generateEIN();
    
    // Determine submission source
    const submissionSources = [
      'Applicant Portal',
      'Mobile App',
      'Partner Portal',
      'API Integration'
    ];
    const submittedBy = this.selectRandom(submissionSources);
    
    // Generate business age (years in operation)
    const businessAge = Math.floor(Math.random() * 15) + 1; // 1-15 years
    
    // Generate number of employees
    const employeeCount = this.generateEmployeeCount();
    
    // Generate annual revenue (correlated with loan amount)
    const annualRevenue = this.generateAnnualRevenue(loanAmount);
    
    // Determine if this is a priority application
    const isPriority = Math.random() < 0.15; // 15% are priority
    
    // Generate submission timestamp (within last few minutes)
    const submittedAt = new Date(Date.now() - Math.random() * 300000); // Last 5 minutes
    
    return {
      applicationId,
      businessName,
      applicantName,
      applicantEmail,
      loanAmount,
      loanPurpose,
      industry,
      location,
      city,
      state,
      ein,
      submittedBy,
      businessAge,
      employeeCount,
      annualRevenue,
      isPriority,
      submittedAt,
      status: 'PENDING_REVIEW',
      // Additional metadata
      metadata: {
        hasBusinessPlan: Math.random() > 0.3,
        hasFinancialStatements: Math.random() > 0.2,
        hasTaxReturns: Math.random() > 0.25,
        documentCount: Math.floor(Math.random() * 5) + 3, // 3-7 documents
        completionPercentage: Math.floor(Math.random() * 20) + 80 // 80-100%
      }
    };
  }
  
  /**
   * Generate realistic loan amount with proper distribution
   * Most applications are in the $25k-$150k range
   * @returns {number} Loan amount
   */
  generateRealisticLoanAmount() {
    const random = Math.random();
    
    if (random < 0.40) {
      // 40% are small loans: $25k-$75k
      return Math.floor(Math.random() * 50000) + 25000;
    } else if (random < 0.75) {
      // 35% are medium loans: $75k-$150k
      return Math.floor(Math.random() * 75000) + 75000;
    } else if (random < 0.90) {
      // 15% are large loans: $150k-$300k
      return Math.floor(Math.random() * 150000) + 150000;
    } else {
      // 10% are very large loans: $300k-$500k
      return Math.floor(Math.random() * 200000) + 300000;
    }
  }
  
  /**
   * Generate realistic employee count
   * @returns {number} Number of employees
   */
  generateEmployeeCount() {
    const random = Math.random();
    
    if (random < 0.50) {
      // 50% are micro businesses: 1-5 employees
      return Math.floor(Math.random() * 5) + 1;
    } else if (random < 0.80) {
      // 30% are small businesses: 6-20 employees
      return Math.floor(Math.random() * 15) + 6;
    } else if (random < 0.95) {
      // 15% are medium businesses: 21-50 employees
      return Math.floor(Math.random() * 30) + 21;
    } else {
      // 5% are larger businesses: 51-100 employees
      return Math.floor(Math.random() * 50) + 51;
    }
  }
  
  /**
   * Generate annual revenue correlated with loan amount
   * @param {number} loanAmount - Requested loan amount
   * @returns {number} Annual revenue
   */
  generateAnnualRevenue(loanAmount) {
    // Revenue is typically 3-8x the loan amount
    const multiplier = 3 + Math.random() * 5;
    const baseRevenue = loanAmount * multiplier;
    
    // Add some randomness (±20%)
    const variance = 0.8 + Math.random() * 0.4;
    return Math.floor(baseRevenue * variance);
  }
  
  /**
   * Generate realistic EIN (Employer Identification Number)
   * Format: XX-XXXXXXX
   * @returns {string} EIN
   */
  generateEIN() {
    const part1 = Math.floor(Math.random() * 90) + 10; // 10-99
    const part2 = Math.floor(Math.random() * 9000000) + 1000000; // 1000000-9999999
    return `${part1}-${part2}`;
  }
  
  /**
   * Select random item from array
   * @param {Array} array - Array to select from
   * @returns {*} Random item
   */
  selectRandom(array) {
    return array[Math.floor(Math.random() * array.length)];
  }
  
  /**
   * Format currency for display
   * @param {number} amount - Amount to format
   * @returns {string} Formatted currency
   */
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }
  
  /**
   * Generate a human-readable description of the application
   * @param {Object} data - Application data
   * @returns {string} Description
   */
  generateApplicationDescription(data) {
    return `${data.businessName} in ${data.location} has applied for ${this.formatCurrency(data.loanAmount)} ` +
           `for ${data.loanPurpose.toLowerCase()}. The business has been operating for ${data.businessAge} ` +
           `year${data.businessAge !== 1 ? 's' : ''} with ${data.employeeCount} employee${data.employeeCount !== 1 ? 's' : ''}.`;
  }
  
  /**
   * Generate a status change event
   * Creates realistic status transitions based on workflow rules
   * @param {Object} existingApplication - Optional existing application to update
   * @returns {Object} Status change event data
   */
  generateStatusChange(existingApplication = null) {
    // Status transition rules (from demo-event-templates.json)
    const statusTransitions = {
      'PENDING_REVIEW': ['UNDER_REVIEW', 'REJECTED'],
      'UNDER_REVIEW': ['PENDING_DOCUMENTS', 'IN_APPROVAL', 'REJECTED'],
      'PENDING_DOCUMENTS': ['UNDER_REVIEW', 'REJECTED'],
      'IN_APPROVAL': ['APPROVED', 'REJECTED', 'UNDER_REVIEW'],
      'APPROVED': ['FUNDED'],
      'REJECTED': [],
      'FUNDED': []
    };
    
    // Status display names
    const statusDisplayNames = {
      'PENDING_REVIEW': 'Pending Review',
      'UNDER_REVIEW': 'Under Review',
      'PENDING_DOCUMENTS': 'Pending Documents',
      'IN_APPROVAL': 'In Approval',
      'APPROVED': 'Approved',
      'REJECTED': 'Rejected',
      'FUNDED': 'Funded'
    };
    
    // If no existing application provided, create a mock one
    let application;
    if (existingApplication) {
      application = existingApplication;
    } else {
      // Create a mock application with a current status
      const possibleStatuses = ['PENDING_REVIEW', 'UNDER_REVIEW', 'PENDING_DOCUMENTS', 'IN_APPROVAL'];
      const currentStatus = this.selectRandom(possibleStatuses);
      
      application = {
        applicationId: `APP-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        businessName: this.selectRandom(this.dataPool.businesses),
        status: currentStatus,
        loanAmount: this.generateRealisticLoanAmount(),
        location: `${this.selectRandom(this.dataPool.cities)}, ${this.selectRandom(this.dataPool.states)}`
      };
    }
    
    // Get possible next statuses
    const possibleNextStatuses = statusTransitions[application.status] || [];
    
    // If no valid transitions, return null
    if (possibleNextStatuses.length === 0) {
      console.warn(`[Event Generators] No valid transitions from status: ${application.status}`);
      return null;
    }
    
    // Select next status with weighted probabilities
    const newStatus = this.selectNextStatus(application.status, possibleNextStatuses);
    
    // Generate reviewer/actor information
    const reviewerNames = [
      'Sarah Johnson',
      'Michael Chen',
      'Emily Rodriguez',
      'David Kim',
      'Jennifer Martinez',
      'Robert Taylor',
      'Amanda White',
      'Christopher Lee',
      'Michelle Garcia',
      'Daniel Anderson'
    ];
    const changedBy = this.selectRandom(reviewerNames);
    
    // Generate reason/notes for the status change
    const reason = this.generateStatusChangeReason(application.status, newStatus);
    
    // Generate timestamp (within last few minutes)
    const changedAt = new Date(Date.now() - Math.random() * 180000); // Last 3 minutes
    
    // Determine if this is a significant change (approval/rejection)
    const isSignificant = ['APPROVED', 'REJECTED', 'FUNDED'].includes(newStatus);
    
    // Generate additional metadata based on new status
    const metadata = this.generateStatusChangeMetadata(application.status, newStatus);
    
    return {
      applicationId: application.applicationId,
      businessName: application.businessName,
      loanAmount: application.loanAmount,
      location: application.location,
      previousStatus: application.status,
      previousStatusDisplay: statusDisplayNames[application.status],
      newStatus: newStatus,
      newStatusDisplay: statusDisplayNames[newStatus],
      changedBy,
      reason,
      changedAt,
      isSignificant,
      metadata
    };
  }
  
  /**
   * Select next status with weighted probabilities
   * Favors forward progression over rejection
   * @param {string} currentStatus - Current application status
   * @param {Array} possibleStatuses - Array of possible next statuses
   * @returns {string} Selected next status
   */
  selectNextStatus(currentStatus, possibleStatuses) {
    // If only one option, return it
    if (possibleStatuses.length === 1) {
      return possibleStatuses[0];
    }
    
    // Apply weights to favor progression over rejection
    const weights = possibleStatuses.map(status => {
      if (status === 'REJECTED') {
        return 0.15; // 15% chance of rejection
      } else if (status === 'APPROVED') {
        return 0.70; // 70% chance of approval when in IN_APPROVAL
      } else if (status === 'FUNDED') {
        return 0.90; // 90% chance of funding when approved
      } else {
        return 1.0; // Normal weight for other transitions
      }
    });
    
    // Normalize weights
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    const normalizedWeights = weights.map(w => w / totalWeight);
    
    // Select based on weighted random
    const random = Math.random();
    let cumulativeWeight = 0;
    
    for (let i = 0; i < possibleStatuses.length; i++) {
      cumulativeWeight += normalizedWeights[i];
      if (random <= cumulativeWeight) {
        return possibleStatuses[i];
      }
    }
    
    // Fallback to first option
    return possibleStatuses[0];
  }
  
  /**
   * Generate reason/notes for status change
   * @param {string} previousStatus - Previous status
   * @param {string} newStatus - New status
   * @returns {string} Reason for change
   */
  generateStatusChangeReason(previousStatus, newStatus) {
    const reasons = {
      'UNDER_REVIEW': [
        'Initial review assigned to underwriter',
        'Application meets preliminary requirements',
        'Moving to detailed analysis phase',
        'Assigned to review team for evaluation'
      ],
      'PENDING_DOCUMENTS': [
        'Additional documentation required',
        'Missing required financial statements',
        'Need updated bank statements',
        'Requesting additional business information',
        'Tax returns need clarification'
      ],
      'IN_APPROVAL': [
        'Review completed successfully',
        'All requirements met, moving to approval',
        'Underwriting complete, ready for final decision',
        'Recommended for approval by review team'
      ],
      'APPROVED': [
        'Application approved for funding',
        'All criteria met, loan approved',
        'Approved with standard terms',
        'Final approval granted by committee',
        'Approved pending final documentation'
      ],
      'REJECTED': [
        'Insufficient credit history',
        'Unable to verify business viability',
        'Debt-to-income ratio exceeds limits',
        'Incomplete documentation after follow-up',
        'Business does not meet program requirements',
        'Collateral insufficient for loan amount'
      ],
      'FUNDED': [
        'Funds disbursed to business account',
        'Loan funded successfully',
        'Funding complete, monitoring begins',
        'Disbursement processed'
      ]
    };
    
    const statusReasons = reasons[newStatus] || ['Status updated'];
    return this.selectRandom(statusReasons);
  }
  
  /**
   * Generate additional metadata for status change
   * @param {string} previousStatus - Previous status
   * @param {string} newStatus - New status
   * @returns {Object} Metadata object
   */
  generateStatusChangeMetadata(previousStatus, newStatus) {
    const metadata = {
      transitionType: this.getTransitionType(previousStatus, newStatus),
      daysInPreviousStatus: Math.floor(Math.random() * 7) + 1, // 1-7 days
      requiresNotification: true,
      requiresAction: false
    };
    
    // Add status-specific metadata
    if (newStatus === 'PENDING_DOCUMENTS') {
      metadata.requiresAction = true;
      metadata.documentsNeeded = Math.floor(Math.random() * 3) + 1; // 1-3 documents
      metadata.dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
    }
    
    if (newStatus === 'APPROVED') {
      metadata.approvalAmount = null; // Will use application loan amount
      metadata.interestRate = (3.5 + Math.random() * 3.5).toFixed(2); // 3.5-7.0%
      metadata.termMonths = this.selectRandom([12, 24, 36, 48, 60]);
      metadata.conditions = Math.random() > 0.7 ? ['Quarterly financial reporting required'] : [];
    }
    
    if (newStatus === 'REJECTED') {
      metadata.appealable = Math.random() > 0.5;
      metadata.appealDeadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    }
    
    if (newStatus === 'FUNDED') {
      metadata.fundingDate = new Date();
      metadata.disbursementMethod = this.selectRandom(['ACH Transfer', 'Wire Transfer', 'Check']);
      metadata.firstPaymentDue = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    }
    
    return metadata;
  }
  
  /**
   * Get transition type classification
   * @param {string} previousStatus - Previous status
   * @param {string} newStatus - New status
   * @returns {string} Transition type
   */
  getTransitionType(previousStatus, newStatus) {
    if (newStatus === 'REJECTED') {
      return 'rejection';
    }
    if (newStatus === 'APPROVED' || newStatus === 'FUNDED') {
      return 'approval';
    }
    if (newStatus === 'PENDING_DOCUMENTS') {
      return 'information_request';
    }
    return 'progression';
  }
  
  /**
   * Generate a human-readable description of the status change
   * @param {Object} data - Status change data
   * @returns {string} Description
   */
  generateStatusChangeDescription(data) {
    return `${data.businessName} status changed from ${data.previousStatusDisplay} to ${data.newStatusDisplay}. ` +
           `${data.reason} (Changed by ${data.changedBy})`;
  }
  
  /**
   * Generate a document uploaded event
   * Creates realistic document upload data with proper metadata
   * @param {Object} existingApplication - Optional existing application to upload document for
   * @returns {Object} Document uploaded event data
   */
  generateDocumentUploaded(existingApplication = null) {
    // Document types from demo-event-templates.json
    const documentTypes = [
      'Business License',
      'Tax Return (2023)',
      'Tax Return (2022)',
      'Bank Statement (Q4 2023)',
      'Bank Statement (Q3 2023)',
      'Financial Projection',
      'Business Plan',
      'Proof of Insurance',
      'Articles of Incorporation',
      'Operating Agreement',
      'Personal Financial Statement',
      'Credit Report',
      'Lease Agreement',
      'Purchase Order',
      'Invoice'
    ];
    
    // Document categories for classification
    const documentCategories = {
      'Business License': 'legal',
      'Tax Return (2023)': 'financial',
      'Tax Return (2022)': 'financial',
      'Bank Statement (Q4 2023)': 'financial',
      'Bank Statement (Q3 2023)': 'financial',
      'Financial Projection': 'financial',
      'Business Plan': 'business',
      'Proof of Insurance': 'legal',
      'Articles of Incorporation': 'legal',
      'Operating Agreement': 'legal',
      'Personal Financial Statement': 'financial',
      'Credit Report': 'financial',
      'Lease Agreement': 'legal',
      'Purchase Order': 'business',
      'Invoice': 'business'
    };
    
    // File extensions and sizes
    const fileExtensions = {
      'legal': ['pdf', 'pdf', 'pdf', 'docx'],
      'financial': ['pdf', 'pdf', 'xlsx', 'pdf'],
      'business': ['pdf', 'docx', 'pdf', 'pptx']
    };
    
    // If no existing application provided, create a mock one
    let application;
    if (existingApplication) {
      application = existingApplication;
    } else {
      // Create a mock application
      application = {
        applicationId: `APP-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        businessName: this.selectRandom(this.dataPool.businesses),
        status: this.selectRandom(['PENDING_REVIEW', 'UNDER_REVIEW', 'PENDING_DOCUMENTS']),
        loanAmount: this.generateRealisticLoanAmount(),
        location: `${this.selectRandom(this.dataPool.cities)}, ${this.selectRandom(this.dataPool.states)}`
      };
    }
    
    // Select document type
    const documentType = this.selectRandom(documentTypes);
    const category = documentCategories[documentType];
    
    // Generate document ID
    const documentId = `DOC-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    
    // Generate file details
    const extension = this.selectRandom(fileExtensions[category]);
    const fileName = this.generateFileName(documentType, extension);
    const fileSize = this.generateFileSize(category, extension);
    
    // Generate uploader information
    const uploaderTypes = ['Applicant', 'Staff', 'System'];
    const uploaderType = this.selectRandom(uploaderTypes);
    
    let uploadedBy;
    if (uploaderType === 'Applicant') {
      const firstName = this.selectRandom(this.dataPool.applicantFirstNames);
      const lastName = this.selectRandom(this.dataPool.applicantLastNames);
      uploadedBy = `${firstName} ${lastName}`;
    } else if (uploaderType === 'Staff') {
      const staffNames = [
        'Sarah Johnson',
        'Michael Chen',
        'Emily Rodriguez',
        'David Kim',
        'Jennifer Martinez',
        'Robert Taylor',
        'Amanda White',
        'Christopher Lee'
      ];
      uploadedBy = this.selectRandom(staffNames);
    } else {
      uploadedBy = 'System (Auto-generated)';
    }
    
    // Generate upload timestamp (within last few minutes)
    const uploadedAt = new Date(Date.now() - Math.random() * 300000); // Last 5 minutes
    
    // Determine if document is required or optional
    const requiredDocuments = [
      'Business License',
      'Tax Return (2023)',
      'Bank Statement (Q4 2023)',
      'Articles of Incorporation'
    ];
    const isRequired = requiredDocuments.includes(documentType);
    
    // Generate document status
    const documentStatuses = ['pending_review', 'verified', 'needs_attention'];
    const documentStatus = this.selectRandom(documentStatuses);
    
    // Generate verification details if verified
    let verificationDetails = null;
    if (documentStatus === 'verified') {
      verificationDetails = {
        verifiedBy: this.selectRandom([
          'Sarah Johnson',
          'Michael Chen',
          'Emily Rodriguez'
        ]),
        verifiedAt: new Date(uploadedAt.getTime() + Math.random() * 3600000), // Within 1 hour of upload
        verificationMethod: 'Manual Review'
      };
    }
    
    // Generate AI analysis results (simulated)
    const aiAnalysis = this.generateDocumentAIAnalysis(documentType, category);
    
    // Determine if this upload completes a requirement
    const completesRequirement = isRequired && Math.random() > 0.7; // 30% chance
    
    // Generate page count
    const pageCount = this.generatePageCount(documentType);
    
    // Generate quality score (0-100)
    const qualityScore = Math.floor(Math.random() * 30) + 70; // 70-100
    
    // Determine if document has issues
    const hasIssues = documentStatus === 'needs_attention';
    const issues = hasIssues ? this.generateDocumentIssues(documentType) : [];
    
    // Generate metadata
    const metadata = {
      mimeType: this.getMimeType(extension),
      encoding: 'utf-8',
      uploadSource: uploaderType === 'Applicant' ? 'Applicant Portal' : 'Staff Portal',
      ipAddress: this.generateIPAddress(),
      userAgent: this.generateUserAgent(),
      scanStatus: 'clean', // Virus scan status
      ocrProcessed: extension === 'pdf',
      thumbnailGenerated: true,
      extractedText: extension === 'pdf' ? Math.random() > 0.5 : false
    };
    
    return {
      documentId,
      applicationId: application.applicationId,
      businessName: application.businessName,
      documentType,
      category,
      fileName,
      fileSize,
      fileSizeFormatted: this.formatFileSize(fileSize),
      extension,
      uploadedBy,
      uploaderType,
      uploadedAt,
      isRequired,
      documentStatus,
      verificationDetails,
      aiAnalysis,
      completesRequirement,
      pageCount,
      qualityScore,
      hasIssues,
      issues,
      metadata
    };
  }
  
  /**
   * Generate a realistic file name for a document
   * @param {string} documentType - Type of document
   * @param {string} extension - File extension
   * @returns {string} File name
   */
  generateFileName(documentType, extension) {
    // Clean document type for file name
    const cleanType = documentType
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
    
    // Add timestamp or version
    const timestamp = Date.now().toString().slice(-6);
    
    return `${cleanType}_${timestamp}.${extension}`;
  }
  
  /**
   * Generate realistic file size based on document type
   * @param {string} category - Document category
   * @param {string} extension - File extension
   * @returns {number} File size in bytes
   */
  generateFileSize(category, extension) {
    // Base sizes by extension (in KB)
    const baseSizes = {
      'pdf': { min: 100, max: 5000 },      // 100KB - 5MB
      'docx': { min: 50, max: 2000 },      // 50KB - 2MB
      'xlsx': { min: 30, max: 1000 },      // 30KB - 1MB
      'pptx': { min: 500, max: 10000 }     // 500KB - 10MB
    };
    
    const range = baseSizes[extension] || { min: 100, max: 1000 };
    const sizeKB = Math.floor(Math.random() * (range.max - range.min)) + range.min;
    
    return sizeKB * 1024; // Convert to bytes
  }
  
  /**
   * Format file size for display
   * @param {number} bytes - File size in bytes
   * @returns {string} Formatted file size
   */
  formatFileSize(bytes) {
    if (bytes < 1024) {
      return `${bytes} B`;
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    } else {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
  }
  
  /**
   * Generate page count for document
   * @param {string} documentType - Type of document
   * @returns {number} Number of pages
   */
  generatePageCount(documentType) {
    // Different document types have different typical page counts
    const pageCounts = {
      'Business License': [1, 2],
      'Tax Return (2023)': [15, 40],
      'Tax Return (2022)': [15, 40],
      'Bank Statement (Q4 2023)': [3, 8],
      'Bank Statement (Q3 2023)': [3, 8],
      'Financial Projection': [5, 15],
      'Business Plan': [20, 50],
      'Proof of Insurance': [1, 3],
      'Articles of Incorporation': [5, 15],
      'Operating Agreement': [10, 30],
      'Personal Financial Statement': [2, 5],
      'Credit Report': [5, 15],
      'Lease Agreement': [8, 20],
      'Purchase Order': [1, 3],
      'Invoice': [1, 2]
    };
    
    const range = pageCounts[documentType] || [1, 10];
    return Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
  }
  
  /**
   * Get MIME type for file extension
   * @param {string} extension - File extension
   * @returns {string} MIME type
   */
  getMimeType(extension) {
    const mimeTypes = {
      'pdf': 'application/pdf',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    };
    
    return mimeTypes[extension] || 'application/octet-stream';
  }
  
  /**
   * Generate simulated AI analysis results for document
   * @param {string} documentType - Type of document
   * @param {string} category - Document category
   * @returns {Object} AI analysis results
   */
  generateDocumentAIAnalysis(documentType, category) {
    // Confidence score (70-98%)
    const confidence = Math.floor(Math.random() * 28) + 70;
    
    // Classification accuracy
    const classificationCorrect = confidence > 80;
    
    // Extract key fields based on document type
    const extractedFields = this.generateExtractedFields(documentType);
    
    // Generate quality assessment
    const qualityAssessment = {
      readability: Math.floor(Math.random() * 30) + 70, // 70-100
      completeness: Math.floor(Math.random() * 30) + 70,
      authenticity: Math.floor(Math.random() * 20) + 80
    };
    
    return {
      processed: true,
      confidence,
      classificationCorrect,
      detectedType: classificationCorrect ? documentType : 'Unknown',
      extractedFields,
      qualityAssessment,
      processingTime: Math.floor(Math.random() * 3000) + 500, // 500-3500ms
      modelVersion: '2024.1'
    };
  }
  
  /**
   * Generate extracted fields based on document type
   * @param {string} documentType - Type of document
   * @returns {Array} Extracted fields
   */
  generateExtractedFields(documentType) {
    const fieldsByType = {
      'Business License': [
        { name: 'License Number', value: `BL-${Math.floor(Math.random() * 1000000)}`, confidence: 0.95 },
        { name: 'Issue Date', value: '2023-01-15', confidence: 0.92 },
        { name: 'Expiration Date', value: '2024-01-15', confidence: 0.90 }
      ],
      'Tax Return (2023)': [
        { name: 'Tax Year', value: '2023', confidence: 0.98 },
        { name: 'EIN', value: this.generateEIN(), confidence: 0.96 },
        { name: 'Total Income', value: `$${Math.floor(Math.random() * 500000) + 100000}`, confidence: 0.88 }
      ],
      'Bank Statement (Q4 2023)': [
        { name: 'Account Number', value: `****${Math.floor(Math.random() * 10000)}`, confidence: 0.94 },
        { name: 'Statement Period', value: 'Oct-Dec 2023', confidence: 0.96 },
        { name: 'Ending Balance', value: `$${Math.floor(Math.random() * 100000) + 10000}`, confidence: 0.92 }
      ]
    };
    
    return fieldsByType[documentType] || [
      { name: 'Document Date', value: '2023-12-01', confidence: 0.85 },
      { name: 'Document ID', value: `DOC-${Math.floor(Math.random() * 100000)}`, confidence: 0.80 }
    ];
  }
  
  /**
   * Generate document issues
   * @param {string} documentType - Type of document
   * @returns {Array} List of issues
   */
  generateDocumentIssues(documentType) {
    const possibleIssues = [
      'Low image quality - text may be difficult to read',
      'Missing signature on page 3',
      'Date appears to be outside acceptable range',
      'Document appears to be incomplete',
      'Watermark detected - may not be original',
      'Some fields are illegible',
      'Document format not standard',
      'Missing required information'
    ];
    
    // Generate 1-2 issues
    const issueCount = Math.random() > 0.6 ? 2 : 1;
    const issues = [];
    
    for (let i = 0; i < issueCount; i++) {
      const issue = this.selectRandom(possibleIssues);
      if (!issues.includes(issue)) {
        issues.push(issue);
      }
    }
    
    return issues;
  }
  
  /**
   * Generate realistic IP address
   * @returns {string} IP address
   */
  generateIPAddress() {
    return `${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.` +
           `${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
  }
  
  /**
   * Generate realistic user agent string
   * @returns {string} User agent
   */
  generateUserAgent() {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
      'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15'
    ];
    
    return this.selectRandom(userAgents);
  }
  
  /**
   * Generate a human-readable description of the document upload
   * @param {Object} data - Document upload data
   * @returns {string} Description
   */
  generateDocumentUploadDescription(data) {
    return `${data.businessName} uploaded ${data.documentType} (${data.fileSizeFormatted}, ${data.pageCount} page${data.pageCount !== 1 ? 's' : ''}). ` +
           `Uploaded by ${data.uploadedBy}.`;
  }
  
  /**
   * Generate a review completed event
   * Creates realistic review completion data with recommendations and analysis
   * @param {Object} existingApplication - Optional existing application that was reviewed
   * @returns {Object} Review completed event data
   */
  generateReviewCompleted(existingApplication = null) {
    // Reviewer names from demo-event-templates.json
    const reviewerNames = [
      'Sarah Johnson',
      'Michael Chen',
      'Emily Rodriguez',
      'David Kim',
      'Jennifer Martinez',
      'Robert Taylor',
      'Amanda White',
      'Christopher Lee',
      'Michelle Garcia',
      'Daniel Anderson'
    ];
    
    // Review types
    const reviewTypes = [
      'Initial Review',
      'Financial Review',
      'Credit Review',
      'Compliance Review',
      'Final Review',
      'Risk Assessment Review'
    ];
    
    // Recommendation types
    const recommendations = [
      'Approve',
      'Approve with Conditions',
      'Request Additional Information',
      'Reject',
      'Escalate to Senior Reviewer'
    ];
    
    // If no existing application provided, create a mock one
    let application;
    if (existingApplication) {
      application = existingApplication;
    } else {
      // Create a mock application
      application = {
        applicationId: `APP-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        businessName: this.selectRandom(this.dataPool.businesses),
        status: this.selectRandom(['UNDER_REVIEW', 'IN_APPROVAL']),
        loanAmount: this.generateRealisticLoanAmount(),
        location: `${this.selectRandom(this.dataPool.cities)}, ${this.selectRandom(this.dataPool.states)}`,
        industry: this.selectRandom(this.dataPool.industries)
      };
    }
    
    // Generate review ID
    const reviewId = `REV-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    
    // Select reviewer
    const reviewer = this.selectRandom(reviewerNames);
    
    // Select review type
    const reviewType = this.selectRandom(reviewTypes);
    
    // Select recommendation with weighted probabilities
    const recommendation = this.selectWeightedRecommendation();
    
    // Generate review duration (15 minutes to 3 hours)
    const reviewDurationMinutes = Math.floor(Math.random() * 165) + 15; // 15-180 minutes
    
    // Generate completion timestamp (within last few minutes)
    const completedAt = new Date(Date.now() - Math.random() * 300000); // Last 5 minutes
    
    // Calculate start time based on duration
    const startedAt = new Date(completedAt.getTime() - reviewDurationMinutes * 60000);
    
    // Generate risk score (0-100, lower is better)
    const riskScore = this.generateRiskScore(application.industry);
    
    // Generate confidence level (0-100)
    const confidence = Math.floor(Math.random() * 30) + 70; // 70-100
    
    // Generate review notes based on recommendation
    const notes = this.generateReviewNotes(recommendation, application);
    
    // Generate detailed findings
    const findings = this.generateReviewFindings(recommendation, application, riskScore);
    
    // Generate checklist completion
    const checklistItems = this.generateReviewChecklist(reviewType);
    const completedItems = checklistItems.filter(item => item.completed).length;
    const checklistCompletion = Math.floor((completedItems / checklistItems.length) * 100);
    
    // Determine if this review requires follow-up
    const requiresFollowUp = ['Request Additional Information', 'Escalate to Senior Reviewer'].includes(recommendation);
    
    // Generate follow-up details if needed
    let followUpDetails = null;
    if (requiresFollowUp) {
      followUpDetails = this.generateFollowUpDetails(recommendation);
    }
    
    // Generate conditions if approved with conditions
    let conditions = [];
    if (recommendation === 'Approve with Conditions') {
      conditions = this.generateApprovalConditions();
    }
    
    // Determine if this is a final review
    const isFinalReview = reviewType === 'Final Review' || 
                          (recommendation === 'Approve' && Math.random() > 0.5);
    
    // Generate next steps
    const nextSteps = this.generateNextSteps(recommendation, isFinalReview);
    
    // Generate review metrics
    const metrics = {
      documentsReviewed: Math.floor(Math.random() * 8) + 3, // 3-10 documents
      issuesIdentified: Math.floor(Math.random() * 5), // 0-4 issues
      questionsRaised: Math.floor(Math.random() * 6), // 0-5 questions
      timeSpentMinutes: reviewDurationMinutes,
      thoroughnessScore: Math.floor(Math.random() * 30) + 70 // 70-100
    };
    
    // Determine priority level
    const priority = this.determineReviewPriority(riskScore, recommendation);
    
    // Generate reviewer expertise areas
    const expertiseAreas = this.generateReviewerExpertise(reviewType);
    
    // Generate metadata
    const metadata = {
      reviewerRole: this.getReviewerRole(reviewType),
      reviewerExperience: `${Math.floor(Math.random() * 15) + 3} years`, // 3-17 years
      reviewMethod: this.selectRandom(['Manual Review', 'AI-Assisted Review', 'Hybrid Review']),
      toolsUsed: this.selectRandom([
        ['Credit Analysis Tool', 'Risk Calculator'],
        ['Financial Analyzer', 'Document Validator'],
        ['Compliance Checker', 'Risk Assessment Tool']
      ]),
      reviewVersion: '2024.1',
      qualityScore: Math.floor(Math.random() * 20) + 80 // 80-100
    };
    
    return {
      reviewId,
      applicationId: application.applicationId,
      businessName: application.businessName,
      loanAmount: application.loanAmount,
      location: application.location,
      industry: application.industry,
      reviewer,
      reviewType,
      recommendation,
      riskScore,
      confidence,
      notes,
      findings,
      checklistItems,
      checklistCompletion,
      requiresFollowUp,
      followUpDetails,
      conditions,
      isFinalReview,
      nextSteps,
      metrics,
      priority,
      expertiseAreas,
      startedAt,
      completedAt,
      reviewDurationMinutes,
      metadata
    };
  }
  
  /**
   * Select recommendation with weighted probabilities
   * Favors approval over rejection
   * @returns {string} Selected recommendation
   */
  selectWeightedRecommendation() {
    const random = Math.random();
    
    if (random < 0.35) {
      return 'Approve'; // 35%
    } else if (random < 0.55) {
      return 'Approve with Conditions'; // 20%
    } else if (random < 0.80) {
      return 'Request Additional Information'; // 25%
    } else if (random < 0.90) {
      return 'Escalate to Senior Reviewer'; // 10%
    } else {
      return 'Reject'; // 10%
    }
  }
  
  /**
   * Generate risk score based on industry
   * @param {string} industry - Business industry
   * @returns {number} Risk score (0-100, lower is better)
   */
  generateRiskScore(industry) {
    // Base risk scores by industry (from demo-event-templates.json)
    const industryRiskProfiles = {
      'Technology': 45,
      'Manufacturing': 52,
      'Retail': 58,
      'Food & Beverage': 55,
      'Healthcare': 42,
      'Construction': 60,
      'Professional Services': 48,
      'Agriculture': 56
    };
    
    const baseScore = industryRiskProfiles[industry] || 50;
    
    // Add variance (±15 points)
    const variance = Math.floor(Math.random() * 30) - 15;
    const score = Math.max(0, Math.min(100, baseScore + variance));
    
    return score;
  }
  
  /**
   * Generate review notes based on recommendation
   * @param {string} recommendation - Review recommendation
   * @param {Object} application - Application data
   * @returns {string} Review notes
   */
  generateReviewNotes(recommendation, application) {
    const noteTemplates = {
      'Approve': [
        `Application meets all requirements. Business shows strong financials and clear repayment ability. Recommend approval for ${this.formatCurrency(application.loanAmount)}.`,
        `Thorough review completed. All documentation in order. Business demonstrates solid track record and growth potential. Approved for funding.`,
        `Financial analysis shows healthy cash flow and manageable debt ratios. Business plan is comprehensive. Recommend approval.`,
        `Credit review satisfactory. Business has strong industry position and experienced management. All criteria met for approval.`
      ],
      'Approve with Conditions': [
        `Application is strong but requires additional collateral documentation. Recommend approval pending receipt of updated property valuation.`,
        `Business financials are acceptable. Approve with condition of quarterly financial reporting for first year.`,
        `Recommend approval with reduced loan amount of ${this.formatCurrency(Math.floor(application.loanAmount * 0.85))} based on current cash flow analysis.`,
        `Approve pending verification of insurance coverage and personal guarantee from primary owner.`
      ],
      'Request Additional Information': [
        `Need clarification on revenue projections for next 12 months. Request updated business plan with detailed financial forecasts.`,
        `Missing recent bank statements. Require last 6 months of business account statements before proceeding.`,
        `Tax returns show discrepancy with stated revenue. Request explanation and supporting documentation.`,
        `Need additional information about existing debt obligations and repayment schedules.`
      ],
      'Escalate to Senior Reviewer': [
        `Application involves complex financial structure. Recommend escalation to senior reviewer for final determination.`,
        `Loan amount exceeds standard approval threshold. Escalating to senior review committee.`,
        `Unusual industry circumstances require specialized expertise. Recommend senior reviewer assessment.`,
        `Multiple risk factors identified. Escalating for comprehensive senior-level review.`
      ],
      'Reject': [
        `Insufficient cash flow to support requested loan amount. Debt-to-income ratio exceeds acceptable limits. Recommend rejection.`,
        `Credit history shows multiple recent delinquencies. Business does not meet minimum credit requirements.`,
        `Business plan lacks sufficient detail and financial projections are unrealistic. Unable to verify business viability.`,
        `Incomplete documentation after multiple follow-up requests. Application does not meet program requirements.`
      ]
    };
    
    const templates = noteTemplates[recommendation] || ['Review completed.'];
    return this.selectRandom(templates);
  }
  
  /**
   * Generate detailed review findings
   * @param {string} recommendation - Review recommendation
   * @param {Object} application - Application data
   * @param {number} riskScore - Risk score
   * @returns {Array} Array of findings
   */
  generateReviewFindings(recommendation, application, riskScore) {
    const findings = [];
    
    // Always include risk assessment
    findings.push({
      category: 'Risk Assessment',
      status: riskScore < 50 ? 'positive' : riskScore < 70 ? 'neutral' : 'concern',
      description: `Overall risk score: ${riskScore}/100. ${riskScore < 50 ? 'Low risk profile.' : riskScore < 70 ? 'Moderate risk profile.' : 'Elevated risk profile.'}`
    });
    
    // Add findings based on recommendation
    if (recommendation === 'Approve' || recommendation === 'Approve with Conditions') {
      findings.push({
        category: 'Financial Analysis',
        status: 'positive',
        description: 'Strong financial position with healthy cash flow and manageable debt ratios.'
      });
      
      findings.push({
        category: 'Documentation',
        status: 'positive',
        description: 'All required documents submitted and verified.'
      });
      
      if (Math.random() > 0.5) {
        findings.push({
          category: 'Business Viability',
          status: 'positive',
          description: 'Business demonstrates clear market opportunity and experienced management team.'
        });
      }
    }
    
    if (recommendation === 'Request Additional Information') {
      findings.push({
        category: 'Documentation',
        status: 'concern',
        description: 'Missing or incomplete documentation requires follow-up.'
      });
      
      findings.push({
        category: 'Verification',
        status: 'neutral',
        description: 'Additional verification needed for stated revenue and expenses.'
      });
    }
    
    if (recommendation === 'Reject') {
      findings.push({
        category: 'Credit Analysis',
        status: 'concern',
        description: 'Credit history does not meet minimum program requirements.'
      });
      
      findings.push({
        category: 'Financial Analysis',
        status: 'concern',
        description: 'Insufficient cash flow to support requested loan amount.'
      });
    }
    
    if (recommendation === 'Escalate to Senior Reviewer') {
      findings.push({
        category: 'Complexity',
        status: 'neutral',
        description: 'Application complexity requires senior-level expertise.'
      });
    }
    
    return findings;
  }
  
  /**
   * Generate review checklist items
   * @param {string} reviewType - Type of review
   * @returns {Array} Checklist items
   */
  generateReviewChecklist(reviewType) {
    const checklistsByType = {
      'Initial Review': [
        'Application completeness verified',
        'Business information validated',
        'Loan amount within program limits',
        'Basic eligibility criteria met',
        'Required documents present'
      ],
      'Financial Review': [
        'Financial statements analyzed',
        'Cash flow assessment completed',
        'Debt-to-income ratio calculated',
        'Revenue verification completed',
        'Expense analysis performed'
      ],
      'Credit Review': [
        'Credit report obtained',
        'Credit score evaluated',
        'Payment history reviewed',
        'Outstanding debts assessed',
        'Credit references checked'
      ],
      'Compliance Review': [
        'Regulatory requirements verified',
        'Program eligibility confirmed',
        'Documentation standards met',
        'Legal requirements satisfied',
        'Compliance checklist completed'
      ],
      'Final Review': [
        'All prior reviews completed',
        'Conditions satisfied',
        'Final documentation verified',
        'Approval authority confirmed',
        'Funding readiness assessed'
      ],
      'Risk Assessment Review': [
        'Risk factors identified',
        'Risk mitigation strategies evaluated',
        'Industry risk assessed',
        'Market conditions analyzed',
        'Overall risk rating determined'
      ]
    };
    
    const items = checklistsByType[reviewType] || [
      'Review item 1',
      'Review item 2',
      'Review item 3'
    ];
    
    // Randomly mark items as completed (80-100% completion rate)
    return items.map(item => ({
      item,
      completed: Math.random() > 0.15, // 85% completion rate
      completedAt: Math.random() > 0.15 ? new Date(Date.now() - Math.random() * 3600000) : null
    }));
  }
  
  /**
   * Generate follow-up details
   * @param {string} recommendation - Review recommendation
   * @returns {Object} Follow-up details
   */
  generateFollowUpDetails(recommendation) {
    if (recommendation === 'Request Additional Information') {
      return {
        type: 'information_request',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        assignedTo: 'Applicant',
        itemsNeeded: Math.floor(Math.random() * 3) + 1, // 1-3 items
        priority: 'normal'
      };
    }
    
    if (recommendation === 'Escalate to Senior Reviewer') {
      return {
        type: 'escalation',
        escalatedTo: 'Senior Review Committee',
        escalationReason: 'Requires specialized expertise',
        expectedResolution: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        priority: 'high'
      };
    }
    
    return null;
  }
  
  /**
   * Generate approval conditions
   * @returns {Array} Array of conditions
   */
  generateApprovalConditions() {
    const possibleConditions = [
      'Quarterly financial reporting required for first year',
      'Personal guarantee from primary owner',
      'Additional collateral documentation needed',
      'Proof of insurance coverage',
      'Updated business license verification',
      'Reduced loan amount based on cash flow analysis',
      'Higher interest rate due to risk factors',
      'Shorter loan term recommended'
    ];
    
    // Select 1-3 conditions
    const conditionCount = Math.floor(Math.random() * 3) + 1;
    const conditions = [];
    
    for (let i = 0; i < conditionCount; i++) {
      const condition = this.selectRandom(possibleConditions);
      if (!conditions.includes(condition)) {
        conditions.push(condition);
      }
    }
    
    return conditions;
  }
  
  /**
   * Generate next steps based on recommendation
   * @param {string} recommendation - Review recommendation
   * @param {boolean} isFinalReview - Whether this is a final review
   * @returns {Array} Array of next steps
   */
  generateNextSteps(recommendation, isFinalReview) {
    const nextStepsByRecommendation = {
      'Approve': isFinalReview ? 
        ['Prepare funding documents', 'Schedule disbursement', 'Notify applicant of approval'] :
        ['Forward to final approval', 'Prepare approval documentation', 'Schedule approval committee review'],
      'Approve with Conditions': [
        'Document conditions in system',
        'Notify applicant of conditional approval',
        'Set up condition tracking',
        'Schedule follow-up review'
      ],
      'Request Additional Information': [
        'Send information request to applicant',
        'Set follow-up deadline',
        'Create task for document review',
        'Schedule re-review upon receipt'
      ],
      'Escalate to Senior Reviewer': [
        'Prepare escalation package',
        'Schedule senior review meeting',
        'Compile all review documentation',
        'Brief senior reviewer on key issues'
      ],
      'Reject': [
        'Prepare rejection letter',
        'Document rejection reasons',
        'Notify applicant of decision',
        'Provide appeal information if applicable'
      ]
    };
    
    return nextStepsByRecommendation[recommendation] || ['Complete review documentation'];
  }
  
  /**
   * Determine review priority
   * @param {number} riskScore - Risk score
   * @param {string} recommendation - Review recommendation
   * @returns {string} Priority level
   */
  determineReviewPriority(riskScore, recommendation) {
    if (recommendation === 'Reject' || recommendation === 'Escalate to Senior Reviewer') {
      return 'high';
    }
    
    if (riskScore > 70) {
      return 'high';
    }
    
    if (riskScore > 50 || recommendation === 'Request Additional Information') {
      return 'medium';
    }
    
    return 'normal';
  }
  
  /**
   * Generate reviewer expertise areas
   * @param {string} reviewType - Type of review
   * @returns {Array} Expertise areas
   */
  generateReviewerExpertise(reviewType) {
    const expertiseByType = {
      'Initial Review': ['Application Processing', 'Eligibility Assessment'],
      'Financial Review': ['Financial Analysis', 'Cash Flow Management', 'Accounting'],
      'Credit Review': ['Credit Analysis', 'Risk Assessment', 'Underwriting'],
      'Compliance Review': ['Regulatory Compliance', 'Legal Requirements', 'Policy Enforcement'],
      'Final Review': ['Senior Underwriting', 'Decision Making', 'Risk Management'],
      'Risk Assessment Review': ['Risk Analysis', 'Industry Analysis', 'Market Research']
    };
    
    return expertiseByType[reviewType] || ['General Review'];
  }
  
  /**
   * Get reviewer role based on review type
   * @param {string} reviewType - Type of review
   * @returns {string} Reviewer role
   */
  getReviewerRole(reviewType) {
    const rolesByType = {
      'Initial Review': 'Application Processor',
      'Financial Review': 'Financial Analyst',
      'Credit Review': 'Credit Analyst',
      'Compliance Review': 'Compliance Officer',
      'Final Review': 'Senior Underwriter',
      'Risk Assessment Review': 'Risk Analyst'
    };
    
    return rolesByType[reviewType] || 'Reviewer';
  }
  
  /**
   * Generate a human-readable description of the review completion
   * @param {Object} data - Review completion data
   * @returns {string} Description
   */
  generateReviewCompletedDescription(data) {
    return `${data.reviewer} completed ${data.reviewType} for ${data.businessName}. ` +
           `Recommendation: ${data.recommendation}. Risk Score: ${data.riskScore}/100. ` +
           `Review took ${data.reviewDurationMinutes} minutes.`;
  }
  
  /**
   * Generate an approval granted event
   * Creates realistic approval data with loan terms and conditions
   * @param {Object} existingApplication - Optional existing application that was approved
   * @returns {Object} Approval granted event data
   */
  generateApprovalGranted(existingApplication = null) {
    // Approver names (typically senior staff)
    const approverNames = [
      'Sarah Johnson',
      'Michael Chen',
      'Robert Taylor',
      'Jennifer Martinez',
      'Daniel Anderson',
      'Amanda White'
    ];
    
    // If no existing application provided, create a mock one
    let application;
    if (existingApplication) {
      application = existingApplication;
    } else {
      // Create a mock application
      application = {
        applicationId: `APP-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        businessName: this.selectRandom(this.dataPool.businesses),
        status: 'IN_APPROVAL',
        loanAmount: this.generateRealisticLoanAmount(),
        location: `${this.selectRandom(this.dataPool.cities)}, ${this.selectRandom(this.dataPool.states)}`,
        industry: this.selectRandom(this.dataPool.industries),
        applicantName: `${this.selectRandom(this.dataPool.applicantFirstNames)} ${this.selectRandom(this.dataPool.applicantLastNames)}`
      };
    }
    
    // Generate approval ID
    const approvalId = `APR-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    
    // Select approver
    const approvedBy = this.selectRandom(approverNames);
    
    // Determine approved amount (may be different from requested)
    const approvedAmount = this.determineApprovedAmount(application.loanAmount);
    const isFullAmount = approvedAmount === application.loanAmount;
    
    // Generate interest rate (3.5% - 7.0%)
    const interestRate = (3.5 + Math.random() * 3.5).toFixed(2);
    
    // Generate loan term in months
    const termMonths = this.selectRandom([12, 24, 36, 48, 60, 84, 120]);
    
    // Calculate monthly payment
    const monthlyPayment = this.calculateMonthlyPayment(approvedAmount, parseFloat(interestRate), termMonths);
    
    // Generate approval timestamp (within last few minutes)
    const approvedAt = new Date(Date.now() - Math.random() * 300000); // Last 5 minutes
    
    // Generate funding timeline
    const fundingDate = new Date(approvedAt.getTime() + (3 + Math.random() * 7) * 24 * 60 * 60 * 1000); // 3-10 days
    const firstPaymentDue = new Date(fundingDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days after funding
    
    // Generate approval conditions (if any)
    const hasConditions = Math.random() > 0.6; // 40% have conditions
    const conditions = hasConditions ? this.generateApprovalConditions() : [];
    
    // Generate approval notes
    const notes = this.generateApprovalNotes(application, approvedAmount, isFullAmount);
    
    // Generate required documents for funding
    const requiredDocuments = this.generateFundingRequirements();
    
    // Determine approval type
    const approvalType = this.determineApprovalType(approvedAmount, application.loanAmount, hasConditions);
    
    // Generate approval committee details (for larger loans)
    let committeeApproval = null;
    if (approvedAmount > 200000) {
      committeeApproval = {
        committeeMembers: Math.floor(Math.random() * 3) + 3, // 3-5 members
        votesFor: Math.floor(Math.random() * 2) + 4, // 4-5 votes
        votesAgainst: Math.floor(Math.random() * 2), // 0-1 votes
        abstentions: Math.random() > 0.8 ? 1 : 0
      };
    }
    
    // Generate disbursement details
    const disbursementMethod = this.selectRandom(['ACH Transfer', 'Wire Transfer', 'Check']);
    
    // Generate collateral requirements (if any)
    const requiresCollateral = approvedAmount > 100000 && Math.random() > 0.5;
    let collateralDetails = null;
    if (requiresCollateral) {
      collateralDetails = {
        required: true,
        type: this.selectRandom(['Equipment', 'Real Estate', 'Inventory', 'Accounts Receivable']),
        valuationRequired: true,
        insuranceRequired: true
      };
    }
    
    // Generate guarantor requirements
    const requiresGuarantor = approvedAmount > 75000 && Math.random() > 0.4;
    let guarantorDetails = null;
    if (requiresGuarantor) {
      guarantorDetails = {
        required: true,
        type: this.selectRandom(['Personal Guarantee', 'Corporate Guarantee', 'Third-Party Guarantee']),
        creditCheckRequired: true
      };
    }
    
    // Generate approval priority
    const priority = approvedAmount > 250000 ? 'high' : 'normal';
    
    // Generate next steps
    const nextSteps = this.generateApprovalNextSteps(hasConditions, requiredDocuments.length);
    
    // Generate approval metrics
    const metrics = {
      daysToApproval: Math.floor(Math.random() * 20) + 5, // 5-24 days
      reviewsCompleted: Math.floor(Math.random() * 3) + 2, // 2-4 reviews
      documentsReviewed: Math.floor(Math.random() * 8) + 5, // 5-12 documents
      approvalScore: Math.floor(Math.random() * 20) + 80 // 80-100
    };
    
    // Generate metadata
    const metadata = {
      approverRole: 'Senior Underwriter',
      approverAuthority: approvedAmount > 200000 ? 'Committee' : 'Individual',
      approvalMethod: approvedAmount > 200000 ? 'Committee Vote' : 'Individual Decision',
      riskRating: this.selectRandom(['Low', 'Low-Medium', 'Medium']),
      programType: this.selectRandom(['Standard', 'Fast Track', 'Special Program']),
      approvalVersion: '2024.1'
    };
    
    return {
      approvalId,
      applicationId: application.applicationId,
      businessName: application.businessName,
      applicantName: application.applicantName || 'Business Owner',
      requestedAmount: application.loanAmount,
      approvedAmount,
      isFullAmount,
      interestRate: parseFloat(interestRate),
      termMonths,
      monthlyPayment,
      approvedBy,
      approvedAt,
      fundingDate,
      firstPaymentDue,
      hasConditions,
      conditions,
      notes,
      requiredDocuments,
      approvalType,
      committeeApproval,
      disbursementMethod,
      requiresCollateral,
      collateralDetails,
      requiresGuarantor,
      guarantorDetails,
      priority,
      nextSteps,
      metrics,
      location: application.location,
      industry: application.industry,
      metadata
    };
  }
  
  /**
   * Determine approved amount (may be less than requested)
   * @param {number} requestedAmount - Requested loan amount
   * @returns {number} Approved amount
   */
  determineApprovedAmount(requestedAmount) {
    const random = Math.random();
    
    if (random < 0.70) {
      // 70% get full amount
      return requestedAmount;
    } else if (random < 0.90) {
      // 20% get 80-95% of requested
      const percentage = 0.80 + Math.random() * 0.15;
      return Math.floor(requestedAmount * percentage);
    } else {
      // 10% get 60-80% of requested
      const percentage = 0.60 + Math.random() * 0.20;
      return Math.floor(requestedAmount * percentage);
    }
  }
  
  /**
   * Calculate monthly payment
   * @param {number} principal - Loan amount
   * @param {number} annualRate - Annual interest rate (percentage)
   * @param {number} termMonths - Loan term in months
   * @returns {number} Monthly payment
   */
  calculateMonthlyPayment(principal, annualRate, termMonths) {
    const monthlyRate = annualRate / 100 / 12;
    const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / 
                    (Math.pow(1 + monthlyRate, termMonths) - 1);
    return Math.round(payment * 100) / 100;
  }
  
  /**
   * Generate approval notes
   * @param {Object} application - Application data
   * @param {number} approvedAmount - Approved amount
   * @param {boolean} isFullAmount - Whether full amount was approved
   * @returns {string} Approval notes
   */
  generateApprovalNotes(application, approvedAmount, isFullAmount) {
    const noteTemplates = {
      fullAmount: [
        `Application approved for full requested amount of ${this.formatCurrency(approvedAmount)}. Business demonstrates strong financials and clear repayment ability.`,
        `Approved for ${this.formatCurrency(approvedAmount)}. All requirements met. Business shows excellent growth potential and solid management.`,
        `Full approval granted. Financial analysis shows healthy cash flow and manageable debt ratios. Recommend standard terms.`,
        `Application meets all criteria. Approved for ${this.formatCurrency(approvedAmount)} with standard interest rate and terms.`
      ],
      partialAmount: [
        `Approved for ${this.formatCurrency(approvedAmount)} based on current cash flow analysis. Amount adjusted from ${this.formatCurrency(application.loanAmount)} to align with debt service coverage ratio.`,
        `Partial approval granted. Approved amount of ${this.formatCurrency(approvedAmount)} reflects conservative assessment of repayment capacity.`,
        `Approved for ${this.formatCurrency(approvedAmount)}. Reduced from requested amount based on current financial position and industry risk factors.`,
        `Application approved with modified loan amount. ${this.formatCurrency(approvedAmount)} approved to ensure sustainable debt levels.`
      ]
    };
    
    const templates = isFullAmount ? noteTemplates.fullAmount : noteTemplates.partialAmount;
    return this.selectRandom(templates);
  }
  
  /**
   * Generate funding requirements
   * @returns {Array} List of required documents
   */
  generateFundingRequirements() {
    const allRequirements = [
      'Signed loan agreement',
      'Proof of insurance',
      'Final business license verification',
      'Updated bank account information',
      'Personal guarantee documentation',
      'Collateral documentation',
      'Final financial statements',
      'Tax clearance certificate'
    ];
    
    // Select 2-4 requirements
    const count = Math.floor(Math.random() * 3) + 2;
    const requirements = [];
    
    for (let i = 0; i < count; i++) {
      const req = this.selectRandom(allRequirements);
      if (!requirements.includes(req)) {
        requirements.push(req);
      }
    }
    
    return requirements;
  }
  
  /**
   * Determine approval type
   * @param {number} approvedAmount - Approved amount
   * @param {number} requestedAmount - Requested amount
   * @param {boolean} hasConditions - Whether approval has conditions
   * @returns {string} Approval type
   */
  determineApprovalType(approvedAmount, requestedAmount, hasConditions) {
    if (hasConditions) {
      return 'Conditional Approval';
    } else if (approvedAmount < requestedAmount) {
      return 'Partial Approval';
    } else {
      return 'Full Approval';
    }
  }
  
  /**
   * Generate next steps for approval
   * @param {boolean} hasConditions - Whether approval has conditions
   * @param {number} documentCount - Number of required documents
   * @returns {Array} Next steps
   */
  generateApprovalNextSteps(hasConditions, documentCount) {
    const steps = [
      'Notify applicant of approval',
      'Send loan agreement for signature',
      `Collect ${documentCount} required documents`,
      'Schedule funding date',
      'Set up loan account',
      'Prepare disbursement'
    ];
    
    if (hasConditions) {
      steps.splice(2, 0, 'Verify all conditions are met');
    }
    
    return steps;
  }
  
  /**
   * Generate a human-readable description of the approval
   * @param {Object} data - Approval data
   * @returns {string} Description
   */
  generateApprovalGrantedDescription(data) {
    return `${data.businessName} approved for ${this.formatCurrency(data.approvedAmount)} by ${data.approvedBy}. ` +
           `${data.approvalType}. Interest rate: ${data.interestRate}%, Term: ${data.termMonths} months. ` +
           `Funding scheduled for ${data.fundingDate.toLocaleDateString()}.`;
  }
  
  /**
   * Generate a rejection issued event
   * Creates realistic rejection data with reasons and appeal information
   * @param {Object} existingApplication - Optional existing application that was rejected
   * @returns {Object} Rejection issued event data
   */
  generateRejectionIssued(existingApplication = null) {
    // Rejection reasons from demo-event-templates.json
    const rejectionReasons = [
      'Insufficient credit history',
      'Unable to verify business viability',
      'Debt-to-income ratio exceeds limits',
      'Incomplete documentation after follow-up',
      'Business does not meet program requirements',
      'Collateral insufficient for loan amount',
      'Cash flow inadequate for repayment',
      'Industry risk factors too high',
      'Lack of business experience',
      'Missing required financial statements'
    ];
    
    // Rejection categories
    const rejectionCategories = {
      'credit': ['Insufficient credit history', 'Debt-to-income ratio exceeds limits'],
      'documentation': ['Incomplete documentation after follow-up', 'Missing required financial statements'],
      'viability': ['Unable to verify business viability', 'Business does not meet program requirements'],
      'financial': ['Cash flow inadequate for repayment', 'Collateral insufficient for loan amount'],
      'risk': ['Industry risk factors too high', 'Lack of business experience']
    };
    
    // Reviewer names
    const reviewerNames = [
      'Sarah Johnson',
      'Michael Chen',
      'Emily Rodriguez',
      'David Kim',
      'Jennifer Martinez',
      'Robert Taylor'
    ];
    
    // If no existing application provided, create a mock one
    let application;
    if (existingApplication) {
      application = existingApplication;
    } else {
      // Create a mock application
      application = {
        applicationId: `APP-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        businessName: this.selectRandom(this.dataPool.businesses),
        status: this.selectRandom(['UNDER_REVIEW', 'IN_APPROVAL']),
        loanAmount: this.generateRealisticLoanAmount(),
        location: `${this.selectRandom(this.dataPool.cities)}, ${this.selectRandom(this.dataPool.states)}`,
        industry: this.selectRandom(this.dataPool.industries),
        applicantName: `${this.selectRandom(this.dataPool.applicantFirstNames)} ${this.selectRandom(this.dataPool.applicantLastNames)}`
      };
    }
    
    // Generate rejection ID
    const rejectionId = `REJ-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    
    // Select primary rejection reason
    const primaryReason = this.selectRandom(rejectionReasons);
    
    // Determine rejection category
    let category = 'other';
    for (const [cat, reasons] of Object.entries(rejectionCategories)) {
      if (reasons.includes(primaryReason)) {
        category = cat;
        break;
      }
    }
    
    // Generate secondary reasons (0-2 additional reasons)
    const secondaryReasons = [];
    if (Math.random() > 0.6) {
      const additionalCount = Math.random() > 0.7 ? 2 : 1;
      for (let i = 0; i < additionalCount; i++) {
        const reason = this.selectRandom(rejectionReasons);
        if (reason !== primaryReason && !secondaryReasons.includes(reason)) {
          secondaryReasons.push(reason);
        }
      }
    }
    
    // Select reviewer who made rejection decision
    const rejectedBy = this.selectRandom(reviewerNames);
    
    // Generate rejection timestamp (within last few minutes)
    const rejectedAt = new Date(Date.now() - Math.random() * 300000); // Last 5 minutes
    
    // Generate detailed rejection notes
    const notes = this.generateRejectionNotes(primaryReason, secondaryReasons, application);
    
    // Determine if appeal is allowed
    const appealable = Math.random() > 0.3; // 70% are appealable
    
    // Generate appeal details if appealable
    let appealDetails = null;
    if (appealable) {
      const appealDeadline = new Date(rejectedAt.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
      appealDetails = {
        allowed: true,
        deadline: appealDeadline,
        process: 'Submit written appeal with additional documentation',
        reviewedBy: 'Appeals Committee',
        estimatedReviewTime: '10-15 business days',
        requirements: this.generateAppealRequirements(category)
      };
    }
    
    // Determine if reapplication is recommended
    const canReapply = Math.random() > 0.4; // 60% can reapply
    let reapplicationGuidance = null;
    if (canReapply) {
      reapplicationGuidance = {
        allowed: true,
        waitingPeriod: this.selectRandom([30, 60, 90, 180]), // days
        recommendations: this.generateReapplicationRecommendations(category, primaryReason),
        improvementAreas: this.generateImprovementAreas(category)
      };
    }
    
    // Generate risk assessment that led to rejection
    const riskAssessment = {
      overallRiskScore: Math.floor(Math.random() * 30) + 70, // 70-100 (high risk)
      creditRisk: Math.floor(Math.random() * 30) + 60,
      businessRisk: Math.floor(Math.random() * 30) + 60,
      financialRisk: Math.floor(Math.random() * 30) + 60,
      industryRisk: Math.floor(Math.random() * 30) + 50
    };
    
    // Generate rejection metrics
    const metrics = {
      daysInReview: Math.floor(Math.random() * 15) + 5, // 5-19 days
      reviewsCompleted: Math.floor(Math.random() * 3) + 1, // 1-3 reviews
      documentsReviewed: Math.floor(Math.random() * 8) + 3, // 3-10 documents
      followUpAttempts: Math.floor(Math.random() * 4) // 0-3 attempts
    };
    
    // Generate alternative options
    const alternativeOptions = this.generateAlternativeOptions(application.loanAmount, category);
    
    // Determine notification priority
    const priority = 'high'; // Rejections are always high priority
    
    // Generate next steps for applicant
    const nextSteps = this.generateRejectionNextSteps(appealable, canReapply);
    
    // Generate metadata
    const metadata = {
      rejectionType: category,
      reviewerRole: 'Senior Underwriter',
      decisionMethod: 'Manual Review',
      finalReview: true,
      notificationSent: true,
      notificationMethod: this.selectRandom(['Email', 'Email + Mail', 'Portal Notification']),
      rejectionVersion: '2024.1'
    };
    
    return {
      rejectionId,
      applicationId: application.applicationId,
      businessName: application.businessName,
      applicantName: application.applicantName || 'Business Owner',
      requestedAmount: application.loanAmount,
      primaryReason,
      secondaryReasons,
      category,
      rejectedBy,
      rejectedAt,
      notes,
      appealable,
      appealDetails,
      canReapply,
      reapplicationGuidance,
      riskAssessment,
      metrics,
      alternativeOptions,
      priority,
      nextSteps,
      location: application.location,
      industry: application.industry,
      metadata
    };
  }
  
  /**
   * Generate detailed rejection notes
   * @param {string} primaryReason - Primary rejection reason
   * @param {Array} secondaryReasons - Secondary rejection reasons
   * @param {Object} application - Application data
   * @returns {string} Rejection notes
   */
  generateRejectionNotes(primaryReason, secondaryReasons, application) {
    const noteTemplates = {
      'Insufficient credit history': `After careful review, we are unable to approve the loan application for ${application.businessName}. The primary concern is insufficient credit history to assess repayment ability. We recommend building business credit and reapplying in 6-12 months.`,
      'Unable to verify business viability': `The application for ${application.businessName} has been declined. We were unable to verify sufficient business viability and market sustainability. The business plan requires more detailed financial projections and market analysis.`,
      'Debt-to-income ratio exceeds limits': `We regret to inform you that the loan application has been rejected. The current debt-to-income ratio exceeds our program limits. We recommend debt consolidation or reduction before reapplying.`,
      'Incomplete documentation after follow-up': `The application cannot be approved due to incomplete documentation. Despite multiple follow-up requests, required documents have not been provided. You may reapply once all documentation is available.`,
      'Business does not meet program requirements': `After thorough review, ${application.businessName} does not meet the eligibility requirements for this loan program. Please review program guidelines or consider alternative financing options.`,
      'Collateral insufficient for loan amount': `The application has been declined due to insufficient collateral for the requested loan amount of ${this.formatCurrency(application.loanAmount)}. Consider reducing the loan amount or providing additional collateral.`,
      'Cash flow inadequate for repayment': `Based on financial analysis, current cash flow is inadequate to support the requested loan repayment. We recommend improving cash flow or reducing the loan amount before reapplying.`,
      'Industry risk factors too high': `The application has been rejected due to elevated industry risk factors in the ${application.industry} sector. Current market conditions present higher than acceptable risk levels.`,
      'Lack of business experience': `The application cannot be approved at this time due to limited business management experience. We recommend gaining additional experience or partnering with experienced management.`,
      'Missing required financial statements': `The application is incomplete due to missing required financial statements. Please provide all requested financial documentation and resubmit your application.`
    };
    
    let notes = noteTemplates[primaryReason] || `The loan application for ${application.businessName} has been declined after careful review.`;
    
    if (secondaryReasons.length > 0) {
      notes += ` Additional concerns include: ${secondaryReasons.join(', ').toLowerCase()}.`;
    }
    
    return notes;
  }
  
  /**
   * Generate appeal requirements
   * @param {string} category - Rejection category
   * @returns {Array} Appeal requirements
   */
  generateAppealRequirements(category) {
    const requirementsByCategory = {
      'credit': [
        'Updated credit report',
        'Explanation of credit issues',
        'Evidence of credit improvement',
        'Additional guarantor information'
      ],
      'documentation': [
        'All missing documents',
        'Certified financial statements',
        'Updated business information',
        'Supporting documentation'
      ],
      'viability': [
        'Revised business plan',
        'Market analysis report',
        'Financial projections',
        'Management experience documentation'
      ],
      'financial': [
        'Updated financial statements',
        'Cash flow projections',
        'Additional collateral documentation',
        'Debt reduction plan'
      ],
      'risk': [
        'Risk mitigation plan',
        'Industry analysis',
        'Management qualifications',
        'Business continuity plan'
      ]
    };
    
    return requirementsByCategory[category] || ['Additional supporting documentation', 'Written explanation'];
  }
  
  /**
   * Generate reapplication recommendations
   * @param {string} category - Rejection category
   * @param {string} primaryReason - Primary rejection reason
   * @returns {Array} Recommendations
   */
  generateReapplicationRecommendations(category, primaryReason) {
    const recommendations = {
      'credit': [
        'Improve personal and business credit scores',
        'Reduce existing debt obligations',
        'Establish consistent payment history',
        'Consider adding a co-signer or guarantor'
      ],
      'documentation': [
        'Gather all required financial documents',
        'Obtain certified financial statements',
        'Update business licenses and registrations',
        'Prepare comprehensive documentation package'
      ],
      'viability': [
        'Develop detailed business plan',
        'Conduct thorough market research',
        'Create realistic financial projections',
        'Demonstrate market demand'
      ],
      'financial': [
        'Improve cash flow management',
        'Reduce operating expenses',
        'Increase revenue streams',
        'Build cash reserves'
      ],
      'risk': [
        'Gain additional industry experience',
        'Strengthen management team',
        'Develop risk mitigation strategies',
        'Improve business operations'
      ]
    };
    
    return recommendations[category] || ['Address identified concerns', 'Strengthen application'];
  }
  
  /**
   * Generate improvement areas
   * @param {string} category - Rejection category
   * @returns {Array} Improvement areas
   */
  generateImprovementAreas(category) {
    const areas = {
      'credit': ['Credit Score', 'Payment History', 'Debt Management'],
      'documentation': ['Document Completeness', 'Financial Records', 'Business Documentation'],
      'viability': ['Business Plan', 'Market Analysis', 'Financial Projections'],
      'financial': ['Cash Flow', 'Revenue Growth', 'Expense Management'],
      'risk': ['Risk Management', 'Industry Knowledge', 'Management Experience']
    };
    
    return areas[category] || ['General Business Strength'];
  }
  
  /**
   * Generate alternative financing options
   * @param {number} requestedAmount - Requested loan amount
   * @param {string} category - Rejection category
   * @returns {Array} Alternative options
   */
  generateAlternativeOptions(requestedAmount, category) {
    const options = [];
    
    // Smaller loan amount
    if (requestedAmount > 50000) {
      options.push({
        type: 'Reduced Loan Amount',
        description: `Consider applying for a smaller loan amount (${this.formatCurrency(Math.floor(requestedAmount * 0.5))})`,
        likelihood: 'Medium'
      });
    }
    
    // Alternative programs
    if (category === 'credit' || category === 'financial') {
      options.push({
        type: 'Microloan Program',
        description: 'Explore microloan programs with less stringent requirements',
        likelihood: 'High'
      });
    }
    
    // Business credit card
    if (requestedAmount < 50000) {
      options.push({
        type: 'Business Credit Card',
        description: 'Consider business credit card for smaller financing needs',
        likelihood: 'Medium'
      });
    }
    
    // Grant programs
    options.push({
      type: 'Grant Programs',
      description: 'Research available business grant programs',
      likelihood: 'Low'
    });
    
    return options;
  }
  
  /**
   * Generate next steps after rejection
   * @param {boolean} appealable - Whether appeal is allowed
   * @param {boolean} canReapply - Whether reapplication is allowed
   * @returns {Array} Next steps
   */
  generateRejectionNextSteps(appealable, canReapply) {
    const steps = [
      'Review rejection letter carefully',
      'Understand specific reasons for rejection'
    ];
    
    if (appealable) {
      steps.push('Consider filing an appeal within 30 days');
      steps.push('Gather additional supporting documentation');
    }
    
    if (canReapply) {
      steps.push('Work on addressing identified concerns');
      steps.push('Reapply after recommended waiting period');
    }
    
    steps.push('Explore alternative financing options');
    steps.push('Consult with business advisor or financial consultant');
    
    return steps;
  }
  
  /**
   * Generate a human-readable description of the rejection
   * @param {Object} data - Rejection data
   * @returns {string} Description
   */
  generateRejectionIssuedDescription(data) {
    return `${data.businessName} application rejected by ${data.rejectedBy}. ` +
           `Primary reason: ${data.primaryReason}. ` +
           `${data.appealable ? 'Appeal allowed within 30 days.' : 'Appeal not available.'} ` +
           `${data.canReapply ? `Can reapply after ${data.reapplicationGuidance.waitingPeriod} days.` : ''}`;
  }
  
  /**
   * Generate a comment added event
   * Creates realistic comment data with proper context and metadata
   * @param {Object} existingApplication - Optional existing application to comment on
   * @returns {Object} Comment added event data
   */
  generateCommentAdded(existingApplication = null) {
    // Commenter names (staff members who can comment)
    const commenterNames = [
      'Sarah Johnson',
      'Michael Chen',
      'Emily Rodriguez',
      'David Kim',
      'Jennifer Martinez',
      'Robert Taylor',
      'Amanda White',
      'Christopher Lee',
      'Michelle Garcia',
      'Daniel Anderson'
    ];
    
    // Comment types and categories
    const commentTypes = [
      'question',
      'information_request',
      'clarification',
      'note',
      'recommendation',
      'concern',
      'approval_note',
      'status_update'
    ];
    
    // Comment templates from demo-event-templates.json with variations
    const commentTemplates = {
      'question': [
        'Can you clarify the intended use of funds for {purpose}?',
        'What is the timeline for {topic}?',
        'How will this loan impact your current operations?',
        'Can you provide more details about {topic}?',
        'What is your plan for {topic}?'
      ],
      'information_request': [
        'Please provide additional financial statements for the last {years} years.',
        'We need updated bank statements from the last {months} months.',
        'Please provide proof of {requirement}.',
        'Requesting additional information about {topic}.',
        'Please submit {document} at your earliest convenience.'
      ],
      'clarification': [
        'The business plan needs more detail on {topic}.',
        'Tax returns show inconsistency with stated revenue. Please explain.',
        'Can you clarify the discrepancy in {topic}?',
        'Please provide clarification on {topic}.',
        'We need more information about {topic} to proceed.'
      ],
      'note': [
        'Application received and under initial review.',
        'All required documents have been received.',
        'Forwarding to financial analysis team.',
        'Scheduled for review committee meeting on {date}.',
        'Application is progressing well through the review process.'
      ],
      'recommendation': [
        'The application looks strong. Moving to approval stage.',
        'Recommend approval with standard terms.',
        'Suggest requesting additional collateral documentation.',
        'Application meets all initial requirements.',
        'Recommend escalation to senior reviewer for final decision.'
      ],
      'concern': [
        'Collateral valuation needed for {asset}.',
        'Credit history requires additional review.',
        'Cash flow projections need verification.',
        'Industry risk factors require closer examination.',
        'Debt-to-income ratio is approaching program limits.'
      ],
      'approval_note': [
        'Application approved pending final documentation.',
        'Conditional approval granted. See attached conditions.',
        'Approved for funding. Preparing loan documents.',
        'Final approval received from committee.',
        'Loan terms finalized and ready for disbursement.'
      ],
      'status_update': [
        'Application moved to {status} status.',
        'Review completed. Awaiting final decision.',
        'Documents verified. Proceeding to next stage.',
        'Application on hold pending {requirement}.',
        'Status updated based on recent review findings.'
      ]
    };
    
    // Topics for template substitution
    const topics = [
      'revenue projections',
      'market analysis',
      'equipment specifications',
      'staffing plans',
      'expansion timeline',
      'collateral valuation',
      'business operations',
      'financial statements',
      'credit history',
      'industry experience',
      'management team',
      'cash flow management'
    ];
    
    // Requirements for template substitution
    const requirements = [
      'business insurance',
      'property insurance',
      'liability coverage',
      'business license',
      'tax clearance',
      'zoning approval',
      'environmental compliance',
      'professional certifications'
    ];
    
    // Documents for template substitution
    const documents = [
      'updated financial statements',
      'recent bank statements',
      'tax returns',
      'business plan',
      'proof of insurance',
      'collateral documentation',
      'personal financial statement',
      'credit report'
    ];
    
    // Assets for template substitution
    const assets = [
      'equipment',
      'real estate',
      'inventory',
      'vehicles',
      'machinery',
      'property',
      'accounts receivable'
    ];
    
    // If no existing application provided, create a mock one
    let application;
    if (existingApplication) {
      application = existingApplication;
    } else {
      // Create a mock application
      application = {
        applicationId: `APP-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        businessName: this.selectRandom(this.dataPool.businesses),
        status: this.selectRandom(['PENDING_REVIEW', 'UNDER_REVIEW', 'PENDING_DOCUMENTS', 'IN_APPROVAL']),
        loanAmount: this.generateRealisticLoanAmount(),
        location: `${this.selectRandom(this.dataPool.cities)}, ${this.selectRandom(this.dataPool.states)}`,
        industry: this.selectRandom(this.dataPool.industries)
      };
    }
    
    // Generate comment ID
    const commentId = `CMT-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    
    // Select commenter
    const commenter = this.selectRandom(commenterNames);
    
    // Select comment type with weighted probabilities
    const commentType = this.selectWeightedCommentType();
    
    // Generate comment text based on type
    const commentText = this.generateCommentText(commentType, commentTemplates, {
      topics,
      requirements,
      documents,
      assets,
      purpose: this.selectRandom(this.dataPool.loanPurposes),
      years: this.selectRandom([2, 3, 5]),
      months: this.selectRandom([3, 6, 12]),
      date: this.generateFutureDate(7, 14), // 7-14 days from now
      status: this.selectRandom(['Under Review', 'In Approval', 'Pending Documents'])
    });
    
    // Generate comment timestamp (within last few minutes)
    const commentedAt = new Date(Date.now() - Math.random() * 300000); // Last 5 minutes
    
    // Determine if comment is internal or visible to applicant
    const isInternal = Math.random() > 0.6; // 40% are internal notes
    
    // Determine if comment requires response
    const requiresResponse = ['question', 'information_request', 'clarification'].includes(commentType);
    
    // Generate response deadline if response required
    let responseDeadline = null;
    if (requiresResponse) {
      responseDeadline = new Date(commentedAt.getTime() + (3 + Math.random() * 7) * 24 * 60 * 60 * 1000); // 3-10 days
    }
    
    // Determine comment priority
    const priority = this.determineCommentPriority(commentType, requiresResponse);
    
    // Generate mentioned users (for @mentions)
    const mentionedUsers = [];
    if (Math.random() > 0.7) { // 30% chance of mentions
      const mentionCount = Math.floor(Math.random() * 2) + 1; // 1-2 mentions
      for (let i = 0; i < mentionCount; i++) {
        const user = this.selectRandom(commenterNames);
        if (user !== commenter && !mentionedUsers.includes(user)) {
          mentionedUsers.push(user);
        }
      }
    }
    
    // Generate tags/categories
    const tags = this.generateCommentTags(commentType, application);
    
    // Determine if comment has attachments
    const hasAttachments = Math.random() > 0.8; // 20% have attachments
    let attachments = [];
    if (hasAttachments) {
      attachments = this.generateCommentAttachments();
    }
    
    // Generate commenter role
    const commenterRole = this.getCommenterRole(commentType);
    
    // Determine if comment is edited
    const isEdited = Math.random() > 0.9; // 10% are edited
    let editedAt = null;
    if (isEdited) {
      editedAt = new Date(commentedAt.getTime() + Math.random() * 3600000); // Within 1 hour
    }
    
    // Generate thread information (if part of a conversation)
    const isThreadReply = Math.random() > 0.7; // 30% are replies
    let threadInfo = null;
    if (isThreadReply) {
      threadInfo = {
        parentCommentId: `CMT-${Date.now() - 3600000}-${Math.floor(Math.random() * 100000)}`,
        threadDepth: Math.floor(Math.random() * 3) + 1, // 1-3 levels deep
        replyCount: Math.floor(Math.random() * 5) // 0-4 replies
      };
    }
    
    // Generate notification settings
    const notifyApplicant = !isInternal && requiresResponse;
    const notifyTeam = isInternal || mentionedUsers.length > 0;
    
    // Generate metadata
    const metadata = {
      source: this.selectRandom(['Web Portal', 'Mobile App', 'Email', 'System']),
      ipAddress: this.generateIPAddress(),
      userAgent: this.generateUserAgent(),
      characterCount: commentText.length,
      wordCount: commentText.split(' ').length,
      sentiment: this.analyzeCommentSentiment(commentType),
      readBy: [], // Will be populated as users read the comment
      version: isEdited ? 2 : 1
    };
    
    // Generate activity tracking
    const activityTracking = {
      viewCount: Math.floor(Math.random() * 10), // 0-9 views
      reactionCount: Math.floor(Math.random() * 5), // 0-4 reactions
      reactions: this.generateCommentReactions()
    };
    
    return {
      commentId,
      applicationId: application.applicationId,
      businessName: application.businessName,
      loanAmount: application.loanAmount,
      location: application.location,
      industry: application.industry,
      commenter,
      commenterRole,
      commentType,
      commentText,
      commentedAt,
      isInternal,
      requiresResponse,
      responseDeadline,
      priority,
      mentionedUsers,
      tags,
      hasAttachments,
      attachments,
      isEdited,
      editedAt,
      isThreadReply,
      threadInfo,
      notifyApplicant,
      notifyTeam,
      metadata,
      activityTracking
    };
  }
  
  /**
   * Select comment type with weighted probabilities
   * @returns {string} Selected comment type
   */
  selectWeightedCommentType() {
    const random = Math.random();
    
    if (random < 0.25) {
      return 'information_request'; // 25%
    } else if (random < 0.45) {
      return 'note'; // 20%
    } else if (random < 0.60) {
      return 'question'; // 15%
    } else if (random < 0.75) {
      return 'clarification'; // 15%
    } else if (random < 0.85) {
      return 'status_update'; // 10%
    } else if (random < 0.92) {
      return 'recommendation'; // 7%
    } else if (random < 0.97) {
      return 'concern'; // 5%
    } else {
      return 'approval_note'; // 3%
    }
  }
  
  /**
   * Generate comment text based on type and templates
   * @param {string} commentType - Type of comment
   * @param {Object} templates - Comment templates by type
   * @param {Object} substitutions - Values for template substitution
   * @returns {string} Generated comment text
   */
  generateCommentText(commentType, templates, substitutions) {
    const typeTemplates = templates[commentType] || ['Comment added to application.'];
    let template = this.selectRandom(typeTemplates);
    
    // Perform template substitutions
    template = template.replace('{purpose}', substitutions.purpose);
    template = template.replace('{topic}', this.selectRandom(substitutions.topics));
    template = template.replace('{requirement}', this.selectRandom(substitutions.requirements));
    template = template.replace('{document}', this.selectRandom(substitutions.documents));
    template = template.replace('{asset}', this.selectRandom(substitutions.assets));
    template = template.replace('{years}', substitutions.years);
    template = template.replace('{months}', substitutions.months);
    template = template.replace('{date}', substitutions.date);
    template = template.replace('{status}', substitutions.status);
    
    return template;
  }
  
  /**
   * Generate future date string
   * @param {number} minDays - Minimum days from now
   * @param {number} maxDays - Maximum days from now
   * @returns {string} Formatted date string
   */
  generateFutureDate(minDays, maxDays) {
    const days = Math.floor(Math.random() * (maxDays - minDays + 1)) + minDays;
    const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }
  
  /**
   * Determine comment priority
   * @param {string} commentType - Type of comment
   * @param {boolean} requiresResponse - Whether response is required
   * @returns {string} Priority level
   */
  determineCommentPriority(commentType, requiresResponse) {
    if (commentType === 'concern' || (commentType === 'information_request' && requiresResponse)) {
      return 'high';
    }
    
    if (commentType === 'question' || commentType === 'clarification') {
      return 'medium';
    }
    
    return 'normal';
  }
  
  /**
   * Generate comment tags based on type and application
   * @param {string} commentType - Type of comment
   * @param {Object} application - Application data
   * @returns {Array} Array of tags
   */
  generateCommentTags(commentType, application) {
    const tags = [];
    
    // Add type-based tag
    tags.push(commentType.replace('_', ' '));
    
    // Add application-specific tags
    if (application.industry) {
      tags.push(application.industry);
    }
    
    // Add random relevant tags
    const possibleTags = [
      'documentation',
      'financial review',
      'credit check',
      'compliance',
      'risk assessment',
      'follow-up needed',
      'urgent',
      'routine'
    ];
    
    if (Math.random() > 0.5) {
      tags.push(this.selectRandom(possibleTags));
    }
    
    return tags;
  }
  
  /**
   * Generate comment attachments
   * @returns {Array} Array of attachment objects
   */
  generateCommentAttachments() {
    const attachmentTypes = [
      { name: 'additional_info.pdf', type: 'application/pdf', size: 245678 },
      { name: 'clarification_document.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 123456 },
      { name: 'financial_analysis.xlsx', type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', size: 89012 },
      { name: 'supporting_document.pdf', type: 'application/pdf', size: 345678 }
    ];
    
    const count = Math.floor(Math.random() * 2) + 1; // 1-2 attachments
    const attachments = [];
    
    for (let i = 0; i < count; i++) {
      const attachment = this.selectRandom(attachmentTypes);
      if (!attachments.find(a => a.name === attachment.name)) {
        attachments.push({
          ...attachment,
          uploadedAt: new Date(Date.now() - Math.random() * 60000) // Within last minute
        });
      }
    }
    
    return attachments;
  }
  
  /**
   * Get commenter role based on comment type
   * @param {string} commentType - Type of comment
   * @returns {string} Commenter role
   */
  getCommenterRole(commentType) {
    const rolesByType = {
      'question': 'Loan Officer',
      'information_request': 'Underwriter',
      'clarification': 'Financial Analyst',
      'note': 'Application Processor',
      'recommendation': 'Senior Underwriter',
      'concern': 'Risk Analyst',
      'approval_note': 'Approval Manager',
      'status_update': 'Application Processor'
    };
    
    return rolesByType[commentType] || 'Staff Member';
  }
  
  /**
   * Analyze comment sentiment
   * @param {string} commentType - Type of comment
   * @returns {string} Sentiment (positive, neutral, negative)
   */
  analyzeCommentSentiment(commentType) {
    const sentimentMap = {
      'approval_note': 'positive',
      'recommendation': 'positive',
      'note': 'neutral',
      'status_update': 'neutral',
      'question': 'neutral',
      'information_request': 'neutral',
      'clarification': 'neutral',
      'concern': 'negative'
    };
    
    return sentimentMap[commentType] || 'neutral';
  }
  
  /**
   * Generate comment reactions
   * @returns {Object} Reactions object
   */
  generateCommentReactions() {
    const reactionTypes = ['👍', '👎', '❤️', '🎯', '✅'];
    const reactions = {};
    
    // Randomly add 0-2 reaction types
    const reactionCount = Math.floor(Math.random() * 3);
    for (let i = 0; i < reactionCount; i++) {
      const reaction = this.selectRandom(reactionTypes);
      if (!reactions[reaction]) {
        reactions[reaction] = Math.floor(Math.random() * 3) + 1; // 1-3 of each reaction
      }
    }
    
    return reactions;
  }
  
  /**
   * Generate a human-readable description of the comment
   * @param {Object} data - Comment data
   * @returns {string} Description
   */
  generateCommentAddedDescription(data) {
    const responseText = data.requiresResponse ? ' (Response required)' : '';
    const internalText = data.isInternal ? ' [Internal]' : '';
    return `${data.commenter} (${data.commenterRole}) commented on ${data.businessName}${internalText}. ` +
           `Type: ${data.commentType.replace('_', ' ')}${responseText}. "${data.commentText.substring(0, 100)}${data.commentText.length > 100 ? '...' : ''}"`;
  }
  
  /**
   * Generate an AI analysis complete event
   * Creates realistic AI analysis results with risk scores, insights, and recommendations
   * @param {Object} existingApplication - Optional existing application that was analyzed
   * @returns {Object} AI analysis complete event data
   */
  generateAIAnalysisComplete(existingApplication = null) {
    // If no existing application provided, create a mock one
    let application;
    if (existingApplication) {
      application = existingApplication;
    } else {
      // Create a mock application
      application = {
        applicationId: `APP-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        businessName: this.selectRandom(this.dataPool.businesses),
        status: this.selectRandom(['UNDER_REVIEW', 'IN_APPROVAL', 'PENDING_REVIEW']),
        loanAmount: this.generateRealisticLoanAmount(),
        location: `${this.selectRandom(this.dataPool.cities)}, ${this.selectRandom(this.dataPool.states)}`,
        industry: this.selectRandom(this.dataPool.industries),
        applicantName: `${this.selectRandom(this.dataPool.applicantFirstNames)} ${this.selectRandom(this.dataPool.applicantLastNames)}`,
        businessAge: Math.floor(Math.random() * 15) + 1,
        employeeCount: this.generateEmployeeCount(),
        annualRevenue: this.generateAnnualRevenue(this.generateRealisticLoanAmount())
      };
    }
    
    // Generate analysis ID
    const analysisId = `AI-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    
    // Generate risk score based on industry (0-100, lower is better)
    const riskScore = this.generateRiskScore(application.industry);
    
    // Determine risk level based on score
    const riskLevel = riskScore < 40 ? 'low' : riskScore < 60 ? 'medium' : riskScore < 80 ? 'high' : 'very_high';
    
    // Generate confidence score (70-98%)
    const confidence = Math.floor(Math.random() * 28) + 70;
    
    // Generate analysis timestamp (within last few minutes)
    const analyzedAt = new Date(Date.now() - Math.random() * 300000); // Last 5 minutes
    
    // Calculate processing time (2-15 seconds)
    const processingTimeMs = Math.floor(Math.random() * 13000) + 2000;
    
    // Generate risk factors
    const riskFactors = this.generateAIRiskFactors(application, riskScore);
    
    // Generate positive indicators
    const positiveIndicators = this.generateAIPositiveIndicators(application, riskScore);
    
    // Generate AI recommendations
    const recommendations = this.generateAIRecommendations(application, riskScore, riskLevel);
    
    // Generate financial analysis
    const financialAnalysis = this.generateAIFinancialAnalysis(application);
    
    // Generate credit assessment
    const creditAssessment = this.generateAICreditAssessment(application, riskScore);
    
    // Generate business viability score
    const viabilityScore = Math.floor(Math.random() * 30) + (riskScore < 50 ? 70 : 50); // 50-100
    
    // Generate market analysis
    const marketAnalysis = this.generateAIMarketAnalysis(application);
    
    // Generate document analysis summary
    const documentAnalysis = this.generateAIDocumentAnalysisSummary();
    
    // Generate predicted approval probability
    const approvalProbability = Math.max(0, Math.min(100, 100 - riskScore + Math.floor(Math.random() * 20) - 10));
    
    // Generate key insights
    const keyInsights = this.generateAIKeyInsights(application, riskScore, riskLevel);
    
    // Determine if manual review is recommended
    const requiresManualReview = riskScore > 70 || confidence < 80 || Math.random() > 0.7;
    
    // Generate flags/alerts
    const flags = this.generateAIFlags(application, riskScore, riskLevel);
    
    // Generate comparison to similar applications
    const benchmarkComparison = this.generateAIBenchmarkComparison(application, riskScore);
    
    // Generate next recommended actions
    const nextActions = this.generateAINextActions(riskLevel, requiresManualReview);
    
    // Generate AI model information
    const modelInfo = {
      modelName: 'CivicFlow AI Risk Analyzer',
      modelVersion: '2024.1.5',
      trainingDataDate: '2024-01-01',
      algorithmsUsed: [
        'Gradient Boosting',
        'Neural Network',
        'Random Forest',
        'Logistic Regression'
      ],
      featuresAnalyzed: Math.floor(Math.random() * 30) + 50 // 50-79 features
    };
    
    // Generate metadata
    const metadata = {
      analysisType: 'comprehensive',
      dataSourcesUsed: [
        'Application Data',
        'Financial Documents',
        'Credit Reports',
        'Industry Data',
        'Market Trends'
      ],
      dataQualityScore: Math.floor(Math.random() * 20) + 80, // 80-100
      completenessScore: Math.floor(Math.random() * 20) + 80, // 80-100
      analysisDepth: this.selectRandom(['standard', 'detailed', 'comprehensive']),
      reanalysisRecommended: requiresManualReview || riskScore > 75,
      lastUpdated: analyzedAt
    };
    
    return {
      analysisId,
      applicationId: application.applicationId,
      businessName: application.businessName,
      applicantName: application.applicantName,
      loanAmount: application.loanAmount,
      location: application.location,
      industry: application.industry,
      riskScore,
      riskLevel,
      confidence,
      analyzedAt,
      processingTimeMs,
      riskFactors,
      positiveIndicators,
      recommendations,
      financialAnalysis,
      creditAssessment,
      viabilityScore,
      marketAnalysis,
      documentAnalysis,
      approvalProbability,
      keyInsights,
      requiresManualReview,
      flags,
      benchmarkComparison,
      nextActions,
      modelInfo,
      metadata
    };
  }
  
  /**
   * Generate AI risk factors
   * @param {Object} application - Application data
   * @param {number} riskScore - Overall risk score
   * @returns {Array} Array of risk factors
   */
  generateAIRiskFactors(application, riskScore) {
    const allRiskFactors = [
      { factor: 'Limited credit history', impact: -15, severity: 'medium' },
      { factor: 'High debt-to-income ratio', impact: -20, severity: 'high' },
      { factor: 'Industry volatility', impact: -12, severity: 'medium' },
      { factor: 'Limited business experience', impact: -10, severity: 'low' },
      { factor: 'Insufficient collateral', impact: -18, severity: 'high' },
      { factor: 'Inconsistent cash flow', impact: -14, severity: 'medium' },
      { factor: 'Market saturation', impact: -8, severity: 'low' },
      { factor: 'Seasonal revenue patterns', impact: -6, severity: 'low' },
      { factor: 'High operating expenses', impact: -11, severity: 'medium' },
      { factor: 'Limited financial reserves', impact: -13, severity: 'medium' },
      { factor: 'Regulatory compliance concerns', impact: -9, severity: 'low' },
      { factor: 'Geographic market risks', impact: -7, severity: 'low' }
    ];
    
    // Select 2-5 risk factors based on risk score
    const factorCount = riskScore > 70 ? Math.floor(Math.random() * 2) + 4 : // 4-5 factors
                        riskScore > 50 ? Math.floor(Math.random() * 2) + 3 : // 3-4 factors
                        Math.floor(Math.random() * 2) + 2; // 2-3 factors
    
    const selectedFactors = [];
    const availableFactors = [...allRiskFactors];
    
    for (let i = 0; i < factorCount && availableFactors.length > 0; i++) {
      const index = Math.floor(Math.random() * availableFactors.length);
      selectedFactors.push(availableFactors.splice(index, 1)[0]);
    }
    
    return selectedFactors;
  }
  
  /**
   * Generate AI positive indicators
   * @param {Object} application - Application data
   * @param {number} riskScore - Overall risk score
   * @returns {Array} Array of positive indicators
   */
  generateAIPositiveIndicators(application, riskScore) {
    const allPositiveIndicators = [
      { indicator: 'Strong credit history', impact: 15, strength: 'high' },
      { indicator: 'Consistent revenue growth', impact: 18, strength: 'high' },
      { indicator: 'Experienced management team', impact: 12, strength: 'medium' },
      { indicator: 'Healthy cash reserves', impact: 14, strength: 'high' },
      { indicator: 'Low debt levels', impact: 16, strength: 'high' },
      { indicator: 'Diversified customer base', impact: 10, strength: 'medium' },
      { indicator: 'Strong industry position', impact: 13, strength: 'medium' },
      { indicator: 'Positive market trends', impact: 9, strength: 'medium' },
      { indicator: 'Solid business plan', impact: 11, strength: 'medium' },
      { indicator: 'Adequate collateral', impact: 15, strength: 'high' },
      { indicator: 'Profitable operations', impact: 17, strength: 'high' },
      { indicator: 'Low customer concentration', impact: 8, strength: 'low' }
    ];
    
    // Select 3-6 positive indicators based on risk score (lower risk = more positives)
    const indicatorCount = riskScore < 40 ? Math.floor(Math.random() * 2) + 5 : // 5-6 indicators
                           riskScore < 60 ? Math.floor(Math.random() * 2) + 4 : // 4-5 indicators
                           Math.floor(Math.random() * 2) + 3; // 3-4 indicators
    
    const selectedIndicators = [];
    const availableIndicators = [...allPositiveIndicators];
    
    for (let i = 0; i < indicatorCount && availableIndicators.length > 0; i++) {
      const index = Math.floor(Math.random() * availableIndicators.length);
      selectedIndicators.push(availableIndicators.splice(index, 1)[0]);
    }
    
    return selectedIndicators;
  }
  
  /**
   * Generate AI recommendations
   * @param {Object} application - Application data
   * @param {number} riskScore - Overall risk score
   * @param {string} riskLevel - Risk level classification
   * @returns {Array} Array of recommendations
   */
  generateAIRecommendations(application, riskScore, riskLevel) {
    const recommendationsByRisk = {
      'low': [
        { action: 'Approve', priority: 'high', rationale: 'Application meets all criteria with low risk profile' },
        { action: 'Standard Terms', priority: 'medium', rationale: 'Recommend standard interest rate and repayment terms' },
        { action: 'Fast Track', priority: 'low', rationale: 'Consider expedited approval process' }
      ],
      'medium': [
        { action: 'Approve with Conditions', priority: 'high', rationale: 'Application acceptable with additional safeguards' },
        { action: 'Request Additional Documentation', priority: 'medium', rationale: 'Verify financial projections and cash flow' },
        { action: 'Standard Review Process', priority: 'medium', rationale: 'Follow normal approval timeline' }
      ],
      'high': [
        { action: 'Manual Review Required', priority: 'high', rationale: 'Elevated risk factors require human assessment' },
        { action: 'Request Additional Collateral', priority: 'high', rationale: 'Mitigate risk with enhanced security' },
        { action: 'Consider Reduced Loan Amount', priority: 'medium', rationale: `Recommend ${this.formatCurrency(Math.floor(application.loanAmount * 0.7))} to align with risk profile` }
      ],
      'very_high': [
        { action: 'Escalate to Senior Review', priority: 'high', rationale: 'Multiple risk factors require senior expertise' },
        { action: 'Request Comprehensive Documentation', priority: 'high', rationale: 'Need detailed financial analysis and business plan' },
        { action: 'Consider Alternative Programs', priority: 'medium', rationale: 'May be better suited for different loan program' }
      ]
    };
    
    return recommendationsByRisk[riskLevel] || recommendationsByRisk['medium'];
  }
  
  /**
   * Generate AI financial analysis
   * @param {Object} application - Application data
   * @returns {Object} Financial analysis results
   */
  generateAIFinancialAnalysis(application) {
    return {
      debtToIncomeRatio: (Math.random() * 0.5 + 0.2).toFixed(2), // 0.20-0.70
      debtServiceCoverageRatio: (Math.random() * 1.5 + 1.0).toFixed(2), // 1.0-2.5
      currentRatio: (Math.random() * 1.5 + 0.8).toFixed(2), // 0.8-2.3
      profitMargin: (Math.random() * 20 + 5).toFixed(1) + '%', // 5-25%
      revenueGrowth: (Math.random() * 30 - 5).toFixed(1) + '%', // -5% to 25%
      cashFlowScore: Math.floor(Math.random() * 30) + 60, // 60-90
      liquidityScore: Math.floor(Math.random() * 30) + 60, // 60-90
      solvencyScore: Math.floor(Math.random() * 30) + 60, // 60-90
      overallFinancialHealth: Math.floor(Math.random() * 30) + 60 // 60-90
    };
  }
  
  /**
   * Generate AI credit assessment
   * @param {Object} application - Application data
   * @param {number} riskScore - Overall risk score
   * @returns {Object} Credit assessment results
   */
  generateAICreditAssessment(application, riskScore) {
    // Credit score inversely related to risk score
    const creditScore = Math.floor(850 - (riskScore * 3) + Math.random() * 100);
    
    return {
      estimatedCreditScore: Math.max(300, Math.min(850, creditScore)),
      creditRating: creditScore > 750 ? 'Excellent' : 
                    creditScore > 700 ? 'Good' : 
                    creditScore > 650 ? 'Fair' : 'Poor',
      paymentHistory: Math.floor(Math.random() * 30) + (riskScore < 50 ? 70 : 50), // 50-100
      creditUtilization: (Math.random() * 60 + 20).toFixed(1) + '%', // 20-80%
      creditAge: `${Math.floor(Math.random() * 15) + 3} years`, // 3-17 years
      recentInquiries: Math.floor(Math.random() * 5), // 0-4
      delinquencies: Math.floor(Math.random() * (riskScore > 60 ? 3 : 1)), // 0-2
      publicRecords: Math.random() > 0.9 ? 1 : 0 // 10% have public records
    };
  }
  
  /**
   * Generate AI market analysis
   * @param {Object} application - Application data
   * @returns {Object} Market analysis results
   */
  generateAIMarketAnalysis(application) {
    return {
      industryGrowthRate: (Math.random() * 15 - 2).toFixed(1) + '%', // -2% to 13%
      marketSaturation: this.selectRandom(['Low', 'Medium', 'High']),
      competitivePosition: this.selectRandom(['Strong', 'Moderate', 'Weak']),
      marketTrends: this.selectRandom(['Positive', 'Stable', 'Declining']),
      geographicRisk: this.selectRandom(['Low', 'Medium', 'High']),
      seasonalityImpact: this.selectRandom(['Low', 'Medium', 'High']),
      industryOutlook: this.selectRandom(['Favorable', 'Neutral', 'Challenging']),
      marketOpportunityScore: Math.floor(Math.random() * 40) + 50 // 50-90
    };
  }
  
  /**
   * Generate AI document analysis summary
   * @returns {Object} Document analysis summary
   */
  generateAIDocumentAnalysisSummary() {
    const documentCount = Math.floor(Math.random() * 8) + 5; // 5-12 documents
    const verifiedCount = Math.floor(documentCount * (0.7 + Math.random() * 0.3)); // 70-100% verified
    
    return {
      totalDocuments: documentCount,
      documentsVerified: verifiedCount,
      verificationRate: Math.floor((verifiedCount / documentCount) * 100) + '%',
      averageQualityScore: Math.floor(Math.random() * 20) + 75, // 75-95
      issuesDetected: Math.floor(Math.random() * 3), // 0-2 issues
      missingDocuments: Math.floor(Math.random() * 2), // 0-1 missing
      documentCompleteness: Math.floor(Math.random() * 20) + 80 + '%' // 80-100%
    };
  }
  
  /**
   * Generate AI key insights
   * @param {Object} application - Application data
   * @param {number} riskScore - Overall risk score
   * @param {string} riskLevel - Risk level classification
   * @returns {Array} Array of key insights
   */
  generateAIKeyInsights(application, riskScore, riskLevel) {
    const insightsByRisk = {
      'low': [
        `${application.businessName} demonstrates strong financial health with consistent revenue growth`,
        `Credit profile is excellent with no significant risk factors identified`,
        `Business operates in a favorable market with positive growth trends`,
        `Management team has proven track record in ${application.industry} industry`
      ],
      'medium': [
        `${application.businessName} shows acceptable financial performance with some areas for improvement`,
        `Credit history is satisfactory but requires monitoring`,
        `Industry conditions are stable with moderate competition`,
        `Cash flow patterns indicate seasonal variations that should be considered`
      ],
      'high': [
        `${application.businessName} exhibits elevated risk factors requiring careful evaluation`,
        `Financial metrics show concerns about debt service capacity`,
        `Industry faces challenges that may impact business performance`,
        `Additional documentation needed to verify business viability`
      ],
      'very_high': [
        `${application.businessName} presents significant risk factors across multiple dimensions`,
        `Financial position raises concerns about repayment ability`,
        `Market conditions and competitive pressures create substantial uncertainty`,
        `Comprehensive manual review strongly recommended before proceeding`
      ]
    };
    
    const insights = insightsByRisk[riskLevel] || insightsByRisk['medium'];
    
    // Select 2-3 insights
    const selectedInsights = [];
    const count = Math.floor(Math.random() * 2) + 2; // 2-3 insights
    
    for (let i = 0; i < count && i < insights.length; i++) {
      selectedInsights.push(insights[i]);
    }
    
    return selectedInsights;
  }
  
  /**
   * Generate AI flags/alerts
   * @param {Object} application - Application data
   * @param {number} riskScore - Overall risk score
   * @param {string} riskLevel - Risk level classification
   * @returns {Array} Array of flags
   */
  generateAIFlags(application, riskScore, riskLevel) {
    const flags = [];
    
    if (riskScore > 75) {
      flags.push({
        type: 'high_risk',
        severity: 'high',
        message: 'High risk score requires senior review',
        action: 'Escalate to senior underwriter'
      });
    }
    
    if (application.loanAmount > 250000) {
      flags.push({
        type: 'large_amount',
        severity: 'medium',
        message: 'Loan amount exceeds standard threshold',
        action: 'Committee approval required'
      });
    }
    
    if (Math.random() > 0.7) {
      flags.push({
        type: 'documentation',
        severity: 'low',
        message: 'Some documents require additional verification',
        action: 'Request updated documentation'
      });
    }
    
    if (riskLevel === 'high' || riskLevel === 'very_high') {
      flags.push({
        type: 'manual_review',
        severity: 'high',
        message: 'AI confidence below threshold for automated decision',
        action: 'Manual review required'
      });
    }
    
    return flags;
  }
  
  /**
   * Generate AI benchmark comparison
   * @param {Object} application - Application data
   * @param {number} riskScore - Overall risk score
   * @returns {Object} Benchmark comparison
   */
  generateAIBenchmarkComparison(application, riskScore) {
    return {
      similarApplications: Math.floor(Math.random() * 500) + 100, // 100-599 similar apps
      averageRiskScore: Math.floor(riskScore + Math.random() * 20 - 10), // ±10 from current
      approvalRate: (Math.random() * 0.3 + 0.5).toFixed(2), // 50-80%
      averageLoanAmount: this.formatCurrency(Math.floor(application.loanAmount * (0.8 + Math.random() * 0.4))),
      industryComparison: riskScore < 50 ? 'Above Average' : riskScore < 70 ? 'Average' : 'Below Average',
      percentileRanking: Math.floor(Math.random() * 100) + 1, // 1-100
      performanceTrend: this.selectRandom(['Improving', 'Stable', 'Declining'])
    };
  }
  
  /**
   * Generate AI next actions
   * @param {string} riskLevel - Risk level classification
   * @param {boolean} requiresManualReview - Whether manual review is required
   * @returns {Array} Array of next actions
   */
  generateAINextActions(riskLevel, requiresManualReview) {
    const actions = [];
    
    if (requiresManualReview) {
      actions.push('Assign to senior underwriter for manual review');
    }
    
    if (riskLevel === 'low') {
      actions.push('Proceed with standard approval process');
      actions.push('Prepare loan documents');
      actions.push('Schedule funding timeline');
    } else if (riskLevel === 'medium') {
      actions.push('Request additional financial documentation');
      actions.push('Verify credit references');
      actions.push('Conduct detailed financial analysis');
    } else {
      actions.push('Escalate to risk committee');
      actions.push('Request comprehensive business plan review');
      actions.push('Consider alternative loan structures');
    }
    
    return actions;
  }
  
  /**
   * Generate a human-readable description of the AI analysis
   * @param {Object} data - AI analysis data
   * @returns {string} Description
   */
  generateAIAnalysisCompleteDescription(data) {
    return `AI analysis complete for ${data.businessName}. ` +
           `Risk Score: ${data.riskScore}/100 (${data.riskLevel}), ` +
           `Confidence: ${data.confidence}%, ` +
           `Approval Probability: ${data.approvalProbability}%. ` +
           `${data.requiresManualReview ? 'Manual review recommended.' : 'Analysis complete.'}`;
  }
}

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.EventGenerators = EventGenerators;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EventGenerators;
}
