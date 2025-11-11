/**
 * Auto-Assignment Service
 * Implements automatic assignment of applications to loan officers based on rules
 */

import logger from '../utils/logger';
import { Application } from '../models/application';
import {
  AssignmentRule,
  AssignmentCondition,
  AssignmentTarget,
} from '../models/assignmentRule';
import assignmentRuleRepository from '../repositories/assignmentRuleRepository';
import auditLogRepository from '../repositories/auditLogRepository';
import database from '../config/database';
import { QueryResult } from 'pg';
import { EntityType } from '../models/auditLog';
import websocketService from './websocketService';

class AutoAssignmentService {
  /**
   * Assign application to a user based on assignment rules
   * @param application - Application to assign
   * @returns Assigned user ID or null if no assignment made
   */
  async assignApplication(application: Application): Promise<string | null> {
    try {
      // Skip if already assigned
      if (application.assignedTo) {
        logger.info('Application already assigned', {
          applicationId: application.id,
          assignedTo: application.assignedTo,
        });
        return application.assignedTo;
      }

      // Find matching rule
      const matchingRule = await this.findMatchingRule(application);
      
      if (!matchingRule) {
        logger.info('No matching assignment rule, application remains unassigned', {
          applicationId: application.id,
        });
        return null;
      }

      // Execute assignment based on rule
      const assignedUserId = await this.executeAssignment(application, matchingRule.assignTo);
      
      if (!assignedUserId) {
        logger.error('Assignment execution failed', {
          applicationId: application.id,
          ruleId: matchingRule.id,
        });
        return null;
      }

      // Update application with assignment
      await this.updateApplicationAssignment(application.id, assignedUserId);

      // Log assignment to audit log
      await this.logAssignment(application.id, assignedUserId, matchingRule);

      logger.info('Application assigned successfully', {
        applicationId: application.id,
        assignedTo: assignedUserId,
        ruleId: matchingRule.id,
        ruleName: matchingRule.name,
      });

      return assignedUserId;
    } catch (error) {
      logger.error('Failed to assign application', {
        error,
        applicationId: application.id,
      });
      // Don't throw error - assignment failure shouldn't block application processing
      return null;
    }
  }

  /**
   * Update application with assignment information
   * @param applicationId - Application ID
   * @param userId - User ID to assign to
   */
  private async updateApplicationAssignment(
    applicationId: string,
    userId: string
  ): Promise<void> {
    const query = `
      UPDATE applications
      SET 
        assigned_to = $1,
        assigned_at = NOW(),
        updated_at = NOW()
      WHERE id = $2
    `;

    try {
      await database.query(query, [userId, applicationId]);
      logger.debug('Updated application assignment', { applicationId, userId });

      // Emit WebSocket event for assignment
      websocketService.sendToUser(userId, {
        type: 'application.assigned',
        data: {
          applicationId,
          assignedTo: userId,
        },
        timestamp: new Date(),
      });

      // Also broadcast to all users for dashboard updates
      websocketService.broadcast({
        type: 'application.updated',
        data: {
          applicationId,
          assignedTo: userId,
        },
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error('Failed to update application assignment', {
        error,
        applicationId,
        userId,
      });
      throw new Error('Failed to update application assignment');
    }
  }

  /**
   * Log assignment decision to audit log
   * @param applicationId - Application ID
   * @param userId - Assigned user ID
   * @param rule - Assignment rule used
   */
  private async logAssignment(
    applicationId: string,
    userId: string,
    rule: AssignmentRule
  ): Promise<void> {
    try {
      await auditLogRepository.create({
        actionType: 'AUTO_ASSIGN_APPLICATION',
        entityType: EntityType.APPLICATION,
        entityId: applicationId,
        performedBy: 'system', // System-initiated assignment
        details: {
          assignedTo: userId,
          ruleId: rule.id,
          ruleName: rule.name,
          rulePriority: rule.priority,
          assignmentType: rule.assignTo.type,
        },
      });
    } catch (error) {
      // Log error but don't throw - audit logging failure shouldn't block assignment
      logger.error('Failed to log assignment to audit log', {
        error,
        applicationId,
        userId,
      });
    }
  }

  /**
   * Evaluate if an application matches a rule's condition
   * @param application - Application to evaluate
   * @param condition - Assignment condition to check
   * @returns True if application matches condition
   */
  matchesCondition(application: Application, condition: AssignmentCondition): boolean {
    // Check program type condition
    if (condition.programTypes && condition.programTypes.length > 0) {
      if (!condition.programTypes.includes(application.programType)) {
        return false;
      }
    }

    // Check amount range condition
    if (condition.amountRange) {
      const { min, max } = condition.amountRange;
      if (application.requestedAmount < min || application.requestedAmount > max) {
        return false;
      }
    }

    // Check risk score range condition
    if (condition.riskScoreRange && application.fraudFlags) {
      // Calculate risk score from fraud flags
      const riskScore = this.calculateRiskScore(application);
      const { min, max } = condition.riskScoreRange;
      if (riskScore < min || riskScore > max) {
        return false;
      }
    }

    // Check specialization requirements
    // Note: This would require user specialization data which isn't in the current schema
    // For now, we'll skip this check and it can be implemented when user profiles are extended
    if (condition.requiresSpecialization && condition.requiresSpecialization.length > 0) {
      logger.debug('Specialization check not yet implemented', {
        applicationId: application.id,
        requiredSpecializations: condition.requiresSpecialization,
      });
      // For now, we'll consider this as matching if other conditions pass
    }

    return true;
  }

  /**
   * Calculate risk score from fraud flags
   * @param application - Application with fraud flags
   * @returns Risk score (0-100)
   */
  private calculateRiskScore(application: Application): number {
    if (!application.fraudFlags || application.fraudFlags.length === 0) {
      return 0;
    }

    const severityScores = {
      LOW: 20,
      MEDIUM: 50,
      HIGH: 80,
    };

    // Calculate average severity score
    const totalScore = application.fraudFlags.reduce((sum, flag) => {
      return sum + severityScores[flag.severity];
    }, 0);

    return Math.min(100, Math.round(totalScore / application.fraudFlags.length));
  }

  /**
   * Find matching assignment rule for an application
   * @param application - Application to assign
   * @returns Matching assignment rule or null
   */
  async findMatchingRule(application: Application): Promise<AssignmentRule | null> {
    try {
      // Get all active rules sorted by priority (highest first)
      const rules = await assignmentRuleRepository.findActiveRulesByPriority();

      // Find first matching rule
      for (const rule of rules) {
        if (this.matchesCondition(application, rule.condition)) {
          logger.info('Found matching assignment rule', {
            applicationId: application.id,
            ruleId: rule.id,
            ruleName: rule.name,
            priority: rule.priority,
          });
          return rule;
        }
      }

      logger.info('No matching assignment rule found', {
        applicationId: application.id,
      });
      return null;
    } catch (error) {
      logger.error('Failed to find matching assignment rule', {
        error,
        applicationId: application.id,
      });
      throw new Error('Failed to find matching assignment rule');
    }
  }

  /**
   * Evaluate all rules and return matching rules in priority order
   * @param application - Application to evaluate
   * @returns Array of matching rules sorted by priority
   */
  async evaluateRules(application: Application): Promise<AssignmentRule[]> {
    try {
      const rules = await assignmentRuleRepository.findActiveRulesByPriority();
      
      const matchingRules = rules.filter(rule => 
        this.matchesCondition(application, rule.condition)
      );

      logger.debug('Evaluated assignment rules', {
        applicationId: application.id,
        totalRules: rules.length,
        matchingRules: matchingRules.length,
      });

      return matchingRules;
    } catch (error) {
      logger.error('Failed to evaluate assignment rules', {
        error,
        applicationId: application.id,
      });
      throw new Error('Failed to evaluate assignment rules');
    }
  }

  /**
   * Execute assignment based on assignment target strategy
   * @param application - Application to assign
   * @param assignTo - Assignment target configuration
   * @returns User ID of assigned user or null if assignment failed
   */
  async executeAssignment(
    application: Application,
    assignTo: AssignmentTarget
  ): Promise<string | null> {
    try {
      switch (assignTo.type) {
        case 'USER':
          return this.assignToUser(assignTo.userId);
        
        case 'ROUND_ROBIN':
          return this.assignRoundRobin(assignTo.userPool || []);
        
        case 'LEAST_LOADED':
          return this.assignLeastLoaded(assignTo.userPool || []);
        
        default:
          logger.error('Unknown assignment type', { type: assignTo.type });
          return null;
      }
    } catch (error) {
      logger.error('Failed to execute assignment', {
        error,
        applicationId: application.id,
        assignTo,
      });
      throw new Error('Failed to execute assignment');
    }
  }

  /**
   * Direct user assignment strategy
   * @param userId - User ID to assign to
   * @returns User ID
   */
  private async assignToUser(userId: string | undefined): Promise<string | null> {
    if (!userId) {
      logger.error('User ID not provided for direct assignment');
      return null;
    }

    logger.info('Assigning to specific user', { userId });
    return userId;
  }

  /**
   * Round-robin assignment strategy
   * Assigns to the next user in the pool based on last assignment
   * @param userPool - Array of user IDs to rotate through
   * @returns User ID
   */
  private async assignRoundRobin(userPool: string[]): Promise<string | null> {
    if (!userPool || userPool.length === 0) {
      logger.error('User pool is empty for round-robin assignment');
      return null;
    }

    try {
      // Get the last assigned user from this pool
      const lastAssignedUser = await this.getLastAssignedUser(userPool);
      
      if (!lastAssignedUser) {
        // No previous assignment, start with first user
        logger.info('Round-robin: Starting with first user', { userId: userPool[0] });
        return userPool[0];
      }

      // Find current index and get next user
      const currentIndex = userPool.indexOf(lastAssignedUser);
      const nextIndex = (currentIndex + 1) % userPool.length;
      const nextUser = userPool[nextIndex];

      logger.info('Round-robin assignment', {
        lastUser: lastAssignedUser,
        nextUser,
        poolSize: userPool.length,
      });

      return nextUser;
    } catch (error) {
      logger.error('Failed to execute round-robin assignment', { error, userPool });
      // Fallback to first user in pool
      return userPool[0];
    }
  }

  /**
   * Least-loaded assignment strategy
   * Assigns to the user with the fewest active applications
   * @param userPool - Array of user IDs to consider
   * @returns User ID
   */
  private async assignLeastLoaded(userPool: string[]): Promise<string | null> {
    if (!userPool || userPool.length === 0) {
      logger.error('User pool is empty for least-loaded assignment');
      return null;
    }

    try {
      // Get workload for each user in the pool
      const workloads = await Promise.all(
        userPool.map(async (userId) => ({
          userId,
          workload: await this.getUserWorkload(userId),
        }))
      );

      // Sort by workload (ascending) and get user with least workload
      workloads.sort((a, b) => a.workload - b.workload);
      const leastLoadedUser = workloads[0];

      logger.info('Least-loaded assignment', {
        selectedUser: leastLoadedUser.userId,
        workload: leastLoadedUser.workload,
        allWorkloads: workloads,
      });

      return leastLoadedUser.userId;
    } catch (error) {
      logger.error('Failed to execute least-loaded assignment', { error, userPool });
      // Fallback to first user in pool
      return userPool[0];
    }
  }

  /**
   * Get current workload for a user
   * Counts active applications assigned to the user
   * @param userId - User ID
   * @returns Number of active applications
   */
  async getUserWorkload(userId: string): Promise<number> {
    const query = `
      SELECT COUNT(*) as workload
      FROM applications
      WHERE assigned_to = $1
        AND status NOT IN ('APPROVED', 'REJECTED', 'WITHDRAWN')
    `;

    try {
      const result: QueryResult = await database.query(query, [userId]);
      const workload = parseInt(result.rows[0].workload, 10);
      
      logger.debug('Retrieved user workload', { userId, workload });
      return workload;
    } catch (error) {
      logger.error('Failed to get user workload', { error, userId });
      return 0; // Return 0 on error to avoid blocking assignment
    }
  }

  /**
   * Get the last user who was assigned an application from the given user pool
   * @param userPool - Array of user IDs
   * @returns User ID of last assigned user or null
   */
  private async getLastAssignedUser(userPool: string[]): Promise<string | null> {
    const query = `
      SELECT assigned_to
      FROM applications
      WHERE assigned_to = ANY($1)
        AND assigned_to IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 1
    `;

    try {
      const result: QueryResult = await database.query(query, [userPool]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0].assigned_to;
    } catch (error) {
      logger.error('Failed to get last assigned user', { error, userPool });
      return null;
    }
  }
}

export default new AutoAssignmentService();
