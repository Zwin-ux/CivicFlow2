/**
 * Email Template Repository
 * Data access layer for email templates
 */

import pool from '../config/database';
import { EmailTemplate, EmailTemplateType } from '../models/communication';
import logger from '../utils/logger';

class EmailTemplateRepository {
  /**
   * Find email template by type
   * @param templateType - Template type
   * @returns Email template or null
   */
  async findByType(templateType: EmailTemplateType): Promise<EmailTemplate | null> {
    try {
      const result = await pool.query(
        `SELECT 
          id,
          template_type as "templateType",
          name,
          subject,
          body_html as "bodyHtml",
          body_text as "bodyText",
          variables,
          is_active as "isActive",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM email_templates
        WHERE template_type = $1 AND is_active = TRUE`,
        [templateType]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Error finding email template by type', { error, templateType });
      throw error;
    }
  }

  /**
   * Find all active email templates
   * @returns Array of email templates
   */
  async findAllActive(): Promise<EmailTemplate[]> {
    try {
      const result = await pool.query(
        `SELECT 
          id,
          template_type as "templateType",
          name,
          subject,
          body_html as "bodyHtml",
          body_text as "bodyText",
          variables,
          is_active as "isActive",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM email_templates
        WHERE is_active = TRUE
        ORDER BY template_type`
      );

      return result.rows;
    } catch (error) {
      logger.error('Error finding all active email templates', { error });
      throw error;
    }
  }

  /**
   * Create email template
   * @param template - Template data
   * @returns Created email template
   */
  async create(template: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<EmailTemplate> {
    try {
      const result = await pool.query(
        `INSERT INTO email_templates (
          template_type,
          name,
          subject,
          body_html,
          body_text,
          variables,
          is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING 
          id,
          template_type as "templateType",
          name,
          subject,
          body_html as "bodyHtml",
          body_text as "bodyText",
          variables,
          is_active as "isActive",
          created_at as "createdAt",
          updated_at as "updatedAt"`,
        [
          template.templateType,
          template.name,
          template.subject,
          template.bodyHtml,
          template.bodyText,
          JSON.stringify(template.variables),
          template.isActive,
        ]
      );

      return result.rows[0];
    } catch (error) {
      logger.error('Error creating email template', { error, template });
      throw error;
    }
  }

  /**
   * Update email template
   * @param id - Template ID
   * @param updates - Template updates
   * @returns Updated email template
   */
  async update(
    id: string,
    updates: Partial<Omit<EmailTemplate, 'id' | 'templateType' | 'createdAt' | 'updatedAt'>>
  ): Promise<EmailTemplate> {
    try {
      const fields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (updates.name !== undefined) {
        fields.push(`name = $${paramCount++}`);
        values.push(updates.name);
      }
      if (updates.subject !== undefined) {
        fields.push(`subject = $${paramCount++}`);
        values.push(updates.subject);
      }
      if (updates.bodyHtml !== undefined) {
        fields.push(`body_html = $${paramCount++}`);
        values.push(updates.bodyHtml);
      }
      if (updates.bodyText !== undefined) {
        fields.push(`body_text = $${paramCount++}`);
        values.push(updates.bodyText);
      }
      if (updates.variables !== undefined) {
        fields.push(`variables = $${paramCount++}`);
        values.push(JSON.stringify(updates.variables));
      }
      if (updates.isActive !== undefined) {
        fields.push(`is_active = $${paramCount++}`);
        values.push(updates.isActive);
      }

      if (fields.length === 0) {
        throw new Error('No fields to update');
      }

      values.push(id);

      const result = await pool.query(
        `UPDATE email_templates
        SET ${fields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING 
          id,
          template_type as "templateType",
          name,
          subject,
          body_html as "bodyHtml",
          body_text as "bodyText",
          variables,
          is_active as "isActive",
          created_at as "createdAt",
          updated_at as "updatedAt"`,
        values
      );

      if (result.rows.length === 0) {
        throw new Error('Email template not found');
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Error updating email template', { error, id, updates });
      throw error;
    }
  }

  /**
   * Delete email template (soft delete by setting is_active to false)
   * @param id - Template ID
   */
  async delete(id: string): Promise<void> {
    try {
      await pool.query(
        'UPDATE email_templates SET is_active = FALSE WHERE id = $1',
        [id]
      );
    } catch (error) {
      logger.error('Error deleting email template', { error, id });
      throw error;
    }
  }
}

export default new EmailTemplateRepository();
