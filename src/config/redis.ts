import { createClient, RedisClientType } from 'redis';
import config from './index';
import logger from '../utils/logger';
import demoModeManager from '../services/demoModeManager';

class RedisClient {
  private client: RedisClientType | null = null;
  private static instance: RedisClient;
  private isConnected: boolean = false;
  private mockCache: Map<string, { value: string; expiry?: number }> = new Map();

  private constructor() {
    // Don't initialize client if demo mode is already active
    if (demoModeManager.isActive()) {
      logger.info('Redis client not initialized - demo mode is active');
      return;
    }

    try {
      this.client = createClient({
        socket: {
          host: config.redis.host,
          port: config.redis.port,
        },
        password: config.redis.password,
        database: config.redis.db,
      });

      // Handle connection events
      this.client.on('connect', () => {
        logger.info('Redis client connecting');
      });

      this.client.on('ready', () => {
        this.isConnected = true;
        demoModeManager.resetFailures();
        logger.info('Redis client ready');
      });

      this.client.on('error', (err: Error) => {
        logger.error('Redis client error', { error: err });
        demoModeManager.recordFailure('redis', err);
      });

      this.client.on('end', () => {
        this.isConnected = false;
        logger.info('Redis client disconnected');
      });
    } catch (error: any) {
      logger.error('Failed to initialize Redis client', { error });
      demoModeManager.recordFailure('redis', error);
    }
  }

  public static getInstance(): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
    }
    return RedisClient.instance;
  }

  public async connect(): Promise<void> {
    if (demoModeManager.isActive()) {
      logger.info('Redis connect skipped - demo mode is active');
      return;
    }

    if (!this.isConnected && this.client) {
      try {
        await this.client.connect();
        demoModeManager.resetFailures();
      } catch (error: any) {
        logger.error('Redis connection failed', { error });
        demoModeManager.recordFailure('redis', error);
        
        if (demoModeManager.isActive()) {
          logger.info('Demo mode activated, Redis operations will use in-memory cache');
        } else {
          throw error;
        }
      }
    }
  }

  public async get(key: string): Promise<string | null> {
    if (demoModeManager.isActive()) {
      return this.mockGet(key);
    }

    try {
      if (!this.client) throw new Error('Redis client not initialized');
      return await this.client.get(key);
    } catch (error) {
      logger.error('Redis GET error', { key, error });
      demoModeManager.recordFailure('redis', error);
      
      if (demoModeManager.isActive()) {
        return this.mockGet(key);
      }
      throw error;
    }
  }

  public async set(key: string, value: string, ttl?: number): Promise<void> {
    if (demoModeManager.isActive()) {
      this.mockSet(key, value, ttl);
      return;
    }

    try {
      if (!this.client) throw new Error('Redis client not initialized');
      if (ttl) {
        await this.client.setEx(key, ttl, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      logger.error('Redis SET error', { key, error });
      demoModeManager.recordFailure('redis', error);
      
      if (demoModeManager.isActive()) {
        this.mockSet(key, value, ttl);
      } else {
        throw error;
      }
    }
  }

  public async del(key: string): Promise<void> {
    if (demoModeManager.isActive()) {
      this.mockCache.delete(key);
      return;
    }

    try {
      if (!this.client) throw new Error('Redis client not initialized');
      await this.client.del(key);
    } catch (error) {
      logger.error('Redis DEL error', { key, error });
      demoModeManager.recordFailure('redis', error);
      
      if (demoModeManager.isActive()) {
        this.mockCache.delete(key);
      } else {
        throw error;
      }
    }
  }

  public async exists(key: string): Promise<boolean> {
    if (demoModeManager.isActive()) {
      return this.mockCache.has(key);
    }

    try {
      if (!this.client) throw new Error('Redis client not initialized');
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Redis EXISTS error', { key, error });
      demoModeManager.recordFailure('redis', error);
      
      if (demoModeManager.isActive()) {
        return this.mockCache.has(key);
      }
      throw error;
    }
  }

  public async rPush(key: string, value: string): Promise<number> {
    if (demoModeManager.isActive()) {
      return 1; // Mock response
    }
    try {
      if (!this.client) throw new Error('Redis client not initialized');
      return await this.client.rPush(key, value);
    } catch (error) {
      logger.error('Redis RPUSH error', { key, error });
      if (demoModeManager.isActive()) return 1;
      throw error;
    }
  }

  public async lPop(key: string): Promise<string | null> {
    if (demoModeManager.isActive()) {
      return null; // Mock response
    }
    try {
      if (!this.client) throw new Error('Redis client not initialized');
      return await this.client.lPop(key);
    } catch (error) {
      logger.error('Redis LPOP error', { key, error });
      if (demoModeManager.isActive()) return null;
      throw error;
    }
  }

  public async lLen(key: string): Promise<number> {
    if (demoModeManager.isActive()) {
      return 0; // Mock response
    }
    try {
      if (!this.client) throw new Error('Redis client not initialized');
      return await this.client.lLen(key);
    } catch (error) {
      logger.error('Redis LLEN error', { key, error });
      if (demoModeManager.isActive()) return 0;
      throw error;
    }
  }

  public async hincrby(key: string, field: string, increment: number): Promise<number> {
    if (demoModeManager.isActive()) {
      return increment; // Mock response
    }
    try {
      if (!this.client) throw new Error('Redis client not initialized');
      return await this.client.hIncrBy(key, field, increment);
    } catch (error) {
      logger.error('Redis HINCRBY error', { key, field, increment, error });
      if (demoModeManager.isActive()) return increment;
      throw error;
    }
  }

  public async hgetall(key: string): Promise<Record<string, string>> {
    if (demoModeManager.isActive()) {
      return {}; // Mock response
    }
    try {
      if (!this.client) throw new Error('Redis client not initialized');
      return await this.client.hGetAll(key);
    } catch (error) {
      logger.error('Redis HGETALL error', { key, error });
      if (demoModeManager.isActive()) return {};
      throw error;
    }
  }

  public async zadd(key: string, score: number, member: string): Promise<number> {
    if (demoModeManager.isActive()) {
      return 1; // Mock response
    }
    try {
      if (!this.client) throw new Error('Redis client not initialized');
      return await this.client.zAdd(key, { score, value: member });
    } catch (error) {
      logger.error('Redis ZADD error', { key, score, member, error });
      if (demoModeManager.isActive()) return 1;
      throw error;
    }
  }

  public async zremrangebyscore(key: string, min: number, max: number): Promise<number> {
    if (demoModeManager.isActive()) {
      return 0; // Mock response
    }
    try {
      if (!this.client) throw new Error('Redis client not initialized');
      return await this.client.zRemRangeByScore(key, min, max);
    } catch (error) {
      logger.error('Redis ZREMRANGEBYSCORE error', { key, min, max, error });
      if (demoModeManager.isActive()) return 0;
      throw error;
    }
  }

  public async zcount(key: string, min: number, max: number): Promise<number> {
    if (demoModeManager.isActive()) {
      return 0; // Mock response
    }
    try {
      if (!this.client) throw new Error('Redis client not initialized');
      return await this.client.zCount(key, min, max);
    } catch (error) {
      logger.error('Redis ZCOUNT error', { key, min, max, error });
      if (demoModeManager.isActive()) return 0;
      throw error;
    }
  }

  public async expire(key: string, seconds: number): Promise<boolean> {
    if (demoModeManager.isActive()) {
      return true; // Mock response
    }
    try {
      if (!this.client) throw new Error('Redis client not initialized');
      return await this.client.expire(key, seconds);
    } catch (error) {
      logger.error('Redis EXPIRE error', { key, seconds, error });
      if (demoModeManager.isActive()) return true;
      throw error;
    }
  }

  public async healthCheck(): Promise<boolean> {
    if (demoModeManager.isActive()) {
      return true; // Always healthy in demo mode
    }

    try {
      if (!this.client) return false;
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Redis health check failed', { error });
      return false;
    }
  }

  public async close(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      logger.info('Redis client closed');
    }
  }

  public getClient(): RedisClientType {
    if (!this.client) {
      throw new Error('Redis client not available - running in demo mode');
    }
    return this.client;
  }

  // Mock methods for demo mode
  private mockGet(key: string): string | null {
    const cached = this.mockCache.get(key);
    if (!cached) return null;
    
    // Check expiry
    if (cached.expiry && Date.now() > cached.expiry) {
      this.mockCache.delete(key);
      return null;
    }
    
    return cached.value;
  }

  private mockSet(key: string, value: string, ttl?: number): void {
    const expiry = ttl ? Date.now() + (ttl * 1000) : undefined;
    this.mockCache.set(key, { value, expiry });
    logger.debug('Mock Redis SET', { key, ttl });
  }

  public isDemoMode(): boolean {
    return demoModeManager.isActive();
  }
}

export default RedisClient.getInstance();
