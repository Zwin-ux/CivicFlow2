# Demo Mode Documentation

## Overview

CivicFlow2 includes a robust **Demo Mode** feature that ensures the application remains functional even when database or Redis connections fail. This is particularly useful for:

- **Railway deployments** with unreliable database connections
- **Showcase/demo environments** without real infrastructure
- **Development** when services are unavailable
- **Graceful degradation** in production

## How It Works

### Automatic Activation

Demo Mode can be activated in three ways:

1. **Explicitly enabled** via environment variable:
   ```bash
   DEMO_MODE=true
   ```

2. **Auto-enabled after connection failures** (default behavior):
   - After 3 failed database connection attempts
   - After 3 failed Redis connection attempts
   - Configurable via `DEMO_MODE_MAX_RETRIES`

3. **Manual activation** during startup if critical services fail

### Features in Demo Mode

When Demo Mode is active:

[OK] **Static Demo Data**: All database queries return pre-seeded demo data
[OK] **In-Memory Cache**: Redis operations use an in-memory Map
[OK] **No Crashes**: Application never crashes due to missing DB/Redis
[OK] **Full UI Functionality**: All pages remain interactive
[OK] **Clear Indicators**: Console, logs, and UI show demo mode status
[OK] **Health Checks Pass**: Health endpoints return success

## Configuration

### Environment Variables

```bash
# Enable demo mode explicitly
DEMO_MODE=true

# Auto-enable demo mode on connection failures (default: true)
DEMO_MODE_AUTO_ENABLE=true

# Number of retries before auto-enabling demo mode (default: 3)
DEMO_MODE_MAX_RETRIES=3
```

### Railway Deployment

For Railway, use the `.env.railway` file which has demo mode enabled by default:

```bash
# Copy Railway environment template
cp .env.railway .env

# Or set in Railway dashboard:
DEMO_MODE=true
DEMO_MODE_AUTO_ENABLE=true
```

## Demo Data

The demo mode includes realistic seed data:

### Applications (5 sample applications)
- **Acme Coffee Shop**: $50,000 loan, Pending Review
- **Tech Startup Inc**: $100,000 loan, Under Review
- **Green Energy Solutions**: $250,000 loan, Approved
- **Local Bakery**: $30,000 loan, Rejected
- **Digital Marketing Agency**: $75,000 loan, Pending Review

### Users (4 roles)
- Applicant
- Reviewer
- Approver
- Administrator

### Documents
- Business plans
- Tax returns
- Financial statements
- Project proposals

## Visual Indicators

### Console Output

When demo mode is active, you'll see:

```
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║              Demo DEMO MODE ACTIVATED Demo                     ║
║                                                            ║
║  Running in offline showcase mode with static demo data   ║
║  Database and Redis connections are unavailable           ║
║  All data operations are simulated                        ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
```

### HTTP Headers

All responses include:
```
X-Demo-Mode: true
X-Demo-Mode-Message: Running in offline showcase mode
```

### UI Banner

A purple gradient banner appears at the top of all pages:
```
Demo DEMO MODE: Running in offline showcase mode with simulated data Demo
```

## API Behavior

### Health Check

```bash
GET /api/v1/health
```

Response includes demo mode status:
```json
{
  "status": "ok",
  "timestamp": "2024-01-20T10:30:00.000Z",
  "demoMode": {
    "active": true,
    "message": "Running in offline showcase mode with simulated data"
  }
}
```

### Detailed Health Check

```bash
GET /api/v1/health/detailed
```

Response includes:
```json
{
  "status": "healthy",
  "demoMode": {
    "active": true,
    "reason": "Auto-enabled after 3 failed connection attempts to database",
    "failureCount": 3,
    "maxRetries": 3,
    "autoEnableOnFailure": true
  },
  "services": {
    "database": { "status": "ok" },
    "redis": { "status": "ok" }
  }
}
```

## Database Operations

In demo mode, all database operations are mocked:

```typescript
// This query returns demo data instead of hitting the database
const applications = await database.query('SELECT * FROM applications');
// Returns: 5 demo applications
```

### Supported Operations

- [OK] SELECT queries return demo data
- [OK] INSERT/UPDATE/DELETE operations are simulated (not persisted)
- [OK] Transactions are mocked
- [OK] Health checks always pass

## Redis Operations

In demo mode, Redis uses an in-memory cache:

```typescript
// This uses Map instead of Redis
await redis.set('key', 'value', 3600);
const value = await redis.get('key');
// Works exactly like Redis but in-memory
```

### Supported Operations

- [OK] GET/SET with TTL support
- [OK] DEL, EXISTS
- [OK] Lists (RPUSH, LPOP, LLEN)
- [OK] Hashes (HINCRBY, HGETALL)
- [OK] Sorted Sets (ZADD, ZCOUNT, ZREMRANGEBYSCORE)
- [OK] EXPIRE

## Logging

Demo mode logs are clearly marked:

```
[INFO] Demo mode initialized
[WARN] Database connection failed (1/3)
[WARN] Database connection failed (2/3)
[WARN] Database connection failed (3/3)
[WARN] Demo DEMO MODE ACTIVATED Demo
[INFO] Mock query executed in demo mode
[DEBUG] Mock Redis SET: key=session:123, ttl=3600
```

## Production Considerations

### When to Use Demo Mode

[OK] **Good for:**
- Showcase/demo environments
- Development without infrastructure
- Graceful degradation in production
- Testing UI without backend

[FAIL] **Not suitable for:**
- Production with real user data
- Applications requiring data persistence
- Compliance-sensitive environments

### Disabling Demo Mode

To ensure demo mode never activates:

```bash
DEMO_MODE=false
DEMO_MODE_AUTO_ENABLE=false
```

The application will crash if database/Redis are unavailable (traditional behavior).

## Troubleshooting

### Demo Mode Not Activating

1. Check environment variables:
   ```bash
   echo $DEMO_MODE
   echo $DEMO_MODE_AUTO_ENABLE
   ```

2. Check logs for connection attempts:
   ```
   [WARN] Database connection failed (1/3)
   ```

3. Verify max retries setting:
   ```bash
   DEMO_MODE_MAX_RETRIES=3
   ```

### Demo Mode Activating Unexpectedly

1. Check database connection string:
   ```bash
   echo $DATABASE_URL
   ```

2. Verify database is accessible:
   ```bash
   psql $DATABASE_URL -c "SELECT 1"
   ```

3. Check Redis connection:
   ```bash
   redis-cli -u $REDIS_URL ping
   ```

### Disabling Demo Mode Banner

The UI banner is automatically shown when demo mode is active. To hide it, modify `public/index.html`:

```javascript
// Comment out or remove the checkDemoMode() call
// checkDemoMode();
```

## Testing Demo Mode

### Manual Testing

1. Start with invalid database credentials:
   ```bash
   DATABASE_URL=postgresql://invalid:invalid@localhost:5432/invalid
   DEMO_MODE_AUTO_ENABLE=true
   npm start
   ```

2. Verify demo mode activates after 3 retries

3. Check UI shows demo banner

4. Verify API returns demo data

### Automated Testing

```bash
# Test with demo mode enabled
DEMO_MODE=true npm test

# Test auto-enable behavior
DATABASE_URL=invalid DEMO_MODE_AUTO_ENABLE=true npm start
```

## Architecture

### Components

1. **DemoModeManager** (`src/services/demoModeManager.ts`)
   - Tracks connection failures
   - Activates demo mode
   - Provides status information

2. **DemoDataService** (`src/services/demoDataService.ts`)
   - Provides static seed data
   - Simulates CRUD operations
   - Returns realistic mock data

3. **Database Wrapper** (`src/config/database.ts`)
   - Intercepts queries in demo mode
   - Returns mock data
   - Handles connection failures

4. **Redis Wrapper** (`src/config/redis.ts`)
   - Uses in-memory Map in demo mode
   - Simulates all Redis operations
   - Handles connection failures

### Flow Diagram

```
Startup
  ↓
Check DEMO_MODE env var
  ↓
Try Database Connection
  ↓
Failed? → Retry (up to MAX_RETRIES)
  ↓
Still Failed? → Auto-enable Demo Mode
  ↓
Continue Startup with Demo Data
  ↓
Server Running 
```

## Support

For issues or questions about demo mode:

1. Check logs for demo mode activation messages
2. Verify environment variables are set correctly
3. Review health check endpoints for status
4. Check Railway logs if deployed there

## Future Enhancements

Planned improvements:

- [ ] Configurable demo data via JSON files
- [ ] Demo mode session persistence
- [ ] Admin panel to toggle demo mode
- [ ] More realistic demo data scenarios
- [ ] Demo mode analytics/tracking
