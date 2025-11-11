import cron from 'node-cron';
import demoModeService from './demoModeService';
import logger from '../utils/logger';

class DemoSessionCleanupJob {
  private job: cron.ScheduledTask | null = null;

  /**
   * Start the cleanup job
   * Runs every 5 minutes to expire old demo sessions
   */
  start(): void {
    if (this.job) {
      logger.warn('Demo session cleanup job is already running');
      return;
    }

    // Run every 5 minutes
    this.job = cron.schedule('*/5 * * * *', async () => {
      try {
        logger.debug('Running demo session cleanup job');
        const expiredCount = await demoModeService.expireOldSessions();
        
        if (expiredCount > 0) {
          logger.info('Demo session cleanup completed', { expiredCount });
        }
      } catch (error) {
        logger.error('Error in demo session cleanup job', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    logger.info('Demo session cleanup job started');
  }

  /**
   * Stop the cleanup job
   */
  stop(): void {
    if (this.job) {
      this.job.stop();
      this.job = null;
      logger.info('Demo session cleanup job stopped');
    }
  }

  /**
   * Run cleanup immediately (for testing or manual trigger)
   */
  async runNow(): Promise<number> {
    logger.info('Running demo session cleanup manually');
    return await demoModeService.expireOldSessions();
  }
}

export default new DemoSessionCleanupJob();
