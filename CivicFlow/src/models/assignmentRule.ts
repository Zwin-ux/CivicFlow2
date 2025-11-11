/**
 * Assignment Rule Data Models
 * Defines TypeScript interfaces for auto-assignment rules
 */

/**
 * Assignment condition interface
 * Defines criteria for matching applications to rules
 */
export interface AssignmentCondition {
  programTypes?: string[];
  amountRange?: {
    min: number;
    max: number;
  };
  riskScoreRange?: {
    min: number;
    max: number;
  };
  requiresSpecialization?: string[];
}

/**
 * Assignment target interface
 * Defines how applications should be assigned
 */
export interface AssignmentTarget {
  type: 'USER' | 'ROUND_ROBIN' | 'LEAST_LOADED';
  userId?: string;
  userPool?: string[];
}

/**
 * Assignment rule interface
 */
export interface AssignmentRule {
  id: string;
  name: string;
  priority: number;
  condition: AssignmentCondition;
  assignTo: AssignmentTarget;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create assignment rule request
 */
export interface CreateAssignmentRuleRequest {
  name: string;
  priority: number;
  condition: AssignmentCondition;
  assignTo: AssignmentTarget;
  isActive?: boolean;
}

/**
 * Update assignment rule request
 */
export interface UpdateAssignmentRuleRequest {
  name?: string;
  priority?: number;
  condition?: AssignmentCondition;
  assignTo?: AssignmentTarget;
  isActive?: boolean;
}
