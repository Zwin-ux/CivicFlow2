'use client';

/**
 * Demo Landing Page
 * Hero section with demo overview and Start Demo CTA
 */

import Link from 'next/link';

export default function DemoLanding() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'var(--cc-bg)',
        padding: 'var(--s-12)',
      }}
    >
      {/* Hero Section */}
      <div
        style={{
          maxWidth: '800px',
          textAlign: 'center',
        }}
      >
        {/* Headline */}
        <h1
          style={{
            fontSize: 'var(--text-3xl)',
            fontWeight: '700',
            color: 'var(--cc-text)',
            marginBottom: 'var(--s-4)',
            lineHeight: '1.2',
            letterSpacing: '-1px',
          }}
        >
          Institutional Lending,{' '}
          <span style={{ color: 'var(--cc-accent)' }}>Simplified</span>
        </h1>

        {/* Subheading */}
        <p
          style={{
            fontSize: 'var(--text-lg)',
            color: 'var(--cc-text-secondary)',
            marginBottom: 'var(--s-8)',
            lineHeight: '1.7',
          }}
        >
          Fast intake, clear validation, confident decisions. Watch how CivicFlow streamlines SBA 504
          and 5(a) loan workflows from application to approval.
        </p>

        {/* 3-Step Overview */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 'var(--s-8)',
            marginBottom: 'var(--s-12)',
          }}
        >
          {[
            {
              step: '1',
              title: 'Intake',
              description: 'Structured form with auto-extraction and confidence scores',
            },
            {
              step: '2',
              title: 'Validate',
              description: 'Documents analyzed, risks flagged, compliance ready',
            },
            {
              step: '3',
              title: 'Approve',
              description: 'Full timeline, team collaboration, instant decisions',
            },
          ].map((item) => (
            <div
              key={item.step}
              style={{
                padding: 'var(--s-8)',
                borderRadius: 'var(--r-4)',
                backgroundColor: 'var(--cc-surface)',
                border: '1px solid var(--cc-border)',
                transition: 'all var(--dur-gentle) ease',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.boxShadow = 'var(--shadow-md)';
                el.style.borderColor = 'var(--cc-accent)';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.boxShadow = 'none';
                el.style.borderColor = 'var(--cc-border)';
              }}
            >
              <div
                style={{
                  fontSize: 'var(--text-2xl)',
                  fontWeight: '700',
                  color: 'var(--cc-accent)',
                  marginBottom: 'var(--s-2)',
                }}
              >
                {item.step}
              </div>
              <h3
                style={{
                  fontSize: 'var(--text-base)',
                  fontWeight: '600',
                  color: 'var(--cc-text)',
                  marginBottom: 'var(--s-2)',
                }}
              >
                {item.title}
              </h3>
              <p
                style={{
                  fontSize: 'var(--text-sm)',
                  color: 'var(--cc-muted)',
                  margin: 0,
                  lineHeight: '1.6',
                }}
              >
                {item.description}
              </p>
            </div>
          ))}
        </div>

        {/* Call to Action */}
        <div
          style={{
            display: 'flex',
            gap: 'var(--s-4)',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          <Link
            href="/demo/walkthrough"
            style={{
              padding: 'var(--s-4) var(--s-8)',
              backgroundColor: 'var(--cc-accent)',
              color: 'white',
              borderRadius: 'var(--r-4)',
              fontWeight: '600',
              fontSize: 'var(--text-base)',
              textDecoration: 'none',
              border: 'none',
              cursor: 'pointer',
              transition: 'all var(--dur-micro) ease',
              boxShadow: 'var(--shadow-md)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.backgroundColor =
                'var(--cc-accent-dark)';
              (e.currentTarget as HTMLAnchorElement).style.boxShadow = 'var(--shadow-lg)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.backgroundColor =
                'var(--cc-accent)';
              (e.currentTarget as HTMLAnchorElement).style.boxShadow = 'var(--shadow-md)';
            }}
          >
            Start Guided Walkthrough
          </Link>

          <Link
            href="/demo/intake"
            style={{
              padding: 'var(--s-4) var(--s-8)',
              backgroundColor: 'transparent',
              color: 'var(--cc-accent)',
              borderRadius: 'var(--r-4)',
              fontWeight: '600',
              fontSize: 'var(--text-base)',
              textDecoration: 'none',
              border: '2px solid var(--cc-accent)',
              cursor: 'pointer',
              transition: 'all var(--dur-micro) ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'var(--cc-accent)';
              (e.currentTarget as HTMLAnchorElement).style.color = 'white';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.backgroundColor =
                'transparent';
              (e.currentTarget as HTMLAnchorElement).style.color = 'var(--cc-accent)';
            }}
          >
            Try Intake Form
          </Link>
        </div>

        {/* Demo Note */}
        <p
          style={{
            marginTop: 'var(--s-12)',
            fontSize: 'var(--text-sm)',
            color: 'var(--cc-muted)',
            fontStyle: 'italic',
          }}
        >
          This is a demonstration environment. Data is simulated and not persisted.
        </p>
      </div>
    </div>
  );
}
