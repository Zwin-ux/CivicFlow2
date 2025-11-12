/**
 * Response Wrapper Utility
 * Wraps API responses with demo mode indicators
 */

import { Response } from 'express';
import demoModeManager from '../services/demoModeManager';

/**
 * Wraps response data with demo mode indicator
 */
export function wrapResponse<T>(data: T): { data: T; isDemo: boolean; timestamp: string } {
  return {
    data,
    isDemo: demoModeManager.isActive(),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Sends a JSON response with demo mode indicator
 */
export function sendResponse<T>(res: Response, data: T, statusCode: number = 200): void {
  const response = wrapResponse(data);
  
  // Add demo mode header
  if (response.isDemo) {
    res.setHeader('X-Demo-Mode', 'true');
    res.setHeader('X-Demo-Mode-Message', 'Running in offline showcase mode');
  }
  
  res.status(statusCode).json(response);
}

/**
 * Sends an error response with demo mode indicator
 */
export function sendErrorResponse(
  res: Response,
  code: string,
  message: string,
  statusCode: number = 500,
  details?: any
): void {
  const response = {
    error: {
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
    },
    isDemo: demoModeManager.isActive(),
  };
  
  // Add demo mode header
  if (response.isDemo) {
    res.setHeader('X-Demo-Mode', 'true');
    res.setHeader('X-Demo-Mode-Message', 'Running in offline showcase mode');
  }
  
  res.status(statusCode).json(response);
}
