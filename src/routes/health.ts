/**
 * Health Check Routes
 * System health and circuit breaker status endpoints
 */

import { Router, Request, Response } from 'express';
import database from '../config/database';
import redisClient from '../config/redis';
import einVerificationClient from '../clients/einVerificationClient';
import emailClient from '../clients/emailClient';
import logger from '../utils/logger';
import demoModeManager from '../services/demoModeManager';

const router = Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Basic health check
 *     description: Returns basic health status of the API
 *     tags: [Health]
 *     security: []
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get('/', (_req: Request, res: Response) => {
  const response: any = {
    status: 'ok',
    timestamp: new Date().toISOString(),
  };

  // Add demo mode indicator
  if (demoModeManager.isActive()) {
    response.demoMode = {
      active: true,
      message: 'Running in offline showcase mode with simulated data',
    };
  }

  res.json(response);
});

/**
 * @swagger
 * /health/detailed:
 *   get:
 *     summary: Detailed health check
 *     description: Returns detailed health status including database, cache, and external services
 *     tags: [Health]
 *     security: []
 *     responses:
 *       200:
 *         description: Detailed health status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 services:
 *                   type: object
 *                   properties:
 *                     database:
 *                       type: object
 *                     cache:
 *                       type: object
 *                     externalServices:
 *                       type: object
 */
router.get('/detailed', async (_req: Request, res: Response) => {
  const startTime = Date.now();
  const health: any = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    demoMode: demoModeManager.getStatus(),
    services: {},
  };

  // Check database with latency measurement
  try {
    const dbStart = Date.now();
    const result = await database.query('SELECT NOW() as current_time, version() as db_version');
    const dbLatency = Date.now() - dbStart;
    
    health.services.database = {
      status: 'ok',
      latency: dbLatency,
      timestamp: result.rows[0].current_time,
      version: result.rows[0].db_version.split(' ')[0] + ' ' + result.rows[0].db_version.split(' ')[1],
    };
  } catch (error: any) {
    health.status = 'unhealthy';
    health.services.database = {
      status: 'error',
      error: error.message,
      code: error.code,
    };
    logger.error('Database health check failed', { error });
  }

  // Check Redis with latency measurement
  try {
    const redisStart = Date.now();
    const isHealthy = await redisClient.healthCheck();
    const redisLatency = Date.now() - redisStart;
    
    health.services.redis = {
      status: isHealthy ? 'ok' : 'error',
      latency: redisLatency,
    };
    
    if (!isHealthy) {
      health.status = health.status === 'healthy' ? 'degraded' : 'unhealthy';
    }
  } catch (error: any) {
    health.status = health.status === 'healthy' ? 'degraded' : 'unhealthy';
    health.services.redis = {
      status: 'error',
      error: error.message,
    };
    logger.error('Redis health check failed', { error });
  }

  // Check external services circuit breakers
  health.services.externalServices = {
    einVerification: einVerificationClient.getCircuitBreakerStatus(),
    emailService: emailClient.getCircuitBreakerStatus(),
  };

  // Set overall status based on circuit breakers
  if (
    health.services.externalServices.einVerification.state === 'OPEN' ||
    health.services.externalServices.emailService.state === 'OPEN'
  ) {
    health.status = health.status === 'healthy' ? 'degraded' : health.status;
  }

  // Add system metrics
  health.system = {
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      unit: 'MB',
    },
    cpu: process.cpuUsage(),
  };

  // Add response time
  health.responseTime = Date.now() - startTime;

  // Set HTTP status code based on health
  const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;
  res.status(statusCode).json(health);
});

/**
 * @swagger
 * /health/circuit-breakers:
 *   get:
 *     summary: Circuit breaker status
 *     description: Returns status of all circuit breakers for external services
 *     tags: [Health]
 *     security: []
 *     responses:
 *       200:
 *         description: Circuit breaker status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 circuitBreakers:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       state:
 *                         type: string
 *                         enum: [OPEN, HALF_OPEN, CLOSED]
 *                       stats:
 *                         type: object
 */
router.get('/circuit-breakers', (_req: Request, res: Response) => {
  const circuitBreakers = [
    {
      service: 'EIN Verification',
      ...einVerificationClient.getCircuitBreakerStatus(),
    },
    {
      service: 'Email Service',
      ...emailClient.getCircuitBreakerStatus(),
    },
  ];

  res.json({
    circuitBreakers,
    timestamp: new Date().toISOString(),
  });
});

export default router;
