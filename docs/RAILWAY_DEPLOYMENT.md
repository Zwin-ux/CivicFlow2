# Railway Deployment Guide for CivicFlow2

## Quick Start with Demo Mode

CivicFlow2 is configured to run on Railway with **automatic demo mode fallback**, ensuring your app never crashes even if database connections fail.

### 1. Deploy to Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template)

Or manually:

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Deploy
railway up
```

### 2. Configure Environment Variables

In Railway dashboard, set these **required** variables:

```bash
# Demo Mode (enabled by default for resilience)
DEMO_MODE=true
DEMO_MODE_AUTO_ENABLE=true

# Security (GENERATE SECURE VALUES!)
JWT_SECRET=your-secure-jwt-secret-here
ENCRYPTION_KEY=your-secure-encryption-key-here

# Optional: Database (if you add PostgreSQL service)
# DATABASE_URL will be auto-injected by Railway

# Optional: Redis (if you add Redis service)
# REDIS_URL will be auto-injected by Railway
```

### 3. Generate Secure Secrets

```bash
# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Add Database (Optional)

If you want real data persistence:

1. In Railway dashboard, click "New" → "Database" → "PostgreSQL"
2. Railway will automatically inject `DATABASE_URL`
3. Redeploy your app
4. Demo mode will automatically disable once DB connects

### 5. Add Redis (Optional)

For caching and sessions:

1. In Railway dashboard, click "New" → "Database" → "Redis"
2. Railway will automatically inject `REDIS_URL`
3. Redeploy your app

## Demo Mode Behavior

### With Demo Mode Enabled (Default)

[OK] **App always runs** - never crashes
[OK] **Static demo data** - 5 sample applications, 4 users
[OK] **Full UI functionality** - all pages work
[OK] **No database required** - runs standalone
[OK] **Perfect for demos** - showcase without infrastructure

### With Database Connected

[OK] **Real data persistence** - actual database operations
[OK] **Demo mode as fallback** - auto-enables if DB fails
[OK] **Graceful degradation** - never crashes on connection loss

## Environment Variables Reference

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `JWT_SECRET` | Secret for JWT tokens | `your-64-char-hex-string` |
| `ENCRYPTION_KEY` | Key for data encryption | `your-32-char-hex-string` |

### Demo Mode

| Variable | Default | Description |
|----------|---------|-------------|
| `DEMO_MODE` | `true` | Explicitly enable demo mode |
| `DEMO_MODE_AUTO_ENABLE` | `true` | Auto-enable on DB failure |
| `DEMO_MODE_MAX_RETRIES` | `3` | Retries before demo mode |

### Database (Optional)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (auto-injected by Railway) |

### Redis (Optional)

| Variable | Description |
|----------|-------------|
| `REDIS_URL` | Redis connection string (auto-injected by Railway) |

### Optional Services

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key for AI features | `` |
| `EMAIL_API_KEY` | SendGrid API key for emails | `` |
| `TEAMS_CLIENT_ID` | Microsoft Teams integration | `` |

## Deployment Checklist

- [ ] Generate secure `JWT_SECRET` and `ENCRYPTION_KEY`
- [ ] Set environment variables in Railway dashboard
- [ ] Deploy app to Railway
- [ ] Verify app is running (check logs)
- [ ] Test health endpoint: `https://your-app.railway.app/api/v1/health`
- [ ] Check for demo mode banner in UI
- [ ] (Optional) Add PostgreSQL database
- [ ] (Optional) Add Redis cache
- [ ] (Optional) Configure custom domain

## Verifying Deployment

### 1. Check Health Endpoint

```bash
curl https://your-app.railway.app/api/v1/health
```

Expected response:
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

### 2. Check Detailed Health

```bash
curl https://your-app.railway.app/api/v1/health/detailed
```

### 3. Check Logs

In Railway dashboard:
1. Click on your service
2. Go to "Deployments" tab
3. Click "View Logs"

Look for:
```
╔════════════════════════════════════════════════════════════╗
║              Demo DEMO MODE ACTIVATED Demo                     ║
╚════════════════════════════════════════════════════════════╝
```

### 4. Test UI

Visit `https://your-app.railway.app` and verify:
- Purple demo mode banner appears at top
- All pages load correctly
- Sample applications are visible

## Troubleshooting

### App Won't Start

1. Check Railway logs for errors
2. Verify `JWT_SECRET` and `ENCRYPTION_KEY` are set
3. Check build logs for compilation errors

### Demo Mode Not Activating

1. Verify `DEMO_MODE=true` in environment variables
2. Check logs for connection attempts
3. Ensure `DEMO_MODE_AUTO_ENABLE=true`

### Database Not Connecting

1. Verify PostgreSQL service is running
2. Check `DATABASE_URL` is injected
3. Review connection logs
4. Demo mode should auto-activate as fallback

### Performance Issues

1. Check Railway plan limits
2. Monitor memory usage in dashboard
3. Consider upgrading plan for production
4. Enable Redis for caching

## Production Recommendations

### For Demo/Showcase

[OK] Use demo mode (current setup)
[OK] No database required
[OK] Fast deployment
[OK] Zero infrastructure costs

### For Development

[OK] Add PostgreSQL database
[OK] Keep demo mode as fallback
[OK] Use Railway's free tier

### For Production

[OK] Add PostgreSQL database
[OK] Add Redis cache
[OK] Disable demo mode: `DEMO_MODE=false`
[OK] Configure custom domain
[OK] Set up monitoring
[OK] Upgrade Railway plan
[OK] Enable backups
[OK] Configure CORS properly

## Cost Optimization

### Free Tier (Demo Mode)

- **Cost**: $0/month
- **Limits**: 500 hours/month
- **Perfect for**: Demos, showcases, testing

### With Database

- **Cost**: ~$5-10/month
- **Includes**: PostgreSQL + Redis
- **Perfect for**: Development, small production

### Production

- **Cost**: ~$20-50/month
- **Includes**: Scaled resources, backups
- **Perfect for**: Real production workloads

## Support

- **Documentation**: See `docs/DEMO_MODE.md`
- **Railway Docs**: https://docs.railway.app
- **Issues**: Check Railway logs first
- **Demo Mode**: Always provides fallback

## Next Steps

1. [OK] Deploy to Railway
2. [OK] Verify demo mode works
3. Metrics Add PostgreSQL for real data
4.  Add Redis for performance
5. Secure Configure custom domain
6.  Add email service (optional)
7.  Add AI services (optional)
8.  Configure Teams integration (optional)

---

**Note**: With demo mode enabled by default, your app will **always work** on Railway, even without any database configuration. This makes it perfect for quick demos and showcases!
