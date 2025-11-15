'use client';

import { useMemo } from 'react';
import { useDemoMode } from '@/hooks/useDemoMode';

/**
 * DemoModeBadge highlights that the system is running in demo mode and
 * surfaces key signals from the backend health endpoint so users know
 * exactly what environment they are in.
 */
export default function DemoModeBadge() {
  const { state, refresh } = useDemoMode(120000);

  const featureEntries = useMemo(() => {
    if (!state.features) {
      return [];
    }

    return Object.entries(state.features).filter(([, value]) => {
      if (value === undefined || value === null) {
        return false;
      }
      return String(value).trim().length > 0;
    });
  }, [state.features]);

  if (!state.loading && !state.isDemo && !state.error) {
    return null;
  }

  return (
    <section
      aria-live="polite"
      aria-label="Demo mode status"
      className="w-full border-b"
      style={{
        backgroundColor: state.isDemo ? 'var(--cc-accent-light)' : 'var(--cc-surface)',
        borderColor: 'var(--cc-accent)',
        color: 'var(--cc-text)',
      }}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-1">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide">
            <span
              className="inline-flex h-2 w-2 rounded-full"
              style={{
                backgroundColor: state.isDemo ? 'var(--cc-accent-dark)' : 'var(--cc-warning)',
              }}
              aria-hidden="true"
            />
            <strong>
              {state.loading
                ? 'Checking environment'
                : state.isDemo
                ? 'Demo mode active'
                : 'Demo mode unavailable'}
            </strong>
          </div>
          <p className="text-sm" style={{ color: 'var(--cc-text)' }}>
            {state.loading && 'Verifying demo safeguards...'}
            {!state.loading && state.statusMessage && state.statusMessage}
            {!state.loading && !state.statusMessage && state.isDemo && 'Running in demonstration mode'}
            {!state.loading && state.error && `Unable to confirm demo mode: ${state.error}`}
          </p>
          {state.reason && (
            <p className="text-xs" style={{ color: 'var(--cc-text-secondary)' }}>
              Reason: {state.reason}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {featureEntries.map(([key, value]) => (
            <span
              key={key}
              className="rounded-full px-3 py-1 text-xs font-medium"
              style={{
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: 'var(--cc-accent-dark)',
              }}
            >
              {key.replace(/([A-Z])/g, ' ').trim()}: {value}
            </span>
          ))}
          <button
            type="button"
            onClick={refresh}
            className="rounded-2 px-3 py-1 text-xs font-semibold"
            style={{
              border: '1px solid var(--cc-accent)',
              color: 'var(--cc-accent-dark)',
              backgroundColor: 'transparent',
            }}
          >
            Refresh
          </button>
        </div>
      </div>
    </section>
  );
}
