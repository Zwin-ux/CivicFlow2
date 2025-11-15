import { act, renderHook, waitFor } from '@testing-library/react';
import { useDemoMode } from '../useDemoMode';

describe('useDemoMode', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    jest.resetAllMocks();
    global.fetch = originalFetch;
  });

  it('reports demo state when backend confirms demo mode', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        status: 'ok',
        isDemo: true,
        demoMode: {
          active: true,
          message: 'Running in offline showcase mode',
          reason: 'env-var',
          features: {
            database: 'simulated',
            cache: 'in-memory',
          },
        },
      }),
    } as Response;

    const mockFetch = jest.fn().mockResolvedValue(mockResponse);
    global.fetch = mockFetch as unknown as typeof fetch;

    const { result } = renderHook(() => useDemoMode());

    await waitFor(() => expect(result.current.state.loading).toBe(false));

    expect(result.current.state.isDemo).toBe(true);
    expect(result.current.state.statusMessage).toContain('offline showcase');
    expect(result.current.state.features?.database).toBe('simulated');
  });

  it('surfaces errors when the health endpoint fails', async () => {
    const mockResponse = {
      ok: false,
      status: 503,
      json: async () => ({}),
    } as Response;

    const mockFetch = jest.fn().mockResolvedValue(mockResponse);
    global.fetch = mockFetch as unknown as typeof fetch;

    const { result } = renderHook(() => useDemoMode());

    await waitFor(() => expect(result.current.state.loading).toBe(false));
    expect(result.current.state.error).toContain('503');
  });

  it('allows manual refresh to pull updated status', async () => {
    const firstResponse = {
      ok: true,
      json: async () => ({
        status: 'ok',
        isDemo: true,
        demoMode: {
          active: true,
          message: 'initial',
          reason: 'auto-check',
        },
      }),
    } as Response;

    const secondResponse = {
      ok: true,
      json: async () => ({
        status: 'ok',
        isDemo: true,
        demoMode: {
          active: true,
          message: 'refreshed',
          reason: 'manual-check',
        },
      }),
    } as Response;

    const mockFetch = jest
      .fn()
      .mockResolvedValueOnce(firstResponse)
      .mockResolvedValueOnce(secondResponse);
    global.fetch = mockFetch as unknown as typeof fetch;

    const { result } = renderHook(() => useDemoMode());

    await waitFor(() => expect(result.current.state.reason).toBe('auto-check'));

    await act(async () => {
      await result.current.refresh();
    });

    await waitFor(() => expect(result.current.state.reason).toBe('manual-check'));
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
