/**
 * Circuit Breaker Utility
 * Implements circuit breaker pattern for external service calls
 */

import CircuitBreaker from 'opossum';
import logger from './logger';
import { ExternalServiceError } from './errors';

export interface CircuitBreakerOptions {
  timeout?: number; // Request timeout in ms
  errorThresholdPercentage?: number; // Percentage of failures to open circuit
  resetTimeout?: number; // Time in ms before attempting to close circuit
  rollingCountTimeout?: number; // Time window for error percentage calculation
  rollingCountBuckets?: number; // Number of buckets in rolling window
  name?: string; // Circuit breaker name for logging
}

/**
 * Default circuit breaker options
 */
const DEFAULT_OPTIONS: CircuitBreakerOptions = {
  timeout: 10000, // 10 seconds
  errorThresholdPercentage: 50, // Open circuit if 50% of requests fail
  resetTimeout: 30000, // Try to close circuit after 30 seconds
  rollingCountTimeout: 10000, // 10 second rolling window
  rollingCountBuckets: 10, // 10 buckets of 1 second each
};

/**
 * Create a circuit breaker for an async function
 */
export function createCircuitBreaker<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  options: CircuitBreakerOptions = {}
): CircuitBreaker<T, R> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const name = opts.name || fn.name || 'anonymous';

  const breaker = new CircuitBreaker(fn, {
    timeout: opts.timeout,
    errorThresholdPercentage: opts.errorThresholdPercentage,
    resetTimeout: opts.resetTimeout,
    rollingCountTimeout: opts.rollingCountTimeout,
    rollingCountBuckets: opts.rollingCountBuckets,
    name,
  });

  // Event listeners for monitoring
  breaker.on('open', () => {
    logger.error(`Circuit breaker opened for ${name}`, {
      circuitBreaker: name,
      state: 'OPEN',
      stats: breaker.stats,
    });
  });

  breaker.on('halfOpen', () => {
    logger.warn(`Circuit breaker half-open for ${name}`, {
      circuitBreaker: name,
      state: 'HALF_OPEN',
    });
  });

  breaker.on('close', () => {
    logger.info(`Circuit breaker closed for ${name}`, {
      circuitBreaker: name,
      state: 'CLOSED',
    });
  });

  breaker.on('timeout', () => {
    logger.warn(`Circuit breaker timeout for ${name}`, {
      circuitBreaker: name,
      timeout: opts.timeout,
    });
  });

  breaker.on('reject', () => {
    logger.warn(`Circuit breaker rejected request for ${name}`, {
      circuitBreaker: name,
      state: breaker.opened ? 'OPEN' : 'UNKNOWN',
    });
  });

  breaker.on('failure', (error) => {
    logger.error(`Circuit breaker failure for ${name}`, {
      circuitBreaker: name,
      error: error.message,
      stats: breaker.stats,
    });
  });

  return breaker;
}

/**
 * Circuit breaker with fallback function
 */
export function createCircuitBreakerWithFallback<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  fallback: (...args: T) => Promise<R> | R,
  options: CircuitBreakerOptions = {}
): CircuitBreaker<T, R> {
  const breaker = createCircuitBreaker(fn, options);
  breaker.fallback(fallback);
  return breaker;
}

/**
 * Get circuit breaker statistics
 */
export function getCircuitBreakerStats(breaker: CircuitBreaker<any, any>) {
  return {
    name: breaker.name,
    state: breaker.opened ? 'OPEN' : breaker.halfOpen ? 'HALF_OPEN' : 'CLOSED',
    stats: breaker.stats,
    enabled: breaker.enabled,
  };
}

/**
 * Monitor circuit breaker health
 * Returns true if circuit is healthy (closed), false otherwise
 */
export function isCircuitHealthy(breaker: CircuitBreaker<any, any>): boolean {
  return !breaker.opened;
}

/**
 * Create error for circuit breaker rejection
 */
export function createCircuitBreakerError(serviceName: string): ExternalServiceError {
  return new ExternalServiceError(
    serviceName,
    `${serviceName} is temporarily unavailable due to repeated failures. Please try again later.`,
    { circuitBreakerOpen: true }
  );
}
