'use server';

/**
 * Server action: uploadDocuments & pollJobStatus
 * Handles document upload + real-time polling for validation results
 * Supports multi-file upload and job status tracking
 */

interface UploadResponse {
  jobIds?: string[];
  error?: string;
}

interface JobStatusResponse {
  jobId?: string;
  stage?: string;
  status?: string;
  progress?: number;
  fields?: Record<string, any>;
  error?: string;
}

export async function uploadDocuments(
  sessionId: string,
  files: File[]
): Promise<UploadResponse> {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const endpoint = `${apiBase}/api/v1/sba-demo/upload`;

    const jobIds: string[] = [];

    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sessionId', sessionId);
      formData.append('documentType', 'financial');

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          error: errorData.error?.message || `Upload failed (${response.status})`,
        };
      }

      const data = await response.json();
      if (data.jobId) {
        jobIds.push(data.jobId);
      }
    }

    return { jobIds };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Upload failed',
    };
  }
}

export async function pollJobStatus(jobId: string): Promise<JobStatusResponse> {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const endpoint = `${apiBase}/api/v1/sba-demo/status/${jobId}`;

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        error: errorData.error?.message || `Status check failed (${response.status})`,
      };
    }

    const data = await response.json();
    return {
      jobId: data.jobId,
      stage: data.stage,
      status: data.status,
      progress: data.progress,
      fields: data.fields,
    };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Status check failed',
    };
  }
}
