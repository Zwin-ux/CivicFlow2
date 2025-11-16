import Link from 'next/link';

const identityQuestions = [
  {
    title: 'Where am I in the process?',
    answer: 'Demo landing shows the full pipeline. Intake highlights current step and next milestone.',
  },
  {
    title: 'What is coming next?',
    answer: 'Each stage banner forecasts the next task so lenders can prep documents or reviewers.',
  },
  {
    title: 'How sure is CivicFlow about the data?',
    answer: 'Confidence badges accompany every extracted field and document status update.',
  },
];

const pipeline = [
  { label: 'Intake', detail: 'Structured fields + deterministic prefill' },
  { label: 'Upload', detail: 'Drag-and-drop, staged processing' },
  { label: 'Validate', detail: 'Threat scan, OCR, policy, AI review' },
  { label: 'Decide', detail: 'Timeline + underwriting snapshot' },
];

export default function Home() {
  return (
    <div className="space-y-12" style={{ paddingTop: 'var(--s-8)', paddingBottom: 'var(--s-12)' }}>
      <section
        className="rounded-4 shadow-md"
        style={{
          backgroundColor: 'var(--cc-surface)',
          border: '1px solid var(--cc-border)',
          padding: 'var(--s-12)',
        }}
      >
        <p className="text-sm" style={{ color: 'var(--cc-text-secondary)' }}>
          Demo-first SBA 504 + 7a platform
        </p>
        <h1
          className="text-3xl"
          style={{ color: 'var(--cc-text)', marginTop: 'var(--s-2)', marginBottom: 'var(--s-4)' }}
        >
          Move from application to decision in days, even when core systems are offline.
        </h1>
        <p className="text-lg" style={{ color: 'var(--cc-text-secondary)', maxWidth: '60ch' }}>
          CivicFlow runs a complete lending walkthrough without Postgres or Redis. Demo mode keeps
          lenders informed with stage indicators, next steps, and confidence scores on every field.
        </p>
        <div className="mt-6 flex flex-wrap gap-4">
          <Link
            href="/demo"
            className="rounded-4 px-6 py-3 text-base font-semibold"
            style={{
              backgroundColor: 'var(--cc-accent)',
              color: '#ffffff',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            Explore the demo narrative
          </Link>
          <Link
            href="/intake"
            className="rounded-4 px-6 py-3 text-base font-semibold"
            style={{
              border: '1px solid var(--cc-accent)',
              color: 'var(--cc-accent-dark)',
            }}
          >
            Jump into intake
          </Link>
        </div>
      </section>

      <section aria-labelledby="identity-guidance">
        <h2 id="identity-guidance" className="text-2xl font-semibold" style={{ color: 'var(--cc-text)' }}>
          Every screen answers the three CivicFlow questions
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {identityQuestions.map((item) => (
            <article
              key={item.title}
              className="rounded-4 border p-6"
              style={{ borderColor: 'var(--cc-border)', backgroundColor: 'var(--cc-surface)' }}
            >
              <h3 className="text-lg font-semibold" style={{ color: 'var(--cc-text)' }}>
                {item.title}
              </h3>
              <p className="text-sm" style={{ color: 'var(--cc-text-secondary)', marginTop: 'var(--s-2)' }}>
                {item.answer}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="pipeline-preview">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 id="pipeline-preview" className="text-2xl font-semibold" style={{ color: 'var(--cc-text)' }}>
              Demo pipeline in four steps
            </h2>
            <p className="text-sm" style={{ color: 'var(--cc-text-secondary)' }}>
              Deterministic stages let lenders rehearse the workflow before production.
            </p>
          </div>
          <Link
            href="/demo"
            className="text-sm font-semibold"
            style={{ color: 'var(--cc-accent-dark)' }}
          >
            View walkthrough →
          </Link>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {pipeline.map((stage, index) => (
            <div
              key={stage.label}
              className="rounded-4 border p-4"
              style={{
                borderColor: 'var(--cc-border)',
                backgroundColor: 'var(--cc-surface)',
              }}
            >
              <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--cc-muted)' }}>
                Stage {index + 1}
              </p>
              <h3 className="text-lg font-semibold" style={{ color: 'var(--cc-text)' }}>
                {stage.label}
              </h3>
              <p className="text-sm" style={{ color: 'var(--cc-text-secondary)' }}>
                {stage.detail}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
