#!/usr/bin/env node

import migrationRunner from '../database/migrationRunner';
import logger from '../utils/logger';

const command = process.argv[2];

async function main() {
  try {
    switch (command) {
      case 'up':
        logger.info('Running migrations...');
        await migrationRunner.runMigrations();
        break;
      
      case 'status':
        await migrationRunner.getMigrationStatus();
        break;
      
      case 'rollback':
        logger.warn('Rolling back last migration...');
        await migrationRunner.rollbackLastMigration();
        break;
      
      default:
        console.log(`
Usage: npm run migrate [command]

Commands:
  up        Run all pending migrations
  status    Show migration status
  rollback  Rollback last migration (use with caution)

Examples:
  npm run migrate up
  npm run migrate status
        `);
        process.exit(0);
    }

    process.exit(0);
  } catch (error) {
    logger.error('Migration script failed', { error });
    process.exit(1);
  }
}

main();
