'use server';

/**
 * Server action: startIntakeSession
 * Calls the Express API backend at /api/v1/sba-demo/start (or intake endpoint)
 * Returns extracted fields with confidence scores
 * Supports demoMode flag for demo session handling
 */

interface IntakeResponse {
  sessionId?: string;
  ein?: { value: string; confidence: number } | undefined;
  businessName?: { value: string; confidence: number } | undefined;
  address?: { value: string; confidence: number } | undefined;
  naics?: { value: string; confidence: number } | undefined;
  revenue?: { value: string; confidence: number } | undefined;
  yearsOperating?: { value: string; confidence: number } | undefined;
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
      body: JSON.stringify({ 
        loanType: '504', // SBA 504 loan as default demo
        applicantName: 'Demo Applicant',
        email: 'demo@example.com',
        seed: initialEIN ? initialEIN.replace(/\D/g, '') : undefined,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        error: (errorData.error?.message || errorData.error) || `Failed to start intake session (${response.status})`,
      };
    }

    const data = await response.json();
    
    // Map response fields to expected format with confidence scores
    return {
      sessionId: data.sessionId,
      ein: data.extractedFields?.ein 
        ? { value: data.extractedFields.ein, confidence: 0.95 }
        : undefined,
      businessName: data.extractedFields?.businessName
        ? { value: data.extractedFields.businessName, confidence: 0.9 }
        : undefined,
      address: data.extractedFields?.address
        ? { value: data.extractedFields.address, confidence: 0.85 }
        : undefined,
      naics: data.extractedFields?.naicsCode
        ? { value: data.extractedFields.naicsCode, confidence: 0.8 }
        : undefined,
      revenue: data.extractedFields?.annualRevenue
        ? { value: data.extractedFields.annualRevenue.toString(), confidence: 0.75 }
        : undefined,
      yearsOperating: data.extractedFields?.yearsInOperation
        ? { value: data.extractedFields.yearsInOperation.toString(), confidence: 0.8 }
        : undefined,
    };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Failed to start intake session',
    };
  }
}
