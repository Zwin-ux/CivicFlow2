import database from '../../config/database';
import logger from '../../utils/logger';

interface ProgramRuleData {
  program_type: string;
  program_name: string;
  version: number;
  rules: any;
  created_by: string;
}

const programRules: ProgramRuleData[] = [
  {
    program_type: 'MICRO_BUSINESS_GRANT',
    program_name: 'Small Business Recovery Grant',
    version: 1,
    created_by: 'SYSTEM',
    rules: {
      minCreditScore: 600,
      maxLoanAmount: 50000,
      minBusinessAge: 1, // years
      minAnnualRevenue: 25000,
      requiredDocuments: ['W9', 'EIN_VERIFICATION', 'BANK_STATEMENT'],
      eligibilityCriteria: [
        {
          field: 'businessAge',
          operator: '>=',
          value: 1,
          weight: 20,
          description: 'Business must be at least 1 year old'
        },
        {
          field: 'annualRevenue',
          operator: '>=',
          value: 25000,
          weight: 30,
          description: 'Minimum annual revenue of $25,000'
        },
        {
          field: 'employeeCount',
          operator: '<=',
          value: 10,
          weight: 15,
          description: 'Maximum 10 employees (micro-business)'
        },
        {
          field: 'creditScore',
          operator: '>=',
          value: 600,
          weight: 25,
          description: 'Minimum credit score of 600'
        },
        {
          field: 'hasValidEIN',
          operator: '==',
          value: true,
          weight: 10,
          description: 'Valid EIN verification required'
        }
      ],
      passingScore: 70,
      maxApplicationsPerYear: 1,
      fundingRange: {
        min: 5000,
        max: 50000
      }
    }
  },
  {
    program_type: 'EMERGENCY_LOAN',
    program_name: 'Emergency Business Loan Program',
    version: 1,
    created_by: 'SYSTEM',
    rules: {
      minCreditScore: 550,
      maxLoanAmount: 100000,
      minBusinessAge: 0.5, // 6 months
      minAnnualRevenue: 10000,
      requiredDocuments: ['W9', 'EIN_VERIFICATION', 'BANK_STATEMENT', 'TAX_RETURN'],
      eligibilityCriteria: [
        {
          field: 'businessAge',
          operator: '>=',
          value: 0.5,
          weight: 15,
          description: 'Business must be at least 6 months old'
        },
        {
          field: 'annualRevenue',
          operator: '>=',
          value: 10000,
          weight: 25,
          description: 'Minimum annual revenue of $10,000'
        },
        {
          field: 'creditScore',
          operator: '>=',
          value: 550,
          weight: 30,
          description: 'Minimum credit score of 550'
        },
        {
          field: 'hasValidEIN',
          operator: '==',
          value: true,
          weight: 15,
          description: 'Valid EIN verification required'
        },
        {
          field: 'hasEmergencyNeed',
          operator: '==',
          value: true,
          weight: 15,
          description: 'Documented emergency business need'
        }
      ],
      passingScore: 65,
      maxApplicationsPerYear: 2,
      fundingRange: {
        min: 10000,
        max: 100000
      },
      interestRate: 3.5,
      repaymentTermMonths: 60
    }
  },
  {
    program_type: 'STARTUP_GRANT',
    program_name: 'New Business Startup Grant',
    version: 1,
    created_by: 'SYSTEM',
    rules: {
      minCreditScore: 650,
      maxLoanAmount: 25000,
      minBusinessAge: 0, // new businesses
      maxBusinessAge: 2, // must be less than 2 years old
      requiredDocuments: ['W9', 'EIN_VERIFICATION', 'BUSINESS_LICENSE'],
      eligibilityCriteria: [
        {
          field: 'businessAge',
          operator: '<=',
          value: 2,
          weight: 20,
          description: 'Business must be less than 2 years old'
        },
        {
          field: 'hasBusinessPlan',
          operator: '==',
          value: true,
          weight: 30,
          description: 'Complete business plan required'
        },
        {
          field: 'creditScore',
          operator: '>=',
          value: 650,
          weight: 25,
          description: 'Minimum credit score of 650'
        },
        {
          field: 'hasValidEIN',
          operator: '==',
          value: true,
          weight: 15,
          description: 'Valid EIN verification required'
        },
        {
          field: 'isMinorityOwned',
          operator: '==',
          value: true,
          weight: 10,
          description: 'Priority for minority-owned businesses'
        }
      ],
      passingScore: 75,
      maxApplicationsPerYear: 1,
      fundingRange: {
        min: 5000,
        max: 25000
      }
    }
  }
];

export async function seedProgramRules(): Promise<void> {
  try {
    logger.info('Seeding program rules...');

    for (const rule of programRules) {
      // Check if rule already exists
      const existing = await database.query(
        'SELECT id FROM program_rules WHERE program_type = $1 AND version = $2',
        [rule.program_type, rule.version]
      );

      if (existing.rows.length > 0) {
        logger.info(`Program rule already exists: ${rule.program_type} v${rule.version}`);
        continue;
      }

      // Insert program rule
      await database.query(
        `INSERT INTO program_rules 
         (program_type, program_name, version, rules, created_by) 
         VALUES ($1, $2, $3, $4, $5)`,
        [
          rule.program_type,
          rule.program_name,
          rule.version,
          JSON.stringify(rule.rules),
          rule.created_by
        ]
      );

      logger.info(`Seeded program rule: ${rule.program_type} v${rule.version}`);
    }

    logger.info('Program rules seeding completed');
  } catch (error) {
    logger.error('Failed to seed program rules', { error });
    throw error;
  }
}
