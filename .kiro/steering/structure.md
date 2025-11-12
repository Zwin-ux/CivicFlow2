# Project Structure

## Root Directory Layout

```
├── src/                    # TypeScript source code
├── dist/                   # Compiled JavaScript output
├── public/                 # Static frontend files (HTML/CSS/JS)
├── docs/                   # Documentation
├── k8s/                    # Kubernetes deployment configs
├── scripts/                # Shell scripts for setup
├── .kiro/                  # Kiro AI assistant configuration
├── .github/                # GitHub Actions CI/CD
└── node_modules/           # Dependencies
```

## Source Code Organization (`src/`)

### Entry Points
- **`index.ts`**: Server startup, graceful shutdown, WebSocket initialization
- **`app.ts`**: Express app configuration, middleware chain, route registration

### Core Directories

#### `config/`
Configuration and connection management
- `index.ts` - Central config (loads from env vars)
- `database.ts` - PostgreSQL connection pool with demo mode fallback
- `redis.ts` - Redis client with in-memory fallback
- `permissions.ts` - Role-based access control definitions
- `swagger.ts` - API documentation config
- `tls.ts` - TLS/HTTPS configuration

#### `routes/`
Express route handlers (thin layer, delegates to services)
- One file per resource (e.g., `applications.ts`, `documents.ts`)
- `admin/` subfolder for admin-only routes
- Routes define HTTP endpoints and call services
- Validation and authentication applied via middleware

#### `services/`
Business logic layer (core application logic)
- One service per domain (e.g., `applicationService.ts`, `documentService.ts`)
- **Demo Mode Services**: `demoModeManager.ts`, `demoDataService.ts`, `demoDataGenerator.ts`
- **AI Services**: `aiDocumentAnalyzerService.ts`, `aiDecisionSupportService.ts`, `aiRecommendationEngine.ts`
- **Integration Services**: `teamsIntegrationService.ts`, `teamsNotificationService.ts`
- **Background Jobs**: `demoSessionCleanupJob.ts`, `teamsConfigReloadService.ts`
- Contains README files documenting specific subsystems

#### `repositories/`
Data access layer (database queries)
- One repository per entity (e.g., `applicationRepository.ts`, `userRepository.ts`)
- Encapsulates all SQL queries
- Returns domain models
- Demo mode: returns mock data when active

#### `models/`
TypeScript interfaces and types for domain entities
- Define data structures (e.g., `Application`, `User`, `Document`)
- Used across services and repositories
- No business logic, just type definitions

#### `middleware/`
Express middleware functions
- `authenticate.ts` - JWT token validation
- `authorize.ts` - Role-based authorization
- `demoMode.ts` - Demo mode detection and auth bypass
- `errorHandler.ts` - Centralized error handling
- `rateLimiter.ts` - Rate limiting configurations
- `requestLogger.ts` - Winston-based request logging
- `auditLogger.ts` - Compliance audit trail
- `requestId.ts` - Request ID generation/tracking

#### `clients/`
External service integrations
- `azureDocumentIntelligenceClient.ts` - Azure Document Intelligence API
- `llmClient.ts` - OpenAI GPT-4 integration
- `graphClient.ts` - Microsoft Graph API
- `emailClient.ts` - SendGrid email service
- `extractionClient.ts`, `classificationClient.ts` - AI utilities
- Contains README files for Teams and AI integrations

#### `database/`
Database migrations and seeds
- `migrations/` - SQL migration files (numbered sequentially)
- `seeds/` - Data seeding scripts
- `migrationRunner.ts` - Migration execution logic
- `seedRunner.ts` - Seed execution logic
- `README.md` - Database documentation
- `SCHEMA.md` - Schema reference

#### `scripts/`
CLI utility scripts
- `migrate.ts` - Run database migrations
- `seed.ts` - Seed database with data
- `startup.ts` - Startup orchestration (migrations + seeding + verification)
- `verify-ai-services.ts` - Check AI service connectivity
- `verify-deployment.ts` - Pre-deployment checks
- `generate-secrets.ts` - Generate JWT/encryption keys

#### `utils/`
Shared utility functions
- `logger.ts` - Winston logger configuration
- `errors.ts` - Custom error classes
- `encryption.ts` - Data encryption utilities
- `keyManagement.ts` - Encryption key rotation
- `circuitBreaker.ts` - Circuit breaker wrapper
- `storage.ts` - File storage abstraction
- `templateRenderer.ts` - Handlebars template rendering
- `adaptiveCardFactory.ts` - Teams adaptive card builder
- `messageQueue.ts` - In-memory message queue
- `promptTemplates.ts` - AI prompt templates
- Contains README files for encryption and key management

#### `types/`
TypeScript type definitions
- `express.d.ts` - Express request/response extensions

## Frontend (`public/`)

Static HTML/CSS/JS files served by Express
- `index.html` - Main landing page
- `admin-dashboard.html` - Admin interface
- `applicant-portal.html` - Applicant interface
- `staff-portal.html` - Staff interface
- `loan-ops-dashboard.html` - Operations dashboard
- `ai-insights-dashboard.html` - AI analytics
- `teams-config.html` - Teams integration config
- `demo-landing.html` - Demo mode landing page
- `css/` - Stylesheets
- `js/` - Client-side JavaScript

## Documentation (`docs/`)

Comprehensive documentation files
- `API_DOCUMENTATION.md` - API reference
- `AUTHENTICATION.md` - Auth implementation guide
- `DEMO_MODE.md` - Demo mode documentation
- `DOCKER.md` - Docker deployment guide
- `SECURITY.md` - Security best practices
- `ERROR_HANDLING.md` - Error handling patterns
- `CI_CD.md` - CI/CD pipeline documentation
- `TEAMS_INTEGRATION_SETUP.md` - Teams setup guide

## Kubernetes (`k8s/`)

Production Kubernetes manifests
- `api-deployment.yaml` - API deployment
- `postgres-deployment.yaml` - Database
- `redis-deployment.yaml` - Cache
- `ingress.yaml` - Ingress rules
- `hpa.yaml` - Horizontal pod autoscaling
- `monitoring.yaml` - Prometheus/Grafana
- `overlays/` - Kustomize overlays for environments
- `deploy.sh`, `deploy.ps1` - Deployment scripts

## Configuration Files

### Environment Files
- `.env.example` - Template with all variables
- `.env.development` - Development defaults
- `.env.production` - Production template
- `.env.docker` - Docker-specific config
- `.env.railway` - Railway deployment config
- `.env.test` - Test environment

### Build & Tooling
- `tsconfig.json` - TypeScript compiler config
- `package.json` - Dependencies and scripts
- `jest.config.js` - Jest test configuration
- `.eslintrc.json` - ESLint rules
- `Dockerfile` - Production container
- `Dockerfile.dev` - Development container
- `docker-compose.yml` - Production compose
- `docker-compose.dev.yml` - Development compose
- `Makefile` - Common Docker commands

### Deployment
- `railway.json`, `railway.toml` - Railway platform config
- `.dockerignore` - Docker build exclusions
- `.gitignore` - Git exclusions

## Key Architectural Patterns

### Request Flow
```
HTTP Request
  ↓
Middleware Chain (auth, logging, rate limiting, demo mode)
  ↓
Route Handler (validates input)
  ↓
Service Layer (business logic)
  ↓
Repository Layer (data access)
  ↓
Database / Demo Data
```

### Demo Mode Flow
```
Startup
  ↓
Try Database Connection
  ↓
Failed? → demoModeManager.activate()
  ↓
All repositories check demoModeManager.isActive()
  ↓
If active: return mock data from demoDataService
  ↓
If not active: query real database
```

### Service Dependencies
- Services depend on repositories (never direct DB access)
- Repositories depend on database/redis config
- Routes depend on services (never repositories)
- Middleware is independent and reusable

## File Naming Conventions

- **Services**: `{domain}Service.ts` (e.g., `applicationService.ts`)
- **Repositories**: `{entity}Repository.ts` (e.g., `userRepository.ts`)
- **Routes**: `{resource}.ts` (e.g., `applications.ts`)
- **Models**: `{entity}.ts` (e.g., `application.ts`)
- **Middleware**: `{function}.ts` (e.g., `authenticate.ts`)
- **Clients**: `{service}Client.ts` (e.g., `llmClient.ts`)
- **Utils**: `{purpose}.ts` (e.g., `logger.ts`)

## Important Subsystems

### Demo Mode System
- `services/demoModeManager.ts` - Activation logic
- `services/demoDataService.ts` - Mock data provider
- `services/demoDataGenerator.ts` - Generate realistic data
- `middleware/demoMode.ts` - Request-level demo detection
- `repositories/demoDataRepository.ts` - Demo data storage

### AI Document Processing
- `services/aiDocumentAnalyzerService.ts` - Main analyzer
- `services/aiDecisionSupportService.ts` - Decision recommendations
- `services/documentQualityService.ts` - Quality checks
- `clients/azureDocumentIntelligenceClient.ts` - Azure integration
- `clients/llmClient.ts` - OpenAI integration

### Teams Integration
- `services/teamsIntegrationService.ts` - Core integration
- `services/teamsNotificationService.ts` - Notification sender
- `clients/graphClient.ts` - Microsoft Graph API
- `utils/adaptiveCardFactory.ts` - Card builder

### Background Jobs
- `services/demoSessionCleanupJob.ts` - Clean expired demo sessions
- `services/teamsConfigReloadService.ts` - Reload Teams config
- `services/documentProcessingQueueService.ts` - Process document queue

## Adding New Features

### New API Endpoint
1. Create route in `routes/{resource}.ts`
2. Create service in `services/{domain}Service.ts`
3. Create repository in `repositories/{entity}Repository.ts`
4. Add model types in `models/{entity}.ts`
5. Add demo data support in `services/demoDataService.ts`
6. Register route in `app.ts`

### New External Integration
1. Create client in `clients/{service}Client.ts`
2. Add circuit breaker wrapper
3. Add configuration to `config/index.ts`
4. Add environment variables to `.env.example`
5. Document in `docs/`

### New Background Job
1. Create service in `services/{job}Job.ts`
2. Use `node-cron` for scheduling
3. Initialize in `index.ts`
4. Add graceful shutdown logic
