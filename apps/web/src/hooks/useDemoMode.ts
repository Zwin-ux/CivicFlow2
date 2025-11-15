'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { DemoModeState, HealthResponse } from '@/types/demo';

const HEALTH_ENDPOINT = '/api/v1/health';

const defaultState: DemoModeState = {
  loading: true,
  isDemo: false,
};

export function useDemoMode(pollIntervalMs?: number) {
  const [state, setState] = useState<DemoModeState>(defaultState);
  const mountedRef = useRef(true);

  const fetchStatus = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: undefined }));
      const response = await fetch(HEALTH_ENDPOINT, {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`Health check failed (${response.status})`);
      }

      const data = (await response.json()) as HealthResponse;

      if (!mountedRef.current) {
        return;
      }

      setState({
        loading: false,
        isDemo: Boolean(data.isDemo || data.demoMode?.active),
        statusMessage:
          data.demoMode?.message || (data.isDemo ? 'Running in demonstration mode' : undefined),
        reason: data.demoMode?.reason,
        features: data.demoMode?.features,
        lastUpdated: Date.now(),
      });
    } catch (error) {
      if (!mountedRef.current) {
        return;
      }

      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unable to detect demo mode',
      }));
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchStatus();

    if (pollIntervalMs && pollIntervalMs > 0) {
      const id = setInterval(() => {
        fetchStatus();
      }, pollIntervalMs);

      return () => {
        mountedRef.current = false;
        clearInterval(id);
      };
    }

    return () => {
      mountedRef.current = false;
    };
  }, [fetchStatus, pollIntervalMs]);

  const refresh = useCallback(() => {
    return fetchStatus();
  }, [fetchStatus]);

  return {
    state,
    refresh,
  };
}
