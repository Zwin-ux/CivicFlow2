## CivicFlow2 — Copilot / AI agent quick instructions

These notes are a compact, actionable guide for an AI coding agent to be productive in this repository.

1) Big picture
- Server: TypeScript Express app. Entry points:
  - `src/index.ts` — startup sequence, migrations/seeds, service initialization, graceful shutdown.
  - `src/app.ts` — Express app wiring: security, compression, request id, logging, demo-mode detection, rate-limiters, route mounting, static files.
- Important cross-cutting services:
  - `src/config/database.ts` and `src/config/redis.ts` — DB/Redis wrappers which switch to in-memory mocks in demo mode.
  - `src/services/demoModeManager.ts` & `src/services/demoDataService.ts` — manage demo/offline behavior and mock data.
  - `src/utils/logger.ts` — central logging used across services and middleware.

2) Startup and developer workflows (explicit commands)
- Development (hot reload): `npm run dev` (uses `ts-node-dev` and `src/index.ts`).
- Build (TypeScript output): `npm run build` (note: `build` uses `tsc || true`, so tsc failures won't stop the npm script — CI should run `lint`/`test` separately).
- Run production build: `npm run build` then `npm start` (runs `dist/index.js`).
- Demo mode (no DB/Redis required): set `DEMO_MODE=true` and `npm start` or `npm run dev`.
- Migrations and seeds (run after build):
  - `npm run migrate:up`
  - `npm run seed all` (or `npm run seed:demo`)

3) Project-specific conventions & patterns
- Route registration: add a router file under `src/routes/` and import + mount it in `src/app.ts`. Routes are normally mounted under `/api/${config.apiVersion}/...` but many front-end convenience routes are mounted without version prefix — follow existing examples (`applications`, `documents`, `auth`).
- Middleware ordering matters:
  - `requestId` must run before `requestLogger`.
  - `detectDemoMode`, `bypassAuthForDemo`, `checkDemoExpiry` must run before authentication/route handlers.
  - Rate limiters are applied at route mount time (see `authLimiter`, `uploadLimiter`, `aiLimiter`).
- Static files: served from `public/` with caching rules set in `src/app.ts`. SPA fallback serves `public/index.html` for non-API routes.
- API docs: swagger is mounted at `/api-docs` via `src/routes/swagger`.

4) Demo mode (very important)
- Demo mode is core to this repo. If DB/Redis fail or `DEMO_MODE=true`, the system keeps running using mocks.
- Look at `src/services/demoModeManager.ts`, `src/services/demoDataService.ts`, `src/config/database.ts`, and `src/config/redis.ts` to understand the mocks.
- Responses include headers `X-Demo-Mode: true` and `X-Demo-Mode-Message` when active. Console and logs show large banner during startup.

5) External integrations & environment
- Key external integrations in `package.json` dependencies: Azure Form Recognizer, Microsoft Graph, SendGrid, OpenAI, PostgreSQL (`pg`), Redis. Credentials/config live in environment variables and `src/config/index.ts`.
- Node/NPM engine: `package.json` requires `node >=20` and `npm >=10`.

6) Testing & verification
- Tests: `npm test` (Jest + ts-jest). Unit tests are excluded from `tsconfig` output but included in the repo.
- Quick AI-related check script: `npm run verify:ai` (calls `src/scripts/verify-ai-services.ts`).

7) Common code patterns to follow when editing
- Services live in `src/services/` and should be single-responsibility (initialize/terminate methods used by `src/index.ts`).
- Configuration values read from `src/config/index.ts` (use `config.apiVersion` when generating route paths).
- Logging: use `utils/logger.ts` not console.log except for the friendly startup banner in `src/index.ts`.

8) Examples (copy-paste friendly)
- Add a new route and mount it:
  - Create `src/routes/myFeature.ts` exporting an Express `Router`.
  - Import and mount in `src/app.ts`:
    `app.use(`/api/${config.apiVersion}/my-feature`, myFeatureRoutes);`

- Respect demo-mode guards when touching DB/Redis: prefer using `database.query(...)` or `redisClient` wrappers rather than direct `pg`/`redis` client instances.

9) Where to look first when debugging or adding features
- Startup issues: `src/index.ts` (startupScript, demoModeManager).
- Middleware/requests: `src/app.ts` (ordering of middleware and rate-limiter usage).
- DB/Redis behavior: `src/config/database.ts`, `src/config/redis.ts`.
- Demo data and behavior: `src/services/demoDataService.ts`, `docs/DEMO_MODE.md` (detailed behavior and examples).

If anything here is unclear or you want examples expanded (e.g., a 1-file template for adding a route + service), tell me which part to expand and I will update this file.
