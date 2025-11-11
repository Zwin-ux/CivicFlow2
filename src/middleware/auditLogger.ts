/**
 * Audit Logging Middleware
 * Automatically logs all API requests to the audit log system
 */

import { Request, Response, NextFunction } from 'express';
import auditLogRepository from '../repositories/auditLogRepository';
import { EntityType } from '../models/auditLog';
import logger from '../utils/logger';

/**
 * Audit logging middleware
 * Captures all API requests and logs them to the audit log system
 */
export const auditLogger = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Skip audit logging for health check and static routes
  if (req.path.includes('/health') || req.path.includes('/static')) {
    return next();
  }

  // Capture response data
  const originalSend = res.send;
  let responseBody: any;

  res.send = function (data: any): Response {
    responseBody = data;
    return originalSend.call(this, data);
  };

  // Wait for response to complete
  res.on('finish', async () => {
    try {
      // Determine action type from HTTP method and path
      const actionType = determineActionType(req.method, req.path, res.statusCode);

      // Determine entity type and ID from request
      const { entityType, entityId } = extractEntityInfo(req);

      // Get user ID or mark as SYSTEM
      const performedBy = req.user?.userId || 'SYSTEM';

      // Extract confidence score from response if present (for automated actions)
      const confidenceScore = extractConfidenceScore(responseBody);

      // Build details object
      const details: Record<string, any> = {
        method: req.method,
        path: req.path,
        query: req.query,
        statusCode: res.statusCode,
        requestId: req.headers['x-request-id'],
      };

      // Add request body for POST/PUT/PATCH (excluding sensitive fields)
      if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        details.requestBody = sanitizeRequestBody(req.body);
      }

      // Add response summary for successful operations
      if (res.statusCode >= 200 && res.statusCode < 300) {
        details.responseStatus = 'success';
      } else if (res.statusCode >= 400) {
        details.responseStatus = 'error';
        // Try to parse error message from response
        try {
          const parsedResponse = typeof responseBody === 'string' 
            ? JSON.parse(responseBody) 
            : responseBody;
          if (parsedResponse?.error) {
            details.errorCode = parsedResponse.error.code;
            details.errorMessage = parsedResponse.error.message;
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }

      // Create audit log entry
      await auditLogRepository.create({
        actionType,
        entityType,
        entityId,
        performedBy,
        confidenceScore,
        details,
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.get('user-agent'),
      });
    } catch (error) {
      // Log error but don't fail the request
      logger.error('Failed to create audit log entry', {
        error,
        path: req.path,
        method: req.method,
      });
    }
  });

  next();
};

/**
 * Determine action type from HTTP method and path
 */
function determineActionType(method: string, path: string, statusCode: number): string {
  // Extract resource from path (e.g., /api/v1/applications -> applications)
  const pathParts = path.split('/').filter(p => p && p !== 'api' && !p.match(/^v\d+$/));
  const resource = pathParts[0]?.toUpperCase() || 'UNKNOWN';

  // Map HTTP methods to action verbs
  const actionMap: Record<string, string> = {
    GET: 'VIEWED',
    POST: 'CREATED',
    PUT: 'UPDATED',
    PATCH: 'UPDATED',
    DELETE: 'DELETED',
  };

  const action = actionMap[method] || 'ACCESSED';

  // Handle specific cases
  if (statusCode === 404) {
    return `${resource}_NOT_FOUND`;
  }

  if (statusCode >= 400) {
    return `${resource}_${action}_FAILED`;
  }

  return `${resource}_${action}`;
}

/**
 * Extract entity type and ID from request
 */
function extractEntityInfo(req: Request): { entityType: EntityType; entityId: string } {
  const path = req.path;

  // Try to extract entity type from path
  if (path.includes('/applications')) {
    const match = path.match(/\/applications\/([a-f0-9-]+)/);
    return {
      entityType: EntityType.APPLICATION,
      entityId: match ? match[1] : 'unknown',
    };
  }

  if (path.includes('/documents')) {
    const match = path.match(/\/documents\/([a-f0-9-]+)/);
    return {
      entityType: EntityType.DOCUMENT,
      entityId: match ? match[1] : 'unknown',
    };
  }

  if (path.includes('/applicants')) {
    const match = path.match(/\/applicants\/([a-f0-9-]+)/);
    return {
      entityType: EntityType.APPLICANT,
      entityId: match ? match[1] : 'unknown',
    };
  }

  if (path.includes('/users')) {
    const match = path.match(/\/users\/([a-f0-9-]+)/);
    return {
      entityType: EntityType.USER,
      entityId: match ? match[1] : 'unknown',
    };
  }

  // Default to SYSTEM for non-entity-specific requests
  return {
    entityType: EntityType.SYSTEM,
    entityId: 'system',
  };
}

/**
 * Extract confidence score from response body
 */
function extractConfidenceScore(responseBody: any): number | undefined {
  if (!responseBody) {
    return undefined;
  }

  try {
    const parsed = typeof responseBody === 'string' ? JSON.parse(responseBody) : responseBody;

    // Look for confidence score in common locations
    if (parsed.confidenceScore !== undefined) {
      return parsed.confidenceScore;
    }

    if (parsed.data?.confidenceScore !== undefined) {
      return parsed.data.confidenceScore;
    }

    if (parsed.classification?.confidenceScore !== undefined) {
      return parsed.classification.confidenceScore;
    }

    return undefined;
  } catch (e) {
    return undefined;
  }
}

/**
 * Sanitize request body by removing sensitive fields
 */
function sanitizeRequestBody(body: any): any {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sensitiveFields = [
    'password',
    'ssn',
    'socialSecurityNumber',
    'creditCard',
    'cvv',
    'pin',
    'secret',
    'token',
    'apiKey',
  ];

  const sanitized = { ...body };

  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}

/**
 * Helper function to manually log audit actions
 * Use this for logging automated system actions outside of HTTP requests
 */
export async function logAuditAction(
  actionType: string,
  entityType: EntityType,
  entityId: string,
  performedBy: string = 'SYSTEM',
  confidenceScore?: number,
  details?: Record<string, any>
): Promise<void> {
  try {
    await auditLogRepository.create({
      actionType,
      entityType,
      entityId,
      performedBy,
      confidenceScore,
      details,
    });
  } catch (error) {
    logger.error('Failed to log audit action', {
      error,
      actionType,
      entityType,
      entityId,
    });
  }
}
