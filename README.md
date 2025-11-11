# Government Lending CRM Platform

A system designed to streamline micro-business grant and loan workflows for government agencies and lenders.

## Quick Start with Docker (Recommended)

The fastest way to get started is using Docker:

```bash
# Windows (PowerShell)
.\scripts\docker-setup.ps1

# Linux/Mac
chmod +x scripts/docker-setup.sh
./scripts/docker-setup.sh
```

Or manually:

```bash
# Copy environment file
cp .env.docker .env

# Start all services
docker-compose up -d

# Run migrations
docker-compose exec api npm run migrate

# Seed database
docker-compose exec api npm run seed
```

See [Docker Documentation](docs/DOCKER.md) for detailed instructions.

## Prerequisites (Manual Setup)

- Node.js 18+ and npm
- PostgreSQL 14+
- Redis 6+

## Manual Setup

1. Install dependencies:
```bash
npm install
```

2. Copy environment configuration:
```bash
cp .env.example .env
```

3. Update `.env` with your configuration values

4. Run database migrations:
```bash
npm run migrate up
```

5. Seed initial data:
```bash
npm run seed all
```

6. Build the project:
```bash
npm run build
```

## Development

Run the development server with hot reload:
```bash
npm run dev
```

## Production

Build and start the production server:
```bash
npm run build
npm start
```

## API Endpoints

- `GET /api/v1/health` - Health check endpoint
- `GET /api/v1/ready` - Readiness check endpoint

## Database Management

### Migrations

Run all pending migrations:
```bash
npm run migrate up
```

Check migration status:
```bash
npm run migrate status
```

Rollback last migration (use with caution):
```bash
npm run migrate rollback
```

### Seeds

Seed all data (includes test data in development):
```bash
npm run seed all
```

Seed program rules only:
```bash
npm run seed rules
```

Seed test data only (development only):
```bash
npm run seed test
```

See [Database Documentation](src/database/README.md) for more details.

## Project Structure

```
src/
├── config/          # Configuration files
│   ├── index.ts     # Main config
│   ├── database.ts  # PostgreSQL connection
│   └── redis.ts     # Redis client
├── database/        # Database migrations and seeds
│   ├── migrations/  # SQL migration files
│   ├── seeds/       # Seed data scripts
│   ├── migrationRunner.ts
│   ├── seedRunner.ts
│   ├── README.md    # Database documentation
│   └── SCHEMA.md    # Schema reference
├── middleware/      # Express middleware
│   ├── errorHandler.ts
│   └── requestLogger.ts
├── routes/          # API routes
│   └── health.ts
├── scripts/         # CLI scripts
│   ├── migrate.ts   # Migration runner
│   └── seed.ts      # Seed runner
├── utils/           # Utility functions
│   └── logger.ts
├── app.ts           # Express app setup
└── index.ts         # Server entry point
```

## Environment Variables

See `.env.example` for all available configuration options.

## Docker Deployment

### Quick Commands

```bash
# Start services
make up              # Production mode
make up-dev          # Development mode with hot-reload

# View logs
make logs            # All services
make logs-api        # API only

# Database operations
make migrate         # Run migrations
make seed            # Seed database
make backup-db       # Backup database

# Maintenance
make restart         # Restart all services
make clean           # Stop and remove volumes
make health          # Check service health
```

See [Docker Documentation](docs/DOCKER.md) for complete guide.

## Kubernetes Deployment

For production deployments, use Kubernetes for high availability and auto-scaling:

```bash
# Quick deployment
cd k8s
./deploy.sh          # Linux/Mac
.\deploy.ps1         # Windows

# Or using kubectl
kubectl apply -k k8s/

# Production overlay
kubectl apply -k k8s/overlays/production/
```

Features:
- Horizontal pod autoscaling (3-10 replicas)
- Automatic TLS certificate management
- High availability with pod disruption budgets
- Network policies for security
- Persistent storage for database and cache

See [Kubernetes Deployment Guide](k8s/DEPLOYMENT_GUIDE.md) for complete instructions.

## CI/CD Pipeline

The project uses GitHub Actions for continuous integration and deployment:

- **CI Pipeline**: Automated testing, linting, and security scanning on every PR
- **Staging Deployment**: Automatic deployment to staging on merge to `develop`
- **Production Deployment**: Manual approval required for production deployments

### Quick Start

```bash
# Deploy to staging (automatic on merge to develop)
git checkout develop
git merge feature/my-feature
git push origin develop

# Deploy to production (requires manual approval)
git checkout main
git merge develop
git push origin main
```

See [CI/CD Documentation](docs/CI_CD.md) for complete guide.

## Documentation

- [CI/CD Pipeline Guide](docs/CI_CD.md)
- [Kubernetes Deployment Guide](k8s/DEPLOYMENT_GUIDE.md)
- [Docker Deployment Guide](docs/DOCKER.md)
- [Database Documentation](src/database/README.md)
- [Database Schema](src/database/SCHEMA.md)
- [Authentication Guide](docs/AUTHENTICATION.md)
- [Security Guide](docs/SECURITY.md)
- [API Documentation](docs/API_DOCUMENTATION.md)
- [Error Handling](docs/ERROR_HANDLING.md)

## License

MIT
