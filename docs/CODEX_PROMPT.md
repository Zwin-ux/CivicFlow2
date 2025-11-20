# CivicFlow2 Codex v2 - Massive Upgrade Spec for Codex and Devs

**Version**: 2.0  
**Date**: November 15, 2025  
**Authority**: Single source of truth for every agent or engineer touching CivicFlow2. Follow it literally unless a founder overrides it.  
**Prime Test**: Every change must answer two questions-(1) does this reduce friction and anxiety for real lenders? (2) does this strengthen demo mode? If a change weakens demo mode, it is forbidden.

---

## 1. Purpose
- CivicFlow is an institutional lending engine, not a generic CRM. It exists for the messy SBA 504 and 7(a) pipeline.
- Core promise: take a lender from intake to decision in days instead of weeks while keeping regulators and audit teams calm.
- Demo mode is the spine of the product. Every other subsystem hangs from it and must degrade safely into it.
- All work must be justifiable in terms of lender anxiety removed and demo strength added.

## 2. Identity and Founder Laws

### 2.1 Identity
Every screen must answer three questions for the user:
1. Where am I in the process?
2. What is coming next?
3. How sure is the system about my data?

### 2.2 Non-negotiable Laws
- **Demo first**: Demo-mode behavior is always specified before production behavior. A feature without a pure-demo implementation is rejected.
- **Deterministic UX**: All workflows show current stage and next stage. Every extracted field shows a confidence signal. No silent async mutations.
- **Zero heavy setup**: CivicFlow must run on a laptop with no Postgres or Redis as long as `DEMO_MODE=true`. Fallbacks are automatic when backing services are missing or unhealthy.
- **Institutional aesthetic**: Calm, precise, credit-union-meets-modern-bank. Clay warmth is fine for illustration only. No dashboard noise.
- **Crisis ready**: If Postgres or Redis fail, the platform shifts into demo mode without crashing. Logs must state what failed and which path was chosen.
- **Code clarity**: Any file that takes longer than 20 seconds to parse must be simplified. Services expose explicit interfaces. Routes declare their contracts and structured error shapes.
- **Feature narrative**: Do not add endpoints or components without a user anxiety they solve. Each addition must clarify the pipeline for someone.
- **No AI slop**: Generated code must use precise names anchored in the defined types, routes, and patterns. No vague helpers or random abstractions.

## 3. Current Architecture Snapshot

### 3.1 High-Level Stack
```
Frontend: Next.js 16 (App Router) on port 3000
  - React 19, strict TypeScript, Tailwind v4, Radix UI
  - Server Actions call Express backend via /api proxy
Backend: Express + TypeScript on port 3001
  - Prisma ORM for Postgres, Redis cache (best-effort)
  - Demo Mode Manager + OctoDoc-style SBA demo service
All routes under /api/v1/{auth,sba-demo,timeline,underwriting}
```
- API proxy: `/api/* ? http://localhost:3001` configured in `apps/web/next.config.ts`.
- Frontend root: `apps/web/`. Backend root: `src/`. Shared docs live under `docs/`.
- Run everything locally: `npm install` then `npm run dev` (spawns Next.js + Express). For demo-only without DB/Redis run `DEMO_MODE=true npm run dev` or `DEMO_MODE=true npm start`.
- Key services today: `src/services/sbaDemoService.ts`, `demoModeManager.ts`, `demoDataService.ts`, plus Express routes `src/routes/sbaDemo.ts`, `auth.ts`, `timeline.ts`, `underwriting.ts`.

## 4. Target Architecture After This Upgrade
- **Objective**: Clean separation of four layers-platform core, lending domain, demo engine, and UI shell.
- **Platform core**: Express app, middleware, config, repositories, and lifecycle orchestrated in `src/index.ts` and `src/app.ts`.
- **Lending domain**: Services representing SBA flows (intake, documents, underwriting, timeline). Each service exposes an interface and handles validation, status transitions, and error formatting.
- **Demo engine**: `demoModeManager`, `demoDataService`, and demo variants of each domain service. Demo mode becomes a first-class interface with deterministic seeded data shared across back and front.
- **UI shell**: Next.js App Router pages, reusable components, and server actions. UI layers consume shared types and highlight demo state prominently (e.g., `DemoModeBadge`).
- Duplication between frontend and backend models must be removed by promoting common interfaces into `src/types/` and `apps/web/src/types/` (mirrored or generated).
- Preparing for Phase 3 (timeline) and Phase 4 (underwriting) must not break demo mode. Stubs must already describe their demo-mode behavior.

## 5. Demo Mode Specification

### 5.1 Detection
- **Environment switch**: `DEMO_MODE` env var set to the string `true` enables demo mode.
- **Health fallback**: If Postgres or Redis fail to connect on startup, demo mode must auto-activate.
- **Request access**: `demoModeManager` exposes the current state and must be available anywhere handling work (routes, services, repositories).

### 5.2 Behavior
- **Database**: Prisma calls are replaced with in-memory stores (Maps/arrays) that preserve shape and type of records.
- **Redis**: Redis operations fall back to in-memory Maps with identical method signatures.
- **External services**: Document intelligence, email, and Microsoft Graph calls become deterministic stubs seeded by session/applicant data.
- **Pipelines**: Intake + document jobs must continue to emit realistic stage progression even when fully mocked.

### 5.3 Required Headers
Every demo-mode HTTP response includes:
- `X-Demo-Mode: true`
- `X-Demo-Mode-Message: Running in demonstration mode` (or a short, truthful explanation)

### 5.4 Agent Rules
- Each new feature must define its demo-mode behavior inside the service implementation.
- Fallback logic must rely on `demoModeManager` (no ad-hoc env checks sprinkled elsewhere).
- Add at least one unit test covering the demo-mode branch before declaring work complete.
- When demo behavior is undefined, the change is incomplete and must not be merged.

## 6. Frontend Guide for This Upgrade

### 6.1 File Structure Goal
```
apps/web/
+-- src/app/             # App Router pages
|   +-- page.tsx         # Home
|   +-- demo/page.tsx    # Demo landing
|   +-- intake/page.tsx  # Intake workflow
|   +-- layout.tsx       # Root layout wires DemoModeBadge/CommonLayout
|   +-- globals.css      # Imports design tokens and base styles
|   +-- actions/         # Server Actions (intake.ts, documents.ts, ...)
+-- src/components/
|   +-- Common/Layout.tsx
|   +-- Demo/DemoModeBadge.tsx
|   +-- Intake/StructuredIntake.tsx
|   +-- Document/DocumentUpload.tsx
|   +-- future Timeline/Underwriting components
+-- src/styles/tokens.css
+-- src/types/           # Shared interfaces imported by actions + components
```
- Keep this layout and add new pages/components within the same conventions. Do not invent new folders for one-off experiments.

### 6.2 Pages to Keep and Improve
- `/` **Home**: Introduce CivicFlow in under 10 seconds, highlight the prime CTA to launch the demo, and reinforce the three identity questions.
- `/demo` **Demo landing**: Visual narrative of the pipeline showing stages (Intake ? Upload ? Validation ? Decision). Make demo mode state obvious and stable.
- `/intake` **Intake flow**: Four-step workflow with deterministic prefill, confidence badges, and document status panels. Ensure it works on mobile.
- Future `/timeline` and `/underwriting` pages must be scaffolded now with demo-ready placeholders to unblock Phase 3/4.

### 6.3 Component Rules
- All components use explicit TypeScript props and named exports.
- Complex logic lives in hooks or helper functions, not inline inside JSX trees.
- Accessibility is non-negotiable: semantic elements, ARIA attributes, keyboard handlers, focus management, and descriptive aria-live regions for async updates.

### 6.4 Server Actions
- Located under `apps/web/src/app/actions/` and marked with `'use server';`.
- Actions must read `process.env.NEXT_PUBLIC_API_URL` and fall back to `http://localhost:3001` when missing.
- Standard flow: perform `fetch`, parse JSON, check for an `error` payload, and throw typed errors so client components can render deterministic states.
- All actions depend on shared types from `apps/web/src/types` to avoid drift.

### 6.5 Styling and UX
- Design tokens live in `apps/web/styles/tokens.css`. Import them in `globals.css` and reference them via `var(--token-name)` or Tailwind utilities.
- Use Tailwind v4 utilities for layout, spacing, and responsive design. Avoid magic hex values or spacing numbers outside tokens.
- Confidence badges, pipeline stages, and DemoModeBadge must align with the institutional palette (accent blue, success green, warning amber, error red).
- Every async transition (document upload, job polling) needs visible explanation text so users know what changed and why.

### 6.6 Frontend Ops
- Install deps: `npm install`. Dev server: `npm run dev`. Build: `npm run build`. Tests: `npm test` (Jest + React Testing Library).
- Demo mode UI verification: `DEMO_MODE=true npm run dev` and walk `/demo` ? `/intake` fully.

## 7. Backend Guide for This Upgrade

### 7.1 Directory Structure
```
src/
+-- index.ts                 # Startup lifecycle (init services, graceful shutdown)
+-- app.ts                   # Express bootstrap, middleware, route mounting
+-- config/                  # Env parsing, database/redis/tls config
+-- services/                # Domain logic (sbaDemoService, auth, demo data, ...)
+-- routes/                  # HTTP interfaces per domain (sbaDemo, auth, timeline, underwriting)
+-- repositories/            # Prisma or in-memory persistence adapters
+-- middleware/              # requestId, logging, demoMode banner, auth, rate limiting, error handling
+-- types/                   # Shared TypeScript interfaces for sessions, documents, jobs
+-- utils/                   # Logger, helper utilities, adaptive cards, storage
+-- scripts/                 # seed, migrate, verify AI services, etc.
```
- Move stray logic out of routes/utils and into services. Routes should orchestrate parsing ? service call ? formatted response.

### 7.2 Service Pattern
```typescript
export interface SbaDemoService {
  startSession(input: StartSessionInput): Promise<IntakeSession>;
  uploadDocument(input: UploadDocumentInput): Promise<UploadResult>;
  getJobStatus(jobId: string): Promise<JobStatus>;
  listDocuments(sessionId: string): Promise<Document[]>;
}
```
- Each service defines its interface, implements it, and exports a singleton. Use proper typing so both real and demo implementations satisfy the same contract.
- Services handle validation, branching into demo mode, and raising structured errors.

### 7.3 Route Pattern
```typescript
router.post('/start', async (req, res) => {
  try {
    const input = parseStartSessionInput(req.body);
    const session = await sbaDemoService.startSession(input);
    res.status(201).json({ data: session });
  } catch (error) {
    const formatted = formatHttpError(error);
    res.status(formatted.statusCode).json({ error: formatted.body });
  }
});
```
- One router per feature mounted in `src/app.ts` under `/api/v1/<feature>`.
- Always return `data` or `error` objects. No anonymous arrays or bare strings.

### 7.4 Error Format
```
{
  "code": "VALIDATION_FAILED",
  "message": "Field email is required",
  "details": {
    "field": "email",
    "reason": "missing"
  }
}
```
- Implement `formatHttpError` (if missing) to ensure every thrown error maps to this shape.

### 7.5 Demo Mode Branching
```typescript
if (demoModeManager.isDemoMode()) {
  return demoDataService.listDocuments(sessionId);
}
return documentsRepository.listBySession(sessionId);
```
- Centralize branching inside services or repositories. Never sprinkle inline env checks inside controllers or helpers.
- Demo data generators must be deterministic and seeded (sessionId + applicantName/EIN).

### 7.6 Backend Ops
- Run API only: `npm run dev:api`. Run with demo mode only: `DEMO_MODE=true npm run dev:api`.
- Database migrations: `npm run prisma:migrate`, then `npm run migrate:up`. Reset (dev only): `npm run prisma:reset`.
- Logging: central logger in `src/utils/logger.ts` must annotate demo-mode paths and capture failure context.

## 8. Data Models and Workflows

### 8.1 Core Types
Promote and share the following interfaces between backend `src/types` and frontend `apps/web/src/types`:
```typescript
export interface IntakeSession {
  sessionId: string;
  loanType: '504' | '7a';
  applicantName: string;
  email: string;
  extractedFields: {
    ein?: string;
    businessName?: string;
    address?: string;
    naics?: string;
    revenue?: number;
    yearsOperating?: number;
  };
  documents: Document[];
  status:
    | 'started'
    | 'intake_complete'
    | 'documents_uploaded'
    | 'validated'
    | 'approved'
    | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

export interface Document {
  id: string;
  sessionId: string;
  filename: string;
  mimeType: string;
  size: number;
  jobId: string;
  stage: 'ingest' | 'threat_scan' | 'ocr' | 'policy' | 'ai_review' | 'complete';
  extractedFields: Record<string, unknown>;
  confidence: number;
  uploadedAt: Date;
}

export interface Job {
  jobId: string;
  documentId: string;
  type: 'validate' | 'extract';
  stage: string;
  status: 'pending' | 'processing' | 'complete' | 'failed';
  progress: number;
  result?: Record<string, unknown>;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}
```
- Prefer importing these types instead of duplicating shapes.

### 8.2 Intake Flow
1. User lands on `/demo`, reviews pipeline narrative, and clicks the CTA to start.
2. `/api/v1/sba-demo/start` creates a session (demo mode seeds deterministic data) and returns `IntakeSession`.
3. `/intake` shows extracted fields with confidence badges. Users can edit and trigger revalidation.
4. Document upload triggers `/api/v1/sba-demo/upload`, which spawns a staged job.
5. Frontend polls `/api/v1/sba-demo/status/:jobId` every ~500ms until completion, then refreshes document lists via `/documents/:sessionId`.

### 8.3 Document Validation Pipeline
Stages (always in this order, even in demo mode):
1. **Ingest** - file parsing & normalization
2. **Threat Scan** - safety checks
3. **OCR** - text extraction
4. **Policy** - compliance check for SBA docs
5. **AI Review** - field extraction + confidence scoring
6. **Complete** - job finalization and data persistence

### 8.4 Confidence Scores
- `confidence >= 0.8`: success state (green), auto-accepted but editable.
- `0.7 <= confidence < 0.8`: warning state (amber), instruct user to verify.
- `confidence < 0.7`: error state (red), requires manual review.
- Centralize this logic in a shared helper (e.g., `getConfidenceState(confidence)` returning `{ tone, label, guidance }`) and reuse on both frontend and backend.

### 8.5 Demo Data
- `demoDataService` seeds mock responses using applicant name/EIN to keep runs reproducible.
- Demo uploads should finish in under five seconds with realistic stage durations.
- All demo responses must tag `X-Demo-Mode` headers and expose stage/next-stage cues for UI clarity.

## 9. Design System

### 9.1 Tokens and Palette
- Source of truth: `apps/web/styles/tokens.css`.
- Core palette:
  - `--cc-accent` (#2563eb) for CTAs/highlights.
  - `--cc-success` (#10b981), `--cc-warning` (#f59e0b), `--cc-error` (#ef4444).
  - Backgrounds: `--cc-bg-primary`, `--cc-bg-secondary`.
  - Text: `--cc-text`, `--cc-text-secondary`, `--cc-muted`.
- Spacing scale `--s-{n}` (8px base) and typography scale (`--text-2xl`, `--text-xl`, `--text-lg`, `--text-sm`, `--text-xs`) must be used everywhere.

### 9.2 Motion and Interaction
- Motion tokens: `--dur-micro` (150ms), `--dur-gentle` (300ms), `--dur-progress` (500ms).
- Button and card transitions should reference these tokens for smooth institutional polish.

### 9.3 Aesthetic Rules
- Light background with clear cards/panels. One primary CTA per view.
- Stage labels, progress indicators, and confidence badges stay prominent and legible.
- Avoid gradients/noisy backgrounds. Use subtle clay warmth only in illustrations or empty states.

## 10. Agent Behavior and Prompt Contract
- When implementing a feature, include: the lender anxiety being solved, frontend changes, backend changes, explicit demo-mode behavior, unit/UI tests, and any migrations or scripts to run.
- Preserve existing contracts unless explicitly told otherwise. Improve naming only when it does not break public APIs.
- Avoid introducing new dependencies without a written justification tied to this codex.
- If uncertain, ship the minimal safe change and leave a TODO with context rather than guessing loan-domain rules.
- Never remove or bypass demo mode. Any background job, route, or UI addition must describe what happens when demo mode is on.

## 11. Testing and Quality Gates

### 11.1 Mandatory Automated Tests
- Each new service or significant branch needs at least one Jest unit test.
- Include at least one test that asserts demo-mode behavior (e.g., returns seeded data, sets headers, uses in-memory stores).
- UI changes require a basic rendering/interaction test (React Testing Library) proving that primary state appears and accessibility hooks work.

### 11.2 Manual Checklist Before Merge
- [ ] `DEMO_MODE=true npm run dev` and complete `/demo ? /intake` without touching Postgres/Redis.
- [ ] Intake form can start a session, edit fields, and display confidence tiers correctly.
- [ ] Document upload finishes under ~5 seconds in demo mode; polling transitions show stage + next stage.
- [ ] Demo banner / badge is visible on every page.
- [ ] Error messages use structured format and never show raw stack traces.
- [ ] Responsive layout works for mobile/tablet/desktop, and keyboard navigation succeeds.

### 11.3 Helpful Scripts
- `npm test` - Jest suite (pass `-- --watch` for watch mode, `-- --coverage` for coverage).
- `npm run build` - catches TypeScript issues for both frontend and backend packages.
- `npm run verify:ai` - quick AI-service health script.
- `scripts/test-demo-mode.js` and `scripts/test-demo-response.js` - legacy helpers for demo-mode regression; keep them green until replaced.

## 12. Roadmap for This Upgrade
1. Clean up services and routes to match the patterns above (interfaces, error shapes, demo-mode branching inside services).
2. Centralize demo-mode detection/behavior inside `demoModeManager` and demo data services.
3. Normalize structured error responses across all routes.
4. Unify shared types between backend `src/types` and frontend `apps/web/src/types`.
5. Improve the demo landing page narrative and visuals to highlight the pipeline and confidence cues.
6. Tighten intake + upload flows, confidence UI, and polling explanations.
7. Prepare timeline and underwriting stubs (UI + routes + services) with fully defined demo-mode behavior.
8. Add unit/UI tests that explicitly cover demo mode and the core flows above.

After this pass CivicFlow2 must feel like an intentional institutional engine-grounded in demo mode, calm in presentation, and precise in code.

