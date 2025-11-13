#  CivicFlow2 - Quick Start Guide

## 30-Second Deploy to Railway

```bash
1. Click: https://railway.app/new/template
2. Wait 60 seconds
3. Visit your app URL
4. Done! [OK]
```

App runs immediately in demo mode with sample data - no configuration needed!

---

## 2-Minute Local Demo

```bash
# Install
npm install

# Run in demo mode (no database needed!)
echo "DEMO_MODE=true" > .env
npm start

# Visit
open http://localhost:3000
```

You'll see a purple banner and 5 sample applications!

---

## Environment Variables (Optional)

### Minimal Setup
```bash
DEMO_MODE=true
```

### With Database
```bash
DATABASE_URL=postgresql://user:pass@host:port/db
DEMO_MODE_AUTO_ENABLE=true  # Falls back to demo if DB fails
```

### Production
```bash
NODE_ENV=production
DATABASE_URL=<from Railway>
REDIS_URL=<from Railway>
JWT_SECRET=<generate secure>
ENCRYPTION_KEY=<generate secure>
```

---

## Generate Secrets

```bash
# JWT Secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Encryption Key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Health Check

```bash
curl http://localhost:3000/api/v1/health
```

Response:
```json
{
  "status": "ok",
  "demoMode": {
    "active": true,
    "message": "Running in offline showcase mode"
  }
}
```

---

## Demo Data

### Applications
- Acme Coffee Shop - $50K
- Tech Startup Inc - $100K
- Green Energy Solutions - $250K
- Local Bakery - $30K
- Digital Marketing Agency - $75K

### Users
- Applicant, Reviewer, Approver, Admin

---

## Troubleshooting

### App won't start?
```bash
# Check Node version (need 18+)
node --version

# Install dependencies
npm install

# Enable demo mode
echo "DEMO_MODE=true" > .env
```

### No demo banner?
```bash
# Check health endpoint
curl http://localhost:3000/api/v1/health

# Check logs for demo mode activation
```

### Database not connecting?
```bash
# Demo mode will auto-activate after 3 retries
# Check logs for:
# "Demo DEMO MODE ACTIVATED Demo"
```

---

## Documentation

- **Full Demo Mode Guide**: [docs/DEMO_MODE.md](docs/DEMO_MODE.md)
- **Railway Deployment**: [RAILWAY_DEPLOYMENT.md](RAILWAY_DEPLOYMENT.md)
- **Implementation Details**: [DEMO_MODE_IMPLEMENTATION.md](DEMO_MODE_IMPLEMENTATION.md)
- **Complete README**: [README.md](README.md)

---

## Key Features

[OK] Never crashes
[OK] Auto-enables demo mode on DB failure
[OK] Works without any infrastructure
[OK] Perfect for demos and showcases
[OK] Production-ready with proper config
[OK] Railway optimized

---

**That's it! You're ready to go! **
