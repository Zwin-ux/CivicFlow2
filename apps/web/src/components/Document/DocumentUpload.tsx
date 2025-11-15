'use client';

/**
 * DocumentUpload - Drag-drop file upload with progress tracking
 * Supports multiple files, shows real-time validation progress.
 * Keyboard-accessible, ARIA labels for screen readers.
 */

import { useState, useRef } from 'react';
import { uploadDocuments, pollJobStatus } from '@/app/actions/documents';

interface UploadedFile {
  file: File;
  jobId?: string;
  status?: 'uploading' | 'processing' | 'complete' | 'error';
  progress?: number;
  error?: string;
  result?: any;
}

interface DocumentUploadProps {
  sessionId: string;
  onComplete?: (results: any[]) => void;
  maxFiles?: number;
}

const ProgressBar = ({ progress }: { progress: number }) => {
  return (
    <div
      className="w-full h-2 rounded-full overflow-hidden"
      style={{ backgroundColor: 'var(--cc-border)' }}
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full transition-all duration-300"
        style={{
          width: `${progress}%`,
          backgroundColor: 'var(--cc-accent)',
        }}
      />
    </div>
  );
};

export default function DocumentUpload({
  sessionId,
  onComplete,
  maxFiles = 5,
}: DocumentUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [allComplete, setAllComplete] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    await addFiles(droppedFiles);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      await addFiles(Array.from(e.target.files));
    }
  };

  const addFiles = async (newFiles: File[]) => {
    if (isUploading) return;

    const validFiles = newFiles.filter((f) => {
      if (files.length + validFiles.length >= maxFiles) {
        return false;
      }
      return true;
    });

    const uploadedFiles: UploadedFile[] = validFiles.map((f) => ({
      file: f,
      status: 'uploading',
      progress: 0,
    }));

    setFiles((prev) => [...prev, ...uploadedFiles]);
    setIsUploading(true);

    // Upload each file
    const results = await Promise.all(
      uploadedFiles.map(async (uf, idx) => {
        try {
          const result = await uploadDocuments(sessionId, [uf.file]);

          if (result.error) {
            setFiles((prev) =>
              prev.map((f, i) =>
                i === prev.length - uploadedFiles.length + idx
                  ? { ...f, status: 'error', error: result.error }
                  : f
              )
            );
            return null;
          }

          const jobIds = result.jobIds || [];
          const firstJobId = jobIds[0];

          setFiles((prev) =>
            prev.map((f, i) =>
              i === prev.length - uploadedFiles.length + idx
                ? { ...f, jobId: firstJobId, status: 'processing', progress: 20 }
                : f
            )
          );

          // Poll for completion (max 30 seconds)
          let pollingAttempts = 0;
          const maxAttempts = 60; // 30 seconds at 500ms intervals

          const pollResult = await new Promise((resolve) => {
            const poll = async () => {
              if (pollingAttempts >= maxAttempts) {
                resolve(null);
                return;
              }

              pollingAttempts++;
              const statusResult = await pollJobStatus(firstJobId);

              if (statusResult.error) {
                setFiles((prev) =>
                  prev.map((f, i) =>
                    i === prev.length - uploadedFiles.length + idx
                      ? { ...f, status: 'error', error: statusResult.error }
                      : f
                  )
                );
                resolve(null);
                return;
              }

              const stage = statusResult.stage || 'unknown';
              const stageProgress = ['ingest', 'threat_scan', 'ocr', 'policy', 'ai_review'].indexOf(stage);
              const progress = Math.min(30 + (stageProgress + 1) * 14, 95);

              if (stage === 'complete') {
                setFiles((prev) =>
                  prev.map((f, i) =>
                    i === prev.length - uploadedFiles.length + idx
                      ? { ...f, status: 'complete', progress: 100, result: statusResult }
                      : f
                  )
                );
                resolve(statusResult);
                return;
              }

              setFiles((prev) =>
                prev.map((f, i) =>
                  i === prev.length - uploadedFiles.length + idx ? { ...f, progress } : f
                )
              );

              setTimeout(poll, 500);
            };

            poll();
          });

          return pollResult;
        } catch (err) {
          setFiles((prev) =>
            prev.map((f, i) =>
              i === prev.length - uploadedFiles.length + idx
                ? {
                    ...f,
                    status: 'error',
                    error: err instanceof Error ? err.message : 'Upload failed',
                  }
                : f
            )
          );
          return null;
        }
      })
    );

    setIsUploading(false);
    setAllComplete(true);

    if (onComplete) {
      onComplete(results.filter(Boolean));
    }

    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const hasErrors = files.some((f) => f.status === 'error');
  const allProcessed = files.length > 0 && files.every((f) => f.status === 'complete' || f.status === 'error');

  return (
    <div
      className="cf-ready"
      style={{
        maxWidth: '600px',
        margin: '0 auto',
        padding: 'var(--s-8)',
      }}
    >
      <div className="mb-8">
        <h2 style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--s-2)' }}>
          Upload Supporting Documents
        </h2>
        <p style={{ color: 'var(--cc-muted)', fontSize: 'var(--text-sm)' }}>
          Drag and drop or click to upload business documents (tax returns, financial statements, etc.)
        </p>
      </div>

      {/* Drag-drop zone */}
      {!allComplete && (
        <div
          ref={dragRef}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className="relative cursor-pointer rounded-2 border-2 border-dashed p-8 text-center transition-colors"
          style={{
            borderColor: isDragging ? 'var(--cc-accent)' : 'var(--cc-border)',
            backgroundColor: isDragging ? 'var(--cc-accent-light)' : 'var(--cc-bg-secondary)',
          }}
          role="button"
          tabIndex={0}
          aria-label="Drop files here or click to upload"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              inputRef.current?.click();
            }
          }}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            aria-hidden="true"
            disabled={isUploading}
          />
          <div>
            <p style={{ fontSize: 'var(--text-sm)', fontWeight: 500, marginBottom: 'var(--s-2)' }}>
              {isDragging ? 'Drop files here' : 'Drag files here or click to upload'}
            </p>
            <p style={{ color: 'var(--cc-muted)', fontSize: 'var(--text-xs)' }}>
              Supports PDF, images, and documents up to 25 MB
            </p>
          </div>
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="mt-8" role="region" aria-label="Uploaded files">
          <div style={{ marginBottom: 'var(--s-6)' }}>
            <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: 'var(--s-4)' }}>
              Files ({files.length})
            </h3>
            <div className="space-y-3">
              {files.map((uf, idx) => (
                <div
                  key={idx}
                  className="rounded-2 p-4"
                  style={{
                    backgroundColor: 'var(--cc-bg-secondary)',
                    borderLeft: `4px solid ${
                      uf.status === 'error'
                        ? 'var(--cc-error)'
                        : uf.status === 'complete'
                          ? 'var(--cc-success)'
                          : 'var(--cc-accent)'
                    }`,
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p style={{ fontSize: 'var(--text-sm)', fontWeight: 500, marginBottom: 'var(--s-1)' }}>
                        {uf.file.name}
                      </p>
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--cc-muted)' }}>
                        {(uf.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>

                      {(uf.status === 'uploading' || uf.status === 'processing') && (
                        <div className="mt-3">
                          <ProgressBar progress={uf.progress || 0} />
                          <p
                            style={{
                              fontSize: 'var(--text-xs)',
                              color: 'var(--cc-muted)',
                              marginTop: 'var(--s-1)',
                            }}
                          >
                            {uf.progress}% {uf.status === 'processing' ? 'processing...' : 'uploading...'}
                          </p>
                        </div>
                      )}

                      {uf.status === 'complete' && (
                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--cc-success)', marginTop: 'var(--s-2)' }}>
                          ✓ Processed successfully
                        </p>
                      )}

                      {uf.status === 'error' && (
                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--cc-error)', marginTop: 'var(--s-2)' }}>
                          ✗ {uf.error || 'Upload failed'}
                        </p>
                      )}
                    </div>

                    {uf.status === 'complete' || uf.status === 'error' ? (
                      <button
                        onClick={() => removeFile(idx)}
                        className="text-xs px-3 py-1 rounded"
                        style={{
                          backgroundColor: 'var(--cc-border)',
                          cursor: 'pointer',
                        }}
                        aria-label={`Remove ${uf.file.name}`}
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {allProcessed && (
            <div
              className="rounded-2 p-4"
              style={{
                backgroundColor: hasErrors ? 'var(--cc-error-light)' : 'var(--cc-success-light)',
                borderLeft: `4px solid ${hasErrors ? 'var(--cc-error)' : 'var(--cc-success)'}`,
              }}
            >
              <p style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>
                {hasErrors ? '⚠ Some files had issues' : '✓ All files processed successfully'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
