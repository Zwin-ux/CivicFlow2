/**
 * Program Rule Repository
 * Implements repository pattern for program rule persistence and retrieval
 */

import { QueryResult } from 'pg';
import database from '../config/database';
import logger from '../utils/logger';
import { ProgramRule } from '../models/programRule';

class ProgramRuleRepository {
  /**
   * Find active program rule by program type
   * @param programType - Program type identifier
   * @returns Program rule or null if not found
   */
  async findActiveByProgramType(programType: string): Promise<ProgramRule | null> {
    const query = `
      SELECT 
        id,
        program_type,
        program_name,
        version,
        rules,
        active_from,
        active_to,
        created_by,
        created_at,
        updated_at
      FROM program_rules
      WHERE program_type = $1
        AND active_from <= NOW()
        AND (active_to IS NULL OR active_to > NOW())
      ORDER BY version DESC
      LIMIT 1
    `;

    try {
      const result: QueryResult = await database.query(query, [programType]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToProgramRule(result.rows[0]);
    } catch (error) {
      logger.error('Failed to find active program rule', { error, programType });
      throw new Error('Failed to find active program rule');
    }
  }

  /**
   * Find program rule by ID
   * @param id - Program rule ID
   * @returns Program rule or null if not found
   */
  async findById(id: string): Promise<ProgramRule | null> {
    const query = `
      SELECT 
        id,
        program_type,
        program_name,
        version,
        rules,
        active_from,
        active_to,
        created_by,
        created_at,
        updated_at
      FROM program_rules
      WHERE id = $1
    `;

    try {
      const result: QueryResult = await database.query(query, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToProgramRule(result.rows[0]);
    } catch (error) {
      logger.error('Failed to find program rule by ID', { error, id });
      throw new Error('Failed to find program rule by ID');
    }
  }

  /**
   * Find all active program rules
   * @returns Array of program rules
   */
  async findAllActive(): Promise<ProgramRule[]> {
    const query = `
      SELECT 
        id,
        program_type,
        program_name,
        version,
        rules,
        active_from,
        active_to,
        created_by,
        created_at,
        updated_at
      FROM program_rules
      WHERE active_from <= NOW()
        AND (active_to IS NULL OR active_to > NOW())
      ORDER BY program_type, version DESC
    `;

    try {
      const result: QueryResult = await database.query(query);
      return result.rows.map(row => this.mapRowToProgramRule(row));
    } catch (error) {
      logger.error('Failed to find all active program rules', { error });
      throw new Error('Failed to find all active program rules');
    }
  }

  /**
   * Map database row to ProgramRule object
   * @param row - Database row
   * @returns ProgramRule object
   */
  private mapRowToProgramRule(row: any): ProgramRule {
    return {
      id: row.id,
      programType: row.program_type,
      programName: row.program_name,
      version: parseInt(row.version, 10),
      rules: row.rules,
      activeFrom: new Date(row.active_from),
      activeTo: row.active_to ? new Date(row.active_to) : undefined,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

export default new ProgramRuleRepository();
