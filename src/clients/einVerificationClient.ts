/**
 * EIN Verification Client
 * Integrates with IRS or third-party EIN verification API
 * Implements circuit breaker pattern for resilience
 */

import axios, { AxiosInstance } from 'axios';
import CircuitBreaker from 'opossum';
import logger from '../utils/logger';
import { createCircuitBreaker, createCircuitBreakerError } from '../utils/circuitBreaker';
import { ExternalServiceError } from '../utils/errors';

export interface EINVerificationRequest {
  ein: string;
  businessName: string;
}

export interface EINVerificationResponse {
  isValid: boolean;
  businessName?: string;
  businessNameMatch: boolean;
  status: string;
  details?: Record<string, any>;
}

class EINVerificationClient {
  private client: AxiosInstance;
  private apiKey: string;
  private baseUrl: string;
  private circuitBreaker: CircuitBreaker<any, EINVerificationResponse>;
  private useMock: boolean;

  constructor() {
    this.apiKey = process.env.EIN_VERIFICATION_API_KEY || '';
    this.baseUrl = process.env.EIN_VERIFICATION_API_URL || 'https://api.ein-verification.example.com';
    this.useMock = process.env.USE_MOCK_EIN_VERIFICATION === 'true';
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    // Create circuit breaker for EIN verification
    this.circuitBreaker = createCircuitBreaker(
      this.verifyEINInternal.bind(this),
      {
        timeout: 10000, // 10 seconds
        errorThresholdPercentage: 50, // Open after 50% failures
        resetTimeout: 60000, // Try to close after 1 minute
        rollingCountTimeout: 30000, // 30 second rolling window
        name: 'EINVerificationService',
      }
    );

    // Set up fallback to mock verification when circuit is open
    this.circuitBreaker.fallback(async (ein: string, businessName: string) => {
      logger.warn('EIN verification circuit breaker open, using fallback', {
        ein: this.maskEIN(ein),
      });
      return this.mockVerifyEIN(ein, businessName);
    });
  }

  /**
   * Verify EIN with circuit breaker protection
   * Public method that uses circuit breaker
   */
  async verifyEIN(
    ein: string,
    businessName: string
  ): Promise<EINVerificationResponse> {
    // Use mock if configured
    if (this.useMock) {
      logger.info('Using mock EIN verification (configured)');
      return this.mockVerifyEIN(ein, businessName);
    }

    try {
      // Call through circuit breaker
      const result = await this.circuitBreaker.fire(ein, businessName);
      return result;
    } catch (error: any) {
      // If circuit breaker is open, throw specific error
      if (this.circuitBreaker.opened) {
        throw createCircuitBreakerError('EIN Verification Service');
      }

      // Otherwise, wrap and throw the original error
      if (error.response) {
        throw new ExternalServiceError(
          'EIN Verification Service',
          error.response.data?.message || error.message,
          { status: error.response.status }
        );
      }

      throw new ExternalServiceError('EIN Verification Service', error.message);
    }
  }

  /**
   * Internal verification method with retry logic
   * Called by circuit breaker
   */
  private async verifyEINInternal(
    ein: string,
    businessName: string,
    maxRetries: number = 3
  ): Promise<EINVerificationResponse> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        logger.info(`EIN verification attempt ${attempt + 1} for EIN: ${this.maskEIN(ein)}`);

        const response = await this.client.post<EINVerificationResponse>('/verify', {
          ein: ein.replace(/\D/g, ''), // Remove non-digits
          businessName,
        });

        logger.info(`EIN verification successful for EIN: ${this.maskEIN(ein)}`);
        return response.data;
      } catch (error: any) {
        lastError = error;
        
        // Don't retry on client errors (4xx)
        if (error.response && error.response.status >= 400 && error.response.status < 500) {
          logger.warn(`EIN verification failed with client error: ${error.message}`);
          throw error;
        }

        // Calculate exponential backoff delay
        if (attempt < maxRetries - 1) {
          const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
          logger.warn(`EIN verification failed, retrying in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }

    logger.error(`EIN verification failed after ${maxRetries} attempts`);
    throw lastError || new Error('EIN verification failed');
  }

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus() {
    return {
      name: this.circuitBreaker.name,
      state: this.circuitBreaker.opened ? 'OPEN' : this.circuitBreaker.halfOpen ? 'HALF_OPEN' : 'CLOSED',
      stats: this.circuitBreaker.stats,
    };
  }

  /**
   * Mock verification for development/testing
   */
  async mockVerifyEIN(ein: string, businessName: string): Promise<EINVerificationResponse> {
    logger.info(`Mock EIN verification for EIN: ${this.maskEIN(ein)}`);

    // Simulate API delay
    await this.sleep(500);

    // Mock validation logic
    const isValidFormat = /^\d{2}-?\d{7}$/.test(ein);
    const businessNameMatch = businessName.length > 0;

    return {
      isValid: isValidFormat,
      businessName: businessName,
      businessNameMatch,
      status: isValidFormat ? 'ACTIVE' : 'INVALID',
      details: {
        mock: true,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Mask EIN for logging (show only last 4 digits)
   */
  private maskEIN(ein: string): string {
    const cleaned = ein.replace(/\D/g, '');
    if (cleaned.length >= 4) {
      return `***-***${cleaned.slice(-4)}`;
    }
    return '***-******';
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default new EINVerificationClient();
