import Link from 'next/link';
import UnderwritingPlaceholder from '@/components/Underwriting/UnderwritingPlaceholder';

export default function UnderwritingPage() {
  return (
    <div className="space-y-10" style={{ paddingTop: 'var(--s-8)', paddingBottom: 'var(--s-12)' }}>
      <header className="space-y-3">
        <p className="text-xs uppercase" style={{ color: 'var(--cc-muted)', letterSpacing: '0.08em' }}>
          Phase 4 preview
        </p>
        <h1 className="text-3xl font-semibold" style={{ color: 'var(--cc-text)' }}>
          Underwriting + risk snapshot (demo placeholder)
        </h1>
        <p className="text-lg" style={{ color: 'var(--cc-text-secondary)' }}>
          When demo mode is on, CivicFlow can showcase the final risk layer without needing live
          databases. Use this screen to demonstrate how eligibility checks, risk flags, and
          confidence tiers inform the credit memo.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/timeline" className="text-sm font-semibold" style={{ color: 'var(--cc-accent-dark)' }}>
            Review collaboration log
          </Link>
          <Link href="/intake" className="text-sm font-semibold" style={{ color: 'var(--cc-accent-dark)' }}>
            Restart demo ->
          </Link>
        </div>
      </header>

      <UnderwritingPlaceholder />

      <section className="rounded-4 border p-6" style={{ borderColor: 'var(--cc-border)', backgroundColor: 'var(--cc-surface)' }}>
        <h2 className="text-xl font-semibold" style={{ color: 'var(--cc-text)' }}>
          Planned enhancements
        </h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm" style={{ color: 'var(--cc-text-secondary)' }}>
          <li>Eligibility overrides that sync back to demo timeline.</li>
          <li>Automated decision memo download with audit-ready summary.</li>
          <li>Risk scenario toggles to show best/worst case for stakeholders.</li>
        </ul>
      </section>
    </div>
  );
}
