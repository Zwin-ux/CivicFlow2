import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
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

const app: Application = express();

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  })
);

// CORS configuration
app.use(
  cors({
    origin: config.env === 'production' ? process.env.ALLOWED_ORIGINS?.split(',') : '*',
    credentials: true,
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

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/api-docs', swaggerRoutes); // Swagger documentation (no version prefix)
app.use(`/api/${config.apiVersion}/health`, healthRoutes);
app.use(`/api/${config.apiVersion}/auth`, authRoutes);
app.use(`/api/${config.apiVersion}/audit-logs`, auditLogRoutes);
app.use(`/api/${config.apiVersion}/documents`, documentRoutes);
app.use(`/api/${config.apiVersion}/applications`, applicationRoutes);
app.use(`/api/${config.apiVersion}/communications`, communicationRoutes);
app.use(`/api/${config.apiVersion}/reporting`, reportingRoutes);
app.use(`/api/${config.apiVersion}/validator`, validatorRouter);
app.use(`/api/${config.apiVersion}/metrics`, metricsRoutes);
app.use(`/api/${config.apiVersion}/key-management`, keyManagementRoutes);

// Convenience routes without version prefix for frontend
app.use('/api/applications', applicationRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/auth', authRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

export default app;
