/**
 * Program Rule Data Models
 * Defines TypeScript interfaces for program rules and eligibility criteria
 */

/**
 * Eligibility criterion interface
 */
export interface EligibilityCriterion {
  field: string;
  operator: '>=' | '<=' | '==' | '!=' | '>' | '<';
  value: any;
  weight: number;
  description: string;
}

/**
 * Program rules configuration
 */
export interface ProgramRulesConfig {
  minCreditScore?: number;
  maxLoanAmount?: number;
  minBusinessAge?: number;
  maxBusinessAge?: number;
  minAnnualRevenue?: number;
  requiredDocuments: string[];
  eligibilityCriteria: EligibilityCriterion[];
  passingScore: number;
  maxApplicationsPerYear?: number;
  fundingRange?: {
    min: number;
    max: number;
  };
  interestRate?: number;
  repaymentTermMonths?: number;
}

/**
 * Program rule interface
 */
export interface ProgramRule {
  id: string;
  programType: string;
  programName: string;
  version: number;
  rules: ProgramRulesConfig;
  activeFrom: Date;
  activeTo?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Eligibility result interface
 */
export interface EligibilityResult {
  score: number;
  passed: boolean;
  reasons: string[];
  programRulesApplied: string[];
  confidenceScore: number;
  criteriaResults: CriterionResult[];
}

/**
 * Individual criterion evaluation result
 */
export interface CriterionResult {
  field: string;
  description: string;
  passed: boolean;
  actualValue: any;
  expectedValue: any;
  operator: string;
  weight: number;
  pointsEarned: number;
}
