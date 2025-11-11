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
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
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
  const health: any = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {},
  };

  // Check database
  try {
    const result = await database.query('SELECT NOW()');
    health.services.database = {
      status: 'ok',
      responseTime: result.rows[0].now,
    };
  } catch (error: any) {
    health.status = 'degraded';
    health.services.database = {
      status: 'error',
      error: error.message,
    };
    logger.error('Database health check failed', { error });
  }

  // Check Redis
  try {
    const isHealthy = await redisClient.healthCheck();
    health.services.cache = {
      status: isHealthy ? 'ok' : 'error',
    };
    if (!isHealthy) {
      health.status = 'degraded';
    }
  } catch (error: any) {
    health.status = 'degraded';
    health.services.cache = {
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
    health.status = 'degraded';
  }

  res.json(health);
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
