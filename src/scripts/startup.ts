/**
 * Startup Script for Production Deployment
 * 
 * This script runs before the application starts to:
 * 1. Run database migrations
 * 2. Seed demo data if database is empty
 * 3. Verify all services are connected
 * 4. Log startup status
 */

import database from '../config/database';
import redis from '../config/redis';
import migrationRunner from '../database/migrationRunner';
import seedRunner from '../database/seedRunner';
import logger from '../utils/logger';
import config from '../config';

interface StartupStatus {
  success: boolean;
  steps: {
    database: boolean;
    redis: boolean;
    migrations: boolean;
    demoData: boolean;
  };
  errors: string[];
}

class StartupScript {
  private status: StartupStatus = {
    success: false,
    steps: {
      database: false,
      redis: false,
      migrations: false,
      demoData: false,
    },
    errors: [],
  };

  /**
   * Check if database is empty (no applications table or no data)
   */
  private async isDatabaseEmpty(): Promise<boolean> {
    try {
      // Check if applications table exists and has data
      const result = await database.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'applications'
        ) as table_exists
      `);

      if (!result.rows[0].table_exists) {
        return true;
      }

      // Check if table has any data
      const countResult = await database.query('SELECT COUNT(*) as count FROM applications');
      return parseInt(countResult.rows[0].count, 10) === 0;
    } catch (error) {
      logger.warn('Could not determine if database is empty', { error });
      return true; // Assume empty if we can't check
    }
  }

  /**
   * Verify database connection
   */
  private async verifyDatabase(): Promise<boolean> {
    try {
      logger.info('Verifying database connection...');
      const isHealthy = await database.healthCheck();
      
      if (isHealthy) {
        logger.info('✓ Database connection verified');
        this.status.steps.database = true;
        return true;
      } else {
        const error = 'Database health check failed';
        logger.error(error);
        this.status.errors.push(error);
        return false;
      }
    } catch (error: any) {
      const errorMsg = `Database connection error: ${error.message}`;
      logger.error(errorMsg, { error });
      this.status.errors.push(errorMsg);
      return false;
    }
  }

  /**
   * Verify Redis connection
   */
  private async verifyRedis(): Promise<boolean> {
    try {
      logger.info('Verifying Redis connection...');
      await redis.connect();
      const isHealthy = await redis.healthCheck();
      
      if (isHealthy) {
        logger.info('✓ Redis connection verified');
        this.status.steps.redis = true;
        return true;
      } else {
        const error = 'Redis health check failed';
        logger.error(error);
        this.status.errors.push(error);
        return false;
      }
    } catch (error: any) {
      const errorMsg = `Redis connection error: ${error.message}`;
      logger.error(errorMsg, { error });
      this.status.errors.push(errorMsg);
      return false;
    }
  }

  /**
   * Run database migrations
   */
  private async runMigrations(): Promise<boolean> {
    try {
      logger.info('Running database migrations...');
      await migrationRunner.runMigrations();
      logger.info('✓ Database migrations completed');
      this.status.steps.migrations = true;
      return true;
    } catch (error: any) {
      const errorMsg = `Migration error: ${error.message}`;
      logger.error(errorMsg, { error });
      this.status.errors.push(errorMsg);
      return false;
    }
  }

  /**
   * Seed demo data if needed
   */
  private async seedDemoDataIfNeeded(): Promise<boolean> {
    try {
      const demoModeEnabled = process.env.DEMO_MODE_ENABLED === 'true';
      
      if (!demoModeEnabled) {
        logger.info('Demo mode not enabled, skipping demo data seeding');
        this.status.steps.demoData = true;
        return true;
      }

      logger.info('Checking if demo data seeding is needed...');
      const isEmpty = await this.isDatabaseEmpty();
      
      if (isEmpty) {
        logger.info('Database is empty, seeding demo data...');
        await seedRunner.seedDemoData();
        logger.info('✓ Demo data seeded successfully');
      } else {
        logger.info('Database already has data, skipping demo data seeding');
      }
      
      this.status.steps.demoData = true;
      return true;
    } catch (error: any) {
      const errorMsg = `Demo data seeding error: ${error.message}`;
      logger.error(errorMsg, { error });
      this.status.errors.push(errorMsg);
      // Don't fail startup if demo data seeding fails
      return true;
    }
  }

  /**
   * Log startup status summary
   */
  private logStartupStatus(): void {
    logger.info('=== Startup Status Summary ===');
    logger.info(`Environment: ${config.env}`);
    logger.info(`Node Version: ${process.version}`);
    logger.info(`Database: ${this.status.steps.database ? '✓' : '✗'}`);
    logger.info(`Redis: ${this.status.steps.redis ? '✓' : '✗'}`);
    logger.info(`Migrations: ${this.status.steps.migrations ? '✓' : '✗'}`);
    logger.info(`Demo Data: ${this.status.steps.demoData ? '✓' : '✗'}`);
    
    if (this.status.errors.length > 0) {
      logger.error('Startup errors:', { errors: this.status.errors });
    }
    
    if (this.status.success) {
      logger.info('✓ Startup completed successfully');
    } else {
      logger.error('✗ Startup failed');
    }
    logger.info('==============================');
  }

  /**
   * Run all startup tasks
   */
  public async run(): Promise<boolean> {
    logger.info('Starting application initialization...');
    
    try {
      // Step 1: Verify database connection
      const dbOk = await this.verifyDatabase();
      if (!dbOk) {
        this.logStartupStatus();
        return false;
      }

      // Step 2: Verify Redis connection
      const redisOk = await this.verifyRedis();
      if (!redisOk) {
        this.logStartupStatus();
        return false;
      }

      // Step 3: Run migrations
      const migrationsOk = await this.runMigrations();
      if (!migrationsOk) {
        this.logStartupStatus();
        return false;
      }

      // Step 4: Seed demo data if needed
      await this.seedDemoDataIfNeeded();
      // Continue even if demo data seeding fails

      // All critical steps completed
      this.status.success = true;
      this.logStartupStatus();
      
      return true;
    } catch (error: any) {
      logger.error('Unexpected error during startup', { error });
      this.status.errors.push(`Unexpected error: ${error.message}`);
      this.logStartupStatus();
      return false;
    }
  }

  /**
   * Get startup status
   */
  public getStatus(): StartupStatus {
    return this.status;
  }
}

// Export singleton instance
export default new StartupScript();

// Allow running as standalone script
if (require.main === module) {
  const startup = new StartupScript();
  startup.run()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      logger.error('Fatal startup error', { error });
      process.exit(1);
    });
}
