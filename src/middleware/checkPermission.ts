import { Request, Response, NextFunction } from 'express';
import { Resource, Action, hasPermission } from '../config/permissions';
import logger from '../utils/logger';

/**
 * Middleware to check if user has permission to perform an action on a resource
 * @param resource - The resource being accessed
 * @param action - The action being performed
 */
export const checkPermission = (resource: Resource, action: Action) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            timestamp: new Date(),
          },
        });
        return;
      }

      // Check if user has permission
      if (!hasPermission(req.user.role, resource, action)) {
        logger.warn('Permission denied', {
          userId: req.user.userId,
          userRole: req.user.role,
          resource,
          action,
          path: req.path,
        });

        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: `You do not have permission to ${action} ${resource}`,
            timestamp: new Date(),
          },
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Permission check error', { error });
      
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Permission check failed',
          timestamp: new Date(),
        },
      });
    }
  };
};
