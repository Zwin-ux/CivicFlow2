import database from '../../config/database';
import bcrypt from 'bcryptjs';
import logger from '../../utils/logger';

/**
 * Enhanced demo data seed for MVP deployment
 * Generates 20+ sample applications with varied statuses, documents, AI analysis, and anomalies
 */

const DEMO_PASSWORD = 'Demo123!';
const SALT_ROUNDS = 10;

// Demo user accounts
const DEMO_USERS = [
  {
    email: 'demo-applicant@demo.local',
    firstName: 'Demo',
    lastName: 'Applicant',
    role: 'Applicant',
  },
  {
    email: 'demo-staff@demo.local',
    firstName: 'Demo',
    lastName: 'Staff',
    role: 'Reviewer',
  },
  {
    email: 'demo-admin@demo.local',
    firstName: 'Demo',
    lastName: 'Admin',
    role: 'Administrator',
  },
];

// Sample business names
const BUSINESS_NAMES = [
  'Tech Innovations LLC',
  'Green Valley Bakery',
  'Metro Coffee House',
  'Riverside Consulting Group',
  'Urban Fitness Studio',
  'Coastal Seafood Market',
  'Mountain View Landscaping',
  'Downtown Auto Repair',
  'Sunrise Daycare Center',
  'Elite Marketing Solutions',
  'Fresh Start Catering',
  'Digital Dreams Agency',
  'Harmony Yoga Studio',
  'Prime Construction Co',
  'Artisan Craft Brewery',
  'Smart Home Services',
  'Golden Gate Cleaners',
  'Velocity Sports Training',
  'Maple Street Pharmacy',
  'Innovation Labs Inc',
  'Heritage Furniture Makers',
  'Bright Future Tutoring',
  'Pacific Web Design',
  'Summit Financial Advisors',
  'Evergreen Pet Grooming',
];

// Program types
const PROGRAM_TYPES = [
  'MICRO_GRANT',
  'SMALL_BUSINESS_LOAN',
  'STARTUP_GRANT',
  'EXPANSION_LOAN',
  'EMERGENCY_RELIEF',
];

// Application statuses with distribution
const STATUS_DISTRIBUTION = [
  { status: 'DRAFT', weight: 2 },
  { status: 'SUBMITTED', weight: 5 },
  { status: 'UNDER_REVIEW', weight: 8 },
  { status: 'PENDING_DOCUMENTS', weight: 3 },
  { status: 'APPROVED', weight: 4 },
  { status: 'REJECTED', weight: 2 },
  { status: 'DEFERRED', weight: 1 },
];

// Document types
const DOCUMENT_TYPES = [
  'W9',
  'EIN_VERIFICATION',
  'BANK_STATEMENT',
  'TAX_RETURN',
  'BUSINESS_LICENSE',
  'OTHER',
];

// Anomaly types
const ANOMALY_TYPES = [
  {
    type: 'IMAGE_MANIPULATION',
    severities: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    descriptions: {
      LOW: 'Minor compression artifacts detected in document image',
      MEDIUM: 'Possible image editing detected - requires manual review',
      HIGH: 'Significant image manipulation indicators found',
      CRITICAL: 'Document appears to be digitally altered - immediate review required',
    },
  },
  {
    type: 'INCONSISTENT_DATA',
    severities: ['LOW', 'MEDIUM', 'HIGH'],
    descriptions: {
      LOW: 'Minor discrepancy in dates across documents',
      MEDIUM: 'Inconsistent business name formatting detected',
      HIGH: 'Significant data mismatch between documents',
    },
  },
  {
    type: 'MISSING_INFORMATION',
    severities: ['LOW', 'MEDIUM', 'HIGH'],
    descriptions: {
      LOW: 'Optional field not provided',
      MEDIUM: 'Some supporting documentation missing',
      HIGH: 'Required information not found in document',
    },
  },
  {
    type: 'SUSPICIOUS_PATTERN',
    severities: ['MEDIUM', 'HIGH', 'CRITICAL'],
    descriptions: {
      MEDIUM: 'Transaction pattern requires additional context',
      HIGH: 'Suspicious financial activity detected',
      CRITICAL: 'High-risk pattern detected - escalate for fraud review',
    },
  },
];

function generateEIN(): string {
  const part1 = Math.floor(Math.random() * 90) + 10;
  const part2 = Math.floor(Math.random() * 9000000) + 1000000;
  return `${part1}-${part2}`;
}

function generatePhone(): string {
  const area = Math.floor(Math.random() * 900) + 100;
  const prefix = Math.floor(Math.random() * 900) + 100;
  const line = Math.floor(Math.random() * 9000) + 1000;
  return `+1-${area}-${prefix}-${line}`;
}

function generateAddress() {
  const streetNumber = Math.floor(Math.random() * 9999) + 1;
  const streets = ['Main St', 'Oak Ave', 'Maple Dr', 'Park Blvd', 'Washington St', 'Lake Rd', 'Hill St', 'River Ave'];
  const cities = ['Springfield', 'Riverside', 'Fairview', 'Georgetown', 'Clinton', 'Madison', 'Salem', 'Franklin'];
  const states = ['CA', 'NY', 'TX', 'FL', 'IL', 'PA', 'OH', 'GA', 'NC', 'MI'];
  const zipCode = Math.floor(Math.random() * 90000) + 10000;

  return {
    addressLine1: `${streetNumber} ${streets[Math.floor(Math.random() * streets.length)]}`,
    city: cities[Math.floor(Math.random() * cities.length)],
    state: states[Math.floor(Math.random() * states.length)],
    zipCode: zipCode.toString(),
  };
}

function generateName() {
  const firstNames = ['John', 'Sarah', 'Michael', 'Emily', 'David', 'Jessica', 'Robert', 'Jennifer', 'William', 'Lisa', 'James', 'Mary', 'Christopher', 'Patricia', 'Daniel'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Wilson', 'Anderson', 'Taylor', 'Thomas', 'Moore'];

  return {
    firstName: firstNames[Math.floor(Math.random() * firstNames.length)],
    lastName: lastNames[Math.floor(Math.random() * lastNames.length)],
  };
}

function selectWeightedStatus(): string {
  const totalWeight = STATUS_DISTRIBUTION.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;

  for (const item of STATUS_DISTRIBUTION) {
    random -= item.weight;
    if (random <= 0) {
      return item.status;
    }
  }

  return 'SUBMITTED';
}

function generateExtractedData(documentType: string): any {
  switch (documentType) {
    case 'W9':
      return {
        businessName: BUSINESS_NAMES[Math.floor(Math.random() * BUSINESS_NAMES.length)],
        ein: generateEIN(),
        businessType: ['LLC', 'Corporation', 'Sole Proprietor', 'Partnership'][Math.floor(Math.random() * 4)],
      };

    case 'EIN_VERIFICATION':
      return {
        ein: generateEIN(),
        verificationDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
        status: 'VERIFIED',
      };

    case 'BANK_STATEMENT':
      return {
        accountNumber: `****${Math.floor(Math.random() * 10000)}`,
        statementDate: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
        openingBalance: Math.floor(Math.random() * 100000) + 10000,
        closingBalance: Math.floor(Math.random() * 100000) + 10000,
        transactions: Math.floor(Math.random() * 50) + 10,
      };

    case 'TAX_RETURN':
      return {
        taxYear: new Date().getFullYear() - 1,
        grossIncome: Math.floor(Math.random() * 500000) + 50000,
        netIncome: Math.floor(Math.random() * 200000) + 20000,
        taxPaid: Math.floor(Math.random() * 50000) + 5000,
      };

    case 'BUSINESS_LICENSE':
      return {
        licenseNumber: `BL-${Math.floor(Math.random() * 1000000)}`,
        issueDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
        expiryDate: new Date(Date.now() + Math.random() * 365 * 24 * 60 * 60 * 1000),
        businessType: 'LLC',
      };

    default:
      return {
        documentType,
        processedAt: new Date(),
      };
  }
}

export async function seed(): Promise<void> {
  try {
    logger.info('Starting enhanced demo data seed...');

    // Check if demo data already exists
    const existingDemoUsers = await database.query(
      "SELECT COUNT(*) FROM users WHERE email LIKE '%@demo.local'"
    );

    if (parseInt(existingDemoUsers.rows[0].count) > 0) {
      logger.info('Demo data already exists, skipping seed');
      return;
    }

    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, SALT_ROUNDS);

    // 1. Create demo user accounts
    logger.info('Creating demo user accounts...');
    const userIds: Record<string, string> = {};

    for (const user of DEMO_USERS) {
      const result = await database.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, role)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [user.email, passwordHash, user.firstName, user.lastName, user.role]
      );

      userIds[user.role] = result.rows[0].id;
      logger.info(`Created demo user: ${user.email} (${user.role})`);
    }

    // 2. Create 25 demo applicants
    logger.info('Creating demo applicants...');
    const applicantIds: string[] = [];

    for (let i = 0; i < 25; i++) {
      const businessName = BUSINESS_NAMES[i % BUSINESS_NAMES.length];
      const address = generateAddress();
      const owner = generateName();
      const ein = generateEIN();

      const result = await database.query(
        `INSERT INTO applicants 
         (business_name, ein, email, phone, address_line1, city, state, zip_code, 
          owner_first_name, owner_last_name, owner_ssn)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id`,
        [
          businessName,
          ein,
          `contact@${businessName.toLowerCase().replace(/\s+/g, '')}.example.com`,
          generatePhone(),
          address.addressLine1,
          address.city,
          address.state,
          address.zipCode,
          owner.firstName,
          owner.lastName,
          `ENCRYPTED_SSN_${i}`, // Mock encrypted SSN
        ]
      );

      applicantIds.push(result.rows[0].id);
    }

    logger.info(`Created ${applicantIds.length} demo applicants`);

    // 3. Create 25 demo applications with varied statuses
    logger.info('Creating demo applications...');
    const applicationIds: string[] = [];

    for (let i = 0; i < 25; i++) {
      const applicantId = applicantIds[i];
      const programType = PROGRAM_TYPES[Math.floor(Math.random() * PROGRAM_TYPES.length)];
      const status = selectWeightedStatus();
      const requestedAmount = Math.floor(Math.random() * 450000) + 10000;
      const eligibilityScore = Math.floor(Math.random() * 40) + 60; // 60-100

      // Determine if application should have fraud flags (20% chance)
      const hasFraudFlags = Math.random() < 0.2;
      const fraudFlags = hasFraudFlags
        ? [
            {
              type: 'PATTERN_ANOMALY',
              severity: ['LOW', 'MEDIUM', 'HIGH'][Math.floor(Math.random() * 3)],
              description: 'Unusual pattern detected in financial documents',
              evidence: { confidence: 0.75 + Math.random() * 0.2 },
            },
          ]
        : [];

      // Determine missing documents (30% chance)
      const hasMissingDocs = Math.random() < 0.3;
      const missingDocuments = hasMissingDocs
        ? [DOCUMENT_TYPES[Math.floor(Math.random() * DOCUMENT_TYPES.length)]]
        : [];

      // Set timestamps based on status
      const submittedAt = ['SUBMITTED', 'UNDER_REVIEW', 'PENDING_DOCUMENTS', 'APPROVED', 'REJECTED', 'DEFERRED'].includes(status)
        ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
        : null;

      const reviewedAt = ['UNDER_REVIEW', 'PENDING_DOCUMENTS', 'APPROVED', 'REJECTED', 'DEFERRED'].includes(status)
        ? new Date(Date.now() - Math.random() * 20 * 24 * 60 * 60 * 1000)
        : null;

      const decidedAt = ['APPROVED', 'REJECTED', 'DEFERRED'].includes(status)
        ? new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000)
        : null;

      // Assign to staff for certain statuses
      const assignedTo = ['UNDER_REVIEW', 'PENDING_DOCUMENTS'].includes(status) ? userIds['Reviewer'] : null;

      const result = await database.query(
        `INSERT INTO applications 
         (applicant_id, program_type, requested_amount, status, eligibility_score, 
          missing_documents, fraud_flags, assigned_to, submitted_at, reviewed_at, decided_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id`,
        [
          applicantId,
          programType,
          requestedAmount,
          status,
          eligibilityScore,
          JSON.stringify(missingDocuments),
          JSON.stringify(fraudFlags),
          assignedTo,
          submittedAt,
          reviewedAt,
          decidedAt,
        ]
      );

      applicationIds.push(result.rows[0].id);
    }

    logger.info(`Created ${applicationIds.length} demo applications`);

    // 4. Create documents for each application (3-5 documents per application)
    logger.info('Creating demo documents...');
    const documentIds: string[] = [];

    for (const applicationId of applicationIds) {
      const docCount = Math.floor(Math.random() * 3) + 3; // 3-5 documents

      for (let j = 0; j < docCount; j++) {
        const documentType = DOCUMENT_TYPES[j % DOCUMENT_TYPES.length];
        const fileName = `${documentType.toLowerCase()}_${Date.now()}_${j}.pdf`;
        const fileSize = Math.floor(Math.random() * 5000000) + 100000;
        const classificationConfidence = Math.floor(Math.random() * 20) + 80; // 80-100
        const extractedData = generateExtractedData(documentType);
        const requiresManualReview = Math.random() < 0.15; // 15% require manual review

        const result = await database.query(
          `INSERT INTO documents 
           (application_id, file_name, file_size, mime_type, storage_url, document_type, 
            classification_confidence, extracted_data, requires_manual_review, classified_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING id`,
          [
            applicationId,
            fileName,
            fileSize,
            'application/pdf',
            `/demo/storage/${applicationId}/${fileName}`,
            documentType,
            classificationConfidence,
            JSON.stringify(extractedData),
            requiresManualReview,
            new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
          ]
        );

        documentIds.push(result.rows[0].id);
      }
    }

    logger.info(`Created ${documentIds.length} demo documents`);

    // 5. Create AI analysis results for documents
    logger.info('Creating AI analysis results...');

    for (const documentId of documentIds) {
      const qualityScore = Math.floor(Math.random() * 30) + 70; // 70-100
      const confidence = 0.85 + Math.random() * 0.14; // 0.85-0.99
      const processingTime = Math.floor(Math.random() * 5000) + 2000; // 2-7 seconds

      const summary = 'Document has been analyzed and key information extracted successfully. All required fields are present and readable.';
      const recommendations = qualityScore >= 90
        ? ['Document quality is excellent', 'All required information is present']
        : ['Document quality is good', 'Consider providing additional supporting documents'];

      await database.query(
        `INSERT INTO ai_document_analysis 
         (document_id, quality_score, confidence, processing_time_ms, summary, recommendations, model_version)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          documentId,
          qualityScore,
          confidence,
          processingTime,
          summary,
          JSON.stringify(recommendations),
          'gpt-4-turbo-preview',
        ]
      );
    }

    logger.info('Created AI analysis results for all documents');

    // 6. Create anomaly detections (for ~30% of applications)
    logger.info('Creating anomaly detections...');
    let anomalyCount = 0;

    for (const applicationId of applicationIds) {
      if (Math.random() < 0.3) {
        // 30% of applications have anomalies
        const anomalyTypeData = ANOMALY_TYPES[Math.floor(Math.random() * ANOMALY_TYPES.length)];
        const severity = anomalyTypeData.severities[Math.floor(Math.random() * anomalyTypeData.severities.length)];
        const description = anomalyTypeData.descriptions[severity as keyof typeof anomalyTypeData.descriptions];
        const confidence = 0.75 + Math.random() * 0.24; // 0.75-0.99

        // Get a random document from this application
        const docResult = await database.query(
          'SELECT id FROM documents WHERE application_id = $1 LIMIT 1',
          [applicationId]
        );

        if (docResult.rows.length > 0) {
          await database.query(
            `INSERT INTO anomaly_detections 
             (application_id, document_id, anomaly_type, severity, description, confidence, status, model_version)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              applicationId,
              docResult.rows[0].id,
              anomalyTypeData.type,
              severity,
              description,
              confidence,
              'PENDING',
              'anomaly-detector-v1',
            ]
          );

          anomalyCount++;
        }
      }
    }

    logger.info(`Created ${anomalyCount} anomaly detections`);

    // 7. Create audit log entries for key actions
    logger.info('Creating audit log entries...');

    for (const applicationId of applicationIds) {
      // Application created
      await database.query(
        `INSERT INTO audit_logs 
         (action_type, entity_type, entity_id, performed_by, details)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          'APPLICATION_CREATED',
          'APPLICATION',
          applicationId,
          'SYSTEM',
          JSON.stringify({ source: 'demo_seed', timestamp: new Date() }),
        ]
      );

      // Application submitted (for non-draft applications)
      const appStatus = await database.query(
        'SELECT status FROM applications WHERE id = $1',
        [applicationId]
      );

      if (appStatus.rows[0].status !== 'DRAFT') {
        await database.query(
          `INSERT INTO audit_logs 
           (action_type, entity_type, entity_id, performed_by, details)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            'APPLICATION_SUBMITTED',
            'APPLICATION',
            applicationId,
            userIds['Applicant'],
            JSON.stringify({ timestamp: new Date() }),
          ]
        );
      }
    }

    logger.info('Created audit log entries');

    logger.info('Enhanced demo data seed completed successfully!');
    logger.info(`Summary:
      - Demo Users: ${DEMO_USERS.length}
      - Applicants: ${applicantIds.length}
      - Applications: ${applicationIds.length}
      - Documents: ${documentIds.length}
      - Anomalies: ${anomalyCount}
      - Demo Password: ${DEMO_PASSWORD}
    `);
  } catch (error) {
    logger.error('Failed to seed enhanced demo data', { error });
    throw error;
  }
}
