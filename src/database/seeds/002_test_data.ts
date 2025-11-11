import database from '../../config/database';
import logger from '../../utils/logger';

interface TestApplicant {
  business_name: string;
  ein: string;
  email: string;
  phone: string;
  address_line1: string;
  city: string;
  state: string;
  zip_code: string;
  owner_first_name: string;
  owner_last_name: string;
  owner_ssn: string;
}

interface TestApplication {
  applicant_id: string;
  program_type: string;
  requested_amount: number;
  status: string;
}

const testApplicants: TestApplicant[] = [
  {
    business_name: 'Acme Coffee Shop',
    ein: '12-3456789',
    email: 'owner@acmecoffee.example.com',
    phone: '+1-555-0101',
    address_line1: '123 Main Street',
    city: 'Springfield',
    state: 'IL',
    zip_code: '62701',
    owner_first_name: 'John',
    owner_last_name: 'Doe',
    owner_ssn: 'ENCRYPTED_SSN_123' // In production, this would be properly encrypted
  },
  {
    business_name: 'Tech Startup Inc',
    ein: '98-7654321',
    email: 'founder@techstartup.example.com',
    phone: '+1-555-0102',
    address_line1: '456 Innovation Drive',
    city: 'San Francisco',
    state: 'CA',
    zip_code: '94102',
    owner_first_name: 'Jane',
    owner_last_name: 'Smith',
    owner_ssn: 'ENCRYPTED_SSN_456'
  },
  {
    business_name: 'Local Bakery LLC',
    ein: '45-6789012',
    email: 'baker@localbakery.example.com',
    phone: '+1-555-0103',
    address_line1: '789 Oak Avenue',
    city: 'Portland',
    state: 'OR',
    zip_code: '97201',
    owner_first_name: 'Maria',
    owner_last_name: 'Garcia',
    owner_ssn: 'ENCRYPTED_SSN_789'
  }
];

export async function seedTestData(): Promise<void> {
  try {
    logger.info('Seeding test data...');

    // Check if test data already exists
    const existingCount = await database.query('SELECT COUNT(*) FROM applicants');
    if (parseInt(existingCount.rows[0].count) > 0) {
      logger.info('Test data already exists, skipping seed');
      return;
    }

    const applicantIds: string[] = [];

    // Insert test applicants
    for (const applicant of testApplicants) {
      const result = await database.query(
        `INSERT INTO applicants 
         (business_name, ein, email, phone, address_line1, city, state, zip_code, 
          owner_first_name, owner_last_name, owner_ssn) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id`,
        [
          applicant.business_name,
          applicant.ein,
          applicant.email,
          applicant.phone,
          applicant.address_line1,
          applicant.city,
          applicant.state,
          applicant.zip_code,
          applicant.owner_first_name,
          applicant.owner_last_name,
          applicant.owner_ssn
        ]
      );

      const applicantId = result.rows[0].id;
      applicantIds.push(applicantId);
      logger.info(`Seeded test applicant: ${applicant.business_name}`);
    }

    // Insert test applications
    const testApplications: TestApplication[] = [
      {
        applicant_id: applicantIds[0],
        program_type: 'MICRO_BUSINESS_GRANT',
        requested_amount: 25000,
        status: 'DRAFT'
      },
      {
        applicant_id: applicantIds[1],
        program_type: 'STARTUP_GRANT',
        requested_amount: 15000,
        status: 'SUBMITTED'
      },
      {
        applicant_id: applicantIds[2],
        program_type: 'EMERGENCY_LOAN',
        requested_amount: 50000,
        status: 'UNDER_REVIEW'
      }
    ];

    for (const application of testApplications) {
      await database.query(
        `INSERT INTO applications 
         (applicant_id, program_type, requested_amount, status) 
         VALUES ($1, $2, $3, $4)`,
        [
          application.applicant_id,
          application.program_type,
          application.requested_amount,
          application.status
        ]
      );

      logger.info(`Seeded test application: ${application.program_type}`);
    }

    // Insert test audit log entries
    for (const applicantId of applicantIds) {
      await database.query(
        `INSERT INTO audit_logs 
         (action_type, entity_type, entity_id, performed_by, details) 
         VALUES ($1, $2, $3, $4, $5)`,
        [
          'APPLICANT_CREATED',
          'APPLICANT',
          applicantId,
          'SYSTEM',
          JSON.stringify({ source: 'test_seed', timestamp: new Date() })
        ]
      );
    }

    logger.info('Test data seeding completed');
  } catch (error) {
    logger.error('Failed to seed test data', { error });
    throw error;
  }
}
