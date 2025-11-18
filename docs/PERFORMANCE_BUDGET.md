# Performance Budget

This document captures the launch-level performance targets established in the App Experience Overhaul requirements. It is intended to guide engineering decisions, audits, and regressions.

## Key Targets

| Metric | Budget | Rationale |
| --- | --- | --- |
| First Contentful Paint (FCP) | < 1.5 seconds | Ensure users see meaningful content quickly |
| Time to Interactive (TTI) | < 3.5 seconds | Interfaces must be responsive when users first engage |
| Largest Contentful Paint (LCP) | < 2.5 seconds | Prevent layout jank during hero/metric loading |
| Cumulative Layout Shift (CLS) | < 0.1 | Maintain a stable, trustworthy UI |
| First Input Delay (FID) | < 100 milliseconds | Keep interactions feeling instantaneous |
| Animation Frame Rate | 60 fps | Micro-interactions and transitions should feel fluid |

## Strategy

- **Perceived performance first**: Use skeleton loaders, optimistic updates, and lazy fetches to reduce perceived wait times even under slow networks.
- **Code splitting & prioritization**: Bundle critical UI first; lazily load charts, document viewers, and optional panels.
- **Caching**: Apply stale-while-revalidate on dashboards, cache-first for settings, and network-first with fallbacks for document/detail views.
- **Monitoring**: Run Lighthouse audits, capture metrics through CI scripts, and add runtime observers (e.g., `PerformanceObserver`) where possible.
- **Budget enforcement**: Fail builds or flag PRs when Lighthouse runs exceed the established thresholds.

## Verification

- Include Lighthouse/CrUX snapshots in release notes.
- Track regression across devices (desktop, mobile, slow 3G/4G) before releasing major visuals.
- Add unit/e2e checks that assert skeletons replace spinners and that expensive assets load lazily.
