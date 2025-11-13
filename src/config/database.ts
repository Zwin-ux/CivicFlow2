import { Pool, PoolClient, QueryResult } from 'pg';
import config from './index';
import logger from '../utils/logger';
import demoModeManager from '../services/demoModeManager';
import demoDataService from '../services/demoDataService';

class Database {
  private pool: Pool | null = null;
  private static instance: Database;
  private maxRetries = config.demoMode.maxRetries;
  private retryDelay = 1000; // 1 second
  private connectionAttempted = false;

  private constructor() {
    // Don't initialize pool if demo mode is already active
    if (demoModeManager.isActive()) {
      logger.info('Database pool not initialized - demo mode is active');
      return;
    }

    try {
      // Support both connection string and individual parameters
      const connectionString = process.env.DATABASE_URL;
      const isProduction = config.env === 'production';
      
      // Railway-optimized pool configuration
      const poolConfig = connectionString
        ? {
            connectionString,
            ssl: isProduction ? { rejectUnauthorized: false } : false, // SSL for cloud databases
            min: config.database.pool.min,
            max: isProduction ? 5 : config.database.pool.max, // Railway free tier: limit to 5 connections
            idleTimeoutMillis: 30000, // Close idle connections after 30s
            connectionTimeoutMillis: isProduction ? 10000 : 2000, // 10s timeout for cloud
            statement_timeout: 30000, // 30s query timeout
            query_timeout: 30000, // 30s query timeout
            application_name: 'government-lending-crm',
          }
        : {
            host: config.database.host,
            port: config.database.port,
            database: config.database.name,
            user: config.database.user,
            password: config.database.password,
            min: config.database.pool.min,
            max: config.database.pool.max,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
            statement_timeout: 30000,
            query_timeout: 30000,
            application_name: 'government-lending-crm',
          };
      
      this.pool = new Pool(poolConfig);

      // Handle pool errors with retry logic
      this.pool.on('error', (err: Error) => {
        logger.error('Unexpected database pool error', { error: err });
        demoModeManager.recordFailure('database', err);
      });

      // Handle pool connection
      this.pool.on('connect', (client) => {
        logger.info('New database connection established');
        demoModeManager.resetFailures();
        
        // Set connection-level parameters for better performance
        client.query('SET statement_timeout = 30000').catch((err) => {
          logger.warn('Failed to set statement_timeout', { error: err });
        });
      });

      // Handle pool removal (connection closed)
      this.pool.on('remove', () => {
        logger.debug('Database connection removed from pool');
      });
    } catch (error: any) {
      logger.error('Failed to initialize database pool', { error });
      demoModeManager.recordFailure('database', error);
    }
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public async query(text: string, params?: any[]): Promise<QueryResult> {
    // If demo mode is active, return mock data
    if (demoModeManager.isActive()) {
      return this.mockQuery(text, params);
    }

    return this.queryWithRetry(text, params, this.maxRetries);
  }

  private async queryWithRetry(text: string, _params: any[] | undefined, retriesLeft: number): Promise<QueryResult> {
    const start = Date.now();
    try {
      if (!this.pool) {
        throw new Error('Database pool not initialized');
      }

      const result = await this.pool.query(text, _params as any[] | undefined);
      const duration = Date.now() - start;
      
      demoModeManager.resetFailures();
      
      // Log slow queries (> 1 second)
      if (duration > 1000) {
        logger.warn('Slow query detected', { text, duration, rows: result.rowCount });
      } else {
        logger.debug('Executed query', { text, duration, rows: result.rowCount });
      }
      
      return result;
    } catch (error: any) {
      const duration = Date.now() - start;
      
      // Check if error is retryable (connection issues)
      const isRetryable = error.code === 'ECONNREFUSED' || 
                          error.code === 'ENOTFOUND' || 
                          error.code === 'ETIMEDOUT' ||
                          error.code === '57P03' || // cannot_connect_now
                          error.code === '08006' || // connection_failure
                          error.code === '08001';   // sqlclient_unable_to_establish_sqlconnection
      
      demoModeManager.recordFailure('database', error);
      
      if (isRetryable && retriesLeft > 0) {
        logger.warn('Database query failed, retrying...', { 
          text, 
          error: error.message, 
          retriesLeft,
          duration 
        });
        
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * (this.maxRetries - retriesLeft + 1)));
        
        return this.queryWithRetry(text, _params, retriesLeft - 1);
      }
      
      // If demo mode was auto-enabled, return mock data
      if (demoModeManager.isActive()) {
        logger.info('Falling back to demo mode for query');
        return this.mockQuery(text, _params);
      }
      
      logger.error('Database query error', { text, error, duration });
      throw error;
    }
  }

  private mockQuery(text: string, params?: any[]): QueryResult {
    logger.debug('Mock query executed in demo mode', { text });
    
    // Return empty result set for most queries
    const mockResult: QueryResult = {
      command: 'SELECT',
      rowCount: 0,
      oid: 0,
      fields: [],
      rows: [],
    };

    // Handle specific query patterns
    if (text.includes('SELECT NOW()') || text.includes('SELECT version()')) {
      mockResult.rows = [{
        current_time: new Date().toISOString(),
        db_version: 'PostgreSQL 15.0 (Demo Mode)',
      }];
      mockResult.rowCount = 1;
    } else if (text.includes('applications')) {
      // Return demo applications
      const apps = demoDataService.getAllApplications();
      mockResult.rows = apps;
      mockResult.rowCount = apps.length;
    }

    return mockResult;
  }

  public getPool(): Pool {
    if (!this.pool) {
      throw new Error('Database pool not available - running in demo mode');
    }
    return this.pool;
  }

  public async getClient(): Promise<PoolClient> {
    if (demoModeManager.isActive()) {
      throw new Error('Database client not available in demo mode');
    }
    return this.getClientWithRetry(this.maxRetries);
  }

  private async getClientWithRetry(retriesLeft: number): Promise<PoolClient> {
    try {
      if (!this.pool) {
        throw new Error('Database pool not initialized');
      }
      const client = await this.pool.connect();
      demoModeManager.resetFailures();
      return client;
    } catch (error: any) {
      const isRetryable = error.code === 'ECONNREFUSED' || 
                          error.code === 'ENOTFOUND' || 
                          error.code === 'ETIMEDOUT' ||
                          error.code === '57P03' ||
                          error.code === '08006' ||
                          error.code === '08001';
      
      demoModeManager.recordFailure('database', error);
      
      if (isRetryable && retriesLeft > 0) {
        logger.warn('Failed to get database client, retrying...', { 
          error: error.message, 
          retriesLeft 
        });
        
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * (this.maxRetries - retriesLeft + 1)));
        
        return this.getClientWithRetry(retriesLeft - 1);
      }
      
      logger.error('Failed to get database client', { error });
      throw error;
    }
  }

  public async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Transaction rolled back', { error });
      throw error;
    } finally {
      client.release();
    }
  }

  public async healthCheck(): Promise<boolean> {
    if (demoModeManager.isActive()) {
      return true; // Always healthy in demo mode
    }

    try {
      const result = await this.query('SELECT NOW()');
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      logger.error('Database health check failed', { error });
      return false;
    }
  }

  public async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      logger.info('Database pool closed');
    }
  }

  public isDemoMode(): boolean {
    return demoModeManager.isActive();
  }
}

export default Database.getInstance();
