# PROJECT MANAGER SUMMARY — CivicFlow Institutional Overhaul
**Date**: November 15, 2025  
**Project**: CivicFlow Institutional Lending Platform  
**Current Status**: Foundation scaffolding complete; ready for Phase 1 component implementation  
**Next 30 days**: Demo mode fully functional with guided narrative  

---

## EXECUTIVE SUMMARY

CivicFlow is pivoting from "startup toy" to "institutional infrastructure." Demo mode will be the flagship feature — a 60-second walkthrough showcasing the complete lending workflow: intake → validate → classify → route → collaborate → close.

**What's Done**:
- ✅ Express backend is robust (demo service, routes, error handling, logging, deployment-ready)
- ✅ Next.js frontend bootstrap (apps/web, React 19, Tailwind v4, Radix UI, design tokens)
- ✅ Design tokens and institutional aesthetic defined
- ✅ Docker build process fixed and validated
- ✅ Dev scripts set up (npm run dev runs API + web concurrently)

**What's Next**:
- 🔄 Complete Next.js scaffolding (next.config.ts, Layout, DemoModeBadge, landing page)
- 🔄 Build core intake flow (forms, file upload, validation, optimistic UI)
- 🔄 Add workflow timeline and team chat
- 🔄 Build underwriting snapshot with risk flags
- 🔄 Create guided demo narrative (animated walkthrough)
- 🔄 Polish and test (accessibility, performance, visual regression)

---

## TIMELINE & MILESTONES

### Week 1 (Nov 18–22): Foundation & Intake
- **Mon–Tue**: Phase 1 (next.config, layout, demo badge, landing) — 4–6h
- **Wed–Thu**: Phase 2 (intake form, upload, validation) — 6–8h
- **Fri**: Integration testing, bug fixes — 4h
- **Milestone**: Demo flow works end-to-end (upload file → see result)

### Week 2 (Nov 25–29): Timeline & Underwriting
- **Mon–Wed**: Phase 3 (timeline, team chat) — 8–10h
- **Thu–Fri**: Phase 4 (snapshot, risk flags, quick actions) — 8–10h
- **Milestone**: Full application review interface functional

### Week 3 (Dec 2–6): Narrative & Polish
- **Mon–Tue**: Phase 5 (guided walkthrough, orchestration) — 10–12h
- **Wed–Thu**: Phase 6 (tests, accessibility, performance) — 6–8h
- **Fri**: Phase 7 (docs, handoff, verification) — 4–6h
- **Milestone**: Walkthrough demo complete and polished

### Week 4 (Dec 9–13): Hardening & Deployment
- **Mon–Wed**: Bug fixes, stakeholder feedback incorporation, edge cases — 8–12h
- **Thu–Fri**: Deploy to staging, final verification — 4–6h
- **Milestone**: Demo live and ready for stakeholder walkthrough

---

## RESOURCE ALLOCATION

| Role | Effort | Notes |
|------|--------|-------|
| Gemini CLI (scaffolding & components) | 40–50h | Runs 36 tasks across 7 phases |
| Manual testing & review | 8–10h | Accessibility, performance, e2e |
| Bug fixes & polish | 4–6h | Post-phase feedback |
| Docs & handoff | 2–3h | README, guides, recorded demo |
| **Total** | **54–69h** | ~2 weeks of full-time work |

---

## RISK REGISTER

| Risk | Mitigation | Owner |
|------|------------|-------|
| Next.js app slow to build with dev deps | Use PUPPETEER_SKIP_CHROMIUM_DOWNLOAD; lazy-load tests | Gemini CLI |
| API response times affect demo feel | Mock data for walkthrough; <200ms response target | Express backend |
| Demo data becomes unconvincing | Refresh fixtures quarterly; test walkthrough before each release | QA |
| Accessibility regressions | axe audit in every phase; manual testing | QA |
| Demo mode leaks into production | Strict demoMode flag validation in Express; code review | DevOps |

---

## SUCCESS CRITERIA

By end of Week 3, demo mode will:
- ✅ Be accessible via http://localhost:3000/demo/walkthrough
- ✅ Tell a 60-second story: intake → validate → review → approve
- ✅ Have zero WCAG AA violations
- ✅ Perform >85 on Lighthouse audit
- ✅ Be fully keyboard-navigable
- ✅ Work on desktop and mobile
- ✅ Be backed by comprehensive unit and e2e tests
- ✅ Have clear documentation for developers

---

## STAKEHOLDER COMMUNICATION

### What to Expect
- **Week 1 (end)**: "Here's the intake flow — upload a file and see validation happen instantly"
- **Week 2 (end)**: "Here's the full review interface — see timeline, chat with team, review risks"
- **Week 3 (end)**: "Here's the guided walkthrough — watch a complete workflow in 60 seconds"
- **Week 4 (end)**: "Demo is live and polished — ready for customer demos and investor pitches"

### Demo Talking Points
1. **Speed**: From upload to validation in <2 seconds (optimistic UI)
2. **Clarity**: Every field shows confidence; anomalies highlighted
3. **Compliance**: Full audit trail of who did what and when
4. **Collaboration**: Reviewers can chat and make decisions together
5. **Authority**: Institutional aesthetic signals trust and competence

---

## DEPENDENCIES & BLOCKERS

### Critical Path
```
Phase 1 (next.config, layout) 
  ↓
Phase 2 (intake, upload) 
  ↓
Phase 3 (timeline, chat) — can start in parallel with Phase 2
Phase 4 (underwriting) — can start in parallel with Phase 3
  ↓
Phase 5 (walkthrough narrative)
  ↓
Phase 6 (tests, polish)
  ↓
Phase 7 (docs, deploy)
```

### External Dependencies
- Express API running on port 3001 (already exists)
- PostgreSQL + Redis for persistence (optional for demo, falls back to in-memory)
- Puppeteer for visual regression (npm install handles this)

### Known Blockers
- None currently; all prerequisites are in place

---

## BUDGET & RESOURCE OPTIMIZATION

### Parallel Work Opportunities
- Phase 2 and 3 can run in parallel (different components)
- Phase 3 and 4 can run in parallel
- Phase 6 (testing) can start after Phase 4 (underwriting) is code-complete
- Phase 7 (docs) can happen throughout, not just at end

### Cost Optimization
- Reuse existing Express demo service (don't rebuild backend)
- Use design tokens to avoid duplicating styles
- Lazy-load heavy components (document viewer) to reduce bundle
- Use mock data for walkthrough (avoid real API calls)

---

## SIGN-OFF & NEXT STEPS

**Approved By**: Project Manager (You)  
**Date**: November 15, 2025  
**Next Action**: 

1. Run Gemini CLI Phase 1 tasks (1.1–1.5)
2. Verify `npm run dev` starts both servers
3. Test http://localhost:3000 shows demo landing
4. Report blockers or issues
5. Proceed to Phase 2 if Phase 1 successful

---

**Questions or changes?** Update RECON_REPORT_DEMO_MODE.md or GEMINI_CLI_TASK_QUEUE.md and re-sync.

**Ready to execute?** Start with: `gemini cli --task "CIVICFLOW TASK 1.1: Create next.config.ts..."`
