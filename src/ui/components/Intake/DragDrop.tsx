import React, { DragEvent, InputHTMLAttributes, useCallback, useRef, useState } from 'react';

export type DragDropProps = {
  label?: string;
  description?: string;
  accept?: InputHTMLAttributes<HTMLInputElement>['accept'];
  maxFiles?: number;
  onFilesAdded: (files: File[]) => void | Promise<void>;
  demoMode?: boolean;
};

export const DragDrop: React.FC<DragDropProps> = ({
  label = 'Drop documents',
  description = 'Drag files here or browse to upload supporting docs.',
  accept = '.pdf,.jpg,.jpeg,.png',
  maxFiles = 6,
  demoMode = true,
  onFilesAdded,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'error'>('idle');

  const handleFiles = useCallback(
    async (files: File[]) => {
      if (!files.length) return;
      setStatus('uploading');
      try {
        const limited = files.slice(0, maxFiles);
        await onFilesAdded(limited);
        setStatus('idle');
      } catch (error) {
        console.error('DragDrop upload failed', error);
        setStatus('error');
        setTimeout(() => setStatus('idle'), 2400);
      }
    },
    [maxFiles, onFilesAdded]
  );

  const onDrop = useCallback(
    async (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(false);
      const dt = event.dataTransfer;
      if (!dt?.files?.length) return;
      await handleFiles(Array.from(dt.files));
    },
    [handleFiles]
  );

  const onBrowse = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <section
      data-demo={demoMode}
      className={`rounded-r-4 border border-cc-muted/10 bg-cc-surface-soft shadow-cc-sm transition duration-gentle ${
        isDragging ? 'outline outline-2 outline-offset-4 outline-cc-accent' : ''
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple
        tabIndex={-1}
        className="sr-only"
        onChange={event => {
          if (event.target.files) {
            handleFiles(Array.from(event.target.files));
            event.target.value = '';
          }
        }}
      />
      <div
        className="flex flex-col gap-s-4 p-s-12 text-cc-text"
        role="button"
        tabIndex={0}
        aria-label={`${label}. ${description}`}
        onClick={onBrowse}
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onBrowse();
          }
        }}
        onDragOver={event => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={event => {
          event.preventDefault();
          setIsDragging(false);
        }}
        onDrop={onDrop}
      >
        <span className="text-sm text-cc-muted">{demoMode ? 'Demo upload' : 'Upload'}</span>
        <h3 className="text-lg font-semibold">{label}</h3>
        <p className="text-sm text-cc-muted">{description}</p>
        <div className="flex flex-wrap gap-s-4 text-xs text-cc-muted">
          <span className="rounded-full border border-cc-muted/30 px-3 py-1">Accepts {accept}</span>
          <span className="rounded-full border border-cc-muted/30 px-3 py-1">Max {maxFiles} files</span>
        </div>
        <div className="flex items-center gap-s-4">
          <button type="button" className="rounded-r-2 bg-cc-accent px-s-8 py-s-4 text-sm font-semibold text-cc-bg">
            Browse files
          </button>
          {status === 'uploading' && <span className="text-sm text-cc-muted">Uploading…</span>}
          {status === 'error' && (
            <span role="status" className="text-sm text-red-300">
              Retry upload
            </span>
          )}
        </div>
      </div>
    </section>
  );
};

export default DragDrop;
