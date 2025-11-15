'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

const NAV_ITEMS = [
  { label: 'Home', href: '/' },
  { label: 'Demo', href: '/demo' },
  { label: 'Intake', href: '/intake' },
  { label: 'Timeline', href: '/timeline' },
  { label: 'Underwriting', href: '/underwriting' },
];

const PROCESS_STAGES = [
  {
    id: 'narrative',
    label: 'Narrative',
    description: 'Guided overview of demo mode',
    href: '/demo',
  },
  {
    id: 'intake',
    label: 'Intake',
    description: 'Capture applicant data + documents',
    href: '/intake',
  },
  {
    id: 'timeline',
    label: 'Timeline',
    description: 'Collaboration + audit trail (demo placeholder)',
    href: '/timeline',
  },
  {
    id: 'underwriting',
    label: 'Underwriting',
    description: 'Eligibility + risk snapshot (demo placeholder)',
    href: '/underwriting',
  },
];

const ROUTE_STAGE_INDEX: Record<string, number> = {
  '/': 0,
  '/demo': 0,
  '/intake': 1,
  '/timeline': 2,
  '/underwriting': 3,
};

export default function Layout({ children }: LayoutProps) {
  const pathname = usePathname();
  const activeStageIndex = ROUTE_STAGE_INDEX[pathname] ?? 0;

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: 'var(--cc-bg)',
        color: 'var(--cc-text)',
        fontFamily: 'var(--font-sans)',
      }}
    >
      <header
        className="border-b"
        style={{
          backgroundColor: 'var(--cc-surface)',
          borderColor: 'var(--cc-border)',
        }}
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p
              className="text-xs uppercase tracking-widest"
              style={{ color: 'var(--cc-muted)' }}
            >
              Institutional Lending Platform
            </p>
            <Link
              href="/"
              className="block text-2xl font-semibold"
              style={{ color: 'var(--cc-accent)' }}
            >
              CivicFlow
            </Link>
            <p className="text-sm" style={{ color: 'var(--cc-text-secondary)' }}>
              Clarity for SBA 504 & 7a workflows. Demo-first, audit-ready.
            </p>
          </div>
          <nav aria-label="Primary" className="flex flex-wrap gap-2">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              const baseStyles = {
                border: '1px solid var(--cc-border)',
                borderColor: isActive ? 'var(--cc-accent)' : 'var(--cc-border)',
                color: isActive ? 'var(--cc-accent-dark)' : 'var(--cc-text)',
                backgroundColor: isActive ? 'var(--cc-accent-light)' : 'transparent',
              };

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className="rounded-2 px-3 py-2 text-sm"
                  style={baseStyles}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="border-t" style={{ borderColor: 'var(--cc-border)' }}>
          <div className="mx-auto flex max-w-6xl flex-wrap gap-4 px-4 py-3" aria-label="Workflow stages">
            {PROCESS_STAGES.map((stage, index) => {
              const isActive = index === activeStageIndex;
              const isComplete = index < activeStageIndex;

              const markerColor = isActive
                ? 'var(--cc-accent)'
                : isComplete
                ? 'var(--cc-success)'
                : 'var(--cc-border)';

              return (
                <div key={stage.id} className="flex items-start gap-2">
                  <span
                    className="mt-1 inline-flex h-3 w-3 rounded-full"
                    style={{ backgroundColor: markerColor }}
                    aria-hidden="true"
                  />
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Link
                        href={stage.href}
                        style={{
                          color: isActive || isComplete ? 'var(--cc-accent-dark)' : 'var(--cc-text)',
                          textDecoration: isActive ? 'underline' : 'none',
                        }}
                      >
                        {stage.label}
                      </Link>
                      {isActive && (
                        <span className="text-xs uppercase" style={{ color: 'var(--cc-accent-dark)' }}>
                          In focus
                        </span>
                      )}
                      {isComplete && (
                        <span className="text-xs uppercase" style={{ color: 'var(--cc-muted)' }}>
                          Done
                        </span>
                      )}
                    </div>
                    <p className="text-xs" style={{ color: 'var(--cc-text-secondary)' }}>
                      {stage.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </header>

      <main
        role="main"
        className="mx-auto w-full max-w-6xl px-4 py-8"
        style={{ minHeight: '60vh' }}
      >
        {children}
      </main>

      <footer
        className="border-t"
        style={{
          borderColor: 'var(--cc-border)',
          backgroundColor: 'var(--cc-surface)',
        }}
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-muted md:flex-row md:items-center md:justify-between">
          <p style={{ color: 'var(--cc-muted)' }}>(c) {new Date().getFullYear()} CivicFlow. Institutional lending workflows.</p>
          <p style={{ color: 'var(--cc-text-secondary)' }}>Demo-first. Audit-ready. Built for SBA 504 & 7a.</p>
        </div>
      </footer>
    </div>
  );
}
