/**
 * Applicant Repository
 * Implements repository pattern for applicant persistence with PII encryption
 */

import { QueryResult } from 'pg';
import database from '../config/database';
import logger from '../utils/logger';
import { encrypt, decrypt } from '../utils/encryption';

export interface Applicant {
  id: string;
  businessName: string;
  ein: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  ownerFirstName: string;
  ownerLastName: string;
  ownerSsn: string; // Will be encrypted in database
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateApplicantRequest {
  businessName: string;
  ein: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  country?: string;
  ownerFirstName: string;
  ownerLastName: string;
  ownerSsn: string;
}

export interface UpdateApplicantRequest {
  businessName?: string;
  email?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  ownerFirstName?: string;
  ownerLastName?: string;
}

class ApplicantRepository {
  /**
   * Create a new applicant with encrypted PII
   * @param data - Applicant creation data
   * @returns Created applicant
   */
  async create(data: CreateApplicantRequest): Promise<Applicant> {
    // Encrypt SSN before storing
    const encryptedSsn = encrypt(data.ownerSsn);

    const query = `
      INSERT INTO applicants (
        business_name,
        ein,
        email,
        phone,
        address_line1,
        address_line2,
        city,
        state,
        zip_code,
        country,
        owner_first_name,
        owner_last_name,
        owner_ssn
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING 
        id,
        business_name,
        ein,
        email,
        phone,
        address_line1,
        address_line2,
        city,
        state,
        zip_code,
        country,
        owner_first_name,
        owner_last_name,
        owner_ssn,
        created_at,
        updated_at
    `;

    const values = [
      data.businessName,
      data.ein,
      data.email,
      data.phone,
      data.addressLine1,
      data.addressLine2 || null,
      data.city,
      data.state,
      data.zipCode,
      data.country || 'USA',
      data.ownerFirstName,
      data.ownerLastName,
      encryptedSsn,
    ];

    try {
      const result: QueryResult = await database.query(query, values);
      return this.mapRowToApplicant(result.rows[0]);
    } catch (error) {
      logger.error('Failed to create applicant', { error, businessName: data.businessName });
      throw new Error('Failed to create applicant');
    }
  }

  /**
   * Find applicant by ID
   * @param id - Applicant ID
   * @returns Applicant or null if not found
   */
  async findById(id: string): Promise<Applicant | null> {
    const query = `
      SELECT 
        id,
        business_name,
        ein,
        email,
        phone,
        address_line1,
        address_line2,
        city,
        state,
        zip_code,
        country,
        owner_first_name,
        owner_last_name,
        owner_ssn,
        created_at,
        updated_at
      FROM applicants
      WHERE id = $1
    `;

    try {
      const result: QueryResult = await database.query(query, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToApplicant(result.rows[0]);
    } catch (error) {
      logger.error('Failed to find applicant by ID', { error, id });
      throw new Error('Failed to find applicant by ID');
    }
  }

  /**
   * Find applicant by EIN
   * @param ein - Employer Identification Number
   * @returns Applicant or null if not found
   */
  async findByEin(ein: string): Promise<Applicant | null> {
    const query = `
      SELECT 
        id,
        business_name,
        ein,
        email,
        phone,
        address_line1,
        address_line2,
        city,
        state,
        zip_code,
        country,
        owner_first_name,
        owner_last_name,
        owner_ssn,
        created_at,
        updated_at
      FROM applicants
      WHERE ein = $1
    `;

    try {
      const result: QueryResult = await database.query(query, [ein]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToApplicant(result.rows[0]);
    } catch (error) {
      logger.error('Failed to find applicant by EIN', { error, ein });
      throw new Error('Failed to find applicant by EIN');
    }
  }

  /**
   * Find applicant by email
   * @param email - Email address
   * @returns Applicant or null if not found
   */
  async findByEmail(email: string): Promise<Applicant | null> {
    const query = `
      SELECT 
        id,
        business_name,
        ein,
        email,
        phone,
        address_line1,
        address_line2,
        city,
        state,
        zip_code,
        country,
        owner_first_name,
        owner_last_name,
        owner_ssn,
        created_at,
        updated_at
      FROM applicants
      WHERE email = $1
    `;

    try {
      const result: QueryResult = await database.query(query, [email]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToApplicant(result.rows[0]);
    } catch (error) {
      logger.error('Failed to find applicant by email', { error, email });
      throw new Error('Failed to find applicant by email');
    }
  }

  /**
   * Update applicant
   * @param id - Applicant ID
   * @param data - Update data
   * @returns Updated applicant
   */
  async update(id: string, data: UpdateApplicantRequest): Promise<Applicant> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.businessName !== undefined) {
      updates.push(`business_name = $${paramIndex++}`);
      values.push(data.businessName);
    }

    if (data.email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      values.push(data.email);
    }

    if (data.phone !== undefined) {
      updates.push(`phone = $${paramIndex++}`);
      values.push(data.phone);
    }

    if (data.addressLine1 !== undefined) {
      updates.push(`address_line1 = $${paramIndex++}`);
      values.push(data.addressLine1);
    }

    if (data.addressLine2 !== undefined) {
      updates.push(`address_line2 = $${paramIndex++}`);
      values.push(data.addressLine2);
    }

    if (data.city !== undefined) {
      updates.push(`city = $${paramIndex++}`);
      values.push(data.city);
    }

    if (data.state !== undefined) {
      updates.push(`state = $${paramIndex++}`);
      values.push(data.state);
    }

    if (data.zipCode !== undefined) {
      updates.push(`zip_code = $${paramIndex++}`);
      values.push(data.zipCode);
    }

    if (data.country !== undefined) {
      updates.push(`country = $${paramIndex++}`);
      values.push(data.country);
    }

    if (data.ownerFirstName !== undefined) {
      updates.push(`owner_first_name = $${paramIndex++}`);
      values.push(data.ownerFirstName);
    }

    if (data.ownerLastName !== undefined) {
      updates.push(`owner_last_name = $${paramIndex++}`);
      values.push(data.ownerLastName);
    }

    // Always update the updated_at timestamp
    updates.push(`updated_at = NOW()`);

    if (updates.length === 1) {
      // Only updated_at was set, nothing to update
      const existing = await this.findById(id);
      if (!existing) {
        throw new Error('Applicant not found');
      }
      return existing;
    }

    values.push(id);

    const query = `
      UPDATE applicants
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING 
        id,
        business_name,
        ein,
        email,
        phone,
        address_line1,
        address_line2,
        city,
        state,
        zip_code,
        country,
        owner_first_name,
        owner_last_name,
        owner_ssn,
        created_at,
        updated_at
    `;

    try {
      const result: QueryResult = await database.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('Applicant not found');
      }

      return this.mapRowToApplicant(result.rows[0]);
    } catch (error) {
      logger.error('Failed to update applicant', { error, id, data });
      throw new Error('Failed to update applicant');
    }
  }

  /**
   * Delete applicant
   * @param id - Applicant ID
   */
  async delete(id: string): Promise<void> {
    const query = 'DELETE FROM applicants WHERE id = $1';

    try {
      await database.query(query, [id]);
    } catch (error) {
      logger.error('Failed to delete applicant', { error, id });
      throw new Error('Failed to delete applicant');
    }
  }

  /**
   * Map database row to Applicant object with decrypted PII
   * @param row - Database row
   * @returns Applicant object
   */
  private mapRowToApplicant(row: any): Applicant {
    // Decrypt SSN when reading from database
    const decryptedSsn = decrypt(row.owner_ssn);

    return {
      id: row.id,
      businessName: row.business_name,
      ein: row.ein,
      email: row.email,
      phone: row.phone,
      addressLine1: row.address_line1,
      addressLine2: row.address_line2 || undefined,
      city: row.city,
      state: row.state,
      zipCode: row.zip_code,
      country: row.country,
      ownerFirstName: row.owner_first_name,
      ownerLastName: row.owner_last_name,
      ownerSsn: decryptedSsn,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

export default new ApplicantRepository();
