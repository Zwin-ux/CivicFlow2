# Technology Stack

## Core Technologies

### Runtime & Language
- **Node.js**: 20+ (specified in package.json engines)
- **TypeScript**: 5.3.3 with strict mode enabled
- **Target**: ES2020, CommonJS modules

### Backend Framework
- **Express.js**: 4.18.2 - REST API server
- **WebSocket**: ws 8.18.3 - Real-time updates

### Databases & Caching
- **PostgreSQL**: 14+ - Primary database (pg 8.11.3)
- **Redis**: 6+ - Caching and session management (redis 4.6.12)

### AI & Document Processing
- **Azure Document Intelligence**: @azure/ai-form-recognizer 5.1.0
- **OpenAI**: openai 4.104.0 - GPT-4 for analysis
- **Azure Identity**: @azure/identity 4.0.0 - Authentication

### Microsoft Integration
- **Microsoft Graph**: @microsoft/microsoft-graph-client 3.0.7
- **Teams**: Adaptive cards and webhooks

### Security & Middleware
- **Helmet.js**: 7.1.0 - Security headers
- **JWT**: jsonwebtoken 9.0.2 - Authentication
- **bcryptjs**: 3.0.3 - Password hashing
- **express-rate-limit**: 8.2.1 - Rate limiting

### Utilities
- **Winston**: 3.11.0 - Logging
- **Multer**: 1.4.5-lts.1 - File uploads
- **Handlebars**: 4.7.8 - Email templates
- **node-cron**: 3.0.3 - Scheduled jobs
- **Opossum**: 9.0.0 - Circuit breaker pattern

### Development Tools
- **ts-node-dev**: 2.0.0 - Hot reload in development
- **ESLint**: 8.56.0 with TypeScript plugin
- **Jest**: 29.7.0 - Testing framework

## Build System

### TypeScript Configuration
- Strict mode enabled
- Output: `dist/` directory
- Source maps and declarations generated
- Module resolution: Node

### Common Commands

```bash
# Development
npm install              # Install dependencies
npm run dev             # Start with hot reload (ts-node-dev)

# Building
npm run build           # Compile TypeScript to dist/
npm start               # Run compiled code from dist/

# Database
npm run migrate up      # Run pending migrations
npm run migrate status  # Check migration status
npm run seed all        # Seed database with data
npm run seed demo       # Seed demo data only

# Testing
npm test                # Run Jest tests
npm run lint            # Run ESLint

# Utilities
npm run startup         # Run startup script (migrations + seeding)
npm run verify:ai       # Verify AI service connections
npm run verify:deployment  # Pre-deployment checks
npm run generate-secrets   # Generate JWT/encryption keys
```

### Docker Commands

```bash
# Using docker-compose
docker-compose up -d              # Start all services
docker-compose exec api npm run migrate  # Run migrations in container
docker-compose logs -f api        # View API logs
docker-compose down -v            # Stop and remove volumes

# Using Makefile (if available)
make up                 # Start production
make up-dev            # Start development mode
make migrate           # Run migrations
make seed              # Seed database
make logs              # View all logs
make clean             # Stop and clean up
```

### Environment Setup

```bash
# Quick start options
cp .env.example .env           # Manual setup
cp .env.docker .env            # Docker setup
cp .env.railway .env           # Railway deployment
echo "DEMO_MODE=true" > .env   # Demo mode only

# Required for production
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=<64-byte-hex>
ENCRYPTION_KEY=<32-byte-hex>

# Optional AI features
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=...
AZURE_DOCUMENT_INTELLIGENCE_KEY=...
OPENAI_API_KEY=...
```

## Architecture Patterns

### Layered Architecture
- **Routes** → **Services** → **Repositories** → **Database**
- Clear separation of concerns
- Dependency injection where applicable

### Error Handling
- Custom error classes in `utils/errors.ts`
- Centralized error handler middleware
- Circuit breaker pattern for external services

### Resilience Patterns
- **Demo Mode**: Automatic fallback on infrastructure failure
- **Circuit Breakers**: Opossum for external API calls
- **Rate Limiting**: Per-endpoint rate limits
- **Graceful Degradation**: Services continue with reduced functionality

### Logging
- Winston for structured logging
- Request ID tracking across requests
- Audit logging for compliance
- Different log levels per environment

## Code Style

### TypeScript
- Strict mode enabled
- Explicit types preferred (avoid `any` when possible)
- Async/await over promises
- Interface over type for object shapes

### Naming Conventions
- **Files**: camelCase.ts (e.g., `demoModeManager.ts`)
- **Classes**: PascalCase (e.g., `DemoModeManager`)
- **Functions/Variables**: camelCase
- **Constants**: UPPER_SNAKE_CASE
- **Interfaces**: PascalCase, no "I" prefix

### ESLint Rules
- `@typescript-eslint/no-explicit-any`: warn
- `no-console`: warn (use logger instead)
- Explicit module boundary types: off

## Testing

### Jest Configuration
- Test files: `**/*.test.ts`
- Coverage reports generated
- ts-jest for TypeScript support

### Running Tests
```bash
npm test                    # Run all tests
npm test -- --watch        # Watch mode
npm test -- --coverage     # With coverage
```
