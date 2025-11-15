'use client';

/**
 * DemoModeBadge - Global demo-mode indicator
 * Displays a subtle badge when the app is running in demo mode.
 * Used in app layout to provide persistent, non-intrusive context.
 */

import { useState, useEffect } from 'react';

export default function DemoModeBadge() {
  const [isDemo, setIsDemo] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check if running in demo mode by looking for demo flag in URL or localStorage
    const params = new URLSearchParams(window.location.search);
    const isDemoParam = params.get('demo') === 'true';
    const isDemoLS = localStorage.getItem('civicflow-demo-mode') === 'true';
    setIsDemo(isDemoParam || isDemoLS);
  }, []);

  if (!mounted || !isDemo) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Demo mode active"
      className="fixed top-0 left-0 right-0 z-50 px-4 py-2"
      style={{
        backgroundColor: 'var(--cc-accent-light)',
        borderBottom: '1px solid var(--cc-accent)',
      }}
    >
      <div
        className="max-w-7xl mx-auto flex items-center justify-between"
        style={{ fontSize: 'var(--text-sm)' }}
      >
        <div className="flex items-center gap-2">
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ backgroundColor: 'var(--cc-accent)' }}
            aria-hidden="true"
          />
          <span style={{ color: 'var(--cc-text)' }}>
            <strong>Demo Mode</strong> — This is a simulated environment. Data is not persisted.
          </span>
        </div>
        <button
          onClick={() => {
            localStorage.removeItem('civicflow-demo-mode');
            setIsDemo(false);
          }}
          className="px-2 py-1 rounded-2 text-xs font-medium"
          style={{
            color: 'var(--cc-accent-dark)',
            backgroundColor: 'transparent',
            border: '1px solid var(--cc-accent)',
            transition: `background-color var(--dur-micro) ease`,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--cc-accent)';
            (e.currentTarget as HTMLButtonElement).style.color = 'white';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--cc-accent-dark)';
          }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
