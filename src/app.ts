import express, { Application, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import config from './config';
import { requestLogger } from './middleware/requestLogger';
import { auditLogger } from './middleware/auditLogger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { requestId } from './middleware/requestId';
import healthRoutes from './routes/health';
import auditLogRoutes from './routes/auditLogs';
import authRoutes from './routes/auth';
import documentRoutes from './routes/documents';
import applicationRoutes from './routes/applications';
import communicationRoutes from './routes/communications';
import reportingRoutes from './routes/reporting';
import { validatorRouter } from './routes/validator';
import metricsRoutes from './routes/metrics';
import swaggerRoutes from './routes/swagger';
import keyManagementRoutes from './routes/keyManagement';
import teamsRoutes from './routes/teams';
import dashboardRoutes from './routes/dashboard';
import teamsConfigRoutes from './routes/admin/teamsConfig';
import demoRoutes from './routes/demo';
import sbaDemoRoutes from './routes/sbaDemo';
import aiRoutes from './routes/ai';
import { detectDemoMode, bypassAuthForDemo, checkDemoExpiry } from './middleware/demoMode';
import { apiLimiter, authLimiter, uploadLimiter, aiLimiter, reportLimiter } from './middleware/rateLimiter';
import demoModeManager from './services/demoModeManager';

const app: Application = express();

const setStaticCacheHeaders = (res: Response, filePath: string) => {
  if (filePath.endsWith('.html')) {
    res.setHeader('Cache-Control', 'public, max-age=300, must-revalidate');
    return;
  }
  if (filePath.match(/\.(css|js)$/)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return;
  }
  if (filePath.match(/\.(jpg|jpeg|png|gif|svg|ico|webp)$/)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return;
  }
  if (filePath.match(/\.(woff|woff2|ttf|eot)$/)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  }
};

// Security middleware - Helmet.js for secure HTTP headers
app.use(
  helmet({
    // Content Security Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for demo UI
        scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts for demo UI
        imgSrc: ["'self'", 'data:', 'https:'],
        fontSrc: ["'self'", 'data:'],
        connectSrc: ["'self'", 'wss:', 'ws:'], // Allow WebSocket connections
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: config.env === 'production' ? [] : null,
      },
    },
    // HTTP Strict Transport Security (HSTS)
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    // Disable X-Powered-By header
    hidePoweredBy: true,
    // X-Frame-Options
    frameguard: {
      action: 'deny',
    },
    // X-Content-Type-Options
    noSniff: true,
    // X-XSS-Protection
    xssFilter: true,
    // Referrer-Policy
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin',
    },
    // X-DNS-Prefetch-Control
    dnsPrefetchControl: {
      allow: false,
    },
    // X-Download-Options
    ieNoOpen: true,
    // X-Permitted-Cross-Domain-Policies
    permittedCrossDomainPolicies: {
      permittedPolicies: 'none',
    },
  })
);

// Disable X-Powered-By header (additional safeguard)
app.disable('x-powered-by');

// Compression middleware (should be early in the chain)
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6, // Balance between compression ratio and speed
  threshold: 1024, // Only compress responses larger than 1KB
}));

// CORS configuration
const corsOrigins = (() => {
  if (config.env === 'production') {
    // In production, use CORS_ORIGIN or RAILWAY_PUBLIC_DOMAIN
    const corsOrigin = process.env.CORS_ORIGIN || process.env.RAILWAY_PUBLIC_DOMAIN;
    if (corsOrigin) {
      // Support multiple origins separated by comma
      const origins = corsOrigin.split(',').map(origin => origin.trim());
      // Add https:// prefix if not present
      return origins.map(origin => {
        if (!origin.startsWith('http://') && !origin.startsWith('https://')) {
          return `https://${origin}`;
        }
        return origin;
      });
    }
    // Fallback to same origin only
    return false;
  }
  // Development: allow all origins
  return '*';
})();

app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Demo-Session-ID'],
    exposedHeaders: ['X-Request-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    maxAge: 86400, // 24 hours
  })
);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request ID (must be before logging)
app.use(requestId);

// Request logging
app.use(requestLogger);

// Audit logging (after request logger)
app.use(auditLogger);

// Demo mode detection (must be before authentication)
app.use(detectDemoMode);
app.use(bypassAuthForDemo);
app.use(checkDemoExpiry);

// Add demo mode indicator to all responses
app.use((req, res, next) => {
  if (demoModeManager.isActive()) {
    res.setHeader('X-Demo-Mode', 'true');
    res.setHeader('X-Demo-Mode-Message', 'Running in offline showcase mode');
  }
  next();
});

// Wrap responses with demo mode indicator
import { wrapResponseWithDemoIndicator } from './middleware/demoModeResponse';
app.use(wrapResponseWithDemoIndicator);

// Rate limiting (apply after demo mode detection)
// General API rate limiter for all routes
app.use('/api/', apiLimiter);

// Serve shared style tokens separately so /styles/tokens.css is available to demo pages
app.use(
  '/styles',
  express.static(path.join(__dirname, '../styles'), {
    maxAge: config.env === 'production' ? '1y' : 0,
    etag: true,
    lastModified: true,
    setHeaders: setStaticCacheHeaders,
  })
);

// Serve static files from public directory with caching
app.use(
  express.static(path.join(__dirname, '../public'), {
    maxAge: config.env === 'production' ? '1y' : 0, // Cache for 1 year in production
    etag: true, // Enable ETags for cache validation
    lastModified: true, // Enable Last-Modified header
    setHeaders: setStaticCacheHeaders,
  })
);

// Routes
app.use('/api-docs', swaggerRoutes); // Swagger documentation (no version prefix)
app.use(`/api/${config.apiVersion}/health`, healthRoutes);
app.use(`/api/${config.apiVersion}/auth`, authLimiter, authRoutes);
app.use(`/api/${config.apiVersion}/audit-logs`, auditLogRoutes);
app.use(`/api/${config.apiVersion}/documents`, uploadLimiter, documentRoutes);
app.use(`/api/${config.apiVersion}/applications`, applicationRoutes);
app.use(`/api/${config.apiVersion}/communications`, communicationRoutes);
app.use(`/api/${config.apiVersion}/reporting`, reportLimiter, reportingRoutes);
app.use(`/api/${config.apiVersion}/validator`, validatorRouter);
app.use(`/api/${config.apiVersion}/metrics`, metricsRoutes);
app.use(`/api/${config.apiVersion}/key-management`, keyManagementRoutes);
app.use(`/api/${config.apiVersion}/teams`, teamsRoutes);
app.use(`/api/${config.apiVersion}/dashboard`, dashboardRoutes);
app.use(`/api/${config.apiVersion}/admin/teams/config`, teamsConfigRoutes);
app.use(`/api/${config.apiVersion}/demo`, demoRoutes);
app.use(`/api/${config.apiVersion}/ai`, aiLimiter, aiRoutes);
app.use(`/api/${config.apiVersion}/sba-demo`, sbaDemoRoutes);

// Convenience routes without version prefix for frontend
app.use('/api/applications', applicationRoutes);
app.use('/api/documents', uploadLimiter, documentRoutes);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin/teams/config', teamsConfigRoutes);
app.use('/api/ai', aiLimiter, aiRoutes);

// Serve index.html for root path and any non-API routes (SPA fallback)
app.get('*', (req, res, next) => {
  // Skip API routes
  if (req.path.startsWith('/api')) {
    return next();
  }
  
  // Serve index.html for all other routes
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// 404 handler for API routes
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

export default app;
