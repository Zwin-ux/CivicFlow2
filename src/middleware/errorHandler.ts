import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { toAppError } from '../utils/errors';
import { EntityType } from '../models/auditLog';
import demoModeManager from '../services/demoModeManager';
import demoDataService from '../services/demoDataService';

/**
 * Get demo data fallback for a given route
 */
function getDemoDataForRoute(path: string, method: string): any {
  // Dashboard routes
  if (path.includes('/dashboard/pipeline')) {
    const stats = demoDataService.getStatistics();
    return {
      stages: [
        { stage: 'PENDING_REVIEW', count: stats.pending, totalAmount: 0 },
        { stage: 'UNDER_REVIEW', count: stats.underReview, totalAmount: 0 },
        { stage: 'APPROVED', count: stats.approved, totalAmount: stats.approvedLoanAmount },
        { stage: 'REJECTED', count: stats.rejected, totalAmount: 0 },
      ],
      totalApplications: stats.total,
      totalAmount: stats.totalLoanAmount,
    };
  }

  if (path.includes('/dashboard/queue')) {
    return {
      applications: demoDataService.getAllApplications().slice(0, 10),
      total: demoDataService.getAllApplications().length,
      page: 1,
      pageSize: 10,
    };
  }

  if (path.includes('/dashboard/sla')) {
    return {
      averageProcessingTime: 5.2,
      onTimePercentage: 87,
      breachedCount: 3,
      totalProcessed: 23,
    };
  }

  // Application routes
  if (path.includes('/applications') && method === 'GET') {
    if (path.match(/\/applications\/[^/]+$/)) {
      // Single application
      return demoDataService.getAllApplications()[0] || null;
    }
    // List of applications
    return demoDataService.getAllApplications();
  }

  if (path.includes('/applications') && method === 'POST') {
    return demoDataService.createApplication({
      businessName: 'Demo Business',
      loanAmount: 50000,
    });
  }

  // Documents
  if (path.includes('/documents')) {
    return demoDataService.getAllDocuments();
  }

  // Default fallback
  return {
    message: 'Demo data - service temporarily unavailable',
    availableInDemoMode: true,
  };
}

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

  // In demo mode, return demo data instead of technical errors for 500-level errors
  if (demoModeManager.isActive() && statusCode >= 500) {
    const demoData = getDemoDataForRoute(req.path, req.method);
    
    res.setHeader('X-Demo-Mode', 'true');
    res.setHeader('X-Demo-Mode-Message', 'Using simulated data due to service error');
    
    res.status(200).json({
      data: demoData,
      isDemo: true,
      message: 'Using simulated data',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Add demo mode indicator to error responses
  const isDemo = demoModeManager.isActive();
  
  if (isDemo) {
    res.setHeader('X-Demo-Mode', 'true');
    res.setHeader('X-Demo-Mode-Message', 'Running in offline showcase mode');
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
    isDemo,
  });
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  const requestId = (req.headers['x-request-id'] as string) || `req-${Date.now()}`;
  const isDemo = demoModeManager.isActive();

  logger.warn('Route not found', {
    path: req.path,
    method: req.method,
    requestId,
  });

  if (isDemo) {
    res.setHeader('X-Demo-Mode', 'true');
    res.setHeader('X-Demo-Mode-Message', 'Running in offline showcase mode');
  }

  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
      timestamp: new Date().toISOString(),
      requestId,
    },
    isDemo,
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
