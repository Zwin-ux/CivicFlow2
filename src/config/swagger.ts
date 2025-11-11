/**
 * Swagger/OpenAPI Configuration
 * Generates API documentation for all REST endpoints
 */

import swaggerJsdoc from 'swagger-jsdoc';
import config from './index';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Government Lending CRM Platform API',
      version: '1.0.0',
      description: `
        The Government Lending CRM Platform API provides endpoints for managing micro-business grant and loan applications.
        
        ## Features
        - Document upload and classification
        - Application management and eligibility scoring
        - Automated communication generation
        - Compliance reporting and dashboards
        - Audit trail and privacy protection
        - Human-in-the-loop decision workflow
        
        ## Authentication
        All endpoints (except /health and /auth/login) require authentication via JWT token.
        Include the token in the Authorization header: \`Bearer <token>\`
        
        ## Rate Limiting
        API requests are rate-limited to prevent abuse. Contact your administrator for rate limit details.
      `,
      contact: {
        name: 'API Support',
        email: 'support@example.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.port}/api/${config.apiVersion}`,
        description: 'Development server',
      },
      {
        url: `https://api.example.com/api/${config.apiVersion}`,
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  description: 'Error code for programmatic handling',
                  example: 'VALIDATION_ERROR',
                },
                message: {
                  type: 'string',
                  description: 'Human-readable error message',
                  example: 'Missing required fields',
                },
                details: {
                  type: 'object',
                  description: 'Additional error details',
                },
                timestamp: {
                  type: 'string',
                  format: 'date-time',
                  description: 'Error timestamp',
                },
                requestId: {
                  type: 'string',
                  description: 'Request ID for tracking',
                },
              },
            },
          },
        },
        Application: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Application unique identifier',
            },
            applicantId: {
              type: 'string',
              format: 'uuid',
              description: 'Applicant unique identifier',
            },
            programType: {
              type: 'string',
              description: 'Type of grant or loan program',
              example: 'SMALL_BUSINESS_GRANT',
            },
            requestedAmount: {
              type: 'number',
              format: 'decimal',
              description: 'Requested loan or grant amount',
              example: 50000.00,
            },
            status: {
              type: 'string',
              enum: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'PENDING_DOCUMENTS', 'APPROVED', 'REJECTED', 'DEFERRED'],
              description: 'Current application status',
            },
            eligibilityScore: {
              type: 'number',
              nullable: true,
              description: 'Calculated eligibility score (0-100)',
              example: 85.5,
            },
            missingDocuments: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'List of missing required documents',
            },
            fraudFlags: {
              type: 'array',
              items: {
                type: 'object',
              },
              description: 'Fraud detection flags',
            },
            assignedTo: {
              type: 'string',
              format: 'uuid',
              nullable: true,
              description: 'Staff member ID assigned to review',
            },
            submittedAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
            },
            reviewedAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
            },
            decidedAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
            },
            decision: {
              type: 'object',
              nullable: true,
              description: 'Final decision details',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Document: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            applicationId: {
              type: 'string',
              format: 'uuid',
            },
            fileName: {
              type: 'string',
              example: 'w9-form.pdf',
            },
            fileSize: {
              type: 'integer',
              description: 'File size in bytes',
            },
            mimeType: {
              type: 'string',
              example: 'application/pdf',
            },
            documentType: {
              type: 'string',
              enum: ['W9', 'EIN', 'BANK_STATEMENT', 'OTHER'],
              nullable: true,
            },
            classificationConfidence: {
              type: 'number',
              nullable: true,
              description: 'Classification confidence score (0-100)',
            },
            extractedData: {
              type: 'object',
              nullable: true,
              description: 'Extracted structured data',
            },
            uploadedAt: {
              type: 'string',
              format: 'date-time',
            },
            classifiedAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
            },
          },
        },
        AuditLog: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            actionType: {
              type: 'string',
              description: 'Type of action performed',
            },
            entityType: {
              type: 'string',
              enum: ['APPLICATION', 'DOCUMENT', 'USER', 'SYSTEM'],
            },
            entityId: {
              type: 'string',
              format: 'uuid',
            },
            performedBy: {
              type: 'string',
              description: 'User ID or SYSTEM',
            },
            confidenceScore: {
              type: 'number',
              nullable: true,
            },
            details: {
              type: 'object',
            },
            ipAddress: {
              type: 'string',
              nullable: true,
            },
            userAgent: {
              type: 'string',
              nullable: true,
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication token is missing or invalid',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                error: {
                  code: 'UNAUTHORIZED',
                  message: 'Authentication required',
                  timestamp: '2024-01-15T10:30:00Z',
                  requestId: 'req-123',
                },
              },
            },
          },
        },
        ForbiddenError: {
          description: 'User does not have permission to access this resource',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                error: {
                  code: 'FORBIDDEN',
                  message: 'Insufficient permissions',
                  timestamp: '2024-01-15T10:30:00Z',
                  requestId: 'req-123',
                },
              },
            },
          },
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                error: {
                  code: 'NOT_FOUND',
                  message: 'Resource not found',
                  timestamp: '2024-01-15T10:30:00Z',
                  requestId: 'req-123',
                },
              },
            },
          },
        },
        ValidationError: {
          description: 'Request validation failed',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                error: {
                  code: 'VALIDATION_ERROR',
                  message: 'Missing required fields',
                  details: {
                    fields: ['applicantId', 'programType'],
                  },
                  timestamp: '2024-01-15T10:30:00Z',
                  requestId: 'req-123',
                },
              },
            },
          },
        },
        InternalServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                error: {
                  code: 'INTERNAL_SERVER_ERROR',
                  message: 'An unexpected error occurred',
                  timestamp: '2024-01-15T10:30:00Z',
                  requestId: 'req-123',
                },
              },
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization',
      },
      {
        name: 'Applications',
        description: 'Application management endpoints',
      },
      {
        name: 'Documents',
        description: 'Document upload and management',
      },
      {
        name: 'Communications',
        description: 'Communication and notification management',
      },
      {
        name: 'Reporting',
        description: 'Reports and dashboard metrics',
      },
      {
        name: 'Audit Logs',
        description: 'Audit trail and logging',
      },
      {
        name: 'Validator',
        description: 'Data validation services',
      },
      {
        name: 'Metrics',
        description: 'Performance and accuracy metrics',
      },
      {
        name: 'Health',
        description: 'System health checks',
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/models/*.ts'],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
