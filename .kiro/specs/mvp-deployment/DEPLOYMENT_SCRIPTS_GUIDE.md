# Deployment Scripts Guide

## Overview
This guide explains how to use the deployment automation scripts created in Task 5.

## Scripts Available

### 1. Startup Script
**Purpose**: Orchestrates application startup with migrations, seeding, and service verification.

**Usage:**
```bash
# Run standalone (for testing)
npm run startup

# Automatically runs when starting the application
npm start
```

**What it does:**
1. Verifies database connection
2. Verifies Redis connection
3. Runs pending database migrations
4. Seeds demo data if database is empty (when DEMO_MODE_ENABLED=true)
5. Logs detailed startup status

**Environment Variables:**
- `DEMO_MODE_ENABLED=true` - Enables demo data seeding on empty database

**Exit Codes:**
- `0` - Startup successful
- `1` - Startup failed (check logs for details)

### 2. Health Check Endpoints
**Purpose**: Monitor application and service health.

**Endpoints:**

#### Basic Health Check
```bash
curl http://localhost:3000/api/v1/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### Detailed Health Check
```bash
curl http://localhost:3000/api/v1/health/detailed
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "environment": "production",
  "services": {
    "database": {
      "status": "ok",
      "latency": 15,
      "timestamp": "2024-01-15T10:30:00.000Z",
      "version": "PostgreSQL 15.1"
    },
    "redis": {
      "status": "ok",
      "latency": 5
    }
  },
  "system": {
    "memory": { "used": 128, "total": 256, "unit": "MB" },
    "cpu": { "user": 1000000, "system": 500000 }
  },
  "responseTime": 25
}
```

**Status Levels:**
- `healthy` - All services operational
- `degraded` - Some non-critical services down
- `unhealthy` - Critical services down

**HTTP Status Codes:**
- `200` - Healthy or degraded
- `503` - Unhealthy

### 3. Deployment Verification Script
**Purpose**: Verify deployment success by testing critical endpoints and user flows.

**Usage:**

```bash
# Test local deployment
npm run verify:deployment

# Test remote deployment (environment variable)
BASE_URL=https://your-app.railway.app npm run verify:deployment

# Test remote deployment (command argument)
npm run verify:deployment https://your-app.railway.app
```

**What it tests:**
1. ✓ Health Check - Basic health endpoint
2. ✓ Detailed Health - All services healthy
3. ✓ Demo Applicant Login - demo-applicant credentials
4. ✓ Demo Staff Login - demo-staff credentials
5. ✓ Demo Admin Login - demo-admin credentials
6. ✓ Demo Data Check - Database has applications
7. ✓ Applicant Profile - Authenticated API access
8. ✓ Static Files - Homepage served correctly
9. ✓ API Documentation - API docs accessible
10. ✓ Metrics Endpoint - Admin-only access

**Exit Codes:**
- `0` - All tests passed
- `1` - One or more tests failed

**Sample Output:**
```
================================================================================
DEPLOYMENT VERIFICATION REPORT
================================================================================
Timestamp: 2024-01-15T10:30:00.000Z
Base URL: https://your-app.railway.app
Environment: production
Overall Status: PASSED
Tests: 10/10 passed, 0 failed
================================================================================

Test Results:
--------------------------------------------------------------------------------
1. ✓ PASS - Health Check (45ms)
   Basic health check passed
2. ✓ PASS - Detailed Health (78ms)
   All services healthy
3. ✓ PASS - Demo Applicant Login (120ms)
   Login successful
...
--------------------------------------------------------------------------------

Summary: 10/10 tests passed. 0 failed.
================================================================================
```

## Deployment Workflow

### Local Development
```bash
# 1. Start services
docker-compose up -d postgres redis

# 2. Run startup script (optional - for testing)
npm run startup

# 3. Start application (includes startup script)
npm run dev

# 4. Verify health
curl http://localhost:3000/api/v1/health/detailed
```

### Production Deployment (Railway)

#### Initial Deployment
```bash
# 1. Build application
npm run build

# 2. Start application (startup script runs automatically)
npm start

# Railway will:
# - Run migrations automatically
# - Seed demo data if database is empty
# - Start the server
# - Monitor health at /api/v1/health
```

#### Post-Deployment Verification
```bash
# Run verification script
BASE_URL=https://your-app.railway.app npm run verify:deployment

# Or manually check health
curl https://your-app.railway.app/api/v1/health/detailed
```

## Integration with CI/CD

### GitHub Actions Example
```yaml
- name: Deploy to Railway
  run: railway up

- name: Wait for deployment
  run: sleep 30

- name: Verify deployment
  run: BASE_URL=${{ secrets.RAILWAY_URL }} npm run verify:deployment
```

### Railway Configuration
```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/api/v1/health",
    "healthcheckTimeout": 300
  }
}
```

## Troubleshooting

### Startup Script Fails

**Database Connection Error:**
```
✗ Database connection error: ECONNREFUSED
```
**Solution:** Check DATABASE_URL environment variable and ensure PostgreSQL is running.

**Migration Error:**
```
✗ Migration error: relation "applications" already exists
```
**Solution:** Check migration status with `npm run migrate:status` and manually resolve conflicts.

**Demo Data Seeding Error:**
```
✗ Demo data seeding error: duplicate key value
```
**Solution:** This is non-critical. Demo data may already exist. Check logs for details.

### Health Check Issues

**Database Unhealthy:**
```json
{
  "services": {
    "database": {
      "status": "error",
      "error": "connection timeout"
    }
  }
}
```
**Solution:** Check database connection pool settings and network connectivity.

**Redis Unhealthy:**
```json
{
  "services": {
    "redis": {
      "status": "error",
      "error": "ECONNREFUSED"
    }
  }
}
```
**Solution:** Ensure Redis is running and REDIS_URL is correct.

### Verification Script Fails

**Login Tests Fail:**
```
✗ FAIL - Demo Applicant Login
   Login failed: 401
```
**Solution:** Check that demo data was seeded correctly. Run `npm run seed:demo` manually.

**Demo Data Check Fails:**
```
✗ FAIL - Demo Data Check
   No applications found
```
**Solution:** Database is empty. Ensure DEMO_MODE_ENABLED=true and re-run startup or seed manually.

**Static Files Fail:**
```
✗ FAIL - Static Files
   Unexpected response: 404
```
**Solution:** Ensure `public` directory is included in deployment and static middleware is configured.

## Monitoring Best Practices

### Railway Health Checks
Configure Railway to use the health endpoint:
- **Path:** `/api/v1/health`
- **Interval:** 30 seconds
- **Timeout:** 10 seconds
- **Unhealthy threshold:** 3 consecutive failures

### Alerting
Set up alerts for:
- Health check failures
- High response times (>1000ms)
- Database connection errors
- Redis connection errors
- Circuit breaker opens

### Logging
Monitor logs for:
- `✓` markers - Successful operations
- `✗` markers - Failed operations
- `Startup Status Summary` - Application initialization
- `Migration completed` - Database updates
- `Demo data seeded` - Demo mode initialization

## Environment Variables Reference

### Required for Startup
- `DATABASE_URL` or `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `REDIS_URL` or `REDIS_HOST`, `REDIS_PORT`
- `JWT_SECRET`
- `ENCRYPTION_KEY`

### Optional for Demo Mode
- `DEMO_MODE_ENABLED=true` - Enable demo data seeding
- `NODE_ENV=production` - Set environment

### For Verification Script
- `BASE_URL` - Deployment URL to test (default: http://localhost:3000)

## Quick Reference

| Task | Command |
|------|---------|
| Test startup locally | `npm run startup` |
| Check health | `curl http://localhost:3000/api/v1/health` |
| Detailed health | `curl http://localhost:3000/api/v1/health/detailed` |
| Verify local deployment | `npm run verify:deployment` |
| Verify remote deployment | `BASE_URL=https://your-app.railway.app npm run verify:deployment` |
| View migration status | `npm run migrate:status` |
| Seed demo data manually | `npm run seed:demo` |

## Next Steps

After successful deployment verification:
1. Configure monitoring and alerting
2. Set up log aggregation
3. Document deployment URL and credentials
4. Share access with stakeholders
5. Schedule regular health checks

## Support

For issues or questions:
1. Check logs in Railway dashboard
2. Run health check endpoint for service status
3. Run verification script for comprehensive testing
4. Review startup logs for initialization errors
