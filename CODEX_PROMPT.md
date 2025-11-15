# CivicFlow2 — Comprehensive Product Development Codex

**Version**: 1.0  
**Last Updated**: November 15, 2025  
**Purpose**: Universal reference guide for AI agents and developers improving the CivicFlow institutional lending platform.

---

## 1. Product Vision & Positioning

### Core Mission
CivicFlow is an **institutional lending platform** that simplifies SBA 504 and 5(a) loan workflows for financial institutions. The platform accelerates time-to-decision by automating applicant intake, document validation, risk assessment, and team collaboration—enabling lenders to move from application to approval in days, not weeks.

### Key Differentiator: Demo-First Architecture
Unlike traditional SaaS platforms, CivicFlow was built with a **production-ready demo mode** at its core. This means:
- The system runs flawlessly without external dependencies (DB/Redis failures fall back to in-memory mocks)
- Non-technical stakeholders can immediately experience the full workflow
- Demo data is deterministic and reproducible (seed-based)
- No spinup time, no configuration barriers—it just works

### Target Users
1. **Loan Officers**: Need fast intake and document routing
2. **Underwriters**: Need risk flags, eligibility checks, confidence scores
3. **Operations Managers**: Need team collaboration, timeline tracking, audit trail
4. **C-Level Decision Makers**: Need to see demo before committing to license

---

## 2. Architecture Overview

### High-Level Structure
```
┌─────────────────────────────────────────────────────────┐
│  Frontend: Next.js 16 (App Router) on port 3000        │
│  - React 19, TypeScript strict, Tailwind v4, Radix UI   │
│  - Server Actions for API calls to Express backend      │
│  - Design tokens (CSS vars) for institutional aesthetic │
└──────────────┬──────────────────────────────────────────┘
               │ API proxy: /api/* → http://localhost:3001
               ↓
┌─────────────────────────────────────────────────────────┐
│  Backend: Express.js on port 3001                       │
│  - TypeScript, PostgreSQL (Prisma ORM)                  │
│  - Redis for session/cache (best-effort fallback)       │
│  - Core services: Demo, Auth, Lending, Collaboration    │
│  - Routes: /api/v1/{auth,sba-demo,timeline,underwriting}
└──────────────┬──────────────────────────────────────────┘
               │
    ┌──────────┴────────────┐
    ↓                       ↓
  PostgreSQL            Redis
  (Prisma)          (best-effort)
```

### Core Layers

**Frontend** (`apps/web/`):
- **Pages**: `/` (home), `/demo` (hero), `/intake` (4-step workflow)
- **Components**: 
  - `Intake/StructuredIntake.tsx` — Form with confidence badges
  - `Document/DocumentUpload.tsx` — Drag-drop with real-time polling
  - `Common/Layout.tsx` — Header/nav/footer
  - `Demo/DemoModeBadge.tsx` — Global demo indicator
- **Server Actions** (`app/actions/`):
  - `intake.ts` — Call `/api/v1/sba-demo/start`, return session + fields
  - `documents.ts` — Upload & poll validation results
- **Styling**: 
  - `styles/tokens.css` — Design system (colors, spacing, motion, typography)
  - `globals.css` — Base styles + token imports
  - Tailwind v4 for utilities

**Backend** (`src/`):
- **Services**:
  - `sbaDemoService.ts` (1534 lines) — Core OctoDoc SBA demo service
  - `demoModeManager.ts` — Manages demo/offline mode
  - `demoDataService.ts` — Generates mock data with seeds
- **Routes**:
  - `/api/v1/sba-demo` — Demo intake, upload, job status, documents
  - `/api/v1/auth` — Authentication (demo-aware)
  - `/api/v1/timeline` — Collaboration timeline (stub)
  - `/api/v1/underwriting` — Risk assessment (stub)
- **Middleware**: Request ID, logging, demo-mode detection, rate limiters
- **Config**: `src/config/` — Database, Redis, environment wrappers

---

## 3. Development Patterns & Conventions

### Naming Conventions
- **Components**: PascalCase (e.g., `StructuredIntake`, `DocumentUpload`)
- **Functions**: camelCase (e.g., `startIntakeSession`, `pollJobStatus`)
- **Files**: kebab-case for utilities, PascalCase for components
  - ✅ `src/utils/logger.ts`, `src/components/Intake/StructuredIntake.tsx`
  - ❌ Don't use MixedCase for files
- **Routes**: kebab-case with version prefix
  - ✅ `/api/v1/sba-demo/start`, `/api/v1/underwriting/eligibility`
  - ❌ Don't nest versions in routes; use config constant `config.apiVersion`

### React Component Patterns

**Use Server Actions for API calls:**
```typescript
// ✅ Good: Server action file (app/actions/myAction.ts)
'use server';
export async function myServerAction(data: InputType): Promise<OutputType> {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const response = await fetch(`${apiBase}/api/v1/endpoint`, { ... });
  return response.json();
}

// ✅ Client component calls it:
'use client';
const result = await myServerAction(input);
```

**Style with CSS tokens, not inline styles (prefer utility classes):**
```typescript
// ✅ Good: Use CSS vars from tokens.css
<div style={{ color: 'var(--cc-text)', fontSize: 'var(--text-sm)' }}>

// ✅ Also good: Tailwind utilities
<div className="text-sm text-gray-900">

// ❌ Avoid: Magic hex values
<div style={{ color: '#1a1a1a', fontSize: '14px' }}>
```

**Handle async operations optimistically:**
```typescript
// ✅ Good: Show change immediately, reconcile when server responds
const [isLoading, setIsLoading] = useState(false);
const handleAction = async () => {
  setIsLoading(true);
  try {
    const result = await serverAction();
    setData(result);
  } catch (err) {
    // Rollback or show error
  } finally {
    setIsLoading(false);
  }
};
```

**Make components accessible:**
```typescript
// ✅ Good: ARIA labels, semantic HTML, keyboard navigation
<button
  onClick={handleClick}
  aria-label="Upload documents"
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') handleClick();
  }}
>
  Upload

// ✅ Progress bar with ARIA
<div
  role="progressbar"
  aria-valuenow={progress}
  aria-valuemin={0}
  aria-valuemax={100}
/>
```

### Express Route Patterns

**Create new routes in `src/routes/`, mount in `src/app.ts`:**
```typescript
// ✅ src/routes/myFeature.ts
import express from 'express';
const router = express.Router();

router.post('/create', (req, res) => {
  try {
    // Implementation
    res.status(201).json({ /* response */ });
  } catch (err) {
    logger.error('Failed to create', { error: err });
    res.status(500).json({ error: { code: 'CREATE_FAILED', message: '...' } });
  }
});

export default router;

// ✅ src/app.ts: Mount it
import myFeatureRoutes from './routes/myFeature';
app.use(`/api/${config.apiVersion}/my-feature`, myFeatureRoutes);
```

**Use consistent error response format:**
```typescript
// ✅ Good: Structured error responses
res.status(400).json({
  error: {
    code: 'VALIDATION_FAILED',
    message: 'Field X is required',
    details: { field: 'email', reason: 'invalid format' }
  }
});

// ❌ Avoid: Unstructured errors
res.status(400).json({ message: 'something went wrong' });
```

**Demo-mode aware routes must respect demo flag:**
```typescript
// ✅ Good: Use demoModeManager to check
if (demoModeManager.isDemoMode()) {
  // Use in-memory service
  const result = sbaDemoService.startSession(...);
} else {
  // Use database
  const result = await database.startSession(...);
}
```

### Testing Patterns

**Unit tests for business logic:**
```typescript
// ✅ Good: Jest + ts-jest
describe('StructuredIntake', () => {
  it('should show confidence badge for high-confidence fields', () => {
    render(<ConfidenceBadge confidence={0.95} />);
    expect(screen.getByText('95% confident')).toBeInTheDocument();
  });
});
```

**Run tests:** `npm test`

**Visual regression baseline** (optional with Puppeteer):
```bash
npm run verify:ai  # Quick AI service check script
```

---

## 4. Design System & Brand

### Color Palette
Defined in `apps/web/styles/tokens.css`:
- **Accent**: `--cc-accent` (#2563eb) — Primary CTAs, highlights
- **Success**: `--cc-success` (#10b981) — Positive states, confidence
- **Warning**: `--cc-warning` (#f59e0b) — Medium confidence, alerts
- **Error**: `--cc-error` (#ef4444) — Errors, low confidence
- **Background**: `--cc-bg-primary`, `--cc-bg-secondary` — Light institutional look
- **Text**: `--cc-text`, `--cc-text-secondary`, `--cc-muted` — Hierarchy

### Spacing Scale
All spacing uses `--s-{N}` variables (8px base):
- `--s-1` = 8px, `--s-2` = 16px, `--s-4` = 32px, etc.
- Use consistently across layouts

### Typography
- **Headlines**: `--text-2xl` (24px), `--text-xl` (20px), `--text-lg` (18px)
- **Body**: `--text-sm` (14px), `--text-xs` (12px)
- **Font**: System fonts via `--font-sans`

### Motion
- `--dur-micro` = 150ms (button hover, small interactions)
- `--dur-gentle` = 300ms (card transitions, smooth fades)
- `--dur-progress` = 500ms (loading animations)

### Institutional Aesthetic
- Clean lines, generous whitespace
- High contrast text (WCAG AA compliant)
- Confidence badges instead of trust badges
- Progress indicators for clarity
- Monospace code in session IDs (builds credibility)

---

## 5. Core Workflows & Data Models

### Intake Flow
**User Path**: Home → Demo → Intake Form → Upload → Results

**Data Model:**
```typescript
interface IntakeSession {
  sessionId: string;
  loanType: '504' | '5a';
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
  status: 'started' | 'intake_complete' | 'documents_uploaded' | 'validated' | 'approved' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

interface Document {
  id: string;
  sessionId: string;
  filename: string;
  mimeType: string;
  size: number;
  jobId: string;
  stage: 'ingest' | 'threat_scan' | 'ocr' | 'policy' | 'ai_review' | 'complete';
  extractedFields: Record<string, any>;
  confidence: number;
  uploadedAt: Date;
}

interface Job {
  jobId: string;
  documentId: string;
  type: 'validate' | 'extract';
  stage: string;
  status: 'pending' | 'processing' | 'complete' | 'failed';
  progress: number;
  result?: Record<string, any>;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}
```

**API Endpoints:**
- `POST /api/v1/sba-demo/start` — Create session + return initial extracted fields
- `POST /api/v1/sba-demo/upload` — Upload document, return jobId
- `GET /api/v1/sba-demo/status/:jobId` — Poll job status
- `GET /api/v1/sba-demo/documents/:sessionId` — List documents for session
- `POST /api/v1/sba-demo/validate/:documentId` — Re-validate document

### Document Validation Pipeline
**OctoDoc Demo Service** stages each document through:
1. **Ingest**: File parsing, normalization
2. **Threat Scan**: Security/malware check
3. **OCR**: Text extraction from images/PDFs
4. **Policy**: Compliance check (financial docs, tax returns, etc.)
5. **AI Review**: Field extraction + confidence scoring

Each stage updates job status; frontend polls every 500ms.

### Confidence Scores
Fields extracted from documents show confidence (0–100%):
- **≥80%**: Green badge, auto-accepted
- **70–79%**: Amber badge, "Please verify"
- **<70%**: Red badge, requires manual review

Users can edit any field; override triggers re-validation.

---

## 6. Demo Mode: The Heart of CivicFlow

### Why Demo Mode Matters
CivicFlow's killer feature is that **it works without a database or Redis**. This enables:
- Instant onboarding (no DevOps setup)
- Showcasing to non-technical stakeholders
- Deterministic testing (seed-based data)
- Offline resilience (if DB/Redis fail, system continues)

### How It Works

**Detection** (`src/services/demoModeManager.ts`):
- Checks `DEMO_MODE=true` env var
- Checks if PostgreSQL/Redis are unreachable
- If either is true, system enters demo mode (logged as banner)

**Services** (`src/config/database.ts`, `src/config/redis.ts`):
- Database: Falls back to in-memory array
- Redis: Falls back to in-memory Map
- Same interface as real DB/Redis, so routes don't know the difference

**Demo Data** (`src/services/demoDataService.ts`):
- `sbaDemoService` provides mock SBA 504/5a data
- Seeded with applicant name/EIN for reproducibility
- Generates realistic documents, extracted fields, confidence scores

**API Headers** (all responses):
- `X-Demo-Mode: true` (if active)
- `X-Demo-Mode-Message: "Running in demonstration mode"`

### Adding Features to Demo Mode
When you add a new route or feature:
1. Check if it needs demo support (usually yes)
2. Use `demoModeManager.isDemoMode()` to branch logic
3. Implement mock behavior in a demo service
4. Test with `DEMO_MODE=true npm start` (no DB required)

**Example:**
```typescript
if (demoModeManager.isDemoMode()) {
  // Use sbaDemoService or other demo service
  const result = sbaDemoService.getDocuments(sessionId);
} else {
  // Use Prisma/database
  const result = await db.documents.findMany({ where: { sessionId } });
}
```

---

## 7. Frontend Development Guide

### File Structure
```
apps/web/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── actions/              # Server actions (API calls)
│   │   │   ├── intake.ts
│   │   │   └── documents.ts
│   │   ├── demo/                 # Demo landing page
│   │   │   └── page.tsx
│   │   ├── intake/               # Intake flow orchestration
│   │   │   └── page.tsx
│   │   ├── layout.tsx            # Root layout (DemoModeBadge, CommonLayout)
│   │   ├── page.tsx              # Home page
│   │   └── globals.css           # Import tokens.css + base styles
│   ├── components/
│   │   ├── Common/               # Layout, headers, footers
│   │   │   └── Layout.tsx
│   │   ├── Demo/
│   │   │   └── DemoModeBadge.tsx
│   │   ├── Intake/
│   │   │   └── StructuredIntake.tsx
│   │   └── Document/
│   │       └── DocumentUpload.tsx
│   ├── styles/
│   │   └── tokens.css            # Design system (colors, spacing, motion)
│   └── types/                    # TypeScript interfaces
├── next.config.ts                # API proxy rewrite
├── .env.local                    # NEXT_PUBLIC_API_URL
├── tsconfig.json                 # TypeScript strict mode
└── tailwind.config.ts            # Tailwind v4 config
```

### Running Locally
```bash
cd C:\Users\mzwin\CivicFlow2

# Install all dependencies
npm install

# Run dev server (Express on 3001 + Next.js on 3000 concurrently)
npm run dev

# Or run separately:
npm run dev:api      # Just Express on 3001
npm run dev:web      # Just Next.js on 3000

# Build for production
npm run build

# Test
npm test

# Run with demo mode (no DB required)
DEMO_MODE=true npm start
```

### Adding a New Page

**1. Create the page:**
```typescript
// apps/web/src/app/mypage/page.tsx
'use client';

export default function MyPage() {
  return <div>My content</div>;
}
```

**2. Add to navigation** (if needed):
```typescript
// apps/web/src/components/Common/Layout.tsx
<nav>
  <Link href="/mypage">My Page</Link>
</nav>
```

**3. Test:**
```bash
npm run dev
# Visit http://localhost:3000/mypage
```

### Adding a New Component

**1. Create with TypeScript + React best practices:**
```typescript
// apps/web/src/components/MyComponent/MyComponent.tsx
'use client';

interface MyComponentProps {
  title: string;
  onAction?: () => void;
}

export default function MyComponent({ title, onAction }: MyComponentProps) {
  return (
    <div style={{ color: 'var(--cc-text)' }}>
      {title}
      <button onClick={onAction}>Click me</button>
    </div>
  );
}
```

**2. Import and use:**
```typescript
import MyComponent from '@/components/MyComponent/MyComponent';

export default function MyPage() {
  return <MyComponent title="Hello" onAction={() => console.log('clicked')} />;
}
```

### Styling Best Practices

**Use design tokens (CSS vars):**
```typescript
// ✅ Good
<div style={{
  color: 'var(--cc-text)',
  fontSize: 'var(--text-sm)',
  padding: 'var(--s-4)',
  transition: `background-color var(--dur-micro) ease`,
}}>

// ✅ Also good: Tailwind utilities
<div className="text-sm text-gray-900 p-4">

// ❌ Avoid: Magic values
<div style={{ color: '#1a1a1a', fontSize: '14px', padding: '16px' }}>
```

**Responsive design with Tailwind:**
```typescript
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Stacks on mobile, 2 cols on tablet, 3 cols on desktop */}
</div>
```

---

## 8. Backend Development Guide

### File Structure
```
src/
├── index.ts                 # Entry point (startup, migrations, graceful shutdown)
├── app.ts                   # Express app wiring (middleware, routes, static files)
├── actions/                 # Background jobs (optional)
├── clients/                 # External service clients (Azure Form Recognizer, etc.)
├── config/
│   ├── index.ts            # Main config (environment variables)
│   ├── database.ts         # Prisma + demo fallback
│   └── redis.ts            # Redis client + demo fallback
├── database/               # Prisma schema + migrations
│   ├── schema.prisma
│   └── migrations/
├── middleware/
│   ├── requestId.ts
│   ├── requestLogger.ts
│   ├── demoMode.ts
│   └── rateLimiters.ts
├── models/                 # Data models (TypeScript types)
├── repositories/           # Data access layer (Prisma wrappers)
├── routes/
│   ├── auth.ts
│   ├── sbaDemo.ts          # Core demo routes
│   ├── timeline.ts
│   ├── underwriting.ts
│   └── swagger.ts          # API docs
├── scripts/
│   ├── verify-ai-services.ts
│   ├── seed.ts
│   └── migrate.ts
├── services/
│   ├── sbaDemoService.ts   # Core OctoDoc SBA service (1534 lines)
│   ├── demoModeManager.ts  # Demo/offline mode detection
│   ├── demoDataService.ts  # Mock data generation
│   └── authService.ts      # Authentication
├── types/                  # Shared TypeScript types
└── utils/
    ├── logger.ts           # Central logging
    └── helpers.ts
```

### Creating a New Service

**1. Design the interface:**
```typescript
// src/services/myService.ts
interface MyServiceInterface {
  initialize(): Promise<void>;
  terminate(): Promise<void>;
  doSomething(input: string): Promise<Result>;
}

class MyService implements MyServiceInterface {
  async initialize() {
    logger.info('MyService initialized');
  }

  async terminate() {
    logger.info('MyService terminated');
  }

  async doSomething(input: string): Promise<Result> {
    // Implementation
  }
}

const instance = new MyService();
export default instance;
```

**2. Register with startup:**
```typescript
// src/index.ts
import myService from './services/myService';

const services = [myService, /* other services */];

async function startupScript() {
  for (const service of services) {
    await service.initialize();
  }
}

process.on('SIGTERM', async () => {
  for (const service of services.reverse()) {
    await service.terminate();
  }
  process.exit(0);
});
```

### Creating a New Route

**1. Create the router:**
```typescript
// src/routes/myFeature.ts
import express, { Request, Response } from 'express';
import logger from '../utils/logger';

const router = express.Router();

router.post('/create', async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: { code: 'MISSING_FIELD', message: 'name required' } });

    // Business logic
    const result = { id: '123', name };

    res.status(201).json(result);
  } catch (error: any) {
    logger.error('Failed to create', { error: error.message });
    res.status(500).json({ error: { code: 'CREATE_FAILED', message: 'Failed to create' } });
  }
});

export default router;
```

**2. Mount in app.ts:**
```typescript
// src/app.ts
import myFeatureRoutes from './routes/myFeature';
app.use(`/api/${config.apiVersion}/my-feature`, myFeatureRoutes);
```

**3. Test:**
```bash
npm run dev
# POST http://localhost:3001/api/v1/my-feature/create
```

### Database Migrations

**Generate migration after schema change:**
```bash
npm run prisma:migrate

# Review migration file, then apply:
npm run migrate:up
```

**Reset database (dev only):**
```bash
npm run prisma:reset
```

---

## 9. Testing Strategy

### Unit Tests (Frontend)
```typescript
// apps/web/src/components/__tests__/MyComponent.test.tsx
import { render, screen } from '@testing-library/react';
import MyComponent from '../MyComponent';

describe('MyComponent', () => {
  it('renders with title', () => {
    render(<MyComponent title="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
```

**Run tests:**
```bash
npm test

# Watch mode:
npm test -- --watch

# Coverage:
npm test -- --coverage
```

### E2E Tests (Optional)
```typescript
// e2e/intake.spec.ts (Playwright/Cypress)
test('full intake flow', async ({ page }) => {
  await page.goto('http://localhost:3000/intake');
  await page.fill('input[name="ein"]', '12-3456789');
  await page.click('button:has-text("Start Intake")');
  await expect(page).toHaveURL('**/intake?step=upload');
});
```

### Manual Testing Checklist
- [ ] Intake form works with demo data
- [ ] Document upload and polling completes in <5 seconds
- [ ] Confidence badges show correct colors
- [ ] Demo mode banner appears when DB unavailable
- [ ] Responsive design works on mobile/tablet/desktop
- [ ] Keyboard navigation works (Tab, Enter, Escape)
- [ ] Screen reader announces all regions (ARIA labels)
- [ ] Error messages are clear and actionable

---

## 10. Deployment & DevOps

### Local Development
```bash
# With PostgreSQL + Redis running
npm run dev

# Without DB (demo mode)
DEMO_MODE=true npm run dev
```

### Docker Build
```bash
# Multi-stage build (includes Express + Next.js artifacts)
docker build -t civicflow:latest .

# Run container
docker run -p 3000:3000 -p 3001:3001 -e DEMO_MODE=true civicflow:latest
```

### Key Environment Variables
```bash
# Core
NODE_ENV=production
PORT=3001
NEXT_PUBLIC_API_URL=http://api.example.com

# Database
DATABASE_URL=postgresql://user:pass@localhost/civicflow

# Redis
REDIS_URL=redis://localhost:6379

# Demo mode
DEMO_MODE=false  # Set to true for offline operation

# External services
AZURE_FORM_RECOGNIZER_ENDPOINT=...
MICROSOFT_GRAPH_CLIENT_ID=...
SENDGRID_API_KEY=...
OPENAI_API_KEY=...
```

### Kubernetes Deployment
See `k8s/` folder for ConfigMaps, Deployments, Services, Ingress configs.

### CI/CD
- **Lint**: `npm run lint` (TypeScript, ESLint)
- **Test**: `npm test` (Jest)
- **Build**: `npm run build` (TypeScript + Next.js)
- **Docker**: Multi-stage build to keep image <500MB

---

## 11. Common Tasks & Recipes

### Task: Add a New Intake Field
1. **Update TypeScript interface** in `src/services/sbaDemoService.ts`
2. **Add FormField** to `StructuredIntake.tsx`
3. **Update confidence score** mapping in `app/actions/intake.ts`
4. **Test** with `npm run dev`

### Task: Improve Confidence Scoring
1. Inspect `sbaDemoService.extractedFields` response
2. Adjust seed-based confidence percentages
3. Update color thresholds in `ConfidenceBadge.tsx`
4. Run build to verify: `npm run build`

### Task: Add Demo Navigation
1. Update `CommonLayout.tsx` navigation links
2. Add corresponding page in `app/`
3. Link from demo landing page
4. Test responsive design on mobile

### Task: Extend Demo Mode
1. Create new demo service (e.g., `demoUnderwritingService.ts`)
2. Implement mock data generation
3. Branch routes to use demo service when `demoModeManager.isDemoMode()`
4. Test with `DEMO_MODE=true npm run dev`

### Task: Debug API Calls
1. Check `npm run dev` output (Express logs)
2. Open browser DevTools → Network tab
3. Inspect `/api/v1/...` requests
4. Check response status + body
5. Look at server logs for any errors

### Task: Style a Component
1. Use CSS vars from `styles/tokens.css`
2. Prefer `var(--cc-accent)` over magic hex values
3. Use Tailwind utilities for responsive design
4. Test on mobile: DevTools → Toggle Device Toolbar
5. Run accessibility audit: axe DevTools extension

---

## 12. Troubleshooting

### "npm run dev fails with exit code 1"
**Cause**: Usually missing dependencies or TypeScript error
**Fix**:
```bash
npm install
npm run build  # Check for TS errors
npm run dev
```

### "API calls return 404 or CORS error"
**Cause**: Express not running or API proxy misconfigured
**Fix**:
1. Check `npm run dev` shows "Express listening on port 3001"
2. Verify `next.config.ts` has rewrite: `/api/* → http://localhost:3001/api/*`
3. Verify `NEXT_PUBLIC_API_URL=http://localhost:3001` in `.env.local`
4. Check Network tab in DevTools to see actual request URL

### "Document upload never completes"
**Cause**: Job polling timeout or backend error
**Fix**:
1. Check server logs for `/api/v1/sba-demo/upload` errors
2. Verify file size <25MB
3. Check `pollJobStatus` in `app/actions/documents.ts` (max 30s timeout)
4. Try uploading a smaller test file

### "Demo mode not activating"
**Cause**: `DEMO_MODE` env var not set correctly
**Fix**:
```bash
# Windows PowerShell
$env:DEMO_MODE='true'; npm run dev

# Or set in .env.local:
DEMO_MODE=true
NODE_ENV=development
```

### "Design tokens not applying"
**Cause**: Missing import or CSS variable typo
**Fix**:
1. Check `globals.css` imports `tokens.css`
2. Verify component uses `var(--cc-accent)` not `--cc-acccent`
3. Rebuild: `npm run build`
4. Clear browser cache (DevTools → Settings → Clear cache)

---

## 13. Performance & Optimization

### Frontend Optimization
- **Code splitting**: Next.js App Router automatically splits by route
- **Image optimization**: Use `next/image` for responsive images
- **Lazy loading**: Components loaded on-demand via dynamic imports
- **Bundling**: Turbopack (Next.js 16) for fast builds

**Lighthouse targets**: >85 on all audits

### Backend Optimization
- **Query optimization**: Use Prisma `select()` to avoid fetching unused fields
- **Caching**: Redis (best-effort) for session data, file uploads
- **Rate limiting**: Configured for demo, intake, AI endpoints
- **Compression**: gzip enabled for all responses

**Metrics to monitor**:
- API response time: Target <100ms for demo routes, <500ms for processing
- Document processing: Target <5 seconds for typical files
- Build time: Target <10 seconds for Next.js build

---

## 14. Brand & Communication

### Tone
- **Professional**: Institutional lending context
- **Clear**: Jargon explained, confidence/risk language
- **Empowering**: "Let's get your loan approved quickly"
- **Data-driven**: Show confidence scores, validation stages

### Copy Guidelines
- **Headlines**: Action-oriented ("Start Application", "Upload Documents")
- **Descriptions**: Show value ("Fast intake, clear validation, confident decisions")
- **Error messages**: Specific, actionable ("EIN format invalid. Example: 12-3456789")
- **Demo disclaimer**: Always visible: "This is a demonstration environment. Data is simulated."

### Visual Language
- Institutional color palette (blue accent, green success, red errors)
- Generous whitespace (not cluttered)
- Progress indicators for transparency
- Confidence badges instead of stars/ratings

---

## 15. Future Roadmap & Extensibility

### Phase 3: Timeline & Collaboration (Next)
- `ApplicantTimeline` component
- `TeamChat` component
- `/api/v1/timeline` endpoints
- Multi-user session support

### Phase 4: Underwriting & Risk
- `UnderwritingSnapshot` component
- `EligibilityChecklist` component
- `RiskFlags` component
- `/api/v1/underwriting` endpoints

### Phase 5: Demo Narrative
- `GuidedDemoOrchestrator` (state machine)
- Animated walkthrough
- Curated demo data fixtures
- Spotlight effects

### Phase 6: Polish & Testing
- Unit tests (React Testing Library)
- E2E tests (Playwright/Cypress)
- Accessibility audit (axe, WAVE)
- Performance baseline (Lighthouse)

### Phase 7: Deployment & Handoff
- Production deployment guide
- Team onboarding docs
- Monitoring/alerting setup
- Optional: Separate Dockerfile.web for microservices

---

## 16. Quick Reference: Key Files

| File | Purpose | When to Edit |
|------|---------|--------------|
| `src/index.ts` | Startup sequence | Adding services, migrations |
| `src/app.ts` | Middleware + routes | Adding route handlers, rate limiters |
| `apps/web/src/app/layout.tsx` | Root layout | Global header/footer changes |
| `apps/web/styles/tokens.css` | Design system | Changing colors, spacing, motion |
| `src/services/sbaDemoService.ts` | Demo data | Changing mock responses, seeds |
| `src/config/index.ts` | Environment config | Adding env variables |
| `src/routes/sbaDemo.ts` | Demo API routes | Adding new intake endpoints |
| `apps/web/src/components/Intake/StructuredIntake.tsx` | Intake form | Adding/removing fields |
| `apps/web/src/app/intake/page.tsx` | Intake orchestration | Changing workflow steps |

---

## 17. Contact & Support

**Questions about this codex?** Update the relevant section above and re-commit.

**Found a bug?** Create an issue with:
1. Steps to reproduce
2. Expected vs. actual behavior
3. Environment (Node version, OS, Node modules version)
4. Screenshot/error message

**Want to contribute?** Follow the patterns in this codex, run `npm run build` to verify, and submit a PR with a clear description.

---

**Last Updated**: November 15, 2025  
**Next Review**: When Phase 3 or Phase 4 work begins
