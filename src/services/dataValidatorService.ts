/**
 * Data Validator Service
 * Handles EIN verification, contact validation, and fraud detection
 */

import { createClient } from 'redis';
import einVerificationClient from '../clients/einVerificationClient';
import logger from '../utils/logger';
import config from '../config';
import {
  VerificationResult,
  ContactValidationResult,
  ContactInfo,
  FraudAnalysis,
  FraudFlag,
  FraudFlagType,
  FraudSeverity,
} from '../models/validator';
import { Pool } from 'pg';

class DataValidatorService {
  private redisClient: ReturnType<typeof createClient> | null = null;
  private dbPool: Pool;
  private readonly CACHE_TTL = 86400; // 24 hours in seconds

  constructor(dbPool: Pool) {
    this.dbPool = dbPool;
    this.initializeRedis();
  }

  /**
   * Initialize Redis client for caching
   */
  private async initializeRedis(): Promise<void> {
    try {
      this.redisClient = createClient({
        socket: {
          host: config.redis.host,
          port: config.redis.port,
        },
        password: config.redis.password,
        database: config.redis.db,
      });

      this.redisClient.on('error', (err) => {
        logger.error('Redis client error:', err);
      });

      await this.redisClient.connect();
      logger.info('Redis client connected for data validator');
    } catch (error) {
      logger.error('Failed to initialize Redis client:', error);
      this.redisClient = null;
    }
  }

  /**
   * Verify EIN against authoritative sources with caching
   */
  async verifyEIN(ein: string, businessName: string): Promise<VerificationResult> {
    const cacheKey = `ein:${ein}:${businessName}`;

    // Try to get from cache first
    if (this.redisClient) {
      try {
        const cached = await this.redisClient.get(cacheKey);
        if (cached) {
          logger.info(`EIN verification cache hit for ${this.maskEIN(ein)}`);
          return JSON.parse(cached);
        }
      } catch (error) {
        logger.warn('Redis cache read error:', error);
      }
    }

    // Perform verification
    try {
      const useMock = process.env.USE_MOCK_EIN_VERIFICATION === 'true' || !process.env.EIN_VERIFICATION_API_KEY;
      
      const response = useMock
        ? await einVerificationClient.mockVerifyEIN(ein, businessName)
        : await einVerificationClient.verifyEIN(ein, businessName);

      const result: VerificationResult = {
        isValid: response.isValid && response.businessNameMatch,
        source: useMock ? 'MOCK' : 'IRS_API',
        matchConfidence: this.calculateMatchConfidence(response),
        details: {
          einValid: response.isValid,
          businessNameMatch: response.businessNameMatch,
          status: response.status,
          ...response.details,
        },
        timestamp: new Date(),
      };

      // Cache the result
      if (this.redisClient) {
        try {
          await this.redisClient.setEx(cacheKey, this.CACHE_TTL, JSON.stringify(result));
          logger.info(`EIN verification result cached for ${this.maskEIN(ein)}`);
        } catch (error) {
          logger.warn('Redis cache write error:', error);
        }
      }

      return result;
    } catch (error: any) {
      logger.error('EIN verification error:', error);
      
      // Return failed verification result
      return {
        isValid: false,
        source: 'ERROR',
        matchConfidence: 0,
        details: {
          error: error.message,
        },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Calculate match confidence based on verification response
   */
  private calculateMatchConfidence(response: any): number {
    let confidence = 0;

    if (response.isValid) {
      confidence += 50;
    }

    if (response.businessNameMatch) {
      confidence += 50;
    }

    return confidence;
  }

  /**
   * Validate contact information
   */
  async validateContactInfo(contact: ContactInfo): Promise<ContactValidationResult> {
    const result: ContactValidationResult = {
      isValid: true,
    };

    // Validate email
    result.email = this.validateEmail(contact.email);
    if (!result.email.isValid) {
      result.isValid = false;
    }

    // Validate phone
    result.phone = this.validatePhone(contact.phone);
    if (!result.phone.isValid) {
      result.isValid = false;
    }

    // Validate address
    result.address = await this.validateAddress(contact.address);
    if (!result.address.isValid) {
      result.isValid = false;
    }

    return result;
  }

  /**
   * Validate email format and check for disposable domains
   */
  private validateEmail(email: string): { isValid: boolean; isDisposable: boolean; reason?: string } {
    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        isValid: false,
        isDisposable: false,
        reason: 'Invalid email format',
      };
    }

    // Check for disposable email domains
    const domain = email.split('@')[1].toLowerCase();
    const disposableDomains = [
      'tempmail.com',
      'throwaway.email',
      'guerrillamail.com',
      '10minutemail.com',
      'mailinator.com',
      'trashmail.com',
    ];

    const isDisposable = disposableDomains.includes(domain);

    return {
      isValid: !isDisposable,
      isDisposable,
      reason: isDisposable ? 'Disposable email domain detected' : undefined,
    };
  }

  /**
   * Validate phone number format and country code
   */
  private validatePhone(phone: string): { isValid: boolean; countryCode?: string; reason?: string } {
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');

    // US phone number validation (10 digits)
    if (cleaned.length === 10) {
      return {
        isValid: true,
        countryCode: 'US',
      };
    }

    // International format with country code (11+ digits)
    if (cleaned.length >= 11) {
      return {
        isValid: true,
        countryCode: cleaned.substring(0, cleaned.length - 10),
      };
    }

    return {
      isValid: false,
      reason: 'Invalid phone number format',
    };
  }

  /**
   * Validate address using postal service APIs
   */
  private async validateAddress(address: any): Promise<{ isValid: boolean; normalized?: string; reason?: string }> {
    // Basic validation - check required fields
    if (!address.street || !address.city || !address.state || !address.zipCode) {
      return {
        isValid: false,
        reason: 'Missing required address fields',
      };
    }

    // Validate ZIP code format (US)
    const zipRegex = /^\d{5}(-\d{4})?$/;
    if (!zipRegex.test(address.zipCode)) {
      return {
        isValid: false,
        reason: 'Invalid ZIP code format',
      };
    }

    // In production, integrate with USPS or similar API
    // For now, return basic validation
    const normalized = `${address.street}, ${address.city}, ${address.state} ${address.zipCode}`;

    return {
      isValid: true,
      normalized,
    };
  }

  /**
   * Detect fraud patterns in application
   */
  async detectFraud(applicationData: any): Promise<FraudAnalysis> {
    const flags: FraudFlag[] = [];

    // Check for duplicate EIN
    if (applicationData.ein) {
      const duplicateFlag = await this.checkDuplicateEIN(applicationData.ein, applicationData.id);
      if (duplicateFlag) {
        flags.push(duplicateFlag);
      }
    }

    // Check for suspicious document patterns
    if (applicationData.documents) {
      const documentFlags = await this.checkSuspiciousDocuments(applicationData.documents);
      flags.push(...documentFlags);
    }

    // Check for data mismatches
    if (applicationData.verificationResult) {
      const mismatchFlag = this.checkDataMismatch(applicationData);
      if (mismatchFlag) {
        flags.push(mismatchFlag);
      }
    }

    // Calculate risk score
    const riskScore = this.calculateRiskScore(flags);

    return {
      riskScore,
      flags,
      requiresInvestigation: riskScore >= 50 || flags.some(f => f.severity === FraudSeverity.HIGH),
    };
  }

  /**
   * Check for duplicate EIN across applications
   */
  private async checkDuplicateEIN(ein: string, currentApplicationId?: string): Promise<FraudFlag | null> {
    try {
      const query = currentApplicationId
        ? 'SELECT id, applicant_id FROM applications WHERE applicant_id IN (SELECT id FROM applicants WHERE ein = $1) AND id != $2'
        : 'SELECT id, applicant_id FROM applications WHERE applicant_id IN (SELECT id FROM applicants WHERE ein = $1)';
      
      const params = currentApplicationId ? [ein, currentApplicationId] : [ein];
      const result = await this.dbPool.query(query, params);

      if (result.rows.length > 0) {
        return {
          type: FraudFlagType.DUPLICATE_EIN,
          severity: FraudSeverity.HIGH,
          description: `EIN ${this.maskEIN(ein)} found in ${result.rows.length} other application(s)`,
          evidence: {
            duplicateApplicationIds: result.rows.map(r => r.id),
            count: result.rows.length,
          },
        };
      }

      return null;
    } catch (error) {
      logger.error('Error checking duplicate EIN:', error);
      return null;
    }
  }

  /**
   * Check for suspicious document characteristics
   */
  private async checkSuspiciousDocuments(documents: any[]): Promise<FraudFlag[]> {
    const flags: FraudFlag[] = [];

    for (const doc of documents) {
      // Check for low classification confidence
      if (doc.classificationConfidence && doc.classificationConfidence < 60) {
        flags.push({
          type: FraudFlagType.SUSPICIOUS_DOCUMENT,
          severity: FraudSeverity.MEDIUM,
          description: `Document ${doc.id} has low classification confidence (${doc.classificationConfidence}%)`,
          evidence: {
            documentId: doc.id,
            confidence: doc.classificationConfidence,
          },
        });
      }

      // Check for missing required documents
      if (doc.requiresManualReview) {
        flags.push({
          type: FraudFlagType.SUSPICIOUS_DOCUMENT,
          severity: FraudSeverity.LOW,
          description: `Document ${doc.id} flagged for manual review`,
          evidence: {
            documentId: doc.id,
          },
        });
      }
    }

    return flags;
  }

  /**
   * Check for data mismatches
   */
  private checkDataMismatch(applicationData: any): FraudFlag | null {
    if (!applicationData.verificationResult || applicationData.verificationResult.isValid) {
      return null;
    }

    return {
      type: FraudFlagType.DATA_MISMATCH,
      severity: FraudSeverity.HIGH,
      description: 'EIN verification failed or business name mismatch detected',
      evidence: {
        verificationResult: applicationData.verificationResult,
      },
    };
  }

  /**
   * Calculate overall fraud risk score
   */
  private calculateRiskScore(flags: FraudFlag[]): number {
    let score = 0;

    for (const flag of flags) {
      switch (flag.severity) {
        case FraudSeverity.HIGH:
          score += 40;
          break;
        case FraudSeverity.MEDIUM:
          score += 20;
          break;
        case FraudSeverity.LOW:
          score += 10;
          break;
      }
    }

    // Cap at 100
    return Math.min(score, 100);
  }

  /**
   * Mask EIN for logging
   */
  private maskEIN(ein: string): string {
    const cleaned = ein.replace(/\D/g, '');
    if (cleaned.length >= 4) {
      return `***-***${cleaned.slice(-4)}`;
    }
    return '***-******';
  }

  /**
   * Close connections
   */
  async close(): Promise<void> {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }
}

export default DataValidatorService;
