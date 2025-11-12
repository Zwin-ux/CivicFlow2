/**
 * Demo Mode Response Middleware
 * Automatically wraps API responses with demo mode indicators
 */

import { Request, Response, NextFunction } from 'express';
import demoModeManager from '../services/demoModeManager';

/**
 * Middleware to wrap JSON responses with demo mode indicator
 * This intercepts res.json() to add isDemo flag automatically
 */
export const wrapResponseWithDemoIndicator = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Store original json method
  const originalJson = res.json.bind(res);

  // Override json method
  res.json = function (body: any): Response {
    const isDemo = demoModeManager.isActive();

    // Skip wrapping if already wrapped (has isDemo property)
    if (body && typeof body === 'object' && 'isDemo' in body) {
      return originalJson(body);
    }

    // Skip wrapping for error responses (they have 'error' property)
    if (body && typeof body === 'object' && 'error' in body) {
      // Just add isDemo flag to error responses
      return originalJson({
        ...body,
        isDemo,
      });
    }

    // Skip wrapping for health endpoints (they handle it themselves)
    if (req.path.includes('/health')) {
      return originalJson(body);
    }

    // Wrap successful responses
    const wrappedResponse = {
      data: body,
      isDemo,
      timestamp: new Date().toISOString(),
    };

    return originalJson(wrappedResponse);
  };

  next();
};
