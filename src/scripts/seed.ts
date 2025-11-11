#!/usr/bin/env node

import seedRunner from '../database/seedRunner';
import logger from '../utils/logger';
import config from '../config';

const command = process.argv[2];

async function main() {
  try {
    switch (command) {
      case 'all':
        logger.info('Running all seeds...');
        const includeTestData = config.env === 'development';
        await seedRunner.runSeeds(includeTestData);
        break;
      
      case 'rules':
        logger.info('Seeding program rules...');
        await seedRunner.seedProgramRules();
        break;
      
      case 'test':
        if (config.env === 'production') {
          logger.error('Cannot seed test data in production environment');
          process.exit(1);
        }
        logger.info('Seeding test data...');
        await seedRunner.seedTestData();
        break;
      
      default:
        console.log(`
Usage: npm run seed [command]

Commands:
  all     Run all seeds (includes test data in development only)
  rules   Seed program rules only
  test    Seed test data only (development only)

Examples:
  npm run seed all
  npm run seed rules
  npm run seed test
        `);
        process.exit(0);
    }

    process.exit(0);
  } catch (error) {
    logger.error('Seed script failed', { error });
    process.exit(1);
  }
}

main();
