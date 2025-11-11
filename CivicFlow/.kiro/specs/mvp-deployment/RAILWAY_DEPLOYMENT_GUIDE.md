# Railway Deployment Guide

This guide walks you through deploying the Government Lending CRM to Railway.app.

## Prerequisites

- GitHub account with this repository
- Railway account (sign up at https://railway.app)
- OpenAI or Claude API key for AI features

## Task 8.1: Set Up Railway Project

### Step 1: Create Railway Account

1. Go to https://railway.app
2. Click "Start a New Project"
3. Sign in with GitHub (recommended for automatic deployments)

### Step 2: Create New Project

1. Click "New Project" in Railway dashboard
2. Select "Deploy from GitHub repo"
3. Authorize Railway to access your GitHub account
4. Select this repository from the list

### Step 3: Configure Automatic Deployments

Railway automatically configures deployments when connected to GitHub:

- **Branch:** `main` (or your default branch)
- **Auto-deploy:** Enabled by default
- **Build Command:** Detected from `package.json` (`npm run build`)
- **Start Command:** Detected from `package.json` (`npm start`)

**Verification:**
- You should see the project created in Railway dashboard
- GitHub integration should show as "Connected"
- Initial deployment may start automatically (let it fail for now - we need to add services first)

---

## Task 8.2: Provision Database Services

### Step 1: Add PostgreSQL Database

1. In your Railway project, click "New" → "Database" → "Add PostgreSQL"
2. Railway will provision a PostgreSQL 15 instance
3. Note: Connection variables are automatically added to your environment

**Environment Variables Added:**
- `DATABASE_URL` - Full connection string
- `PGHOST` - Database host
- `PGPORT` - Database port (default: 5432)
- `PGUSER` - Database user
- `PGPASSWORD` - Database password
- `PGDATABASE` - Database name

### Step 2: Add Redis Cache

1. In your Railway project, click "New" → "Database" → "Add Redis"
2. Railway will provision a Redis 7 instance
3. Note: Connection variables are automatically added to your environment

**Environment Variables Added:**
- `REDIS_URL` - Full connection string
- `REDISHOST` - Redis host
- `REDISPORT` - Redis port (default: 6379)
- `REDISPASSWORD` - Redis password

### Step 3: Note Connection URLs

Railway automatically injects these variables into your application service. You can view them in:
- Project Settings → Variables tab
- Each service has its own variables section

**Verification:**
- PostgreSQL service shows as "Active"
- Redis service shows as "Active"
- Both services have connection URLs visible in their settings

---

## Task 8.3: Configure Environment Variables

### Step 1: Navigate to Environment Variables

1. Click on your Node.js service (the main application)
2. Go to "Variables" tab
3. Click "Raw Editor" for easier bulk editing

### Step 2: Add Required Variables

Copy and paste the following variables (Railway's database variables are already set):

```bash
# Application Configuration
NODE_ENV=production
API_VERSION=v1
PORT=3000

# Security - GENERATE NEW VALUES
JWT_SECRET=<GENERATE_SECURE_RANDOM_STRING_32_CHARS>
ENCRYPTION_KEY=<GENERATE_SECURE_RANDOM_STRING_32_CHARS>

# Demo Mode Configuration
DEMO_MODE_ENABLED=true
USE_MOCK_SERVICES=true

# Mock Services (for MVP)
USE_MOCK_EIN_VERIFICATION=true
USE_MOCK_EMAIL=true
USE_MOCK_TEAMS=true

# AI Configuration - ADD YOUR KEYS
LLM_PROVIDER=openai
OPENAI_API_KEY=<YOUR_OPENAI_API_KEY>
# OR use Claude:
# LLM_PROVIDER=claude
# CLAUDE_API_KEY=<YOUR_CLAUDE_API_KEY>

# Azure Document Intelligence (Optional)
# AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=<YOUR_ENDPOINT>
# AZURE_DOCUMENT_INTELLIGENCE_KEY=<YOUR_KEY>

# CORS Configuration - UPDATE AFTER DEPLOYMENT
CORS_ORIGIN=*
```

### Step 3: Generate Secure Secrets

Use the helper script to generate secure secrets:

```bash
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
```

Or use this PowerShell command:
```powershell
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex')); console.log('ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
```

### Step 4: Update CORS After First Deployment

After your first deployment, Railway will provide a URL like:
`https://your-app-name.up.railway.app`

Update the `CORS_ORIGIN` variable to this URL for security.

**Verification:**
- All required environment variables are set
- JWT_SECRET and ENCRYPTION_KEY are unique random strings
- AI API key is valid
- Demo mode is enabled

---

## Task 8.4: Deploy Application

### Step 1: Trigger Deployment

If deployment hasn't started automatically:
1. Go to your service in Railway
2. Click "Deploy" → "Deploy Now"
3. Or push a commit to your GitHub repository

### Step 2: Monitor Build Logs

1. Click on the deployment in progress
2. View "Build Logs" tab
3. Watch for:
   - ✓ Dependencies installed
   - ✓ TypeScript compilation successful
   - ✓ Build completed

**Common Build Issues:**
- **TypeScript errors:** Fix in code and push again
- **Missing dependencies:** Check package.json
- **Out of memory:** Upgrade Railway plan

### Step 3: Monitor Deploy Logs

After build completes, watch "Deploy Logs":
1. Application starts
2. Database migrations run
3. Demo data seeds
4. Server listening on port

**Expected Output:**
```
Running database migrations...
✓ Migrations completed
Seeding demo data...
✓ Demo data seeded
Server listening on port 3000
```

### Step 4: Get Deployment URL

1. Once deployment succeeds, Railway provides a public URL
2. Click "Settings" → "Domains"
3. Railway auto-generates: `https://your-app.up.railway.app`
4. You can add a custom domain if desired

**Verification:**
- Deployment status shows "Active"
- No errors in deploy logs
- Public URL is accessible
- Health check endpoint responds

---

## Task 8.5: Run Post-Deployment Verification

### Step 1: Test Health Check

Open your browser or use curl:
```bash
curl https://your-app.up.railway.app/api/v1/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-11-11T...",
  "services": {
    "database": { "status": "connected", "latency": 5 },
    "redis": { "status": "connected", "latency": 2 },
    "api": { "status": "running", "uptime": 120 }
  },
  "version": "1.0.0"
}
```

### Step 2: Test Demo User Logins

Visit the application and test each user type:

**Applicant Portal:**
- URL: `https://your-app.up.railway.app/applicant-portal.html`
- Username: `demo-applicant`
- Password: `Demo123!`

**Staff Portal:**
- URL: `https://your-app.up.railway.app/staff-portal.html`
- Username: `demo-staff`
- Password: `Demo123!`

**Admin Dashboard:**
- URL: `https://your-app.up.railway.app/admin-dashboard.html`
- Username: `demo-admin`
- Password: `Demo123!`

### Step 3: Verify Demo Data

1. Login as staff user
2. Check that applications are visible
3. Verify documents are attached
4. Check AI analysis results are present

### Step 4: Test Key Features

**Applicant Portal:**
- [ ] Can view application form
- [ ] Can upload documents
- [ ] Demo banner is visible

**Staff Portal:**
- [ ] Can view application queue
- [ ] Can see AI analysis
- [ ] Can view anomaly alerts
- [ ] Demo banner is visible

**Admin Dashboard:**
- [ ] Can view metrics
- [ ] Can see AI performance
- [ ] Demo mode controls work
- [ ] Demo banner is visible

### Step 5: Run Automated Verification Script

If you want to run the automated verification script:

```bash
# Set the deployment URL
$env:API_BASE_URL="https://your-app.up.railway.app"

# Run verification
npm run verify-deployment
```

**Expected Output:**
```
✓ Health check passed
✓ Demo applicant login successful
✓ Demo staff login successful
✓ Demo admin login successful
✓ Demo data verified
✓ All tests passed
```

---

## Troubleshooting

### Deployment Fails

**Issue:** Build fails with TypeScript errors
**Solution:** Run `npm run build` locally to identify errors

**Issue:** Application crashes on startup
**Solution:** Check deploy logs for error messages, verify environment variables

**Issue:** Database connection fails
**Solution:** Verify PostgreSQL service is running, check DATABASE_URL variable

### Application Issues

**Issue:** 502 Bad Gateway
**Solution:** Application may still be starting, wait 30 seconds and retry

**Issue:** Login fails
**Solution:** Check JWT_SECRET is set, verify demo data was seeded

**Issue:** AI features not working
**Solution:** Verify OPENAI_API_KEY or CLAUDE_API_KEY is set correctly

### Performance Issues

**Issue:** Slow response times
**Solution:** Check Railway metrics, may need to upgrade plan

**Issue:** Database connection pool exhausted
**Solution:** Reduce concurrent requests or upgrade database plan

---

## Post-Deployment Checklist

- [ ] Application deployed successfully
- [ ] Health check returns "healthy"
- [ ] All three demo users can login
- [ ] Demo data is visible
- [ ] Demo mode banner appears
- [ ] AI features work (if API keys provided)
- [ ] CORS_ORIGIN updated to deployment URL
- [ ] Deployment URL shared with stakeholders
- [ ] Monitoring configured (optional)

---

## Next Steps

After successful deployment:

1. **Update CORS:** Set `CORS_ORIGIN` to your Railway URL
2. **Share Access:** Send URL and demo credentials to stakeholders
3. **Monitor:** Watch Railway metrics and logs
4. **Gather Feedback:** Collect stakeholder feedback
5. **Iterate:** Make improvements based on feedback

---

## Railway Dashboard Quick Reference

**View Logs:**
- Service → Deployments → Click deployment → Deploy Logs

**View Metrics:**
- Service → Metrics tab (CPU, Memory, Network)

**Restart Service:**
- Service → Settings → Restart

**Rollback:**
- Service → Deployments → Previous deployment → Redeploy

**Environment Variables:**
- Service → Variables tab

**Database Access:**
- PostgreSQL service → Connect tab (connection details)

---

## Cost Management

**Current Plan:** Hobby ($5/month)
- 512MB RAM
- Shared CPU
- 100GB bandwidth
- PostgreSQL included
- Redis included

**Monitoring Usage:**
- Check Railway dashboard for usage metrics
- Set up billing alerts in account settings

**Optimization Tips:**
- Enable compression (already configured)
- Use Redis caching (already configured)
- Optimize database queries
- Monitor bandwidth usage

---

## Support Resources

- **Railway Docs:** https://docs.railway.app
- **Railway Discord:** https://discord.gg/railway
- **Railway Status:** https://status.railway.app
- **This Project Docs:** See DEPLOYMENT.md for additional details

---

## Security Reminders

- ✓ Never commit secrets to Git
- ✓ Rotate JWT_SECRET and ENCRYPTION_KEY regularly
- ✓ Use environment variables for all secrets
- ✓ Enable HTTPS (Railway does this automatically)
- ✓ Update CORS_ORIGIN to specific domain
- ✓ Monitor access logs for suspicious activity

---

## Deployment Complete! 🎉

Your Government Lending CRM MVP is now live on Railway!

**Share these details with stakeholders:**
- Deployment URL: `https://your-app.up.railway.app`
- Demo credentials: See DEMO_CREDENTIALS.md
- Feature guide: See DEMO_GUIDE.md (Task 7.2)
