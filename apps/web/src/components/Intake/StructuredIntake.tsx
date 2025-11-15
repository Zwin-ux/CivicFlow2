'use client';

/**
 * StructuredIntake - Institutional intake form for applicants
 * Captures EIN, business name, address, NAICS, revenue, years operating.
 * Shows confidence scores and highlights missing fields.
 * Optimistic UI: shows session started instantly; reconciles when server responds.
 */

import { useState } from 'react';
import { startIntakeSession } from '@/app/actions/intake';

interface ExtractedField {
  value: string;
  confidence: number;
  source?: string;
}

interface IntakeFormData {
  sessionId?: string;
  ein: ExtractedField | null;
  businessName: ExtractedField | null;
  address: ExtractedField | null;
  naics: ExtractedField | null;
  revenue: ExtractedField | null;
  yearsOperating: ExtractedField | null;
  phone: ExtractedField | null;
  email: ExtractedField | null;
  loading?: boolean;
  error?: string;
}

interface StructuredIntakeProps {
  onComplete?: (sessionId: string, data: IntakeFormData) => void;
  initialData?: Partial<IntakeFormData>;
  demoMode?: boolean;
}

const ConfidenceBadge = ({ confidence }: { confidence: number }) => {
  const percentage = Math.round(confidence * 100);
  let bgColor = 'var(--cc-success)'; // high confidence
  if (percentage < 70) bgColor = 'var(--cc-warning)';
  if (percentage < 50) bgColor = 'var(--cc-error)';

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-2"
      style={{
        backgroundColor: `${bgColor}20`,
        color: bgColor,
      }}
    >
      {percentage}% confident
    </span>
  );
};

const FormField = ({
  label,
  value,
  confidence,
  required,
  onChange,
  error,
}: {
  label: string;
  value: string;
  confidence?: number;
  required?: boolean;
  onChange: (val: string) => void;
  error?: string;
}) => {
  return (
    <div className="mb-6">
      <label className="block mb-2" style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>
        {label}
        {required && <span style={{ color: 'var(--cc-error)' }}>*</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-2 border"
        style={{
          borderColor: error ? 'var(--cc-error)' : 'var(--cc-border)',
          fontSize: 'var(--text-sm)',
          fontFamily: 'var(--font-sans)',
        }}
      />
      {confidence && (
        <div className="mt-2 flex items-center justify-between">
          <ConfidenceBadge confidence={confidence} />
          {confidence < 0.8 && (
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--cc-muted)' }}>
              Please verify
            </span>
          )}
        </div>
      )}
      {error && (
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--cc-error)', marginTop: '0.5rem' }}>
          {error}
        </p>
      )}
    </div>
  );
};

export default function StructuredIntake({
  onComplete,
  initialData,
  demoMode = false,
}: StructuredIntakeProps) {
  const [formData, setFormData] = useState<IntakeFormData>({
    sessionId: initialData?.sessionId,
    ein: initialData?.ein || null,
    businessName: initialData?.businessName || null,
    address: initialData?.address || null,
    naics: initialData?.naics || null,
    revenue: initialData?.revenue || null,
    yearsOperating: initialData?.yearsOperating || null,
    phone: initialData?.phone || null,
    email: initialData?.email || null,
    loading: false,
    error: undefined,
  });

  const handleStartSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormData((prev) => ({ ...prev, loading: true, error: undefined }));

    try {
      const result = await startIntakeSession({
        demoMode,
        initialEIN: formData.ein?.value,
      });

      if (result.error) {
        setFormData((prev) => ({ ...prev, error: result.error, loading: false }));
        return;
      }

      setFormData((prev) => ({
        ...prev,
        sessionId: result.sessionId,
        ein: result.ein || prev.ein,
        businessName: result.businessName || prev.businessName,
        address: result.address || prev.address,
        naics: result.naics || prev.naics,
        revenue: result.revenue || prev.revenue,
        yearsOperating: result.yearsOperating || prev.yearsOperating,
        loading: false,
      }));

      if (onComplete && result.sessionId) {
        onComplete(result.sessionId, { ...formData, sessionId: result.sessionId });
      }
    } catch (err) {
      setFormData((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to start intake session',
        loading: false,
      }));
    }
  };

  return (
    <div className="cf-ready" style={{ maxWidth: '600px', margin: '0 auto', padding: 'var(--s-8)' }}>
      <div className="mb-8">
        <h1 style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--s-2)' }}>
          Applicant Information
        </h1>
        <p style={{ color: 'var(--cc-muted)', fontSize: 'var(--text-sm)' }}>
          Enter or verify your business details. We'll extract what we can automatically.
        </p>
      </div>

      <form onSubmit={handleStartSession}>
        <FormField
          label="EIN (Employer Identification Number)"
          value={formData.ein?.value || ''}
          confidence={formData.ein?.confidence}
          required
          onChange={(val) =>
            setFormData((prev) => ({
              ...prev,
              ein: prev.ein ? { ...prev.ein, value: val } : { value: val, confidence: 0 },
            }))
          }
          error={formData.error}
        />

        <FormField
          label="Business Name"
          value={formData.businessName?.value || ''}
          confidence={formData.businessName?.confidence}
          required
          onChange={(val) =>
            setFormData((prev) => ({
              ...prev,
              businessName: prev.businessName
                ? { ...prev.businessName, value: val }
                : { value: val, confidence: 0 },
            }))
          }
        />

        <FormField
          label="Street Address"
          value={formData.address?.value || ''}
          confidence={formData.address?.confidence}
          required
          onChange={(val) =>
            setFormData((prev) => ({
              ...prev,
              address: prev.address ? { ...prev.address, value: val } : { value: val, confidence: 0 },
            }))
          }
        />

        <FormField
          label="NAICS Code"
          value={formData.naics?.value || ''}
          confidence={formData.naics?.confidence}
          onChange={(val) =>
            setFormData((prev) => ({
              ...prev,
              naics: prev.naics ? { ...prev.naics, value: val } : { value: val, confidence: 0 },
            }))
          }
        />

        <FormField
          label="Annual Revenue"
          value={formData.revenue?.value || ''}
          confidence={formData.revenue?.confidence}
          onChange={(val) =>
            setFormData((prev) => ({
              ...prev,
              revenue: prev.revenue ? { ...prev.revenue, value: val } : { value: val, confidence: 0 },
            }))
          }
        />

        <FormField
          label="Years Operating"
          value={formData.yearsOperating?.value || ''}
          confidence={formData.yearsOperating?.confidence}
          onChange={(val) =>
            setFormData((prev) => ({
              ...prev,
              yearsOperating: prev.yearsOperating
                ? { ...prev.yearsOperating, value: val }
                : { value: val, confidence: 0 },
            }))
          }
        />

        <FormField
          label="Phone"
          value={formData.phone?.value || ''}
          onChange={(val) =>
            setFormData((prev) => ({
              ...prev,
              phone: prev.phone ? { ...prev.phone, value: val } : { value: val, confidence: 0 },
            }))
          }
        />

        <FormField
          label="Email"
          value={formData.email?.value || ''}
          onChange={(val) =>
            setFormData((prev) => ({
              ...prev,
              email: prev.email ? { ...prev.email, value: val } : { value: val, confidence: 0 },
            }))
          }
        />

        <button
          type="submit"
          disabled={formData.loading}
          className="w-full py-3 rounded-2 font-medium"
          style={{
            backgroundColor: 'var(--cc-accent)',
            color: 'white',
            cursor: formData.loading ? 'not-allowed' : 'pointer',
            opacity: formData.loading ? 0.6 : 1,
            transition: `background-color var(--dur-micro) ease, opacity var(--dur-micro) ease`,
            fontSize: 'var(--text-sm)',
          }}
          onMouseEnter={(e) => {
            if (!formData.loading) {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--cc-accent-dark)';
            }
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--cc-accent)';
          }}
        >
          {formData.loading ? 'Starting intake...' : 'Start Intake Session'}
        </button>

        {formData.sessionId && (
          <div
            className="mt-6 p-4 rounded-2"
            style={{
              backgroundColor: 'var(--cc-accent-light)',
              borderLeft: '4px solid var(--cc-accent)',
            }}
          >
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--cc-text)' }}>
              ✓ Intake session started: <code>{formData.sessionId}</code>
            </p>
          </div>
        )}
      </form>
    </div>
  );
}
