# Railway Deployment Guide

This guide captures the minimum wiring required to run CivicCopy on [Railway](https://railway.app) using the existing Dockerfile and multi-service resources (PostgreSQL + Redis). Use it as a checklist before the YC demo so we can spin up disposable demo stacks on demand.

## 1. Prerequisites

- Railway CLI installed and authenticated: `npm i -g @railway/cli` then `railway login`.
- Access to the GitHub repo (for CI deploys) or local clone (for `railway up`).
- Production-ready `.env` values handy (see table below). **Never** commit secrets.
- Optional: Railway Postgres + Redis plugins already created in the project (recommended for deterministic connection strings).

## 2. Environment Variables

| Variable | Required | Notes |
|----------|----------|-------|
| `NODE_ENV` | ✅ | Use `production`. |
| `PORT` | ✅ | Railway injects one; our Dockerfile defaults to `3000`. |
| `DATABASE_URL` | ✅ | Provided automatically when linking the Postgres plugin. |
| `REDIS_URL` | ✅ | Provided automatically when linking the Redis plugin. |
| `JWT_SECRET` | ✅ | Generate a strong random string (32+ chars). |
| `ENCRYPTION_KEY` | ✅ | 32-byte base64 string for data crypto. |
| `EMAIL_SERVICE_PROVIDER`, `EMAIL_API_KEY`, `EMAIL_FROM` | ⚠️ | Required if outbound mail is part of the demo. Otherwise leave blank. |
| `OPENAI_API_KEY` (or `CLAUDE_API_KEY`) | ⚠️ | Needed for AI features; set `LLM_PROVIDER` accordingly. |
| `AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT`, `AZURE_DOCUMENT_INTELLIGENCE_KEY` | ⚠️ | Only if OCR/Risk flows call Azure. |
| `DEMO_MODE` | optional | Set to `true` to force in-memory mode (no DB/Redis writes). |
| `LOG_LEVEL` | optional | Default `info`. |
| `TEAMS_*` | optional | Only for Microsoft Graph integration. |

> Tip: store these in Railway service variables or use `railway variables set KEY=VALUE`.

## 3. Project Setup

```bash
# 1) Initialize Railway project / link existing
railway init --service civiccopy-api

# 2) Link local repo to the project
railway link

# 3) Attach Postgres + Redis plugins (skip if already attached)
railway add postgres
railway add redis

# 4) Push code & build via Dockerfile (uses multi-stage build)
railway up
```

The new `railway.json` pins the builder to our Dockerfile and applies `/api/v1/health` as the deployment health-check so no further Nixpacks config is required.

## 4. Post-Deploy Tasks

1. **Run migrations/seeds** (each run happens inside the Railway container):
   ```bash
   railway run npm run migrate
   railway run npm run seed:demo     # optional sample data
   ```
2. **Verify health**:
   ```bash
   railway logs -f
   railway status
   curl https://<railway-domain>/api/v1/health
   ```
3. **Flip demo toggles**: set `DEMO_MODE=true` when you want a DB-less experience for the YC walkthrough; otherwise keep it false to showcase persistence.
4. **Lock secrets**: confirm no secrets leak via logs; rotate keys before sharing environments externally.

## 5. CI/CD Option

Railway can auto-deploy on GitHub pushes. In the Railway UI:
1. Connect the repo & branch.
2. Ensure the service references the same `railway.json`.
3. Confirm build command = Dockerfile, start command = `node dist/index.js` (already defined in the Docker entrypoint).
4. Keep “Run tests” unchecked unless you customize the Dockerfile for CI.

## 6. Rollback & Scaling

- Rollback via: `railway deployments` → `railway rollback <deploymentId>`.
- To scale vertically, bump the plan (Railway UI) and increase `numReplicas` or CPU/RAM; no code change needed.
- If Postgres connection caps out, raise `max` in `config.database.pool` or upgrade the Railway Postgres tier.

## 7. Demo Prep Checklist

- [ ] `railway status` shows healthy deployment.
- [ ] `/api/v1/sba-demo/stream/:sessionId` reachable (SSE allowed through Railway).
- [ ] Deterministic demo seeds configured via `DEMO_MODE` + `?seed=` query.
- [ ] Presenter commands tested against the Railway-hosted instance.
- [ ] Alarm/alerting connected (optional) — at minimum watch `railway logs`.

Once the above checks are green, the app is production-ready on Railway and can be shared with YC partners or pilot lenders.
