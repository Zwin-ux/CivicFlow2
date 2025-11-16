---
inclusion: always
---

# Product Conventions

CivicFlow2: Government lending CRM for micro-business grants and loans with resilient demo mode fallback.

## Domain Model

**Core Entities**: Applications, Documents, Users, Reviews, Decisions, Notifications

**Application States**: Draft → Submitted → Under Review → Approved/Rejected → Funded

**User Roles**: Applicant, Reviewer, Approver, Admin, Investor (demo only)

## Critical: Resilience-First Architecture

**Golden Rule**: The application MUST NEVER crash. Demo mode activates automatically on infrastructure failure.

### Demo Mode Requirements (ALL New Features)

When adding features, ALWAYS implement demo mode support:

1. **Repositories**: Check `demoModeManager.isActive()` before database queries
2. **Mock Data**: Add realistic data to `services/demoDataService.ts` for new entities
3. **External APIs**: Gracefully degrade when Azure/OpenAI/Teams unavailable
4. **Error Handling**: Never throw unhandled errors that crash the server
5. **Testing**: Verify both real and demo code paths work

### Demo Mode Mechanics

- **Activation**: Automatic on DB/Redis failure OR `DEMO_MODE=true` env var
- **Isolation**: Session-based via `x-demo-session-id` header
- **Cleanup**: Background job expires old sessions
- **Detection**: Frontend shows indicator when `demoMode: true` in API responses

## API Conventions

### Response Format (MANDATORY)

ALL API responses MUST use `utils/responseWrapper.ts`:

```typescript
{
  success: boolean,
  data: any,
  demoMode: boolean,
  message?: string
}
```

### Error Handling

- Use custom error classes from `utils/errors.ts`
- Return appropriate HTTP status codes (400, 401, 403, 404, 500)
- Provide actionable messages (never expose internals)
- Centralized via `middleware/errorHandler.ts`

### AI Integration Pattern

AI features are OPTIONAL enhancements with fallbacks:

- Azure Document Intelligence down → return basic metadata
- OpenAI unavailable → skip insights, show manual options
- Wrap external calls with `utils/circuitBreaker.ts`
- Always provide manual override paths

## Frontend Conventions

### JavaScript Architecture

**Core Modules** (`public/js/`):
- `api-client.js` - ALL API calls go through this (handles demo mode, auth, errors)
- `demo/orchestrator.js` - Demo state management
- `demo/config-manager.js` - Feature flags
- `demo/walkthrough-engine.js` - Guided tours
- `components/*.js` - Reusable UI (demo-indicator, skeleton-loader)

**Rules**:
- NEVER call `fetch()` directly, always use `api-client.js`
- Use demo orchestrator for demo-specific features
- Show demo indicator badge when `demoMode: true`

### Styling Standards

**Required Stylesheets** (in order):
1. `css/professional-theme.css` - Brand colors/typography (ALWAYS first)
2. `css/responsive.css` - Mobile-first layouts
3. `css/touch-enhancements.css` - Touch interactions
4. `css/components/*.css` - Component styles

**Design Tokens**: Use CSS variables from `styles/tokens.css`

## Brand Identity (STRICT)

**Product Name**: CivicFlow2 (exact spelling, no spaces, no variations)

**Colors**:
- Primary Blue: `#2563eb`
- Primary Green: `#10b981`
- Neutral Gray: `#64748b`

**Logo**: `public/images/logo.svg` (blue/green gradient SVG)

**Tone**: Professional, trustworthy, efficient, accessible (government-appropriate)

## Implementation Patterns

### New API Endpoint Checklist

1. Route handler: `routes/{resource}.ts`
2. Business logic: `services/{domain}Service.ts`
3. Data access: `repositories/{entity}Repository.ts`
4. Types: `models/{entity}.ts`
5. Demo data: `services/demoDataService.ts`
6. Response wrapper: Use `utils/responseWrapper.ts`
7. Registration: Add to `app.ts`

### New External Integration Checklist

1. Client: `clients/{service}Client.ts`
2. Circuit breaker: Wrap with `utils/circuitBreaker.ts`
3. Config: Add to `config/index.ts`
4. Env vars: Add to `.env.example`
5. Fallback: Implement graceful degradation
6. Docs: Document in `docs/`

### New Background Job Checklist

1. Service: `services/{job}Job.ts`
2. Scheduler: Use `node-cron`
3. Startup: Initialize in `index.ts`
4. Shutdown: Add graceful cleanup

### Frontend API Integration Checklist

1. Method: Add to `public/js/api-client.js`
2. Demo handling: Automatic via api-client
3. Demo features: Use orchestrator
4. Indicator: Show badge when in demo mode

## Code Style

### Naming Conventions

- **Product Name**: CivicFlow2 (exact, always)
- **Files**: camelCase.ts
- **Classes**: PascalCase
- **Functions/Variables**: camelCase
- **Constants**: UPPER_SNAKE_CASE

### TypeScript Patterns

- Prefer explicit types over `any`
- Use async/await over raw promises
- Interface for object shapes
- Strict mode enabled

## Quick Reference

| Purpose | Location |
|---------|----------|
| Demo data | `services/demoDataService.ts`, `demoDataGenerator.ts` |
| API responses | `utils/responseWrapper.ts` |
| Frontend API | `public/js/api-client.js` |
| Demo features | `public/js/demo/orchestrator.js`, `config-manager.js` |
| External services | `clients/` (with circuit breakers) |
| Background jobs | `services/*Job.ts` (init in `index.ts`) |

## Environment Variables

**Required**: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `ENCRYPTION_KEY`

**Optional AI**: `AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT`, `AZURE_DOCUMENT_INTELLIGENCE_KEY`, `OPENAI_API_KEY`

**Optional Teams**: `TEAMS_WEBHOOK_URL`, `MICROSOFT_GRAPH_CLIENT_ID`, `MICROSOFT_GRAPH_CLIENT_SECRET`

**Demo Override**: `DEMO_MODE=true`
