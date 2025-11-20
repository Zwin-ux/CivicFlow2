# RECON REPORT: Demo Mode Functionality & Tooling
**Date**: November 15, 2025
**Status**: Preparation for institutional CivicFlow overhaul + Next.js migration
**Focus**: Demo mode improvements to showcase institutional lending workflows

---

## CURRENT STATE ASSESSMENT

### Demo Mode Infrastructure (Express Backend)
✅ **Exists & Functional**
- `src/services/sbaDemoService.ts` (1534 lines) — OctoDoc demo service with:
  - Session management (start, expire, cleanup)
  - Document upload & validation simulation
  - Processing jobs with multi-stage pipelines (ingest, threat_scan, ocr, policy, ai_review)
  - Structured field extraction with confidence scores
  - Redis best-effort persistence for sessions, documents, jobs
  - In-memory fallback when Redis unavailable
- `src/routes/sbaDemo.ts` — Demo API endpoints:
  - POST `/api/v1/sba-demo/start` — session creation
  - POST `/api/v1/sba-demo/upload` — file upload + multipart handling
  - GET `/api/v1/sba-demo/status/:jobId` — job polling
  - POST `/api/v1/sba-demo/validate/:documentId` — validation check
  - POST `/api/v1/sba-demo/schedule-pickup` — scheduling
  - GET `/api/v1/sba-demo/documents/:sessionId` — document listing
- `public/demo-sba.html` — Vanilla JS UI (modern aesthetic, accessible)
- `public/css/sba-demo.css` — Tailwind-inspired tokens, micro-interactions

### Demo Mode Middleware & Services (Express)
✅ **Exists & Functional**
- `src/services/demoModeManager.ts` — global demo mode toggle
- `src/middleware/detectDemoMode.ts` — auto-enable on DB/Redis failure
- `src/middleware/bypassAuthForDemo.ts` — auth bypass for demo users
- `src/middleware/checkDemoExpiry.ts` — session timeout checks
- Demo data services: mock Email, Teams, AI services

### Mock Data & Seeding
✅ **Partial**
- Sample bank statements (`public/demo-documents/sample-bank-statement-q4-2023.html`)
- Demo form templates
- Some demo applicant fixtures
- **Gap**: No curated "guided narrative" for multi-step workflow demo

### Frontend (Vanilla JS / Static HTML)
✅ **Exists**
- `/public/demo-sba.html` — OctoDoc demo page (responsive, keyboard-accessible, optimistic UI)
- `/public/demo-landing.html` — Entry point with CTA to demo
- `/public/staff-portal.html`, `/public/investor-dashboard.html` — partial demo support
- **Gap**: No coordinated multi-page workflow in static HTML (next.js will fix)

### Frontend (Next.js / New App Router)
🟡 **In Progress**
- `apps/web/` bootstrap complete (Next.js 16, React 19, Tailwind v4, Radix UI)
- `apps/web/styles/tokens.css` — CivicFlow design tokens (colors, spacing, motion)
- `apps/web/src/app/layout.tsx` — updated to import DemoModeBadge (not yet created)
- **Gaps**:
  - DemoModeBadge component missing
  - StructuredIntake component missing
  - Server actions missing
  - Routes not wired to Express API proxy
  - No next.config.ts rewrite for API proxying
  - No .env.local for API_URL

### Deployment & Docker
✅ **Functional**
- Dockerfile updated to:
  - Run `npm install` in builder (tolerates lock file mismatch)
  - Copy builder's lockfile into final stage
  - Run `npm ci --omit=dev` in final (skips dev deps, Puppeteer)
  - `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1` set for builder
- `package.json` updated to:
  - Add `dev` script running API on 3001 + web on 3000 (concurrently)
  - Add `build` script to build both API and web

### Dev Scripts & Tooling
✅ **Exists**
- `npm run dev` — runs Express API on 3001 + Next web on 3000 concurrently
- `npm run dev:api` — Express only on 3001
- `npm run dev:web` — Next only on 3000
- `npm run build` — tsc + next build
- `scripts/visual/regress.js` — Puppeteer visual regression test (requires install)

### Visual Tests & Regression
🟡 **Exists but not running**
- `scripts/visual/regress.js` — Puppeteer screenshot tool (first run = baseline, subsequent = compare)
- `npm run test:visual` — script to invoke regress.js
- **Blocker**: Puppeteer not installed locally (yet)

### Documentation
✅ **Comprehensive**
- `docs/DEMO_MODE.md` — demo mode feature guide
- `DEMO_MODE_IMPLEMENTATION.md` — technical implementation details
- `QUICK_START.md` — get started in 3 minutes
- `.kiro/specs/` — detailed task summaries (Tasks 1–8)
- **Gap**: No "demo narrative orchestration" guide yet

---

## STRATEGIC ASSESSMENT

### What's Working Well
1. **Demo mode infrastructure is robust** — in-memory + Redis, graceful degradation, auto-enable on failure
2. **OctoDoc service is production-ready** — multi-stage processing, confidence scores, field extraction
3. **Express API is mature** — health checks, error handling, logging, deployment-ready
4. **Docker & deployment validated** — builds correctly, handles lock file mismatch
5. **Design tokens in place** — tokens.css ready, Tailwind v4 configured in apps/web

### Critical Gaps (Blocking Institutional Overhaul)
1. **Next.js app incomplete** — no API proxy, no demo badge, no intake component, no server actions
2. **No guided demo narrative** — current demo shows individual features in isolation; needs orchestrated "story"
3. **No audit trail component** — no timeline showing applicant journey, decisions, messages
4. **No team chat/collaboration** — no messaging in demo
5. **No underwriting snapshot page** — no summary card with eligibility, risks, required docs
6. **No intake pipeline visualization** — no drag-drop, no queue management
7. **No compliance mode toggle** — no "log everything" mode for regulated workflows
8. **No document intelligence UI** — no extraction confidence visualization, no anomaly flags

### Architectural Decisions Needed
1. **Express API stays as is** — keep it as backend; Next.js is frontend-only consumer
2. **API proxying in Next.js** — `next.config.ts` rewrites `/api/*` to `http://localhost:3001/api/*`
3. **Demo mode flag in requests** — server actions on Next will pass `?demoMode=true` to Express endpoints
4. **Best-effort persistence** — Redis caching for demo sessions/docs is good; no need to change
5. **Cli tool**: Gemini CLI to scaffold and implement components according to the "Institutional CivicFlow" execution prompt

---

## RECON FINDINGS

### Current Demo User Experience
- ✅ **OctoDoc landing page** works (fast, responsive, accessible)
- ✅ **File upload → validation → processing** works with visual progress
- ✅ **Optimistic UI** works (instant feedback + reconciliation)
- ❌ **Multi-step workflow narrative** missing (intake → classify → route → collaborate → close not wired in UI)
- ❌ **Team collaboration** missing (no chat, no audit trail, no role-based actions)
- ❌ **Underwriting summary** missing (no risk assessment, no eligibility checklist, no quick actions)
- ❌ **Compliance/audit layer** missing (no immutable log, no compliance mode)

### API Capability vs. UI Capability Mismatch
| Feature | API | UI (Next.js) | Priority |
|---------|-----|---|----------|
| Demo Session Start | ✅ | ❌ | HIGH |
| Document Upload | ✅ | ✅ (OctoDoc only) | HIGH |
| Structured Intake | ✅ (service exists) | ❌ | CRITICAL |
| Document Validation | ✅ | ✅ | HIGH |
| Job Status Polling | ✅ | ✅ | HIGH |
| Intake Pipeline Viz | ❌ | ❌ | HIGH |
| Audit Trail / Timeline | ❌ | ❌ | CRITICAL |
| Team Chat | ❌ | ❌ | HIGH |
| Underwriting Snapshot | ❌ | ❌ | CRITICAL |
| Compliance Mode | ❌ | ❌ | MEDIUM |
| Risk Scoring | ✅ | ❌ | HIGH |
| Anomaly Detection | ✅ | ❌ | HIGH |

---

## GEMINI CLI TASK PRIORITIZATION

### Phase 1: Foundation (Complete Next.js scaffolding + Connect to Express API)
**Goal**: Wire Next.js frontend to Express backend; make API proxying work; enable demo mode in Next context.

1. **Task 1.1** — Create `apps/web/next.config.ts` with API rewrite
2. **Task 1.2** — Create `apps/web/.env.local` with API_URL config
3. **Task 1.3** — Create `components/Demo/DemoModeBadge.tsx` (accessible, shows demo state)
4. **Task 1.4** — Create `components/Common/Layout.tsx` (header, nav, sidebar, demo badge)
5. **Task 1.5** — Create `app/(demo)/page.tsx` (demo landing page, styled as "Institutional CivicFlow")

### Phase 2: Core Intake Flow (Structured extraction + Validation)
**Goal**: Build the intake pipeline UI with optimistic UI, field extraction, confidence visualization.

6. **Task 2.1** — Create `components/Intake/StructuredIntake.tsx` (field extraction form, confidence badges)
7. **Task 2.2** — Create `app/actions/intake.ts` (server action calling `/api/v1/sba-demo/start`)
8. **Task 2.3** — Create `components/Document/DocumentUpload.tsx` (drag-drop, file list, progress)
9. **Task 2.4** — Create `app/actions/documents.ts` (server action for upload + validation polling)
10. **Task 2.5** — Create `app/(demo)/intake/page.tsx` (orchestrates intake flow)

### Phase 3: Workflow Timeline & Collaboration
**Goal**: Build audit trail, team chat, and collaborative review interface.

11. **Task 3.1** — Create `components/Timeline/ApplicantTimeline.tsx` (event list with filters)
12. **Task 3.2** — Create `components/Chat/TeamChat.tsx` (messages, pins, document references)
13. **Task 3.3** — Create `app/actions/timeline.ts` (server action fetching events)
14. **Task 3.4** — Create `app/(demo)/applicant/[id]/timeline.tsx` (full page view)
15. **Task 3.5** — Create Express `/api/v1/demo/timeline/:sessionId` endpoint (if not exists)

### Phase 4: Underwriting & Risk Assessment
**Goal**: Build snapshot card, eligibility summary, risk flags, quick actions.

16. **Task 4.1** — Create `components/Underwriting/UnderwritingSnapshot.tsx` (summary card, risk badge, required docs)
17. **Task 4.2** — Create `components/Underwriting/EligibilityChecklist.tsx` (rule engine visualization)
18. **Task 4.3** — Create `components/Underwriting/RiskFlags.tsx` (anomaly list, severity coloring)
19. **Task 4.4** — Create `components/Underwriting/QuickActions.tsx` (buttons: request doc, verify EIN, generate pack)
20. **Task 4.5** — Create `app/actions/underwriting.ts` (server actions for quick actions)
21. **Task 4.6** — Create `app/(demo)/applicant/[id]/snapshot.tsx` (full page view)

### Phase 5: Demo Narrative & Guided Tour
**Goal**: Build an animated "walkthrough" that tells the story of the full workflow.

22. **Task 5.1** — Create `components/Demo/GuidedDemoOrchestrator.tsx` (state machine for multi-step narrative)
23. **Task 5.2** — Create `app/(demo)/walkthrough/page.tsx` (animated guided narrative with pauses/CTAs)
24. **Task 5.3** — Update Express demo service to expose "curated workflow" endpoint
25. **Task 5.4** — Create `styles/demo-narrative.css` (animations for workflow steps, micro-interactions)
26. **Task 5.5** — Create demo data fixtures (curated 3–5 applicants with pre-arranged scenarios)

### Phase 6: Polish & Testing
**Goal**: Accessibility, performance, visual regression, e2e tests.

27. **Task 6.1** — Run Puppeteer visual regression baseline capture
28. **Task 6.2** — Add unit tests for intake, timeline, snapshot components
29. **Task 6.3** — Add accessibility audit (axe, WAVE) to demo pages
30. **Task 6.4** — Add performance profiling (Lighthouse) for demo pages
31. **Task 6.5** — Create demo walkthrough e2e test (Playwright or Cypress)

### Phase 7: Deployment & Handoff
**Goal**: Document setup, deploy both API and web, create developer runbook.

32. **Task 7.1** — Create `apps/web/README.md` (dev setup, build, test, deploy instructions)
33. **Task 7.2** — Update root README with Next.js integration notes
34. **Task 7.3** — Create `docs/DEMO_NARRATIVE.md` (walkthrough script and timing)
35. **Task 7.4** — Test full dev setup: `npm run dev` starts both servers, demo is accessible on http://localhost:3000
36. **Task 7.5** — Create Dockerfile.web for containerizing the Next.js app (optional separate deploy)

---

## EXECUTION PRIORITY FOR GEMINI CLI

### Must-Do First (Unblocks everything else)
```
gemini cli --task "Task 1.1: next.config.ts with API rewrite"
gemini cli --task "Task 1.2: .env.local setup"
gemini cli --task "Task 1.3: DemoModeBadge component"
gemini cli --task "Task 1.4: Layout component"
gemini cli --task "Task 1.5: Demo landing page"
```

### Then: Build Intake (Core workflow)
```
gemini cli --task "Task 2.1: StructuredIntake component"
gemini cli --task "Task 2.2: intake server action"
gemini cli --task "Task 2.3: DocumentUpload component"
gemini cli --task "Task 2.4: documents server action"
gemini cli --task "Task 2.5: intake page"
```

### Then: Timeline & Collaboration
```
gemini cli --task "Task 3.1: ApplicantTimeline component"
gemini cli --task "Task 3.2: TeamChat component"
gemini cli --task "Task 3.3: timeline server action"
gemini cli --task "Task 3.4: timeline page"
gemini cli --task "Task 3.5: Express timeline endpoint"
```

### Then: Underwriting
```
gemini cli --task "Task 4.1–4.6: Underwriting components + snapshot page"
```

### Then: Narrative
```
gemini cli --task "Task 5.1–5.5: Guided demo orchestrator + walkthrough page"
```

### Then: Polish & Test
```
gemini cli --task "Task 6.1–6.5: Visual tests, unit tests, accessibility, e2e"
```

### Finally: Deploy & Handoff
```
gemini cli --task "Task 7.1–7.5: Docs, runbook, Dockerfile, verification"
```

---

## CRITICAL SUCCESS METRICS

By end of Phase 2 (Intake + Validation):
- ✅ Next.js app fully running and communicating with Express API
- ✅ Demo mode badge visible on every page
- ✅ Intake flow working end-to-end (file upload → validation → job polling)
- ✅ Optimistic UI working (instant visual feedback + reconciliation)
- ✅ Can start a demo session and upload a document in <5 seconds

By end of Phase 3 (Timeline):
- ✅ Audit trail visible with timestamps and actor info
- ✅ Team chat functional and styled
- ✅ Messages can reference documents/applicants

By end of Phase 4 (Underwriting):
- ✅ Snapshot page shows eligibility, risks, required docs in one glance
- ✅ Quick action buttons work (request doc, verify EIN, generate pack)
- ✅ Anomaly flags highlighted with severity coloring

By end of Phase 5 (Narrative):
- ✅ Demo walkthrough tells a 60-second story of a complete workflow
- ✅ Animated transitions between steps
- ✅ User can click through or let auto-play
- ✅ Curated data makes the story believable and compelling

---

## RISKS & MITIGATIONS

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Next.js app slow to compile with Puppeteer deps | Medium | Low | Use `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1`; lazy-load visual tests |
| API response times affect demo feel | Low | Medium | Ensure Express demo routes return in <200ms; use Redis caching |
| Demo data becomes stale/unconvincing | Medium | High | Refresh curated fixtures monthly; test walkthrough quarterly |
| Accessibility regressions on new components | Medium | Medium | Run axe audits in CI; manual WAVE testing before release |
| Demo mode leaks into production | Low | Critical | Strict `?demoMode=true` flag validation; audit Express routes; document bypass clearly |

---

## NEXT IMMEDIATE STEPS

1. **Complete Next.js scaffolding** (Phase 1 Tasks) — ~2–4 hours
2. **Run `npm run dev`** and verify both servers start (API on 3001, web on 3000)
3. **Verify demo badge appears** on http://localhost:3000
4. **Implement Intake flow** (Phase 2 Tasks) — ~4–6 hours
5. **Test end-to-end**: upload file → see progress → get result
6. **Schedule Phase 3–5** based on stakeholder feedback on intake UX

---

**Report generated**: November 15, 2025  
**Next review**: After Phase 2 completion
