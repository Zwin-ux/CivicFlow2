/**
 * Request ID Middleware
 * Adds unique request ID to each request for tracking
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export const requestId = (req: Request, res: Response, next: NextFunction): void => {
  // Use existing request ID from header or generate new one
  const reqId = (req.headers['x-request-id'] as string) || `req-${uuidv4()}`;
  
  // Set request ID in header
  req.headers['x-request-id'] = reqId;
  
  // Add to response headers for client tracking
  res.setHeader('X-Request-ID', reqId);
  
  next();
};
