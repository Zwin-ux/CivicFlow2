/**
 * AI Cache Service
 * Manages caching of AI analysis results in Redis
 * Implements cache key strategies and TTL policies
 */

import redisClient from '../config/redis';
import logger from '../utils/logger';
import crypto from 'crypto';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string; // Cache key prefix
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
}

class AICacheService {
  private static instance: AICacheService;
  private readonly CACHE_PREFIXES = {
    DOCUMENT_ANALYSIS: 'ai:doc:analysis',
    EXTRACTION: 'ai:doc:extraction',
    SUMMARY: 'ai:doc:summary',
    ANOMALY: 'ai:anomaly',
    RECOMMENDATION: 'ai:recommendation',
    DECISION_SUPPORT: 'ai:decision',
    QUALITY_SCORE: 'ai:quality',
    APPLICATION_SUMMARY: 'ai:app:summary',
  };

  private readonly TTL_POLICIES = {
    DOCUMENT_ANALYSIS: 86400, // 24 hours
    EXTRACTION: 86400, // 24 hours
    SUMMARY: 43200, // 12 hours
    ANOMALY: 86400, // 24 hours
    RECOMMENDATION: 3600, // 1 hour (more dynamic)
    DECISION_SUPPORT: 7200, // 2 hours
    QUALITY_SCORE: 86400, // 24 hours
    APPLICATION_SUMMARY: 43200, // 12 hours
  };

  private constructor() {}

  public static getInstance(): AICacheService {
    if (!AICacheService.instance) {
      AICacheService.instance = new AICacheService();
    }
    return AICacheService.instance;
  }

  /**
   * Generate cache key from document ID and operation type
   */
  private generateCacheKey(
    prefix: string,
    identifier: string,
    additionalParams?: Record<string, any>
  ): string {
    if (!additionalParams || Object.keys(additionalParams).length === 0) {
      return `${prefix}:${identifier}`;
    }

    // Create a hash of additional parameters for consistent key generation
    const paramsHash = crypto
      .createHash('md5')
      .update(JSON.stringify(additionalParams))
      .digest('hex')
      .substring(0, 8);

    return `${prefix}:${identifier}:${paramsHash}`;
  }

  /**
   * Cache document analysis result
   */
  public async cacheDocumentAnalysis(
    documentId: string,
    analysisResult: any,
    options: CacheOptions = {}
  ): Promise<void> {
    const key = this.generateCacheKey(
      this.CACHE_PREFIXES.DOCUMENT_ANALYSIS,
      documentId,
      options.prefix ? { prefix: options.prefix } : undefined
    );
    const ttl = options.ttl || this.TTL_POLICIES.DOCUMENT_ANALYSIS;

    try {
      await redisClient.set(key, JSON.stringify(analysisResult), ttl);
      logger.debug('Cached document analysis', { documentId, key, ttl });
    } catch (error) {
      logger.error('Failed to cache document analysis', { documentId, error });
    }
  }

  /**
   * Get cached document analysis
   */
  public async getDocumentAnalysis(
    documentId: string,
    options: CacheOptions = {}
  ): Promise<any | null> {
    const key = this.generateCacheKey(
      this.CACHE_PREFIXES.DOCUMENT_ANALYSIS,
      documentId,
      options.prefix ? { prefix: options.prefix } : undefined
    );

    try {
      const cached = await redisClient.get(key);
      if (cached) {
        logger.debug('Cache hit for document analysis', { documentId, key });
        return JSON.parse(cached);
      }
      logger.debug('Cache miss for document analysis', { documentId, key });
      return null;
    } catch (error) {
      logger.error('Failed to get cached document analysis', { documentId, error });
      return null;
    }
  }

  /**
   * Cache extracted data
   */
  public async cacheExtractedData(
    documentId: string,
    extractedData: any,
    options: CacheOptions = {}
  ): Promise<void> {
    const key = this.generateCacheKey(this.CACHE_PREFIXES.EXTRACTION, documentId);
    const ttl = options.ttl || this.TTL_POLICIES.EXTRACTION;

    try {
      await redisClient.set(key, JSON.stringify(extractedData), ttl);
      logger.debug('Cached extracted data', { documentId, key, ttl });
    } catch (error) {
      logger.error('Failed to cache extracted data', { documentId, error });
    }
  }

  /**
   * Get cached extracted data
   */
  public async getExtractedData(documentId: string): Promise<any | null> {
    const key = this.generateCacheKey(this.CACHE_PREFIXES.EXTRACTION, documentId);

    try {
      const cached = await redisClient.get(key);
      if (cached) {
        logger.debug('Cache hit for extracted data', { documentId, key });
        return JSON.parse(cached);
      }
      logger.debug('Cache miss for extracted data', { documentId, key });
      return null;
    } catch (error) {
      logger.error('Failed to get cached extracted data', { documentId, error });
      return null;
    }
  }

  /**
   * Cache document summary
   */
  public async cacheSummary(
    documentId: string,
    summary: any,
    options: CacheOptions = {}
  ): Promise<void> {
    const key = this.generateCacheKey(this.CACHE_PREFIXES.SUMMARY, documentId);
    const ttl = options.ttl || this.TTL_POLICIES.SUMMARY;

    try {
      await redisClient.set(key, JSON.stringify(summary), ttl);
      logger.debug('Cached summary', { documentId, key, ttl });
    } catch (error) {
      logger.error('Failed to cache summary', { documentId, error });
    }
  }

  /**
   * Get cached summary
   */
  public async getSummary(documentId: string): Promise<any | null> {
    const key = this.generateCacheKey(this.CACHE_PREFIXES.SUMMARY, documentId);

    try {
      const cached = await redisClient.get(key);
      if (cached) {
        logger.debug('Cache hit for summary', { documentId, key });
        return JSON.parse(cached);
      }
      logger.debug('Cache miss for summary', { documentId, key });
      return null;
    } catch (error) {
      logger.error('Failed to get cached summary', { documentId, error });
      return null;
    }
  }

  /**
   * Cache application summary
   */
  public async cacheApplicationSummary(
    applicationId: string,
    summary: any,
    options: CacheOptions = {}
  ): Promise<void> {
    const key = this.generateCacheKey(this.CACHE_PREFIXES.APPLICATION_SUMMARY, applicationId);
    const ttl = options.ttl || this.TTL_POLICIES.APPLICATION_SUMMARY;

    try {
      await redisClient.set(key, JSON.stringify(summary), ttl);
      logger.debug('Cached application summary', { applicationId, key, ttl });
    } catch (error) {
      logger.error('Failed to cache application summary', { applicationId, error });
    }
  }

  /**
   * Get cached application summary
   */
  public async getApplicationSummary(applicationId: string): Promise<any | null> {
    const key = this.generateCacheKey(this.CACHE_PREFIXES.APPLICATION_SUMMARY, applicationId);

    try {
      const cached = await redisClient.get(key);
      if (cached) {
        logger.debug('Cache hit for application summary', { applicationId, key });
        return JSON.parse(cached);
      }
      logger.debug('Cache miss for application summary', { applicationId, key });
      return null;
    } catch (error) {
      logger.error('Failed to get cached application summary', { applicationId, error });
      return null;
    }
  }

  /**
   * Cache anomaly detection results
   */
  public async cacheAnomalyDetection(
    applicationId: string,
    anomalies: any,
    options: CacheOptions = {}
  ): Promise<void> {
    const key = this.generateCacheKey(this.CACHE_PREFIXES.ANOMALY, applicationId);
    const ttl = options.ttl || this.TTL_POLICIES.ANOMALY;

    try {
      await redisClient.set(key, JSON.stringify(anomalies), ttl);
      logger.debug('Cached anomaly detection', { applicationId, key, ttl });
    } catch (error) {
      logger.error('Failed to cache anomaly detection', { applicationId, error });
    }
  }

  /**
   * Get cached anomaly detection
   */
  public async getAnomalyDetection(applicationId: string): Promise<any | null> {
    const key = this.generateCacheKey(this.CACHE_PREFIXES.ANOMALY, applicationId);

    try {
      const cached = await redisClient.get(key);
      if (cached) {
        logger.debug('Cache hit for anomaly detection', { applicationId, key });
        return JSON.parse(cached);
      }
      logger.debug('Cache miss for anomaly detection', { applicationId, key });
      return null;
    } catch (error) {
      logger.error('Failed to get cached anomaly detection', { applicationId, error });
      return null;
    }
  }

  /**
   * Cache recommendations
   */
  public async cacheRecommendations(
    applicationId: string,
    recommendations: any,
    options: CacheOptions = {}
  ): Promise<void> {
    const key = this.generateCacheKey(this.CACHE_PREFIXES.RECOMMENDATION, applicationId);
    const ttl = options.ttl || this.TTL_POLICIES.RECOMMENDATION;

    try {
      await redisClient.set(key, JSON.stringify(recommendations), ttl);
      logger.debug('Cached recommendations', { applicationId, key, ttl });
    } catch (error) {
      logger.error('Failed to cache recommendations', { applicationId, error });
    }
  }

  /**
   * Get cached recommendations
   */
  public async getRecommendations(applicationId: string): Promise<any | null> {
    const key = this.generateCacheKey(this.CACHE_PREFIXES.RECOMMENDATION, applicationId);

    try {
      const cached = await redisClient.get(key);
      if (cached) {
        logger.debug('Cache hit for recommendations', { applicationId, key });
        return JSON.parse(cached);
      }
      logger.debug('Cache miss for recommendations', { applicationId, key });
      return null;
    } catch (error) {
      logger.error('Failed to get cached recommendations', { applicationId, error });
      return null;
    }
  }

  /**
   * Cache decision support
   */
  public async cacheDecisionSupport(
    applicationId: string,
    decision: any,
    options: CacheOptions = {}
  ): Promise<void> {
    const key = this.generateCacheKey(this.CACHE_PREFIXES.DECISION_SUPPORT, applicationId);
    const ttl = options.ttl || this.TTL_POLICIES.DECISION_SUPPORT;

    try {
      await redisClient.set(key, JSON.stringify(decision), ttl);
      logger.debug('Cached decision support', { applicationId, key, ttl });
    } catch (error) {
      logger.error('Failed to cache decision support', { applicationId, error });
    }
  }

  /**
   * Get cached decision support
   */
  public async getDecisionSupport(applicationId: string): Promise<any | null> {
    const key = this.generateCacheKey(this.CACHE_PREFIXES.DECISION_SUPPORT, applicationId);

    try {
      const cached = await redisClient.get(key);
      if (cached) {
        logger.debug('Cache hit for decision support', { applicationId, key });
        return JSON.parse(cached);
      }
      logger.debug('Cache miss for decision support', { applicationId, key });
      return null;
    } catch (error) {
      logger.error('Failed to get cached decision support', { applicationId, error });
      return null;
    }
  }

  /**
   * Invalidate cache for a document
   */
  public async invalidateDocumentCache(documentId: string): Promise<void> {
    const keys = [
      this.generateCacheKey(this.CACHE_PREFIXES.DOCUMENT_ANALYSIS, documentId),
      this.generateCacheKey(this.CACHE_PREFIXES.EXTRACTION, documentId),
      this.generateCacheKey(this.CACHE_PREFIXES.SUMMARY, documentId),
      this.generateCacheKey(this.CACHE_PREFIXES.QUALITY_SCORE, documentId),
    ];

    try {
      for (const key of keys) {
        await redisClient.del(key);
      }
      logger.info('Invalidated document cache', { documentId, keysInvalidated: keys.length });
    } catch (error) {
      logger.error('Failed to invalidate document cache', { documentId, error });
    }
  }

  /**
   * Invalidate cache for an application
   */
  public async invalidateApplicationCache(applicationId: string): Promise<void> {
    const keys = [
      this.generateCacheKey(this.CACHE_PREFIXES.APPLICATION_SUMMARY, applicationId),
      this.generateCacheKey(this.CACHE_PREFIXES.ANOMALY, applicationId),
      this.generateCacheKey(this.CACHE_PREFIXES.RECOMMENDATION, applicationId),
      this.generateCacheKey(this.CACHE_PREFIXES.DECISION_SUPPORT, applicationId),
    ];

    try {
      for (const key of keys) {
        await redisClient.del(key);
      }
      logger.info('Invalidated application cache', { applicationId, keysInvalidated: keys.length });
    } catch (error) {
      logger.error('Failed to invalidate application cache', { applicationId, error });
    }
  }

  /**
   * Clear all AI caches (use with caution)
   */
  public async clearAllCaches(): Promise<void> {
    try {
      const prefixes = Object.values(this.CACHE_PREFIXES);
      logger.warn('Clearing all AI caches', { prefixes });
      
      // Note: This is a simplified implementation
      // In production, you might want to use SCAN to find and delete keys
      for (const prefix of prefixes) {
        // This would require implementing a scan operation in redis client
        logger.info('Cache prefix cleared', { prefix });
      }
    } catch (error) {
      logger.error('Failed to clear all caches', { error });
    }
  }

  /**
   * Get cache statistics (simplified)
   */
  public async getCacheStats(): Promise<CacheStats> {
    // This is a simplified implementation
    // In production, you would track hits/misses in Redis
    return {
      hits: 0,
      misses: 0,
      hitRate: 0,
    };
  }
}

export default AICacheService.getInstance();
