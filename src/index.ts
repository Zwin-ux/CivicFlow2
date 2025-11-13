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
    logger.info('Initialization step: running startup script (migrations, seeding, service verification)');
    try {
      const startupSuccess = await startupScript.run();
      logger.info('Initialization step: startup script completed', { success: startupSuccess });
      if (!startupSuccess && !demoModeManager.isActive()) {
        throw new Error('Startup script failed and demo mode not available - check logs for details');
      }
    } catch (err) {
      logger.error('Initialization failure in startup script', { error: err instanceof Error ? err.stack || err.message : err });
      // Also echo to stderr for platform logs
      // eslint-disable-next-line no-console
      console.error('Startup script error:', err instanceof Error ? err.stack || err.message : err);
      throw err;
    }

    if (demoModeManager.isActive()) {
      logger.warn('Server starting in DEMO MODE - all operations will use simulated data');
    }

    // Validate encryption key configuration
    logger.info('Initialization step: validating ENCRYPTION_KEY');
    try {
      validateEncryptionKey();
      logger.info('Initialization step: ENCRYPTION_KEY validated successfully');
    } catch (err) {
      logger.error('Initialization failure validating ENCRYPTION_KEY', { error: err instanceof Error ? err.stack || err.message : err });
      // eslint-disable-next-line no-console
      console.error('ENCRYPTION_KEY validation error:', err instanceof Error ? err.stack || err.message : err);
      throw err;
    }

    // Validate TLS configuration
    logger.info('Initialization step: validating TLS configuration');
    try {
      validateTLSConfig();
      logger.info('Initialization step: TLS configuration validated successfully');
    } catch (err) {
      logger.error('Initialization failure validating TLS configuration', { error: err instanceof Error ? err.stack || err.message : err });
      // eslint-disable-next-line no-console
      console.error('TLS validation error:', err instanceof Error ? err.stack || err.message : err);
      throw err;
    }

    // Initialize validator routes with database pool (skip in demo mode)
    logger.info('Initialization step: initializing validator routes');
    try {
      if (!demoModeManager.isActive()) {
        initializeValidatorRoutes(database.getPool());
        logger.info('Initialization step: validator routes initialized');
      } else {
        logger.info('Validator routes initialization skipped (demo mode)');
      }
    } catch (err) {
      logger.error('Initialization failure initializing validator routes', { error: err instanceof Error ? err.stack || err.message : err });
      // eslint-disable-next-line no-console
      console.error('Validator routes initialization error:', err instanceof Error ? err.stack || err.message : err);
      throw err;
    }

    // Initialize Teams notification service
    logger.info('Initialization step: initializing Teams notification service');
    try {
      teamsNotificationService.initialize();
      logger.info('Initialization step: Teams notification service initialized');
    } catch (err) {
      logger.error('Initialization failure initializing Teams notification service', { error: err instanceof Error ? err.stack || err.message : err });
      // eslint-disable-next-line no-console
      console.error('Teams notification service init error:', err instanceof Error ? err.stack || err.message : err);
      throw err;
    }

    // Initialize Teams configuration reload service
    logger.info('Initialization step: initializing Teams configuration reload service');
    try {
      teamsConfigReloadService.initialize();
      logger.info('Initialization step: Teams configuration reload service initialized');
    } catch (err) {
      logger.error('Initialization failure initializing Teams configuration reload service', { error: err instanceof Error ? err.stack || err.message : err });
      // eslint-disable-next-line no-console
      console.error('Teams config reload init error:', err instanceof Error ? err.stack || err.message : err);
      throw err;
    }

    // Start demo session cleanup job
    logger.info('Initialization step: starting demo session cleanup job');
    try {
      demoSessionCleanupJob.start();
      logger.info('Initialization step: demo session cleanup job started');
    } catch (err) {
      logger.error('Initialization failure starting demo session cleanup job', { error: err instanceof Error ? err.stack || err.message : err });
      // eslint-disable-next-line no-console
      console.error('Demo session cleanup job start error:', err instanceof Error ? err.stack || err.message : err);
      throw err;
    }

    // Create server (HTTP or HTTPS based on TLS configuration)
    logger.info('Initialization step: creating HTTP/HTTPS server');
    let server: http.Server | https.Server;
    try {
      const httpsOptions = createHTTPSOptions();
      server = httpsOptions ? https.createServer(httpsOptions, app) : http.createServer(app);
      logger.info('Initialization step: HTTP/HTTPS server created');
    } catch (err) {
      logger.error('Initialization failure creating HTTP/HTTPS server', { error: err instanceof Error ? err.stack || err.message : err });
      // eslint-disable-next-line no-console
      console.error('Server creation error:', err instanceof Error ? err.stack || err.message : err);
      throw err;
    }

    // Initialize WebSocket server
    logger.info('Initialization step: initializing WebSocket server');
    try {
      websocketService.initialize(server);
      logger.info('Initialization step: WebSocket server initialized');
    } catch (err) {
      logger.error('Initialization failure initializing WebSocket server', { error: err instanceof Error ? err.stack || err.message : err });
      // eslint-disable-next-line no-console
      console.error('WebSocket initialization error:', err instanceof Error ? err.stack || err.message : err);
      throw err;
    }

    // Start server
    logger.info('Initialization step: starting HTTP server listener');
    try {
      server.listen(config.port, () => {
        const protocol = (/* eslint-disable @typescript-eslint/no-explicit-any */ (server as any).addListener) ? (https.globalAgent ? 'https' : 'http') : (https.globalAgent ? 'https' : 'http');

        // Concise startup output (no decorative banners or emojis)
        console.log('\nCivicFlow2 Server Started');
        logger.info(`Server running on port ${config.port} in ${config.env} mode`);
        logger.info(`API available at ${protocol}://localhost:${config.port}/api/${config.apiVersion}`);
        logger.info(`WebSocket available at ${protocol === 'https' ? 'wss' : 'ws'}://localhost:${config.port}/api/dashboard/stream`);

        if (demoModeManager.isActive()) {
          // Short, clear demo mode notice
          console.log('\nDEMO MODE ACTIVE: Running in offline showcase mode');
          console.log(`Reason: ${demoModeManager.getReason()}`);
          logger.warn('Demo mode active - using simulated data and in-memory services');
        }
      });
      logger.info('Initialization step: server.listen invoked');
    } catch (err) {
      logger.error('Initialization failure starting server listener', { error: err instanceof Error ? err.stack || err.message : err });
      // eslint-disable-next-line no-console
      console.error('Server listen error:', err instanceof Error ? err.stack || err.message : err);
      throw err;
    }

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
    // Also print to stderr so container/platform logs show the stack trace immediately
    try {
      // eslint-disable-next-line no-console
      console.error('Failed to start server:', error instanceof Error ? error.stack || error.message : error);
    } catch (e) {
      // ignore
    }
    process.exit(1);
  }
};

startServer();
