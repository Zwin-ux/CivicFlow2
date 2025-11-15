import Link from 'next/link';

const pipeline = [
  {
    title: 'Intake',
    status: 'Live now',
    next: 'Document upload',
    description: 'Autofill EIN, business identity, and contact data with confidence indicators.',
  },
  {
    title: 'Upload',
    status: 'Starts after intake',
    next: 'Validation pipeline',
    description: 'Drag-and-drop documents, see ingest status, and monitor OCR + policy stages.',
  },
  {
    title: 'Validation',
    status: 'Simulated pipeline',
    next: 'Decision + timeline',
    description: 'Threat scan, OCR, policy, and AI review update every 500ms in demo mode.',
  },
  {
    title: 'Decision',
    status: 'Coming soon',
    next: 'Team timeline + underwriting snapshot',
    description: 'Review collaboration timeline, risk snapshot, and final approvals.',
  },
];

const assurances = [
  {
    title: 'Always demo-ready',
    description: 'If Postgres or Redis fail, demo mode activates instantly and keeps responses deterministic.',
  },
  {
    title: 'Stage + next stage',
    description: 'Every module displays current status and what comes next, so lenders stay oriented.',
  },
  {
    title: 'Confidence signals',
    description: 'Green/amber/red badges communicate whether data is trustworthy, needs review, or must be corrected.',
  },
];

const confidenceLegend = [
  { label: '80%+', tone: 'var(--cc-success)', text: 'Auto-accept, editable' },
  { label: '70-79%', tone: 'var(--cc-warning)', text: 'Verify before sending' },
  { label: '<70%', tone: 'var(--cc-error)', text: 'Manual review required' },
];

export default function DemoLanding() {
  return (
    <div className="space-y-12" style={{ paddingTop: 'var(--s-8)', paddingBottom: 'var(--s-12)' }}>
      <section
        className="rounded-4 border shadow-sm"
        style={{
          borderColor: 'var(--cc-border)',
          backgroundColor: 'var(--cc-surface)',
          padding: 'var(--s-12)',
        }}
      >
        <p className="text-sm" style={{ color: 'var(--cc-text-secondary)' }}>
          Demo narrative overview
        </p>
        <h1 className="text-3xl" style={{ color: 'var(--cc-text)', marginTop: 'var(--s-2)' }}>
          Follow a lender from intake to decision without leaving demo mode.
        </h1>
        <p className="text-lg" style={{ color: 'var(--cc-text-secondary)', marginTop: 'var(--s-4)', maxWidth: '65ch' }}>
          This walkthrough mirrors production flow while running entirely on deterministic demo data.
          Every call returns X-Demo-Mode: true so stakeholders know the environment is simulated but
          realistic.
        </p>
        <div className="mt-6 flex flex-wrap gap-4">
          <Link
            href="/intake"
            className="rounded-4 px-6 py-3 text-base font-semibold"
            style={{ backgroundColor: 'var(--cc-accent)', color: '#ffffff' }}
          >
            Start intake in demo mode
          </Link>
          <Link
            href="/intake"
            className="rounded-4 px-6 py-3 text-base font-semibold"
            style={{ border: '1px solid var(--cc-accent)', color: 'var(--cc-accent-dark)' }}
          >
            Skip ahead to uploads
          </Link>
        </div>
      </section>

      <section aria-labelledby="pipeline-map" className="space-y-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-baseline md:justify-between">
          <div>
            <h2 id="pipeline-map" className="text-2xl font-semibold" style={{ color: 'var(--cc-text)' }}>
              Pipeline clarity
            </h2>
            <p className="text-sm" style={{ color: 'var(--cc-text-secondary)' }}>
              Each step lists the next outcome so lenders are never surprised.
            </p>
          </div>
          <p className="text-xs" style={{ color: 'var(--cc-muted)' }}>
            Responses include X-Demo-Mode headers. Status refreshes every 500ms in validation.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {pipeline.map((stage) => (
            <article
              key={stage.title}
              className="rounded-4 border p-6"
              style={{ borderColor: 'var(--cc-border)', backgroundColor: 'var(--cc-surface)' }}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold" style={{ color: 'var(--cc-text)' }}>
                  {stage.title}
                </h3>
                <span className="text-xs uppercase" style={{ color: 'var(--cc-muted)' }}>
                  Next: {stage.next}
                </span>
              </div>
              <p className="text-sm" style={{ color: 'var(--cc-text-secondary)', marginTop: 'var(--s-2)' }}>
                {stage.description}
              </p>
              <p className="text-sm font-semibold" style={{ color: 'var(--cc-accent-dark)', marginTop: 'var(--s-2)' }}>
                Status: {stage.status}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="demo-assurances" className="space-y-4">
        <h2 id="demo-assurances" className="text-2xl font-semibold" style={{ color: 'var(--cc-text)' }}>
          Demo mode safeguards
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {assurances.map((item) => (
            <article
              key={item.title}
              className="rounded-4 border p-5"
              style={{ borderColor: 'var(--cc-border)', backgroundColor: 'var(--cc-surface)' }}
            >
              <h3 className="text-lg font-semibold" style={{ color: 'var(--cc-text)' }}>
                {item.title}
              </h3>
              <p className="text-sm" style={{ color: 'var(--cc-text-secondary)', marginTop: 'var(--s-2)' }}>
                {item.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="confidence-legend" className="space-y-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 id="confidence-legend" className="text-2xl font-semibold" style={{ color: 'var(--cc-text)' }}>
              Confidence legend
            </h2>
            <p className="text-sm" style={{ color: 'var(--cc-text-secondary)' }}>
              Intake and document pages reuse these tiers so reviewers know when to trust extracted
              data.
            </p>
          </div>
          <Link href="/intake" className="text-sm font-semibold" style={{ color: 'var(--cc-accent-dark)' }}>
            See badges in context ->
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {confidenceLegend.map((item) => (
            <div
              key={item.label}
              className="rounded-4 border p-4"
              style={{ borderColor: 'var(--cc-border)', backgroundColor: 'var(--cc-surface)' }}
            >
              <p className="text-xs uppercase" style={{ color: 'var(--cc-muted)' }}>
                Tier
              </p>
              <div className="mt-1 flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.tone }} aria-hidden="true" />
                <strong style={{ color: 'var(--cc-text)' }}>{item.label}</strong>
              </div>
              <p className="text-sm" style={{ color: 'var(--cc-text-secondary)', marginTop: 'var(--s-2)' }}>
                {item.text}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
