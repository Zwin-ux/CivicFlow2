import Link from 'next/link';
import TimelinePlaceholder from '@/components/Timeline/TimelinePlaceholder';

export default function TimelinePage() {
  return (
    <div className="space-y-10" style={{ paddingTop: 'var(--s-8)', paddingBottom: 'var(--s-12)' }}>
      <header className="space-y-3">
        <p className="text-xs uppercase" style={{ color: 'var(--cc-muted)', letterSpacing: '0.08em' }}>
          Phase 3 preview
        </p>
        <h1 className="text-3xl font-semibold" style={{ color: 'var(--cc-text)' }}>
          Timeline + collaboration feed (demo placeholder)
        </h1>
        <p className="text-lg" style={{ color: 'var(--cc-text-secondary)' }}>
          Show lenders how every intake action, upload, and underwriting note is captured in one
          institutional record. This page reuses demo-mode data so stakeholders can rehearse the
          review conversation before production data flows in.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/intake" className="text-sm font-semibold" style={{ color: 'var(--cc-accent-dark)' }}>
            Back to intake
          </Link>
          <Link href="/underwriting" className="text-sm font-semibold" style={{ color: 'var(--cc-accent-dark)' }}>
            Jump to underwriting snapshot ->
          </Link>
        </div>
      </header>

      <TimelinePlaceholder />

      <section className="rounded-4 border p-6" style={{ borderColor: 'var(--cc-border)', backgroundColor: 'var(--cc-surface)' }}>
        <h2 className="text-xl font-semibold" style={{ color: 'var(--cc-text)' }}>
          Coming next
        </h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm" style={{ color: 'var(--cc-text-secondary)' }}>
          <li>Live chat bubbles that respect demo mode and log actions for audit.</li>
          <li>Team assignments + role-based reminders seeded by demo data service.</li>
          <li>Ability to export the timeline state as part of the MLA package.</li>
        </ul>
      </section>
    </div>
  );
}
