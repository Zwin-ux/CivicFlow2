import logger from '../utils/logger';
import { seedProgramRules } from './seeds/001_program_rules';
import { seedTestData } from './seeds/002_test_data';
import { seed as seedTestUsers } from './seeds/003_test_users';

class SeedRunner {
  /**
   * Run all seed scripts
   */
  public async runSeeds(includeTestData: boolean = false): Promise<void> {
    try {
      logger.info('Starting database seeding...');

      // Always seed program rules
      await seedProgramRules();

      // Optionally seed test data (only in development)
      if (includeTestData) {
        await seedTestData();
        await seedTestUsers();
      }

      logger.info('Database seeding completed successfully');
    } catch (error) {
      logger.error('Seeding failed', { error });
      throw error;
    }
  }

  /**
   * Run only program rules seed
   */
  public async seedProgramRules(): Promise<void> {
    try {
      logger.info('Seeding program rules only...');
      await seedProgramRules();
      logger.info('Program rules seeding completed');
    } catch (error) {
      logger.error('Program rules seeding failed', { error });
      throw error;
    }
  }

  /**
   * Run only test data seed
   */
  public async seedTestData(): Promise<void> {
    try {
      logger.info('Seeding test data only...');
      await seedTestData();
      logger.info('Test data seeding completed');
    } catch (error) {
      logger.error('Test data seeding failed', { error });
      throw error;
    }
  }
}

export default new SeedRunner();
