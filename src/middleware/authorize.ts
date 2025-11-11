import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../models/user';
import logger from '../utils/logger';

/**
 * Middleware to authorize requests based on user roles
 * @param allowedRoles - Array of roles that are allowed to access the route
 */
export const authorize = (...allowedRoles: UserRole[]) => {
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

      // Check if user's role is in the allowed roles
      if (!allowedRoles.includes(req.user.role)) {
        logger.warn('Authorization failed', {
          userId: req.user.userId,
          userRole: req.user.role,
          allowedRoles,
          path: req.path,
        });

        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to access this resource',
            timestamp: new Date(),
          },
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Authorization error', { error });
      
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Authorization check failed',
          timestamp: new Date(),
        },
      });
    }
  };
};

/**
 * Check if user has any of the specified roles
 */
export const hasRole = (userRole: UserRole, allowedRoles: UserRole[]): boolean => {
  return allowedRoles.includes(userRole);
};

/**
 * Check if user is an administrator
 */
export const isAdministrator = (userRole: UserRole): boolean => {
  return userRole === 'Administrator';
};

/**
 * Check if user is an approver or administrator
 */
export const canApprove = (userRole: UserRole): boolean => {
  return userRole === 'Approver' || userRole === 'Administrator';
};

/**
 * Check if user is a reviewer, approver, or administrator
 */
export const canReview = (userRole: UserRole): boolean => {
  return userRole === 'Reviewer' || userRole === 'Approver' || userRole === 'Administrator';
};

/**
 * Check if user can access audit logs
 */
export const canAccessAuditLogs = (userRole: UserRole): boolean => {
  return userRole === 'Auditor' || userRole === 'Administrator';
};

/**
 * Middleware to check if user owns the resource or has elevated permissions
 * @param resourceUserIdGetter - Function to extract the resource owner's user ID from the request
 */
export const authorizeOwnerOrRole = (
  resourceUserIdGetter: (req: Request) => string | Promise<string>,
  allowedRoles: UserRole[] = ['Administrator']
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

      // Get resource owner ID
      const resourceUserId = await resourceUserIdGetter(req);

      // Check if user owns the resource
      if (req.user.userId === resourceUserId) {
        next();
        return;
      }

      // Check if user has elevated permissions
      if (allowedRoles.includes(req.user.role)) {
        next();
        return;
      }

      logger.warn('Authorization failed - not owner and insufficient role', {
        userId: req.user.userId,
        userRole: req.user.role,
        resourceUserId,
        allowedRoles,
        path: req.path,
      });

      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to access this resource',
          timestamp: new Date(),
        },
      });
    } catch (error) {
      logger.error('Authorization error', { error });
      
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Authorization check failed',
          timestamp: new Date(),
        },
      });
    }
  };
};
