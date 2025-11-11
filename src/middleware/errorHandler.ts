import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { toAppError } from '../utils/errors';
import { EntityType } from '../models/auditLog';

/**
 * Global error handler middleware
 * Handles all errors thrown in the application
 */
export const errorHandler = async (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> => {
  // Convert to AppError if not already
  const appError = toAppError(err);

  const statusCode = appError.statusCode || 500;
  const code = appError.code || 'INTERNAL_SERVER_ERROR';
  const message = appError.message || 'An unexpected error occurred';

  // Generate request ID if not present
  const requestId = (req.headers['x-request-id'] as string) || `req-${Date.now()}`;

  // Log error with appropriate level
  const logLevel = statusCode >= 500 ? 'error' : 'warn';
  logger[logLevel]('Request error', {
    statusCode,
    code,
    message,
    stack: appError.stack,
    path: req.path,
    method: req.method,
    details: appError.details,
    requestId,
    userId: req.user?.userId,
    isOperational: appError.isOperational,
  });

  // Log to audit system for non-operational errors (potential security issues)
  if (!appError.isOperational || statusCode === 403 || statusCode === 401) {
    try {
      const auditLogRepository = (await import('../repositories/auditLogRepository')).default;
      await auditLogRepository.create({
        actionType: 'ERROR_OCCURRED',
        entityType: EntityType.SYSTEM,
        entityId: requestId,
        performedBy: req.user?.userId || 'ANONYMOUS',
        details: {
          statusCode,
          code,
          message,
          path: req.path,
          method: req.method,
          userAgent: req.headers['user-agent'],
          isOperational: appError.isOperational,
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] as string,
      });
    } catch (auditError) {
      // Don't fail the request if audit logging fails
      logger.error('Failed to log error to audit system', { auditError });
    }
  }

  // Send error response
  res.status(statusCode).json({
    error: {
      code,
      message,
      details: appError.details,
      timestamp: new Date().toISOString(),
      requestId,
    },
  });
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  const requestId = (req.headers['x-request-id'] as string) || `req-${Date.now()}`;

  logger.warn('Route not found', {
    path: req.path,
    method: req.method,
    requestId,
  });

  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
      timestamp: new Date().toISOString(),
      requestId,
    },
  });
};

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
