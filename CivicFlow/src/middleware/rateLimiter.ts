import rateLimit from 'express-rate-limit';
import config from '../config';

/**
 * General API rate limiter
 * Applies to all API endpoints
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.env === 'production' ? 100 : 1000, // 100 requests per 15 minutes in production
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later.',
      timestamp: new Date(),
    },
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip rate limiting in demo mode
  skip: (req) => {
    return req.headers['x-demo-session-id'] !== undefined;
  },
});

/**
 * Strict rate limiter for authentication endpoints
 * Prevents brute force attacks
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.env === 'production' ? 5 : 100, // 5 login attempts per 15 minutes in production
  message: {
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts, please try again later.',
      timestamp: new Date(),
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
  skip: (req) => {
    return req.headers['x-demo-session-id'] !== undefined;
  },
});

/**
 * Rate limiter for document upload endpoints
 * Prevents abuse of file upload functionality
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: config.env === 'production' ? 20 : 100, // 20 uploads per hour in production
  message: {
    error: {
      code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
      message: 'Too many file uploads, please try again later.',
      timestamp: new Date(),
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return req.headers['x-demo-session-id'] !== undefined;
  },
});

/**
 * Rate limiter for AI analysis endpoints
 * Prevents excessive AI API usage
 */
export const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: config.env === 'production' ? 50 : 200, // 50 AI requests per hour in production
  message: {
    error: {
      code: 'AI_RATE_LIMIT_EXCEEDED',
      message: 'Too many AI analysis requests, please try again later.',
      timestamp: new Date(),
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return req.headers['x-demo-session-id'] !== undefined;
  },
});

/**
 * Rate limiter for reporting endpoints
 * Prevents excessive report generation
 */
export const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: config.env === 'production' ? 30 : 100, // 30 reports per hour in production
  message: {
    error: {
      code: 'REPORT_RATE_LIMIT_EXCEEDED',
      message: 'Too many report requests, please try again later.',
      timestamp: new Date(),
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return req.headers['x-demo-session-id'] !== undefined;
  },
});
