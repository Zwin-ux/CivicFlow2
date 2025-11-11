import { Request, Response, NextFunction } from 'express';
import demoModeService from '../services/demoModeService';
import logger from '../utils/logger';

// Extend Express Request to include demo session
declare global {
  namespace Express {
    interface Request {
      demoSession?: {
        sessionId: string;
        userRole: 'APPLICANT' | 'REVIEWER' | 'APPROVER' | 'ADMIN';
        isDemo: true;
      };
    }
  }
}

/**
 * Middleware to detect and validate demo mode sessions
 * This should be applied before authentication middleware
 */
export const detectDemoMode = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check for demo session ID in various places
    const sessionId = 
      req.query.demo_session as string ||
      req.headers['x-demo-session'] as string ||
      req.cookies?.demo_session;

    if (!sessionId) {
      // Not a demo session, continue normally
      next();
      return;
    }

    // Validate demo session
    const isValid = await demoModeService.isValidSession(sessionId);

    if (!isValid) {
      // Invalid or expired demo session
      res.status(401).json({
        error: {
          code: 'DEMO_SESSION_EXPIRED',
          message: 'Demo session has expired or is invalid',
          timestamp: new Date(),
        },
      });
      return;
    }

    // Get session details
    const session = await demoModeService.getSession(sessionId);

    if (!session) {
      res.status(401).json({
        error: {
          code: 'DEMO_SESSION_NOT_FOUND',
          message: 'Demo session not found',
          timestamp: new Date(),
        },
      });
      return;
    }

    // Update activity timestamp
    await demoModeService.updateActivity(sessionId);

    // Attach demo session to request
    req.demoSession = {
      sessionId: session.sessionId,
      userRole: session.userRole,
      isDemo: true,
    };

    logger.debug('Demo mode detected', {
      sessionId,
      userRole: session.userRole,
      path: req.path,
    });

    next();
  } catch (error) {
    logger.error('Error in demo mode detection', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    next(error);
  }
};

/**
 * Middleware to bypass authentication for demo mode
 * This should be applied after detectDemoMode and before authenticate
 */
export const bypassAuthForDemo = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  // If demo session exists, create a mock user object
  if (req.demoSession) {
    // Map demo roles to system roles
    const roleMap: Record<string, any> = {
      'APPLICANT': 'Applicant',
      'REVIEWER': 'Reviewer',
      'APPROVER': 'Approver',
      'ADMIN': 'Administrator',
    };

    req.user = {
      userId: `demo-${req.demoSession.sessionId}`,
      email: `demo-${req.demoSession.userRole.toLowerCase()}@demo.local`,
      role: roleMap[req.demoSession.userRole] || 'Applicant',
    };

    logger.debug('Authentication bypassed for demo mode', {
      sessionId: req.demoSession.sessionId,
      role: req.demoSession.userRole,
    });
  }

  next();
};

/**
 * Middleware to track demo interactions
 */
export const trackDemoInteraction = (action: string) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (req.demoSession) {
      try {
        await demoModeService.trackInteraction(
          req.demoSession.sessionId,
          action,
          req.path,
          {
            method: req.method,
            query: req.query,
            body: req.body,
          }
        );
      } catch (error) {
        logger.warn('Failed to track demo interaction', {
          sessionId: req.demoSession.sessionId,
          action,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    next();
  };
};

/**
 * Middleware to prevent data persistence in demo mode
 * This should be applied to routes that modify data
 */
export const preventDemoPersistence = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (req.demoSession) {
    // For demo mode, we'll handle this in the service layer
    // This middleware just marks the request as demo
    req.body = {
      ...req.body,
      _isDemoMode: true,
    };
    
    // Add demo mode indicator to response headers
    res.setHeader('X-Demo-Mode', 'true');
    res.setHeader('X-Demo-Session', req.demoSession.sessionId);
  }

  next();
};

/**
 * Middleware to redirect write operations to simulation in demo mode
 * Returns simulated responses without database operations
 */
export const simulateInDemoMode = (simulationHandler: (req: Request, res: Response) => Promise<void>) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (req.demoSession) {
      // In demo mode, use the simulation handler
      try {
        await simulationHandler(req, res);
      } catch (error) {
        logger.error('Error in demo simulation', {
          sessionId: req.demoSession.sessionId,
          path: req.path,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        next(error);
      }
    } else {
      // Not in demo mode, proceed normally
      next();
    }
  };
};

/**
 * Middleware to require demo mode (for demo-only endpoints)
 */
export const requireDemoMode = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.demoSession) {
    res.status(403).json({
      error: {
        code: 'DEMO_MODE_REQUIRED',
        message: 'This endpoint is only available in demo mode',
        timestamp: new Date(),
      },
    });
    return;
  }

  next();
};

/**
 * Middleware to check if demo session is about to expire
 * Adds warning header if less than 5 minutes remaining
 */
export const checkDemoExpiry = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (req.demoSession) {
    try {
      const session = await demoModeService.getSession(req.demoSession.sessionId);

      if (session) {
        const timeRemaining = session.expiresAt.getTime() - Date.now();
        const minutesRemaining = Math.floor(timeRemaining / 60000);

        if (minutesRemaining <= 5 && minutesRemaining > 0) {
          res.setHeader('X-Demo-Expiry-Warning', `${minutesRemaining} minutes remaining`);
        }
      }
    } catch (error) {
      logger.warn('Failed to check demo expiry', {
        sessionId: req.demoSession.sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  next();
};
