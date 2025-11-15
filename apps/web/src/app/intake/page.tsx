'use client';

/**
 * Intake Flow Page - Orchestrates the complete intake workflow
 * Steps:
 * 1. Intake form (applicant info)
 * 2. Document upload (tax returns, financial statements)
 * 3. Validation (real-time processing)
 * 4. Results (extracted fields + next steps)
 */

import { useState } from 'react';
import StructuredIntake from '@/components/Intake/StructuredIntake';
import DocumentUpload from '@/components/Document/DocumentUpload';

type IntakeStep = 'intro' | 'form' | 'upload' | 'results';

interface IntakeSession {
  sessionId?: string;
  extractedFields?: Record<string, any>;
  documents?: any[];
  uploadResults?: any[];
}

export default function IntakePage() {
  const [step, setStep] = useState<IntakeStep>('intro');
  const [session, setSession] = useState<IntakeSession>({});

  const handleIntakeComplete = (sessionId: string, data: any) => {
    setSession((prev) => ({
      ...prev,
      sessionId,
      extractedFields: {
        ein: data.ein?.value,
        businessName: data.businessName?.value,
        address: data.address?.value,
        naics: data.naics?.value,
        revenue: data.revenue?.value,
        yearsOperating: data.yearsOperating?.value,
        phone: data.phone?.value,
        email: data.email?.value,
      },
    }));
    setStep('upload');
  };

  const handleDocumentsComplete = (results: any[]) => {
    setSession((prev) => ({
      ...prev,
      uploadResults: results,
    }));
    setStep('results');
  };

  return (
    <div className="cf-ready min-h-screen" style={{ backgroundColor: 'var(--cc-bg-primary)' }}>
      {/* Progress indicator */}
      <div
        className="sticky top-0 z-40"
        style={{
          backgroundColor: 'var(--cc-bg-secondary)',
          borderBottom: '1px solid var(--cc-border)',
          paddingTop: 'var(--s-4)',
          paddingBottom: 'var(--s-4)',
        }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            {['intro', 'form', 'upload', 'results'].map((s, idx) => (
              <div key={s} className="flex items-center">
                <div
                  className="flex items-center justify-center rounded-full"
                  style={{
                    width: '32px',
                    height: '32px',
                    backgroundColor:
                      s === step || (['form', 'upload', 'results'].includes(s) && ['form', 'upload', 'results'].includes(step))
                        ? 'var(--cc-accent)'
                        : 'var(--cc-border)',
                    color:
                      s === step || (['form', 'upload', 'results'].includes(s) && ['form', 'upload', 'results'].includes(step))
                        ? 'white'
                        : 'var(--cc-muted)',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 600,
                  }}
                >
                  {idx + 1}
                </div>
                {idx < 3 && (
                  <div
                    style={{
                      width: '24px',
                      height: '2px',
                      backgroundColor:
                        (['form', 'upload', 'results'].includes(s) && ['form', 'upload', 'results'].includes(step))
                          ? 'var(--cc-accent)'
                          : 'var(--cc-border)',
                      marginLeft: '12px',
                      marginRight: '12px',
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="py-12">
        {step === 'intro' && (
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h1 style={{ fontSize: 'var(--text-4xl)', fontWeight: 700, marginBottom: 'var(--s-4)' }}>
                SBA 504 Loan Application
              </h1>
              <p style={{ fontSize: 'var(--text-lg)', color: 'var(--cc-muted)', marginBottom: 'var(--s-8)' }}>
                Let's get your business information and supporting documents.
              </p>
            </div>

            <div
              className="rounded-2 p-8 mb-8"
              style={{
                backgroundColor: 'var(--cc-bg-secondary)',
                borderLeft: '4px solid var(--cc-accent)',
              }}
            >
              <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, marginBottom: 'var(--s-4)' }}>
                What We'll Need
              </h2>
              <ul style={{ listStylePosition: 'inside', color: 'var(--cc-text)', lineHeight: '1.8' }}>
                <li>✓ Business information (EIN, name, address)</li>
                <li>✓ Industry classification (NAICS code)</li>
                <li>✓ Financial overview (revenue, years operating)</li>
                <li>✓ Supporting documents (tax returns, statements)</li>
              </ul>
            </div>

            <button
              onClick={() => setStep('form')}
              className="w-full py-3 rounded-2 font-medium"
              style={{
                backgroundColor: 'var(--cc-accent)',
                color: 'white',
                cursor: 'pointer',
                fontSize: 'var(--text-sm)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--cc-accent-dark)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--cc-accent)';
              }}
            >
              Start Application
            </button>
          </div>
        )}

        {step === 'form' && (
          <StructuredIntake onComplete={handleIntakeComplete} demoMode={true} />
        )}

        {step === 'upload' && session.sessionId && (
          <DocumentUpload sessionId={session.sessionId} onComplete={handleDocumentsComplete} />
        )}

        {step === 'results' && (
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <div
                className="inline-flex items-center justify-center rounded-full mb-4"
                style={{
                  width: '64px',
                  height: '64px',
                  backgroundColor: 'var(--cc-success-light)',
                }}
              >
                <span style={{ fontSize: '32px' }}>✓</span>
              </div>
              <h1 style={{ fontSize: 'var(--text-4xl)', fontWeight: 700, marginBottom: 'var(--s-2)' }}>
                Application Submitted
              </h1>
              <p style={{ fontSize: 'var(--text-lg)', color: 'var(--cc-muted)', marginBottom: 'var(--s-8)' }}>
                Thank you! Your application is being reviewed.
              </p>
            </div>

            {/* Extracted fields summary */}
            {session.extractedFields && (
              <div
                className="rounded-2 p-8 mb-8"
                style={{
                  backgroundColor: 'var(--cc-bg-secondary)',
                }}
              >
                <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, marginBottom: 'var(--s-6)' }}>
                  Extracted Information
                </h2>
                <div className="grid grid-cols-2 gap-6">
                  {Object.entries(session.extractedFields).map(([key, value]) => (
                    <div key={key}>
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--cc-muted)', marginBottom: 'var(--s-1)' }}>
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </p>
                      <p style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>
                        {value || '—'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Documents summary */}
            {session.uploadResults && session.uploadResults.length > 0 && (
              <div
                className="rounded-2 p-8 mb-8"
                style={{
                  backgroundColor: 'var(--cc-bg-secondary)',
                }}
              >
                <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, marginBottom: 'var(--s-6)' }}>
                  Processed Documents ({session.uploadResults.length})
                </h2>
                <div className="space-y-4">
                  {session.uploadResults.map((result: any, idx: number) => (
                    <div
                      key={idx}
                      className="rounded p-4"
                      style={{
                        backgroundColor: 'var(--cc-bg-primary)',
                        borderLeft: '4px solid var(--cc-success)',
                      }}
                    >
                      <p style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>
                        ✓ Document {idx + 1} processed
                      </p>
                      {result.fields && (
                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--cc-muted)', marginTop: 'var(--s-2)' }}>
                          {Object.keys(result.fields || {}).length} fields extracted
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Next steps */}
            <div className="space-y-4">
              <button
                onClick={() => {
                  setStep('intro');
                  setSession({});
                }}
                className="w-full py-3 rounded-2 font-medium"
                style={{
                  backgroundColor: 'var(--cc-accent)',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: 'var(--text-sm)',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--cc-accent-dark)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--cc-accent)';
                }}
              >
                Start New Application
              </button>
              <a
                href="/demo"
                className="block text-center py-3 rounded-2 font-medium"
                style={{
                  backgroundColor: 'var(--cc-bg-secondary)',
                  color: 'var(--cc-accent)',
                  cursor: 'pointer',
                  fontSize: 'var(--text-sm)',
                  textDecoration: 'none',
                  border: '1px solid var(--cc-border)',
                }}
              >
                Back to Demo
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
