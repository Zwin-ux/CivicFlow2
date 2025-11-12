import http from 'http';
import https from 'https';
import app from './app';
import config from './config';
import database from './config/database';
import redis from './config/redis';
import logger from './utils/logger';
import { initializeValidatorRoutes } from './routes/validator';
import { validateEncryptionKey } from './utils/encryption';
import { validateTLSConfig, createHTTPSOptions } from './config/tls';
import teamsNotificationService from './services/teamsNotificationService';
import websocketService from './services/websocketService';
import teamsConfigReloadService from './services/teamsConfigReloadService';
import demoSessionCleanupJob from './services/demoSessionCleanupJob';
import startupScript from './scripts/startup';
import demoModeManager from './services/demoModeManager';

const startServer = async (): Promise<void> => {
  try {
    // Run startup script (migrations, seeding, service verification)
    const startupSuccess = await startupScript.run();
    if (!startupSuccess && !demoModeManager.isActive()) {
      throw new Error('Startup script failed and demo mode not available - check logs for details');
    }

    if (demoModeManager.isActive()) {
      logger.warn('Server starting in DEMO MODE - all operations will use simulated data');
    }

    // Validate encryption key configuration
    validateEncryptionKey();
    logger.info('Encryption key validated successfully');

    // Validate TLS configuration
    validateTLSConfig();

    // Initialize validator routes with database pool (skip in demo mode)
    if (!demoModeManager.isActive()) {
      initializeValidatorRoutes(database.getPool());
    } else {
      logger.info('Validator routes initialization skipped (demo mode)');
    }

    // Initialize Teams notification service
    teamsNotificationService.initialize();
    logger.info('Teams notification service initialized');

    // Initialize Teams configuration reload service
    teamsConfigReloadService.initialize();
    logger.info('Teams configuration reload service initialized');

    // Start demo session cleanup job
    demoSessionCleanupJob.start();
    logger.info('Demo session cleanup job started');

    // Create server (HTTP or HTTPS based on TLS configuration)
    const httpsOptions = createHTTPSOptions();
    const server = httpsOptions
      ? https.createServer(httpsOptions, app)
      : http.createServer(app);

    // Initialize WebSocket server
    websocketService.initialize(server);
    logger.info('WebSocket server initialized');

    // Start server
    server.listen(config.port, () => {
      const protocol = httpsOptions ? 'https' : 'http';
      
      console.log('\n');
      console.log('╔════════════════════════════════════════════════════════════╗');
      console.log('║                                                            ║');
      console.log('║              🚀 CivicFlow2 Server Started 🚀               ║');
      console.log('║                                                            ║');
      console.log('╚════════════════════════════════════════════════════════════╝');
      
      logger.info(`Server running on port ${config.port} in ${config.env} mode`);
      logger.info(`API available at ${protocol}://localhost:${config.port}/api/${config.apiVersion}`);
      logger.info(`WebSocket available at ${protocol === 'https' ? 'wss' : 'ws'}://localhost:${config.port}/api/dashboard/stream`);
      
      if (httpsOptions) {
        logger.info('TLS 1.3 enabled for secure communications');
      }
      
      if (demoModeManager.isActive()) {
        console.log('\n');
        console.log('╔════════════════════════════════════════════════════════════╗');
        console.log('║                                                            ║');
        console.log('║              ⚠️  DEMO MODE ACTIVE ⚠️                       ║');
        console.log('║                                                            ║');
        console.log('║  Running in offline showcase mode                         ║');
        console.log('║  All data operations are simulated                        ║');
        console.log('║  No real database connections active                      ║');
        console.log('║                                                            ║');
        console.log(`║  Reason: ${demoModeManager.getReason().padEnd(44)} ║`);
        console.log('║                                                            ║');
        console.log('╚════════════════════════════════════════════════════════════╝');
        console.log('\n');
      }
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string): Promise<void> => {
      logger.info(`${signal} received, starting graceful shutdown`);
      
      server.close(async () => {
        logger.info('HTTP server closed');
        
        try {
          websocketService.shutdown();
          teamsConfigReloadService.shutdown();
          demoSessionCleanupJob.stop();
          await database.close();
          await redis.close();
          logger.info('All connections closed');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown', { error });
          process.exit(1);
        }
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
};

startServer();
