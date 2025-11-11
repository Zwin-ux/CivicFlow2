# Docker Deployment Guide

This guide covers how to build, run, and deploy the Government Lending CRM platform using Docker and Docker Compose.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- At least 4GB of available RAM
- 10GB of available disk space

## Quick Start

### Development Environment

1. Clone the repository and navigate to the project directory

2. Copy the environment file:
```bash
cp .env.example .env
```

3. Start all services with hot-reload:
```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

4. The API will be available at `http://localhost:3000`

5. Run database migrations:
```bash
docker-compose exec api npm run migrate
```

6. Seed the database with test data:
```bash
docker-compose exec api npm run seed
```

### Production Environment

1. Set up production environment variables:
```bash
cp .env.example .env.production
# Edit .env.production with production values
```

2. Build and start services:
```bash
docker-compose --env-file .env.production up -d
```

3. Run migrations:
```bash
docker-compose exec api npm run migrate
```

## Docker Images

### API Server Image

The API server uses a multi-stage build for optimal image size:

- **Builder stage**: Compiles TypeScript to JavaScript
- **Production stage**: Runs the compiled application with minimal dependencies

**Image size**: ~150MB (Alpine-based)

**Security features**:
- Non-root user (nodejs:nodejs)
- Minimal attack surface (Alpine Linux)
- No development dependencies
- Read-only source code

### Building the Image

```bash
# Build production image
docker build -t lending-crm-api:latest .

# Build development image
docker build -f Dockerfile.dev -t lending-crm-api:dev .
```

## Docker Compose Services

### Services Overview

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| postgres | postgres:16-alpine | 5432 | PostgreSQL database |
| redis | redis:7-alpine | 6379 | Cache and session store |
| api | Custom build | 3000 | Node.js API server |

### Service Configuration

#### PostgreSQL
- **Version**: 16 (Alpine)
- **Data persistence**: Named volume `postgres_data`
- **Health check**: `pg_isready` command
- **Initialization**: Runs migration scripts on first start

#### Redis
- **Version**: 7 (Alpine)
- **Data persistence**: Named volume `redis_data`
- **Password protected**: Set via `REDIS_PASSWORD` env var
- **Health check**: Redis ping command

#### API Server
- **Base image**: Node.js 20 (Alpine)
- **Health check**: HTTP GET to `/api/v1/health/ready`
- **Resource limits**: 2 CPU cores, 2GB RAM (configurable)
- **Volumes**: 
  - `./uploads` - Document storage
  - `./logs` - Application logs

## Environment Variables

### Required Variables

```bash
# Database
DB_HOST=postgres
DB_PORT=5432
DB_NAME=lending_crm
DB_USER=postgres
DB_PASSWORD=<secure-password>

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=<secure-password>

# Security
JWT_SECRET=<random-secret-min-32-chars>
ENCRYPTION_KEY=<random-key-min-32-chars>

# Storage
STORAGE_PROVIDER=local|s3|azure
STORAGE_BUCKET=lending-crm-documents
STORAGE_REGION=us-east-1
```

### Optional Variables

```bash
# Application
NODE_ENV=production
PORT=3000
API_VERSION=v1
LOG_LEVEL=info

# Database Pool
DB_POOL_MIN=2
DB_POOL_MAX=10

# JWT
JWT_EXPIRES_IN=24h
```

## Common Commands

### Start Services

```bash
# Start all services in foreground
docker-compose up

# Start all services in background
docker-compose up -d

# Start specific service
docker-compose up -d api
```

### Stop Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes data)
docker-compose down -v
```

### View Logs

```bash
# View all logs
docker-compose logs

# Follow logs in real-time
docker-compose logs -f

# View specific service logs
docker-compose logs -f api
```

### Execute Commands

```bash
# Run migrations
docker-compose exec api npm run migrate

# Seed database
docker-compose exec api npm run seed

# Run tests
docker-compose exec api npm test

# Access PostgreSQL shell
docker-compose exec postgres psql -U postgres -d lending_crm

# Access Redis CLI
docker-compose exec redis redis-cli -a <password>
```

### Rebuild Services

```bash
# Rebuild all images
docker-compose build

# Rebuild specific service
docker-compose build api

# Rebuild without cache
docker-compose build --no-cache
```

## Health Checks

### API Health Endpoint

```bash
# Check API health
curl http://localhost:3000/api/v1/health

# Check readiness
curl http://localhost:3000/api/v1/health/ready
```

### Container Health Status

```bash
# View health status of all containers
docker-compose ps

# Inspect specific container health
docker inspect --format='{{.State.Health.Status}}' lending-crm-api
```

## Resource Management

### Resource Limits

Default limits (configurable in docker-compose.yml):

- **CPU**: 2 cores (limit), 0.5 cores (reservation)
- **Memory**: 2GB (limit), 512MB (reservation)

### Monitoring Resource Usage

```bash
# View real-time resource usage
docker stats

# View specific container stats
docker stats lending-crm-api
```

## Volumes and Data Persistence

### Named Volumes

- `postgres_data`: PostgreSQL database files
- `redis_data`: Redis persistence files

### Bind Mounts

- `./uploads`: Document storage (local development)
- `./logs`: Application logs

### Backup and Restore

#### Database Backup

```bash
# Create backup
docker-compose exec postgres pg_dump -U postgres lending_crm > backup.sql

# Restore backup
docker-compose exec -T postgres psql -U postgres lending_crm < backup.sql
```

#### Volume Backup

```bash
# Backup volume to tar file
docker run --rm -v lending-crm_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres-backup.tar.gz -C /data .

# Restore volume from tar file
docker run --rm -v lending-crm_postgres_data:/data -v $(pwd):/backup alpine tar xzf /backup/postgres-backup.tar.gz -C /data
```

## Troubleshooting

### Container Won't Start

1. Check logs:
```bash
docker-compose logs api
```

2. Verify environment variables:
```bash
docker-compose config
```

3. Check port conflicts:
```bash
netstat -an | grep 3000
```

### Database Connection Issues

1. Verify PostgreSQL is healthy:
```bash
docker-compose ps postgres
```

2. Test database connection:
```bash
docker-compose exec postgres pg_isready -U postgres
```

3. Check network connectivity:
```bash
docker-compose exec api ping postgres
```

### Redis Connection Issues

1. Verify Redis is healthy:
```bash
docker-compose ps redis
```

2. Test Redis connection:
```bash
docker-compose exec redis redis-cli -a <password> ping
```

### Out of Memory

1. Increase Docker memory limit in Docker Desktop settings

2. Adjust container resource limits in docker-compose.yml

3. Monitor memory usage:
```bash
docker stats
```

### Permission Issues

1. Check file ownership:
```bash
ls -la uploads/ logs/
```

2. Fix permissions:
```bash
sudo chown -R 1001:1001 uploads/ logs/
```

## Security Best Practices

### Production Deployment

1. **Use secrets management**: Store sensitive values in Docker secrets or external secret managers

2. **Enable TLS**: Use a reverse proxy (nginx, Traefik) with TLS certificates

3. **Network isolation**: Use Docker networks to isolate services

4. **Regular updates**: Keep base images and dependencies updated

5. **Scan images**: Use `docker scan` or Trivy to check for vulnerabilities

6. **Limit resources**: Set appropriate CPU and memory limits

7. **Read-only filesystem**: Mount volumes as read-only where possible

8. **Drop capabilities**: Remove unnecessary Linux capabilities

### Security Scanning

```bash
# Scan image for vulnerabilities
docker scan lending-crm-api:latest

# Using Trivy
trivy image lending-crm-api:latest
```

## Performance Optimization

### Build Optimization

1. **Use .dockerignore**: Exclude unnecessary files from build context

2. **Layer caching**: Order Dockerfile commands from least to most frequently changed

3. **Multi-stage builds**: Separate build and runtime stages

4. **Minimize layers**: Combine RUN commands where appropriate

### Runtime Optimization

1. **Connection pooling**: Configure appropriate database pool sizes

2. **Redis caching**: Enable Redis for session and data caching

3. **Resource limits**: Set appropriate CPU and memory limits

4. **Health checks**: Configure reasonable intervals and timeouts

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Build and Push Docker Image

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build image
        run: docker build -t lending-crm-api:${{ github.sha }} .
      
      - name: Run tests
        run: docker run lending-crm-api:${{ github.sha }} npm test
      
      - name: Push to registry
        run: |
          echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
          docker push lending-crm-api:${{ github.sha }}
```

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Node.js Docker Best Practices](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md)
- [PostgreSQL Docker Hub](https://hub.docker.com/_/postgres)
- [Redis Docker Hub](https://hub.docker.com/_/redis)
