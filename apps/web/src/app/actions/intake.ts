'use server';

/**
 * Server action: startIntakeSession
 * Calls the Express API backend at /api/v1/sba-demo/start (or intake endpoint)
 * Returns extracted fields with confidence scores
 * Supports demoMode flag for demo session handling
 */

interface IntakeResponse {
  sessionId?: string;
  ein?: { value: string; confidence: number };
  businessName?: { value: string; confidence: number };
  address?: { value: string; confidence: number };
  naics?: { value: string; confidence: number };
  revenue?: { value: string; confidence: number };
  yearsOperating?: { value: string; confidence: number };
  error?: string;
}

export async function startIntakeSession({
  demoMode = true,
  initialEIN,
}: {
  demoMode?: boolean;
  initialEIN?: string;
}): Promise<IntakeResponse> {
  try {
    // Point to the Express API (running on port 3001 in dev)
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const endpoint = `${apiBase}/api/v1/sba-demo/start`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ demoMode, initialEIN }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        error: errorData.error || `Failed to start intake session (${response.status})`,
      };
    }

    const data = await response.json();
    return data;
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Failed to start intake session',
    };
  }
}
