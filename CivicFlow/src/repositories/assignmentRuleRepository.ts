/**
 * Assignment Rule Repository
 * Implements repository pattern for assignment rule persistence and retrieval
 */

import { QueryResult } from 'pg';
import database from '../config/database';
import logger from '../utils/logger';
import {
  AssignmentRule,
  CreateAssignmentRuleRequest,
  UpdateAssignmentRuleRequest,
} from '../models/assignmentRule';

class AssignmentRuleRepository {
  /**
   * Create a new assignment rule
   * @param data - Assignment rule creation data
   * @returns Created assignment rule
   */
  async create(data: CreateAssignmentRuleRequest): Promise<AssignmentRule> {
    const query = `
      INSERT INTO assignment_rules (
        name,
        priority,
        condition,
        assign_to,
        is_active
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING 
        id,
        name,
        priority,
        condition,
        assign_to,
        is_active,
        created_at,
        updated_at
    `;

    const values = [
      data.name,
      data.priority,
      JSON.stringify(data.condition),
      JSON.stringify(data.assignTo),
      data.isActive !== undefined ? data.isActive : true,
    ];

    try {
      const result: QueryResult = await database.query(query, values);
      return this.mapRowToAssignmentRule(result.rows[0]);
    } catch (error) {
      logger.error('Failed to create assignment rule', { error, data });
      throw new Error('Failed to create assignment rule');
    }
  }

  /**
   * Find assignment rule by ID
   * @param id - Assignment rule ID
   * @returns Assignment rule or null if not found
   */
  async findById(id: string): Promise<AssignmentRule | null> {
    const query = `
      SELECT 
        id,
        name,
        priority,
        condition,
        assign_to,
        is_active,
        created_at,
        updated_at
      FROM assignment_rules
      WHERE id = $1
    `;

    try {
      const result: QueryResult = await database.query(query, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToAssignmentRule(result.rows[0]);
    } catch (error) {
      logger.error('Failed to find assignment rule by ID', { error, id });
      throw new Error('Failed to find assignment rule by ID');
    }
  }

  /**
   * Find all assignment rules
   * @param includeInactive - Whether to include inactive rules
   * @returns Array of assignment rules
   */
  async findAll(includeInactive: boolean = false): Promise<AssignmentRule[]> {
    const whereClause = includeInactive ? '' : 'WHERE is_active = true';
    
    const query = `
      SELECT 
        id,
        name,
        priority,
        condition,
        assign_to,
        is_active,
        created_at,
        updated_at
      FROM assignment_rules
      ${whereClause}
      ORDER BY priority DESC, created_at ASC
    `;

    try {
      const result: QueryResult = await database.query(query);
      return result.rows.map(row => this.mapRowToAssignmentRule(row));
    } catch (error) {
      logger.error('Failed to find all assignment rules', { error });
      throw new Error('Failed to find all assignment rules');
    }
  }

  /**
   * Find active assignment rules sorted by priority
   * @returns Array of active assignment rules sorted by priority (highest first)
   */
  async findActiveRulesByPriority(): Promise<AssignmentRule[]> {
    const query = `
      SELECT 
        id,
        name,
        priority,
        condition,
        assign_to,
        is_active,
        created_at,
        updated_at
      FROM assignment_rules
      WHERE is_active = true
      ORDER BY priority DESC, created_at ASC
    `;

    try {
      const result: QueryResult = await database.query(query);
      return result.rows.map(row => this.mapRowToAssignmentRule(row));
    } catch (error) {
      logger.error('Failed to find active assignment rules by priority', { error });
      throw new Error('Failed to find active assignment rules by priority');
    }
  }

  /**
   * Update assignment rule
   * @param id - Assignment rule ID
   * @param data - Update data
   * @returns Updated assignment rule
   */
  async update(id: string, data: UpdateAssignmentRuleRequest): Promise<AssignmentRule> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }

    if (data.priority !== undefined) {
      updates.push(`priority = $${paramIndex++}`);
      values.push(data.priority);
    }

    if (data.condition !== undefined) {
      updates.push(`condition = $${paramIndex++}`);
      values.push(JSON.stringify(data.condition));
    }

    if (data.assignTo !== undefined) {
      updates.push(`assign_to = $${paramIndex++}`);
      values.push(JSON.stringify(data.assignTo));
    }

    if (data.isActive !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(data.isActive);
    }

    // Always update the updated_at timestamp
    updates.push(`updated_at = NOW()`);

    if (updates.length === 1) {
      // Only updated_at was set, nothing to update
      const existing = await this.findById(id);
      if (!existing) {
        throw new Error('Assignment rule not found');
      }
      return existing;
    }

    values.push(id);

    const query = `
      UPDATE assignment_rules
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING 
        id,
        name,
        priority,
        condition,
        assign_to,
        is_active,
        created_at,
        updated_at
    `;

    try {
      const result: QueryResult = await database.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('Assignment rule not found');
      }

      return this.mapRowToAssignmentRule(result.rows[0]);
    } catch (error) {
      logger.error('Failed to update assignment rule', { error, id, data });
      throw new Error('Failed to update assignment rule');
    }
  }

  /**
   * Delete assignment rule
   * @param id - Assignment rule ID
   */
  async delete(id: string): Promise<void> {
    const query = 'DELETE FROM assignment_rules WHERE id = $1';

    try {
      await database.query(query, [id]);
    } catch (error) {
      logger.error('Failed to delete assignment rule', { error, id });
      throw new Error('Failed to delete assignment rule');
    }
  }

  /**
   * Deactivate assignment rule (soft delete)
   * @param id - Assignment rule ID
   * @returns Updated assignment rule
   */
  async deactivate(id: string): Promise<AssignmentRule> {
    return this.update(id, { isActive: false });
  }

  /**
   * Activate assignment rule
   * @param id - Assignment rule ID
   * @returns Updated assignment rule
   */
  async activate(id: string): Promise<AssignmentRule> {
    return this.update(id, { isActive: true });
  }

  /**
   * Map database row to AssignmentRule object
   * @param row - Database row
   * @returns AssignmentRule object
   */
  private mapRowToAssignmentRule(row: any): AssignmentRule {
    return {
      id: row.id,
      name: row.name,
      priority: row.priority,
      condition: row.condition,
      assignTo: row.assign_to,
      isActive: row.is_active,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

export default new AssignmentRuleRepository();
