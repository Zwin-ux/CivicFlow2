'use client';

/**
 * CivicFlow Main Layout Component
 * Provides consistent header, navigation, and footer across all pages.
 */

import React, { ReactNode } from 'react';
import Link from 'next/link';

interface LayoutProps {
  children: ReactNode;
  showNav?: boolean;
}

export default function Layout({ children, showNav = true }: LayoutProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: 'var(--cc-bg)',
        color: 'var(--cc-text)',
      }}
    >
      {/* Header */}
      <header
        style={{
          borderBottom: '1px solid var(--cc-border)',
          backgroundColor: 'var(--cc-surface)',
          padding: 'var(--s-4) var(--s-8)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div
          style={{
            maxWidth: '1400px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          {/* Logo */}
          <Link
            href="/"
            style={{
              fontSize: 'var(--text-lg)',
              fontWeight: '600',
              color: 'var(--cc-accent)',
              textDecoration: 'none',
              letterSpacing: '-0.5px',
            }}
          >
            CivicFlow
          </Link>

          {/* Nav Links (Desktop) */}
          {showNav && (
            <nav
              style={{
                display: 'flex',
                gap: 'var(--s-8)',
                alignItems: 'center',
              }}
            >
              <Link
                href="/"
                style={{
                  fontSize: 'var(--text-sm)',
                  color: 'var(--cc-text)',
                  textDecoration: 'none',
                  transition: 'color var(--dur-micro) ease',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.color = 'var(--cc-accent)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.color = 'var(--cc-text)';
                }}
              >
                Home
              </Link>
              <Link
                href="/intake"
                style={{
                  fontSize: 'var(--text-sm)',
                  color: 'var(--cc-text)',
                  textDecoration: 'none',
                  transition: 'color var(--dur-micro) ease',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.color = 'var(--cc-accent)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.color = 'var(--cc-text)';
                }}
              >
                Intake
              </Link>
              <Link
                href="/walkthrough"
                style={{
                  fontSize: 'var(--text-sm)',
                  color: 'var(--cc-text)',
                  textDecoration: 'none',
                  transition: 'color var(--dur-micro) ease',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.color = 'var(--cc-accent)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.color = 'var(--cc-text)';
                }}
              >
                Walkthrough
              </Link>
            </nav>
          )}

          {/* User Menu Placeholder */}
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--cc-muted)' }}>
            Demo User
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main
        style={{
          flex: 1,
          maxWidth: '1400px',
          width: '100%',
          margin: '0 auto',
          padding: 'var(--s-12)',
        }}
      >
        {children}
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--cc-border)',
          backgroundColor: 'var(--cc-surface)',
          padding: 'var(--s-8)',
          textAlign: 'center',
          fontSize: 'var(--text-xs)',
          color: 'var(--cc-muted)',
        }}
      >
        <p style={{ margin: 0 }}>© 2025 CivicFlow. Institutional Lending Platform.</p>
        <p style={{ margin: 'var(--s-2) 0 0 0' }}>
          Built for speed, clarity, and compliance.
        </p>
      </footer>
    </div>
  );
}
