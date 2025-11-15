'use client';

import { useDemoMode } from '@/hooks/useDemoMode';

const eligibilityChecks = [
  { label: 'Use of proceeds aligns with SBA 504', status: 'pass', note: 'Equipment + owner-occupied real estate' },
  { label: 'Borrower equity >= 10%', status: 'pass', note: 'Demo borrower seeded at 18% to show buffer' },
  { label: 'Franchise disclosure received', status: 'warn', note: 'Missing Appendix C. Prompt applicant for upload.' },
];

const riskFlags = [
  { label: 'NAICS variance', tone: 'var(--cc-warning)', detail: 'Auto extraction saw 2 codes. Confirm 531110 vs 531120.' },
  { label: 'Debt service coverage', tone: 'var(--cc-error)', detail: 'Simulated DSCR at 1.12. Manual override required.' },
  { label: 'Environmental questionnaire', tone: 'var(--cc-warning)', detail: 'Phase II recommended for industrial parcels.' },
];

const scorecard = [
  { label: 'Confidence score', value: '0.82', description: 'Documents auto-accepted but still editable.' },
  { label: 'Eligibility readiness', value: 'Ready for review', description: 'All mandatory items uploaded.' },
  { label: 'Demo narrative', value: 'Step 4 of 4', description: 'Show stakeholders the risk snapshot before approvals.' },
];

export default function UnderwritingPlaceholder() {
  const { state } = useDemoMode();

  return (
    <section
      className="space-y-6 rounded-4 border"
      style={{ borderColor: 'var(--cc-border)', backgroundColor: 'var(--cc-surface)', padding: 'var(--s-8)' }}
      aria-label="Underwriting snapshot demo"
    >
      <div>
        <p className="text-xs uppercase" style={{ color: 'var(--cc-muted)', letterSpacing: '0.08em' }}>
          Underwriting snapshot (demo)
        </p>
        <h2 className="text-2xl font-semibold" style={{ color: 'var(--cc-text)', marginTop: 'var(--s-2)' }}>
          Explain risk posture before approvals
        </h2>
        <p className="text-sm" style={{ color: 'var(--cc-text-secondary)', marginTop: 'var(--s-2)' }}>
          {state.isDemo
            ? 'These values come from the seed-based demo underwriting engine. Override any field to see how confidence changes.'
            : 'Waiting for demo mode. Enable demo mode to replay the underwriting walkthrough.'}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {scorecard.map((item) => (
          <div key={item.label} className="rounded-4 border p-4" style={{ borderColor: 'var(--cc-border)', backgroundColor: 'var(--cc-bg)' }}>
            <p className="text-xs uppercase" style={{ color: 'var(--cc-muted)' }}>
              {item.label}
            </p>
            <p className="text-2xl font-semibold" style={{ color: 'var(--cc-text)' }}>
              {item.value}
            </p>
            <p className="text-sm" style={{ color: 'var(--cc-text-secondary)' }}>
              {item.description}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold" style={{ color: 'var(--cc-text)' }}>
            Eligibility checklist
          </h3>
          <ul className="space-y-3">
            {eligibilityChecks.map((check) => (
              <li key={check.label} className="rounded-4 border p-3" style={{ borderColor: 'var(--cc-border)', backgroundColor: 'var(--cc-bg)' }}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold" style={{ color: 'var(--cc-text)' }}>
                    {check.label}
                  </p>
                  <span
                    className="text-xs uppercase"
                    style={{
                      color:
                        check.status === 'pass'
                          ? 'var(--cc-success)'
                          : check.status === 'warn'
                          ? 'var(--cc-warning)'
                          : 'var(--cc-error)',
                    }}
                  >
                    {check.status}
                  </span>
                </div>
                <p className="text-xs" style={{ color: 'var(--cc-text-secondary)', marginTop: 'var(--s-2)' }}>
                  {check.note}
                </p>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-4">
          <h3 className="text-lg font-semibold" style={{ color: 'var(--cc-text)' }}>
            Risk flags to review live
          </h3>
          <ul className="space-y-3">
            {riskFlags.map((flag) => (
              <li key={flag.label} className="rounded-4 border p-3" style={{ borderColor: 'var(--cc-border)', backgroundColor: 'var(--cc-bg)' }}>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: flag.tone }} aria-hidden="true" />
                  <p className="text-sm font-semibold" style={{ color: 'var(--cc-text)' }}>
                    {flag.label}
                  </p>
                </div>
                <p className="text-xs" style={{ color: 'var(--cc-text-secondary)', marginTop: 'var(--s-2)' }}>
                  {flag.detail}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="text-xs" style={{ color: 'var(--cc-muted)' }}>
        Demo tip: Feeds above are deterministic. Change the intake EIN seed to watch underwriting numbers refresh predictably.
      </p>
    </section>
  );
}
