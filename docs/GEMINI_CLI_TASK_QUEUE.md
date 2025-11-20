# GEMINI CLI TASK QUEUE — Demo Mode Institutional Overhaul
**Project**: CivicFlow Institutional Lending Platform  
**Phase**: Foundation & Core Intake  
**Duration**: Estimate 3–4 weeks (36 tasks total across 7 phases)  
**Execution**: Sequential or parallel using Gemini CLI  

---

## PHASE 1: Foundation (Next.js Scaffolding + API Integration)
**Duration**: 4–6 hours | **Blockers**: None | **Dependencies**: Apps/web bootstrap (done)

Run these tasks in order:

```bash
# 1.1: Create next.config.ts with API proxy rewrite
gemini cli --task "
CIVICFLOW TASK: Create next.config.ts for API proxy rewriting

Create apps/web/next.config.ts that:
1. Rewrites /api/* requests to http://localhost:3001/api/*
2. Configures static file serving (public assets)
3. Enables experimental features if needed (React Compiler)
4. Sets NEXT_PUBLIC_API_URL env var

Output: Full next.config.ts TypeScript file with inline comments.
Accept criteria: tsc compiles, Next.js accepts config on next dev.
"

# 1.2: Create .env.local with API configuration
gemini cli --task "
CIVICFLOW TASK: Create .env.local for development

Create apps/web/.env.local that:
1. Sets NEXT_PUBLIC_API_URL=http://localhost:3001
2. Sets NEXT_PUBLIC_API_VERSION=v1
3. Sets DEMO_MODE=true (for local dev)
4. Any other needed env vars (logging, etc)

Output: Plain .env.local file. Keep secrets minimal for dev.
"

# 1.3: Create DemoModeBadge component
gemini cli --task "
CIVICFLOW TASK: Create DemoModeBadge component

Create apps/web/src/components/Demo/DemoModeBadge.tsx that:
1. Renders a sticky or floating badge showing 'DEMO MODE ACTIVE'
2. Uses design tokens from tokens.css (--cc-accent, --cc-bg, --cc-text)
3. Includes accessible ARIA labels
4. Shows only when NEXT_PUBLIC_DEMO_MODE=true
5. Includes a brief tooltip on hover explaining demo state

Output: Full TSX component with TypeScript types, unit test stub, Storybook story stub.
Accept criteria: Component renders, is accessible, uses tokens correctly, no lint errors.
"

# 1.4: Create Layout component
gemini cli --task "
CIVICFLOW TASK: Create root Layout and Navigation

Create apps/web/src/components/Common/Layout.tsx that:
1. Wraps all demo pages with consistent header, nav, and sidebar
2. Header shows logo (placeholder text 'CivicFlow'), breadcrumbs, user menu
3. Sidebar: minimal nav (Home, Intake, Applications, Timeline, Settings)
4. Footer: copyright, links
5. All styled using design tokens (colors, spacing, shadows)
6. Accessible navigation with ARIA landmarks

Output: Full TSX layout component with navigation. Update app/layout.tsx to use it.
Accept criteria: Layout wraps content, nav is keyboard-accessible, styling uses tokens.
"

# 1.5: Create demo landing page
gemini cli --task "
CIVICFLOW TASK: Create demo landing page (app/demo/page.tsx)

Create apps/web/src/app/(demo)/page.tsx that:
1. Shows hero section with CivicFlow headline and demo CTA
2. Shows 3-step overview: Intake → Review → Approve
3. Prominent 'Start Demo' button that navigates to /demo/intake
4. Explains demo mode: 'Explore the full workflow with sample data'
5. All styled as 'institutional calm' per design tokens
6. Responsive (mobile-first)

Output: Full TSX page with hero styling, grid layout, buttons using Tailwind/tokens.
Accept criteria: Renders, responsive, styled per institutional aesthetic, button routes work.
"
```

---

## PHASE 2: Core Intake Flow (Structured Extraction + Validation)
**Duration**: 6–8 hours | **Blockers**: Phase 1 | **Dependencies**: Express demo API

Run these tasks in order:

```bash
# 2.1: Create StructuredIntake component
gemini cli --task "
CIVICFLOW TASK: Create StructuredIntake component

Create apps/web/src/components/Intake/StructuredIntake.tsx that:
1. Shows a form with fields: EIN, business_name, address, NAICS, revenue, years_operating, ownership, phone, email
2. Each field displays a confidence badge showing AI confidence (0–100%) after extraction
3. Fields are editable (user can correct AI extraction)
4. Submits to a server action on 'Next' button click
5. Uses design tokens for styling (form inputs, buttons, badges)
6. Accessible: keyboard nav, proper labels, error messages

Output: Full TSX component with TypeScript interfaces, prop types. Include unit test for field editing.
Accept criteria: All fields render, editable, confidence badges display, no lint errors.
"

# 2.2: Create intake server action
gemini cli --task "
CIVICFLOW TASK: Create intake server action (app/actions/intake.ts)

Create apps/web/src/app/actions/intake.ts that:
1. Exports async function startIntakeSession(loanType: '504' | '5a'): Promise<{ sessionId: string }>
2. Calls Express POST /api/v1/sba-demo/start?demoMode=true with loanType
3. Returns sessionId and other metadata
4. Handles errors gracefully (returns error message if API fails)
5. Uses fetch with proper headers (Content-Type: application/json)

Output: Full TypeScript server action file. Include JSDoc comments for function signature.
Accept criteria: Compiles, handles errors, returns expected types, works with demoMode=true.
"

# 2.3: Create DocumentUpload component
gemini cli --task "
CIVICFLOW TASK: Create DocumentUpload component

Create apps/web/src/components/Document/DocumentUpload.tsx that:
1. Shows drag-and-drop zone (large, visually obvious)
2. Supports multiple file selection
3. Shows file list with size and status (uploading / done / error)
4. Progress bar for each file during upload
5. Callback prop: onFilesAdded(files: File[])
6. Keyboard accessible: Tab into dropzone, Space/Enter to open file picker
7. Styled with design tokens (colors, shadows, hover states)

Output: Full TSX component with TypeScript types, prop interface. Include unit test for file selection.
Accept criteria: Dropzone works, files list displays, progress bars animate, keyboard nav works.
"

# 2.4: Create documents server action
gemini cli --task "
CIVICFLOW TASK: Create documents server action (app/actions/documents.ts)

Create apps/web/src/app/actions/documents.ts that:
1. Exports uploadDocument(formData: FormData, sessionId: string): Promise<{ documentId, jobId, status }>
2. Calls Express POST /api/v1/sba-demo/upload with multipart form-data?demoMode=true
3. Polls GET /api/v1/sba-demo/status/:jobId every 500ms until job done
4. Returns job result (extracted fields, validation status)
5. Handles network errors and retries (max 3 retries with exponential backoff)

Output: Full TypeScript server action. Include polling logic, error handling, comments.
Accept criteria: Uploads work, polling works, result is returned, errors handled gracefully.
"

# 2.5: Create intake flow page
gemini cli --task "
CIVICFLOW TASK: Create intake flow page (app/(demo)/intake/page.tsx)

Create apps/web/src/app/(demo)/intake/page.tsx that:
1. Orchestrates the intake workflow: StructuredIntake → DocumentUpload → Polling → Success
2. Step 1: Show StructuredIntake form, on submit start session
3. Step 2: Show DocumentUpload, on submit upload and poll
4. Step 3: Show results (extracted fields, validation status, next steps)
5. All optimistic UI (show results instantly, reconcile when server responds)
6. Shows progress: Step 1/3 indicator
7. Mobile responsive

Output: Full TSX page with state management (useState), form handling, optimistic UI. Include comments.
Accept criteria: Page renders, workflow flows end-to-end, optimistic UI works, styled per tokens.
"
```

---

## PHASE 3: Workflow Timeline & Collaboration
**Duration**: 8–10 hours | **Blockers**: Phase 2 | **Dependencies**: Express timeline API (needs creation)

Run these tasks in order:

```bash
# 3.1: Create ApplicantTimeline component
gemini cli --task "
CIVICFLOW TASK: Create ApplicantTimeline component

Create apps/web/src/components/Timeline/ApplicantTimeline.tsx that:
1. Displays a vertical timeline of events (uploaded, validated, routed, reviewed, approved, etc)
2. Each event shows: timestamp, actor, action type, status/outcome
3. Events can be clicked to expand and show full details
4. Supports filtering by event type (upload, validation, routing, approval, message)
5. Lazy-loads events (infinite scroll or 'load more')
6. Styled with design tokens: neutral colors, soft shadows, clear typography
7. Accessible: keyboard nav, ARIA live regions for new events

Output: Full TSX component with interfaces for TimelineEvent, filtering logic. Include unit test.
Accept criteria: Timeline renders, events display, filtering works, expandable details work.
"

# 3.2: Create TeamChat component
gemini cli --task "
CIVICFLOW TASK: Create TeamChat component

Create apps/web/src/components/Chat/TeamChat.tsx that:
1. Shows a message list (vertical scroll)
2. Each message shows: sender, timestamp, message text, attachments/references
3. Can pin a message (shows pin icon, pinned list visible)
4. Can reference a document/applicant (link to entity)
5. 'New message' input at bottom with send button
6. Optimistic UI: message appears instantly, syncs when server responds
7. Styled with design tokens: light backgrounds, clear message bubbles
8. Accessible: keyboard nav, focus management, screen reader labels

Output: Full TSX component with interfaces for Message, ChatRef. Include unit test for message sending.
Accept criteria: Messages display, send works, pin works, references work, optimistic UI works.
"

# 3.3: Create timeline server action
gemini cli --task "
CIVICFLOW TASK: Create timeline server action (app/actions/timeline.ts)

Create apps/web/src/app/actions/timeline.ts that:
1. Exports getApplicationTimeline(sessionId: string, limit?: number): Promise<TimelineEvent[]>
2. Calls Express GET /api/v1/demo/timeline/:sessionId?demoMode=true&limit=20
3. Returns array of TimelineEvent objects (id, timestamp, actor, type, payload)
4. If Express endpoint doesn't exist yet, return mock events for demo
5. Handle errors gracefully

Output: Full TypeScript server action. Include TimelineEvent interface. Add JSDoc.
Accept criteria: Compiles, returns events, handles errors, works with mock data if endpoint missing.
"

# 3.4: Create timeline page
gemini cli --task "
CIVICFLOW TASK: Create timeline page (app/(demo)/applicant/[id]/timeline.tsx)

Create apps/web/src/app/(demo)/applicant/[id]/timeline.tsx that:
1. Shows ApplicantTimeline + TeamChat side-by-side (desktop) or stacked (mobile)
2. On left: timeline of all actions/decisions
3. On right: team chat where reviewers discuss the application
4. Header shows applicant name, current status, stage
5. Both are live-updating (polling or WebSocket mockup)
6. Responsive layout using Tailwind

Output: Full TSX page with layout, side-by-side components, responsive design. Add comments.
Accept criteria: Page renders, timeline and chat both visible, responsive works, data loads.
"

# 3.5: Create Express timeline endpoint
gemini cli --task "
CIVICFLOW TASK: Create Express /api/v1/demo/timeline endpoint

Add to src/routes/sbaDemo.ts:
1. GET /demo/timeline/:sessionId that returns timeline events for a session
2. Events include: upload, validate, classify, route, message, approval
3. Format: { id, timestamp, actor, type, payload, status }
4. Return mock curated data for demo sessions
5. Respect demoMode=true flag
6. Add logging and error handling

Output: Full Express route handler with TypeScript types. Include sample response in comments.
Accept criteria: Route works, returns data in correct format, handles errors, responds <200ms.
"
```

---

## PHASE 4: Underwriting & Risk Assessment
**Duration**: 8–10 hours | **Blockers**: Phase 2 | **Dependencies**: Risk scoring API (exists in backend)

Run these tasks in order:

```bash
# 4.1: Create UnderwritingSnapshot component
gemini cli --task "
CIVICFLOW TASK: Create UnderwritingSnapshot component

Create apps/web/src/components/Underwriting/UnderwritingSnapshot.tsx that:
1. Displays a card summarizing: loan amount, business financials, eligibility status, risk level
2. Shows key metrics: debt-to-income, revenue growth, business age, credit score (demo data)
3. Risk badge: color-coded (green=low, yellow=medium, red=high)
4. Lists required documents (checklist with status: done/pending/missing)
5. Collapsible sections for details
6. Styled with design tokens: clean card layout, clear typography, color-coded badges
7. Responsive (stacks on mobile)

Output: Full TSX component with TypeScript interfaces for UnderwritingData. Include unit test.
Accept criteria: Snapshot renders, all metrics visible, badges color-correct, responsive works.
"

# 4.2: Create EligibilityChecklist component
gemini cli --task "
CIVICFLOW TASK: Create EligibilityChecklist component

Create apps/web/src/components/Underwriting/EligibilityChecklist.tsx that:
1. Shows eligibility rules as a checklist (SBA 504: business age >2 years, NAICS valid, debt-to-income <X, etc)
2. Each rule has checkbox: checked (pass), unchecked (fail), or partial (warning)
3. Hover shows rule details and data source
4. Rules can be expanded to show extracted fields that fed into rule
5. Styled with design tokens: neutral colors, clear iconography (✓, ×, ⚠)
6. Accessible: keyboard nav, screen reader labels

Output: Full TSX component with interfaces for EligibilityRule, RuleData. Include unit test.
Accept criteria: Rules render, checkboxes work, details expand, styling uses tokens.
"

# 4.3: Create RiskFlags component
gemini cli --task "
CIVICFLOW TASK: Create RiskFlags component

Create apps/web/src/components/Underwriting/RiskFlags.tsx that:
1. Displays anomalies/flags as a list: inconsistent dates, missing documents, high debt, fraud indicators
2. Each flag shows: severity badge (critical/high/medium/low), description, recommendation
3. Flags are color-coded by severity
4. Can be clicked to expand and show evidence (extracted fields that triggered flag)
5. Can be dismissed (marked as reviewed)
6. Styled with design tokens: colored badges, clear typography, subtle animations

Output: Full TSX component with interfaces for RiskFlag. Include unit test for dismiss.
Accept criteria: Flags render, color-coding correct, expand works, dismiss works, styled well.
"

# 4.4: Create QuickActions component
gemini cli --task "
CIVICFLOW TASK: Create QuickActions component

Create apps/web/src/components/Underwriting/QuickActions.tsx that:
1. Shows 4–5 action buttons: Request Doc, Verify EIN, Generate Pack, Schedule Review, Approve
2. Each button has icon + label, distinct visual treatment
3. Buttons are contextual (e.g., 'Request Doc' only if docs missing)
4. On click, show modal or inline form for action details
5. Styled with design tokens: accent color, hover/active states, icons
6. Accessible: keyboard operable, ARIA labels, focus management

Output: Full TSX component with action handler props. Include unit test for button clicks.
Accept criteria: Buttons render, icons visible, click handlers work, modals show/close.
"

# 4.5: Create underwriting server actions
gemini cli --task "
CIVICFLOW TASK: Create underwriting server actions (app/actions/underwriting.ts)

Create apps/web/src/app/actions/underwriting.ts that:
1. Exports getUnderwritingSnapshot(sessionId: string): Promise<UnderwritingData>
2. Exports getEligibilityStatus(sessionId: string): Promise<EligibilityStatus>
3. Exports getRiskFlags(sessionId: string): Promise<RiskFlag[]>
4. Exports executeQuickAction(sessionId: string, action: QuickAction, payload: any)
5. All call Express endpoints with ?demoMode=true
6. If endpoints don't exist, return mock data for demo

Output: Full TypeScript server actions with interfaces. Include JSDoc comments.
Accept criteria: All compile, return correct types, handle errors, work with mock data.
"

# 4.6: Create snapshot page
gemini cli --task "
CIVICFLOW TASK: Create snapshot page (app/(demo)/applicant/[id]/snapshot.tsx)

Create apps/web/src/app/(demo)/applicant/[id]/snapshot.tsx that:
1. Shows full underwriting view: snapshot + checklist + risk flags + quick actions
2. Grid layout: left column (snapshot + checklist), right column (risk flags + actions)
3. Header shows applicant name, loan amount, status
4. All data loaded on page mount
5. Responsive (stacks on mobile)

Output: Full TSX page with layout, all 4 components integrated. Add comments.
Accept criteria: Page renders, all sections visible, responsive works, data loads.
"
```

---

## PHASE 5: Demo Narrative & Guided Tour
**Duration**: 10–12 hours | **Blockers**: Phase 4 | **Dependencies**: Curated demo data

Run these tasks:

```bash
# 5.1: Create GuidedDemoOrchestrator component
gemini cli --task "
CIVICFLOW TASK: Create GuidedDemoOrchestrator component

Create apps/web/src/components/Demo/GuidedDemoOrchestrator.tsx that:
1. Implements a state machine for a multi-step demo narrative
2. States: welcome → start intake → upload doc → validate → review timeline → underwrite → approve
3. Each state has: description, CTA button, auto-play timer (3–7 seconds), skip button
4. On state transition, animate UI changes (fade, slide)
5. After approval, show summary and 'restart' option
6. Styled with design tokens: clear hierarchy, micro-animations
7. Accessible: narration for each step, keyboard nav

Output: Full TSX component with state machine logic, transition handlers. Include unit test.
Accept criteria: States render, transitions work, animations smooth, timers work, keyboard nav works.
"

# 5.2: Create walkthrough page
gemini cli --task "
CIVICFLOW TASK: Create walkthrough page (app/(demo)/walkthrough/page.tsx)

Create apps/web/src/app/(demo)/walkthrough/page.tsx that:
1. Embeds GuidedDemoOrchestrator
2. Shows full application UI in background (semi-transparent or blurred)
3. Overlay shows current step and guidance
4. Each step highlights relevant UI sections (spotlight effect)
5. Narrative text explains what's happening and why
6. Bottom shows progress: Step 1/7
7. Can manually advance or auto-play
8. Responsive (full-screen on desktop, adjusted on mobile)

Output: Full TSX page with overlay layout, spotlight CSS, progress indicator. Add comments.
Accept criteria: Page renders, orchestrator visible, spotlight works, progress shows, responsive.
"

# 5.3: Create Express curated workflow endpoint
gemini cli --task "
CIVICFLOW TASK: Create Express curated workflow endpoint

Add to src/routes/sbaDemo.ts:
1. GET /demo/workflow/curated returns 3–5 pre-configured demo applicants
2. Each applicant has: name, business, loan amount, documents, timeline, current stage
3. Applicants are at different stages to showcase full pipeline
4. Format: { applicants: [{ sessionId, name, businessName, loanAmount, stage, ... }] }
5. Respect demoMode=true flag
6. Return consistent data (same data on repeated calls)

Output: Full Express route handler with mock data. Include sample response in comments.
Accept criteria: Route works, returns data consistently, format matches frontend expectations.
"

# 5.4: Create demo-narrative.css
gemini cli --task "
CIVICFLOW TASK: Create demo-narrative.css stylesheet

Create apps/web/styles/demo-narrative.css that:
1. Defines animations for demo workflow transitions (fade, slide, spotlight)
2. Spotlight effect: CSS for highlighting UI sections (border, shadow, opacity)
3. Progress bar animation
4. Micro-interactions: button hover/active, state transitions
5. Uses design tokens (colors, durations, shadows)
6. Supports motion-reduce for accessibility

Output: Full CSS file with animations, keyframes, utility classes. Add comments.
Accept criteria: Animations smooth, spotlight works, uses tokens, respects motion-reduce.
"

# 5.5: Create demo data fixtures
gemini cli --task "
CIVICFLOW TASK: Create demo data fixtures (src/services/demoDataFixtures.ts)

Create src/services/demoDataFixtures.ts that:
1. Exports getCuratedApplicants(): ApplicantFixture[]
2. Fixture 1: Early stage (intake just started, docs uploaded)
3. Fixture 2: Mid stage (docs validated, risks flagged, review in progress)
4. Fixture 3: Final stage (underwritten, ready for approval)
5. Each has realistic data (EIN, address, financials, timeline events)
6. Data is consistent and believable (business age >2 yrs, revenue growth reasonable, etc)

Output: Full TypeScript file with interfaces and fixture data. Add JSDoc.
Accept criteria: Fixtures export correctly, data is consistent, types match backend.
"
```

---

## PHASE 6: Polish & Testing
**Duration**: 6–8 hours | **Blockers**: Phase 5 | **Dependencies**: Development environment

Run these tasks:

```bash
# 6.1: Capture visual regression baseline
gemini cli --task "
CIVICFLOW TASK: Run Puppeteer visual baseline capture

1. Ensure Puppeteer is installed: npm install (if not already)
2. Run npm run test:visual from repo root
3. Verify baseline image is created: tests/visual/baseline-demo-sba.png
4. Review baseline image for correctness (no broken layouts, all content visible)
5. Document baseline creation process in VISUAL_TESTING.md

Output: Baseline image captured, verification report. Document process.
Accept criteria: Baseline image exists, is valid (>100KB), shows full demo page.
"

# 6.2: Add component unit tests
gemini cli --task "
CIVICFLOW TASK: Add unit tests for intake, timeline, snapshot components

Create:
1. tests/components/Intake/StructuredIntake.test.tsx (edit fields, submit, errors)
2. tests/components/Timeline/ApplicantTimeline.test.tsx (render events, filter, expand)
3. tests/components/Underwriting/UnderwritingSnapshot.test.tsx (render data, responsive)

Each test: 3–5 test cases covering happy path + edge cases.
Use React Testing Library, test behavior not implementation.

Output: 3 test files, each with 3–5 test cases. Run npm test and verify all pass.
Accept criteria: Tests run and pass locally, >80% component coverage.
"

# 6.3: Run accessibility audit
gemini cli --task "
CIVICFLOW TASK: Run accessibility audit on demo pages

1. Install axe DevTools or use axe-core in tests
2. Test app/(demo)/page.tsx, app/(demo)/intake/page.tsx, app/(demo)/applicant/[id]/snapshot.tsx
3. Fix any WCAG AA violations (contrast, labels, keyboard nav)
4. Document accessibility findings in ACCESSIBILITY_AUDIT.md
5. Ensure all interactive elements are keyboard-operable

Output: Audit report, fixes applied, documented in markdown.
Accept criteria: Zero critical/serious violations, all pages keyboard-navigable.
"

# 6.4: Run Lighthouse performance audit
gemini cli --task "
CIVICFLOW TASK: Run Lighthouse performance audit

1. Run Lighthouse on http://localhost:3000/demo (or walkthrough page)
2. Aim for scores >90 across all categories
3. Identify any performance bottlenecks (large components, slow API calls)
4. Optimize if needed: code-split, lazy-load, memoize
5. Document performance findings in PERFORMANCE_AUDIT.md

Output: Lighthouse report, optimizations applied, documented.
Accept criteria: Performance scores >85, documented recommendations implemented.
"

# 6.5: Create demo e2e test
gemini cli --task "
CIVICFLOW TASK: Create demo end-to-end test

Create e2e/demo-walkthrough.spec.ts (using Playwright or Cypress) that:
1. Navigates to http://localhost:3000/demo/walkthrough
2. Steps through demo: start → intake → upload → validate → timeline → approve
3. Verifies UI updates at each step
4. Verifies data consistency (same applicant through all steps)
5. Measures time-to-complete and reports

Output: E2E test file that runs end-to-end. Run with npm run test:e2e.
Accept criteria: Test runs, all steps execute, no flakes.
"
```

---

## PHASE 7: Deployment & Handoff
**Duration**: 4–6 hours | **Blockers**: Phase 6 | **Dependencies**: Deployment infrastructure

Run these tasks:

```bash
# 7.1: Create apps/web/README.md
gemini cli --task "
CIVICFLOW TASK: Create apps/web/README.md

Create apps/web/README.md that documents:
1. What this app is (Next.js frontend for CivicFlow demo)
2. Quick start: npm install, npm run dev, http://localhost:3000
3. Building and deploying
4. Environment variables
5. Contributing guidelines
6. Troubleshooting common issues

Output: Markdown README with clear sections and examples.
Accept criteria: README is comprehensive, examples work, clear for new developers.
"

# 7.2: Update root README
gemini cli --task "
CIVICFLOW TASK: Update root README with Next.js integration

Update README.md to document:
1. This repo now includes Next.js frontend (apps/web) + Express backend
2. Dev setup: npm run dev runs both servers (API on 3001, web on 3000)
3. Build: npm run build
4. Testing: npm test (runs all tests)
5. Deployment: Docker builds both apps

Output: Updated root README with new sections on Next.js integration.
Accept criteria: README is clear, examples work, developers can get started in 5 min.
"

# 7.3: Create docs/DEMO_NARRATIVE.md
gemini cli --task "
CIVICFLOW TASK: Create DEMO_NARRATIVE.md

Create docs/DEMO_NARRATIVE.md that documents:
1. Demo walkthrough script (what happens at each step)
2. Timing: each step duration and auto-play intervals
3. Key talking points for each step
4. How to customize demo data (fixtures)
5. How to extend walkthrough with new steps

Output: Markdown guide for demo narrative. Include script examples.
Accept criteria: Guide is clear, can be followed step-by-step, extensible.
"

# 7.4: Verify full dev setup
gemini cli --task "
CIVICFLOW TASK: Verify full dev setup end-to-end

1. Clean clone repo
2. Run npm install (repo root)
3. Run npm install (apps/web)
4. Run npm run dev
5. Verify: Express API starts on port 3001
6. Verify: Next.js web starts on port 3000
7. Open http://localhost:3000 → demo landing shows
8. Click 'Start Demo' → navigates to intake
9. Upload a file → see progress → see result
10. Document any issues found

Output: Checklist confirming all steps work. Fix any issues.
Accept criteria: Full dev setup works, demo flow end-to-end, no errors.
"

# 7.5: Create Dockerfile.web for Next.js
gemini cli --task "
CIVICFLOW TASK: Create Dockerfile.web for Next.js app

Create Dockerfile.web that:
1. Multi-stage build: builder stage (npm install, next build) + runtime stage (node dist/)
2. Uses node:20-alpine base image
3. Non-root user for security
4. Health check (curl http://localhost:3000/health or similar)
5. Exposes port 3000
6. CMD: node server.js or next start

Optional: If separate web deployment desired. Main Dockerfile remains unchanged.

Output: Dockerfile.web ready for containerization.
Accept criteria: Builds without errors, image <500MB, starts correctly.
"
```

---

## QUICK REFERENCE: Running Tasks

### Option A: Run All Phase 1 (Fastest way to get web app running)
```bash
# From repo root
for task in 1.1 1.2 1.3 1.4 1.5; do
  gemini cli --task "CIVICFLOW Task $task"
  # ... (task command)
done
npm run dev  # Verify both servers start
```

### Option B: Run Specific Task
```bash
gemini cli --task "CIVICFLOW TASK: Create next.config.ts for API proxy rewriting..."
```

### Option C: Batch Run (all Phase 1 + 2)
```bash
gemini cli --batch "CIVICFLOW PHASE 1 and 2" --tasks "1.1,1.2,1.3,1.4,1.5,2.1,2.2,2.3,2.4,2.5"
```

---

## Success Criteria by Phase

| Phase | Must-Have | Nice-to-Have |
|-------|-----------|--------------|
| 1 | Next.js app + API proxy + demo badge + landing | Sidebar nav |
| 2 | Intake form + upload + validation polling | File preview |
| 3 | Timeline + team chat | Message pins, search |
| 4 | Snapshot card + eligibility + risk flags + quick actions | Comparisons, historical data |
| 5 | Guided walkthrough with auto-play | Multi-language, video intro |
| 6 | Unit tests + accessibility audit | E2E tests, performance >90 |
| 7 | README + verified dev setup | Separate Dockerfile.web, CD pipeline |

---

## Handoff Checklist

- [ ] Phase 1–2 complete and demo flow works end-to-end
- [ ] All components have unit tests (>80% coverage)
- [ ] No WCAG AA violations
- [ ] Performance audit passed (Lighthouse >85)
- [ ] Walkthrough demo recorded (video or GIF)
- [ ] README complete and tested
- [ ] All tasks documented and closed
- [ ] API proxying verified to work locally and in staging
- [ ] Visual regression baseline captured
- [ ] Demo mode clearly labeled in UI and docs

---

**Next Action**: Run Phase 1 Tasks 1.1–1.5 sequentially. Once complete, verify with `npm run dev` and test http://localhost:3000.
