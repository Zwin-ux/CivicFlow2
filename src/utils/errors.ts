/**
 * Standardized Error Classes
 * Provides consistent error handling across the application
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: any;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_SERVER_ERROR',
    details?: any,
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 400 Bad Request - Validation errors
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

/**
 * 401 Unauthorized - Authentication required
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

/**
 * 403 Forbidden - Insufficient permissions
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'FORBIDDEN');
  }
}

/**
 * 404 Not Found - Resource does not exist
 */
export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

/**
 * 409 Conflict - State conflict
 */
export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 409, 'CONFLICT', details);
  }
}

/**
 * 422 Unprocessable Entity - Business logic validation failed
 */
export class UnprocessableEntityError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 422, 'UNPROCESSABLE_ENTITY', details);
  }
}

/**
 * 502 Bad Gateway - External service failure
 */
export class ExternalServiceError extends AppError {
  constructor(service: string, message?: string, details?: any) {
    super(
      message || `External service ${service} is unavailable`,
      502,
      'EXTERNAL_SERVICE_ERROR',
      { service, ...details }
    );
  }
}

/**
 * 503 Service Unavailable - Service temporarily unavailable
 */
export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Service temporarily unavailable', details?: any) {
    super(message, 503, 'SERVICE_UNAVAILABLE', details);
  }
}

/**
 * 500 Internal Server Error - Unexpected errors
 */
export class InternalServerError extends AppError {
  constructor(message: string = 'An unexpected error occurred', details?: any) {
    super(message, 500, 'INTERNAL_SERVER_ERROR', details, false);
  }
}

/**
 * User-friendly error messages for common scenarios
 */
export const ErrorMessages = {
  // Authentication & Authorization
  INVALID_CREDENTIALS: 'Invalid email or password',
  TOKEN_EXPIRED: 'Your session has expired. Please log in again',
  TOKEN_INVALID: 'Invalid authentication token',
  INSUFFICIENT_PERMISSIONS: 'You do not have permission to perform this action',

  // Application errors
  APPLICATION_NOT_FOUND: 'Application not found',
  APPLICATION_ALREADY_SUBMITTED: 'Application has already been submitted',
  INVALID_STATUS_TRANSITION: 'Cannot change application status from current state',
  MISSING_REQUIRED_DOCUMENTS: 'Application is missing required documents',
  DECISION_ALREADY_MADE: 'A decision has already been made for this application',

  // Document errors
  DOCUMENT_NOT_FOUND: 'Document not found',
  DOCUMENT_TOO_LARGE: 'Document size exceeds maximum allowed (10MB)',
  INVALID_FILE_TYPE: 'Invalid file type. Allowed types: PDF, PNG, JPG',
  CLASSIFICATION_FAILED: 'Failed to classify document. Please try again',
  EXTRACTION_FAILED: 'Failed to extract data from document',

  // Validation errors
  MISSING_REQUIRED_FIELDS: 'Missing required fields',
  INVALID_EMAIL_FORMAT: 'Invalid email address format',
  INVALID_PHONE_FORMAT: 'Invalid phone number format',
  INVALID_EIN_FORMAT: 'Invalid EIN format. Expected format: XX-XXXXXXX',
  INVALID_AMOUNT: 'Invalid amount. Must be a positive number',

  // External service errors
  EIN_VERIFICATION_UNAVAILABLE: 'EIN verification service is temporarily unavailable. Please try again later',
  EMAIL_SERVICE_UNAVAILABLE: 'Email service is temporarily unavailable. Notification will be sent later',
  STORAGE_SERVICE_UNAVAILABLE: 'File storage service is temporarily unavailable. Please try again later',

  // Generic errors
  INTERNAL_ERROR: 'An unexpected error occurred. Please try again or contact support',
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please try again later',
  DATABASE_ERROR: 'Database operation failed. Please try again',
};

/**
 * Helper function to create user-friendly error from any error
 */
export function toAppError(error: any): AppError {
  // Already an AppError
  if (error instanceof AppError) {
    return error;
  }

  // Database errors
  if (error.code === '23505') {
    // Unique constraint violation
    return new ConflictError('Resource already exists', { dbError: error.code });
  }

  if (error.code === '23503') {
    // Foreign key violation
    return new ValidationError('Referenced resource does not exist', { dbError: error.code });
  }

  // Axios/HTTP errors
  if (error.response) {
    const status = error.response.status;
    const message = error.response.data?.message || error.message;

    if (status >= 500) {
      return new ExternalServiceError('External API', message);
    }

    return new AppError(message, status, 'EXTERNAL_API_ERROR');
  }

  // Network errors
  if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
    return new ServiceUnavailableError('Service connection failed');
  }

  // Default to internal server error
  return new InternalServerError(error.message || ErrorMessages.INTERNAL_ERROR);
}
