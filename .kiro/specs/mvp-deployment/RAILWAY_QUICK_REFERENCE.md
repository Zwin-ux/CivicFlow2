# Railway Deployment Quick Reference Card

##  Quick Start (5 Minutes)

### 1. Create Railway Project
```
1. Go to https://railway.app
2. Sign in with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository
```

### 2. Add Services
```
Click "New" → "Database" → Add:
   PostgreSQL
   Redis
```

### 3. Configure Environment Variables
```
Click your service → Variables → Raw Editor → Paste:

NODE_ENV=production
API_VERSION=v1
JWT_SECRET=<run: npm run generate-secrets>
ENCRYPTION_KEY=<run: npm run generate-secrets>
DEMO_MODE_ENABLED=true
USE_MOCK_SERVICES=true
USE_MOCK_EIN_VERIFICATION=true
USE_MOCK_EMAIL=true
USE_MOCK_TEAMS=true
LLM_PROVIDER=openai
OPENAI_API_KEY=<your-key>
CORS_ORIGIN=*
```

### 4. Deploy
```
Push to GitHub or click "Deploy Now"
Wait for build to complete
Get your URL: https://your-app.up.railway.app
```

### 5. Verify
```
Visit: https://your-app.up.railway.app/api/v1/health
Login: demo-applicant / Demo123!
```

---

##  Pre-Deployment Checklist

Run before deploying:
```bash
npm run pre-deployment-check
```

Expected output:
```
[OK] All critical checks passed! Ready for deployment.
```

---

## Secure Generate Secrets

```bash
npm run generate-secrets
```

Copy the output to Railway environment variables.

---

##  Verify Deployment

After deployment:
```bash
# Set your Railway URL
$env:API_BASE_URL="https://your-app.up.railway.app"

# Run verification
npm run verify-deployment
```

---

##  Demo User Credentials

**Applicant:**
- Username: `demo-applicant`
- Password: `Demo123!`
- URL: `/applicant-portal.html`

**Staff:**
- Username: `demo-staff`
- Password: `Demo123!`
- URL: `/staff-portal.html`

**Admin:**
- Username: `demo-admin`
- Password: `Demo123!`
- URL: `/admin-dashboard.html`

---

## Tools Common Commands

### View Logs
```
Railway Dashboard → Service → Deployments → Click deployment → Deploy Logs
```

### Restart Service
```
Railway Dashboard → Service → Settings → Restart
```

### Rollback
```
Railway Dashboard → Service → Deployments → Previous → Redeploy
```

### Update Environment Variables
```
Railway Dashboard → Service → Variables → Edit → Update Variables
```

---

##  Troubleshooting

### Build Fails
```
1. Check build logs for errors
2. Run locally: npm run build
3. Fix TypeScript errors
4. Push to GitHub
```

### Application Crashes
```
1. Check deploy logs
2. Verify environment variables
3. Check DATABASE_URL and REDIS_URL are set
4. Verify JWT_SECRET and ENCRYPTION_KEY are set
```

### 502 Bad Gateway
```
1. Wait 30 seconds (app may be starting)
2. Check deploy logs for errors
3. Verify health check: /api/v1/health
```

### Login Fails
```
1. Verify JWT_SECRET is set
2. Check demo data was seeded
3. View logs for authentication errors
```

### AI Features Not Working
```
1. Verify OPENAI_API_KEY or CLAUDE_API_KEY is set
2. Check LLM_PROVIDER matches your key
3. View logs for API errors
```

---

## Metrics Monitoring

### View Metrics
```
Railway Dashboard → Service → Metrics
  - CPU usage
  - Memory usage
  - Network traffic
```

### View Logs
```
Railway Dashboard → Service → Deployments → Deploy Logs
  - Application logs
  - Error logs
  - Access logs
```

### Health Check
```
GET https://your-app.up.railway.app/api/v1/health

Expected: { "status": "healthy", ... }
```

---

##  Cost Management

**Hobby Plan:** $5/month
- 512MB RAM
- Shared CPU
- 100GB bandwidth
- PostgreSQL included
- Redis included

**Monitor Usage:**
```
Railway Dashboard → Usage
  - Check current usage
  - Set billing alerts
```

---

## Secure Security Checklist

- [ ] JWT_SECRET is unique and secure (32+ chars)
- [ ] ENCRYPTION_KEY is unique and secure (32+ chars)
- [ ] Secrets not committed to Git
- [ ] CORS_ORIGIN updated to deployment URL
- [ ] HTTPS enabled (automatic on Railway)
- [ ] Environment variables stored securely

---

##  Support

- **Railway Docs:** https://docs.railway.app
- **Railway Discord:** https://discord.gg/railway
- **Railway Status:** https://status.railway.app
- **Project Docs:** See RAILWAY_DEPLOYMENT_GUIDE.md

---

##  Quick Commands Reference

```bash
# Generate secrets
npm run generate-secrets

# Validate secrets
npm run validate-secrets

# Pre-deployment check
npm run pre-deployment-check

# Build application
npm run build

# Run migrations
npm run migrate:up

# Seed demo data
npm run seed:demo

# Start application
npm start

# Verify deployment
npm run verify-deployment
```

---

## Target Success Criteria

Deployment is successful when:
- [ ] Health check returns "healthy"
- [ ] All three demo users can login
- [ ] Demo data is visible in portals
- [ ] Demo mode banner appears
- [ ] AI features work (if API keys provided)
- [ ] No errors in deploy logs

---

##  Post-Deployment Tasks

1. **Update CORS:**
   ```
   CORS_ORIGIN=https://your-app.up.railway.app
   ```

2. **Share with Stakeholders:**
   - Send deployment URL
   - Share demo credentials
   - Provide demo guide

3. **Monitor:**
   - Watch metrics for first 24 hours
   - Check error logs
   - Monitor API usage

4. **Gather Feedback:**
   - Schedule demo session
   - Collect stakeholder feedback
   - Plan improvements

---

##  Deployment Complete!

Your Government Lending CRM MVP is live!

**Next Steps:**
1. Test all features
2. Share with stakeholders
3. Gather feedback
4. Iterate and improve

**Need Help?**
See RAILWAY_DEPLOYMENT_GUIDE.md for detailed instructions.
