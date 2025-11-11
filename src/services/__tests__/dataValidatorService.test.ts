/**
 * Data Validator Service Unit Tests
 * Tests for EIN verification, fraud detection, and validation error handling
 * Requirements: 2.1, 2.3, 3.5
 */

import DataValidatorService from '../dataValidatorService';
import einVerificationClient from '../../clients/einVerificationClient';
import { Pool } from 'pg';
import {
  FraudFlagType,
  FraudSeverity,
} from '../../models/validator';

// Mock dependencies
jest.mock('../../clients/einVerificationClient');
jest.mock('../../utils/logger');
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    get: jest.fn(),
    setEx: jest.fn(),
    quit: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
  })),
}));

describe('DataValidatorService', () => {
  let dataValidatorService: DataValidatorService;
  let mockDbPool: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock database pool
    mockDbPool = {
      query: jest.fn(),
      connect: jest.fn(),
      end: jest.fn(),
      on: jest.fn(),
    };

    dataValidatorService = new DataValidatorService(mockDbPool as Pool);
  });

  afterEach(async () => {
    await dataValidatorService.close();
  });

  describe('verifyEIN - EIN Verification with Mocked API Responses', () => {
    beforeEach(() => {
      // Set API key to ensure non-mock path is used
      process.env.EIN_VERIFICATION_API_KEY = 'test-api-key';
      delete process.env.USE_MOCK_EIN_VERIFICATION;
    });

    afterEach(() => {
      delete process.env.EIN_VERIFICATION_API_KEY;
    });

    it('should successfully verify valid EIN with matching business name', async () => {
      const mockApiResponse = {
        isValid: true,
        businessName: 'Sample Business LLC',
        businessNameMatch: true,
        status: 'ACTIVE',
        details: {},
      };

      (einVerificationClient.verifyEIN as jest.Mock).mockResolvedValue(mockApiResponse);

      const result = await dataValidatorService.verifyEIN('12-3456789', 'Sample Business LLC');

      expect(result.isValid).toBe(true);
      expect(result.matchConfidence).toBe(100);
      expect(result.details.einValid).toBe(true);
      expect(result.details.businessNameMatch).toBe(true);
      expect(result.details.status).toBe('ACTIVE');
      expect(einVerificationClient.verifyEIN).toHaveBeenCalledWith('12-3456789', 'Sample Business LLC');
    });

    it('should return invalid result when EIN format is invalid', async () => {
      const mockApiResponse = {
        isValid: false,
        businessName: 'Sample Business LLC',
        businessNameMatch: true,
        status: 'INVALID',
        details: {},
      };

      (einVerificationClient.verifyEIN as jest.Mock).mockResolvedValue(mockApiResponse);

      const result = await dataValidatorService.verifyEIN('invalid-ein', 'Sample Business LLC');

      expect(result.isValid).toBe(false);
      expect(result.matchConfidence).toBe(50);
      expect(result.details.einValid).toBe(false);
    });

    it('should return invalid result when business name does not match', async () => {
      const mockApiResponse = {
        isValid: true,
        businessName: 'Different Business LLC',
        businessNameMatch: false,
        status: 'ACTIVE',
        details: {},
      };

      (einVerificationClient.verifyEIN as jest.Mock).mockResolvedValue(mockApiResponse);

      const result = await dataValidatorService.verifyEIN('12-3456789', 'Sample Business LLC');

      expect(result.isValid).toBe(false);
      expect(result.matchConfidence).toBe(50);
      expect(result.details.businessNameMatch).toBe(false);
    });

    it('should handle API errors gracefully and return failed verification', async () => {
      (einVerificationClient.verifyEIN as jest.Mock).mockRejectedValue(
        new Error('API service unavailable')
      );

      const result = await dataValidatorService.verifyEIN('12-3456789', 'Sample Business LLC');

      expect(result.isValid).toBe(false);
      expect(result.source).toBe('ERROR');
      expect(result.matchConfidence).toBe(0);
      expect(result.details.error).toBe('API service unavailable');
    });

    it('should use mock verification when configured', async () => {
      process.env.USE_MOCK_EIN_VERIFICATION = 'true';

      const mockApiResponse = {
        isValid: true,
        businessName: 'Test Business',
        businessNameMatch: true,
        status: 'ACTIVE',
        details: { mock: true },
      };

      (einVerificationClient.mockVerifyEIN as jest.Mock).mockResolvedValue(mockApiResponse);

      const result = await dataValidatorService.verifyEIN('12-3456789', 'Test Business');

      expect(result.isValid).toBe(true);
      expect(result.source).toBe('MOCK');
      expect(result.details.mock).toBe(true);

      delete process.env.USE_MOCK_EIN_VERIFICATION;
    });

    it('should calculate confidence score correctly for partial matches', async () => {
      const mockApiResponse = {
        isValid: true,
        businessName: 'Sample Business LLC',
        businessNameMatch: false,
        status: 'ACTIVE',
        details: {},
      };

      (einVerificationClient.verifyEIN as jest.Mock).mockResolvedValue(mockApiResponse);

      const result = await dataValidatorService.verifyEIN('12-3456789', 'Different Name');

      expect(result.matchConfidence).toBe(50); // Only EIN valid, not business name
    });
  });

  describe('validateContactInfo - Contact Information Validation', () => {
    it('should validate correct email, phone, and address', async () => {
      const contactInfo = {
        email: 'test@example.com',
        phone: '555-123-4567',
        address: {
          street: '123 Main St',
          city: 'Springfield',
          state: 'IL',
          zipCode: '62701',
        },
      };

      const result = await dataValidatorService.validateContactInfo(contactInfo);

      expect(result.isValid).toBe(true);
      expect(result.email?.isValid).toBe(true);
      expect(result.email?.isDisposable).toBe(false);
      expect(result.phone?.isValid).toBe(true);
      expect(result.phone?.countryCode).toBe('US');
      expect(result.address?.isValid).toBe(true);
    });

    it('should reject disposable email domains', async () => {
      const contactInfo = {
        email: 'test@tempmail.com',
        phone: '555-123-4567',
        address: {
          street: '123 Main St',
          city: 'Springfield',
          state: 'IL',
          zipCode: '62701',
        },
      };

      const result = await dataValidatorService.validateContactInfo(contactInfo);

      expect(result.isValid).toBe(false);
      expect(result.email?.isValid).toBe(false);
      expect(result.email?.isDisposable).toBe(true);
      expect(result.email?.reason).toBe('Disposable email domain detected');
    });

    it('should reject invalid email format', async () => {
      const contactInfo = {
        email: 'invalid-email',
        phone: '555-123-4567',
        address: {
          street: '123 Main St',
          city: 'Springfield',
          state: 'IL',
          zipCode: '62701',
        },
      };

      const result = await dataValidatorService.validateContactInfo(contactInfo);

      expect(result.isValid).toBe(false);
      expect(result.email?.isValid).toBe(false);
      expect(result.email?.reason).toBe('Invalid email format');
    });

    it('should validate US phone numbers correctly', async () => {
      const contactInfo = {
        email: 'test@example.com',
        phone: '5551234567',
        address: {
          street: '123 Main St',
          city: 'Springfield',
          state: 'IL',
          zipCode: '62701',
        },
      };

      const result = await dataValidatorService.validateContactInfo(contactInfo);

      expect(result.phone?.isValid).toBe(true);
      expect(result.phone?.countryCode).toBe('US');
    });

    it('should reject invalid phone number format', async () => {
      const contactInfo = {
        email: 'test@example.com',
        phone: '123',
        address: {
          street: '123 Main St',
          city: 'Springfield',
          state: 'IL',
          zipCode: '62701',
        },
      };

      const result = await dataValidatorService.validateContactInfo(contactInfo);

      expect(result.isValid).toBe(false);
      expect(result.phone?.isValid).toBe(false);
      expect(result.phone?.reason).toBe('Invalid phone number format');
    });

    it('should reject invalid ZIP code format', async () => {
      const contactInfo = {
        email: 'test@example.com',
        phone: '555-123-4567',
        address: {
          street: '123 Main St',
          city: 'Springfield',
          state: 'IL',
          zipCode: 'invalid',
        },
      };

      const result = await dataValidatorService.validateContactInfo(contactInfo);

      expect(result.isValid).toBe(false);
      expect(result.address?.isValid).toBe(false);
      expect(result.address?.reason).toBe('Invalid ZIP code format');
    });

    it('should reject address with missing required fields', async () => {
      const contactInfo = {
        email: 'test@example.com',
        phone: '555-123-4567',
        address: {
          street: '',
          city: 'Springfield',
          state: 'IL',
          zipCode: '62701',
        },
      };

      const result = await dataValidatorService.validateContactInfo(contactInfo);

      expect(result.isValid).toBe(false);
      expect(result.address?.isValid).toBe(false);
      expect(result.address?.reason).toBe('Missing required address fields');
    });

    it('should validate international phone numbers', async () => {
      const contactInfo = {
        email: 'test@example.com',
        phone: '15551234567',
        address: {
          street: '123 Main St',
          city: 'Springfield',
          state: 'IL',
          zipCode: '62701',
        },
      };

      const result = await dataValidatorService.validateContactInfo(contactInfo);

      expect(result.phone?.isValid).toBe(true);
      expect(result.phone?.countryCode).toBe('1');
    });
  });

  describe('detectFraud - Fraud Detection with Known Fraudulent Patterns', () => {
    it('should detect duplicate EIN across applications', async () => {
      const applicationData = {
        id: 'app-123',
        ein: '12-3456789',
        documents: [],
      };

      mockDbPool.query.mockResolvedValue({
        rows: [
          { id: 'app-456', applicant_id: 'applicant-1' },
          { id: 'app-789', applicant_id: 'applicant-2' },
        ],
        rowCount: 2,
      } as any);

      const result = await dataValidatorService.detectFraud(applicationData);

      expect(result.flags).toHaveLength(1);
      expect(result.flags[0].type).toBe(FraudFlagType.DUPLICATE_EIN);
      expect(result.flags[0].severity).toBe(FraudSeverity.HIGH);
      expect(result.flags[0].evidence.count).toBe(2);
      expect(result.riskScore).toBeGreaterThanOrEqual(40);
      expect(result.requiresInvestigation).toBe(true);
    });

    it('should detect suspicious documents with low classification confidence', async () => {
      const applicationData = {
        id: 'app-123',
        ein: '12-3456789',
        documents: [
          {
            id: 'doc-1',
            classificationConfidence: 55,
          },
          {
            id: 'doc-2',
            classificationConfidence: 45,
          },
        ],
      };

      mockDbPool.query.mockResolvedValue({
        rows: [],
        rowCount: 0,
      } as any);

      const result = await dataValidatorService.detectFraud(applicationData);

      expect(result.flags.length).toBeGreaterThanOrEqual(2);
      const suspiciousFlags = result.flags.filter(f => f.type === FraudFlagType.SUSPICIOUS_DOCUMENT);
      expect(suspiciousFlags).toHaveLength(2);
      expect(suspiciousFlags[0].severity).toBe(FraudSeverity.MEDIUM);
    });

    it('should detect data mismatch from failed verification', async () => {
      const applicationData = {
        id: 'app-123',
        ein: '12-3456789',
        documents: [],
        verificationResult: {
          isValid: false,
          matchConfidence: 30,
        },
      };

      mockDbPool.query.mockResolvedValue({
        rows: [],
        rowCount: 0,
      } as any);

      const result = await dataValidatorService.detectFraud(applicationData);

      expect(result.flags).toHaveLength(1);
      expect(result.flags[0].type).toBe(FraudFlagType.DATA_MISMATCH);
      expect(result.flags[0].severity).toBe(FraudSeverity.HIGH);
      expect(result.requiresInvestigation).toBe(true);
    });

    it('should calculate risk score based on fraud flag severity', async () => {
      const applicationData = {
        id: 'app-123',
        ein: '12-3456789',
        documents: [
          {
            id: 'doc-1',
            classificationConfidence: 50,
          },
        ],
        verificationResult: {
          isValid: false,
        },
      };

      mockDbPool.query.mockResolvedValue({
        rows: [{ id: 'app-456', applicant_id: 'applicant-1' }],
        rowCount: 1,
      } as any);

      const result = await dataValidatorService.detectFraud(applicationData);

      // Should have HIGH (duplicate EIN) + HIGH (data mismatch) + MEDIUM (suspicious doc)
      // = 40 + 40 + 20 = 100
      expect(result.riskScore).toBeGreaterThanOrEqual(80);
      expect(result.requiresInvestigation).toBe(true);
    });

    it('should not flag applications with no fraud indicators', async () => {
      const applicationData = {
        id: 'app-123',
        ein: '12-3456789',
        documents: [
          {
            id: 'doc-1',
            classificationConfidence: 95,
          },
        ],
        verificationResult: {
          isValid: true,
        },
      };

      mockDbPool.query.mockResolvedValue({
        rows: [],
        rowCount: 0,
      } as any);

      const result = await dataValidatorService.detectFraud(applicationData);

      expect(result.flags).toHaveLength(0);
      expect(result.riskScore).toBe(0);
      expect(result.requiresInvestigation).toBe(false);
    });

    it('should flag documents requiring manual review', async () => {
      const applicationData = {
        id: 'app-123',
        ein: '12-3456789',
        documents: [
          {
            id: 'doc-1',
            classificationConfidence: 85,
            requiresManualReview: true,
          },
        ],
      };

      mockDbPool.query.mockResolvedValue({
        rows: [],
        rowCount: 0,
      } as any);

      const result = await dataValidatorService.detectFraud(applicationData);

      expect(result.flags).toHaveLength(1);
      expect(result.flags[0].type).toBe(FraudFlagType.SUSPICIOUS_DOCUMENT);
      expect(result.flags[0].severity).toBe(FraudSeverity.LOW);
    });

    it('should cap risk score at 100', async () => {
      const applicationData = {
        id: 'app-123',
        ein: '12-3456789',
        documents: [
          { id: 'doc-1', classificationConfidence: 30 },
          { id: 'doc-2', classificationConfidence: 35 },
          { id: 'doc-3', classificationConfidence: 40 },
        ],
        verificationResult: {
          isValid: false,
        },
      };

      mockDbPool.query.mockResolvedValue({
        rows: [
          { id: 'app-456', applicant_id: 'applicant-1' },
          { id: 'app-789', applicant_id: 'applicant-2' },
        ],
        rowCount: 2,
      } as any);

      const result = await dataValidatorService.detectFraud(applicationData);

      expect(result.riskScore).toBeLessThanOrEqual(100);
    });

    it('should handle database errors gracefully when checking duplicate EIN', async () => {
      const applicationData = {
        id: 'app-123',
        ein: '12-3456789',
        documents: [],
      };

      mockDbPool.query.mockRejectedValue(new Error('Database connection error'));

      const result = await dataValidatorService.detectFraud(applicationData);

      // Should not throw error, just skip duplicate check
      expect(result).toBeDefined();
      expect(result.flags).toBeDefined();
    });
  });

  describe('Validation Error Handling and Edge Cases', () => {
    beforeEach(() => {
      // Set API key to ensure non-mock path is used
      process.env.EIN_VERIFICATION_API_KEY = 'test-api-key';
      delete process.env.USE_MOCK_EIN_VERIFICATION;
    });

    afterEach(() => {
      delete process.env.EIN_VERIFICATION_API_KEY;
    });

    it('should handle empty EIN gracefully', async () => {
      const mockApiResponse = {
        isValid: false,
        businessName: '',
        businessNameMatch: false,
        status: 'INVALID',
        details: {},
      };

      (einVerificationClient.verifyEIN as jest.Mock).mockResolvedValue(mockApiResponse);

      const result = await dataValidatorService.verifyEIN('', 'Sample Business LLC');

      expect(result.isValid).toBe(false);
      expect(result.matchConfidence).toBe(0);
    });

    it('should handle empty business name gracefully', async () => {
      const mockApiResponse = {
        isValid: true,
        businessName: '',
        businessNameMatch: false,
        status: 'ACTIVE',
        details: {},
      };

      (einVerificationClient.verifyEIN as jest.Mock).mockResolvedValue(mockApiResponse);

      const result = await dataValidatorService.verifyEIN('12-3456789', '');

      expect(result.isValid).toBe(false);
      expect(result.matchConfidence).toBe(50);
    });

    it('should handle null/undefined in contact validation', async () => {
      const contactInfo = {
        email: '',
        phone: '',
        address: {
          street: '',
          city: '',
          state: '',
          zipCode: '',
        },
      };

      const result = await dataValidatorService.validateContactInfo(contactInfo);

      expect(result.isValid).toBe(false);
    });

    it('should handle application data without documents', async () => {
      const applicationData = {
        id: 'app-123',
        ein: '12-3456789',
      };

      mockDbPool.query.mockResolvedValue({
        rows: [],
        rowCount: 0,
      } as any);

      const result = await dataValidatorService.detectFraud(applicationData);

      expect(result).toBeDefined();
      expect(result.flags).toBeDefined();
    });

    it('should handle application data without EIN', async () => {
      const applicationData = {
        id: 'app-123',
        documents: [],
      };

      const result = await dataValidatorService.detectFraud(applicationData);

      expect(result).toBeDefined();
      expect(result.flags).toBeDefined();
    });

    it('should handle network timeout errors', async () => {
      (einVerificationClient.verifyEIN as jest.Mock).mockRejectedValue(
        new Error('ETIMEDOUT')
      );

      const result = await dataValidatorService.verifyEIN('12-3456789', 'Sample Business LLC');

      expect(result.isValid).toBe(false);
      expect(result.source).toBe('ERROR');
      expect(result.details.error).toBe('ETIMEDOUT');
    });

    it('should handle special characters in email validation', async () => {
      const contactInfo = {
        email: 'test+tag@example.com',
        phone: '555-123-4567',
        address: {
          street: '123 Main St',
          city: 'Springfield',
          state: 'IL',
          zipCode: '62701',
        },
      };

      const result = await dataValidatorService.validateContactInfo(contactInfo);

      expect(result.email?.isValid).toBe(true);
    });

    it('should handle extended ZIP code format', async () => {
      const contactInfo = {
        email: 'test@example.com',
        phone: '555-123-4567',
        address: {
          street: '123 Main St',
          city: 'Springfield',
          state: 'IL',
          zipCode: '62701-1234',
        },
      };

      const result = await dataValidatorService.validateContactInfo(contactInfo);

      expect(result.address?.isValid).toBe(true);
    });

    it('should handle phone numbers with various formatting', async () => {
      const formats = [
        '(555) 123-4567',
        '555.123.4567',
        '555 123 4567',
        '+1-555-123-4567',
      ];

      for (const phone of formats) {
        const contactInfo = {
          email: 'test@example.com',
          phone,
          address: {
            street: '123 Main St',
            city: 'Springfield',
            state: 'IL',
            zipCode: '62701',
          },
        };

        const result = await dataValidatorService.validateContactInfo(contactInfo);
        expect(result.phone?.isValid).toBe(true);
      }
    });
  });
});
