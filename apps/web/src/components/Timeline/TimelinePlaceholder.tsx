'use client';

import { useDemoMode } from '@/hooks/useDemoMode';

const demoEvents = [
  {
    stage: 'Intake',
    summary: 'Applicant data locked',
    actor: 'Loan Officer Avery Chen',
    elapsed: '3 minutes ago',
    detail: 'Seed 1204 generated initial EIN + ownership structure.',
  },
  {
    stage: 'Document Upload',
    summary: 'Tax returns ingested',
    actor: 'Applicant',
    elapsed: '2 minutes ago',
    detail: 'IRS 4506-C delivered. OCR queued for validation.',
  },
  {
    stage: 'Validation',
    summary: 'Policy review flagged NAICS variance',
    actor: 'System',
    elapsed: '90 seconds ago',
    detail: 'Confidence dropped to 0.74. Re-verify business name prior to underwriting.',
  },
  {
    stage: 'Decision Prep',
    summary: 'Underwriter brief requested',
    actor: 'Operations',
    elapsed: 'Just now',
    detail: 'Notify senior approver once confidence badge returns to green state.',
  },
];

export default function TimelinePlaceholder() {
  const { state } = useDemoMode();

  return (
    <section
      className="space-y-6 rounded-4 border"
      style={{ borderColor: 'var(--cc-border)', backgroundColor: 'var(--cc-surface)', padding: 'var(--s-8)' }}
      aria-label="Demo timeline preview"
    >
      <div>
        <p className="text-xs uppercase" style={{ color: 'var(--cc-muted)', letterSpacing: '0.08em' }}>
          Collaboration timeline (demo)
        </p>
        <h2 className="text-2xl font-semibold" style={{ color: 'var(--cc-text)', marginTop: 'var(--s-2)' }}>
          Deterministic activity feed for SBA reviewers
        </h2>
        <p className="text-sm" style={{ color: 'var(--cc-text-secondary)', marginTop: 'var(--s-2)' }}>
          {state.isDemo
            ? 'Events below come from the demo data service. Refreshing intake regenerates the same sequence with the active seed.'
            : 'Demo data service is offline. Timeline will replay once demo mode is active.'}
        </p>
      </div>

      <ol className="space-y-4">
        {demoEvents.map((event) => (
          <li key={event.summary} className="rounded-4 border p-4" style={{ borderColor: 'var(--cc-border)', backgroundColor: 'var(--cc-bg)' }}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase" style={{ color: 'var(--cc-muted)' }}>
                  {event.stage}
                </p>
                <h3 className="text-lg font-semibold" style={{ color: 'var(--cc-text)' }}>
                  {event.summary}
                </h3>
              </div>
              <span className="text-xs" style={{ color: 'var(--cc-text-secondary)' }}>
                {event.elapsed}
              </span>
            </div>
            <p className="text-sm" style={{ color: 'var(--cc-text-secondary)', marginTop: 'var(--s-2)' }}>
              {event.detail}
            </p>
            <p className="text-xs" style={{ color: 'var(--cc-text-secondary)', marginTop: 'var(--s-2)' }}>
              Owner: {event.actor}
            </p>
          </li>
        ))}
      </ol>
      <p className="text-xs" style={{ color: 'var(--cc-muted)' }}>
        Demo tip: Fast-forward this feed by uploading another document. The OctoDoc simulator streams updates every 500ms.
      </p>
    </section>
  );
}
