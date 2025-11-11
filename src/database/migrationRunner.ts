import fs from 'fs';
import path from 'path';
import database from '../config/database';
import logger from '../utils/logger';

interface Migration {
  id: number;
  name: string;
  filename: string;
  sql: string;
}

class MigrationRunner {
  private migrationsPath: string;

  constructor() {
    this.migrationsPath = path.join(__dirname, 'migrations');
  }

  /**
   * Initialize migrations tracking table
   */
  private async initializeMigrationsTable(): Promise<void> {
    const sql = `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        migration_name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT NOW()
      );
    `;
    
    await database.query(sql);
    logger.info('Migrations tracking table initialized');
  }

  /**
   * Get list of executed migrations
   */
  private async getExecutedMigrations(): Promise<string[]> {
    const result = await database.query(
      'SELECT migration_name FROM schema_migrations ORDER BY id'
    );
    return result.rows.map(row => row.migration_name);
  }

  /**
   * Load migration files from disk
   */
  private loadMigrationFiles(): Migration[] {
    if (!fs.existsSync(this.migrationsPath)) {
      logger.warn('Migrations directory not found');
      return [];
    }

    const files = fs.readdirSync(this.migrationsPath)
      .filter(file => file.endsWith('.sql'))
      .sort();

    return files.map(filename => {
      const match = filename.match(/^(\d+)_(.+)\.sql$/);
      if (!match) {
        throw new Error(`Invalid migration filename: ${filename}`);
      }

      const id = parseInt(match[1], 10);
      const name = match[2];
      const filepath = path.join(this.migrationsPath, filename);
      const sql = fs.readFileSync(filepath, 'utf-8');

      return { id, name, filename, sql };
    });
  }

  /**
   * Execute a single migration
   */
  private async executeMigration(migration: Migration): Promise<void> {
    logger.info(`Executing migration: ${migration.filename}`);
    
    await database.transaction(async (client) => {
      // Execute migration SQL
      await client.query(migration.sql);
      
      // Record migration execution
      await client.query(
        'INSERT INTO schema_migrations (migration_name) VALUES ($1)',
        [migration.filename]
      );
    });

    logger.info(`Migration completed: ${migration.filename}`);
  }

  /**
   * Run all pending migrations
   */
  public async runMigrations(): Promise<void> {
    try {
      logger.info('Starting database migrations...');
      
      // Initialize migrations table
      await this.initializeMigrationsTable();
      
      // Get executed migrations
      const executedMigrations = await this.getExecutedMigrations();
      logger.info(`Found ${executedMigrations.length} executed migrations`);
      
      // Load migration files
      const allMigrations = this.loadMigrationFiles();
      logger.info(`Found ${allMigrations.length} migration files`);
      
      // Filter pending migrations
      const pendingMigrations = allMigrations.filter(
        migration => !executedMigrations.includes(migration.filename)
      );
      
      if (pendingMigrations.length === 0) {
        logger.info('No pending migrations');
        return;
      }
      
      logger.info(`Running ${pendingMigrations.length} pending migrations`);
      
      // Execute pending migrations
      for (const migration of pendingMigrations) {
        await this.executeMigration(migration);
      }
      
      logger.info('All migrations completed successfully');
    } catch (error) {
      logger.error('Migration failed', { error });
      throw error;
    }
  }

  /**
   * Rollback last migration (use with caution)
   */
  public async rollbackLastMigration(): Promise<void> {
    try {
      const result = await database.query(
        'SELECT migration_name FROM schema_migrations ORDER BY id DESC LIMIT 1'
      );
      
      if (result.rows.length === 0) {
        logger.info('No migrations to rollback');
        return;
      }
      
      const migrationName = result.rows[0].migration_name;
      logger.warn(`Rolling back migration: ${migrationName}`);
      
      // Note: Actual rollback SQL would need to be implemented per migration
      // This is a placeholder for the tracking table update
      await database.query(
        'DELETE FROM schema_migrations WHERE migration_name = $1',
        [migrationName]
      );
      
      logger.info(`Rollback completed: ${migrationName}`);
    } catch (error) {
      logger.error('Rollback failed', { error });
      throw error;
    }
  }

  /**
   * Get migration status
   */
  public async getMigrationStatus(): Promise<void> {
    try {
      await this.initializeMigrationsTable();
      
      const executedMigrations = await this.getExecutedMigrations();
      const allMigrations = this.loadMigrationFiles();
      
      console.log('\n=== Migration Status ===\n');
      console.log(`Total migrations: ${allMigrations.length}`);
      console.log(`Executed: ${executedMigrations.length}`);
      console.log(`Pending: ${allMigrations.length - executedMigrations.length}\n`);
      
      allMigrations.forEach(migration => {
        const status = executedMigrations.includes(migration.filename) ? '✓' : '✗';
        console.log(`${status} ${migration.filename}`);
      });
      
      console.log('\n');
    } catch (error) {
      logger.error('Failed to get migration status', { error });
      throw error;
    }
  }
}

export default new MigrationRunner();
