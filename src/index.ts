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

const startServer = async (): Promise<void> => {
  try {
    // Validate encryption key configuration
    validateEncryptionKey();
    logger.info('Encryption key validated successfully');

    // Validate TLS configuration
    validateTLSConfig();

    // Connect to Redis
    await redis.connect();
    logger.info('Redis connected successfully');

    // Test database connection
    const dbHealthy = await database.healthCheck();
    if (!dbHealthy) {
      throw new Error('Database connection failed');
    }
    logger.info('Database connected successfully');

    // Initialize validator routes with database pool
    initializeValidatorRoutes(database.getPool());

    // Create server (HTTP or HTTPS based on TLS configuration)
    const httpsOptions = createHTTPSOptions();
    const server = httpsOptions
      ? https.createServer(httpsOptions, app)
      : http.createServer(app);

    // Start server
    server.listen(config.port, () => {
      const protocol = httpsOptions ? 'https' : 'http';
      logger.info(`Server running on port ${config.port} in ${config.env} mode`);
      logger.info(`API available at ${protocol}://localhost:${config.port}/api/${config.apiVersion}`);
      if (httpsOptions) {
        logger.info('TLS 1.3 enabled for secure communications');
      }
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string): Promise<void> => {
      logger.info(`${signal} received, starting graceful shutdown`);
      
      server.close(async () => {
        logger.info('HTTP server closed');
        
        try {
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
