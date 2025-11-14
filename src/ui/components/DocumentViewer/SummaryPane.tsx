import React from 'react';

export type ExtractionField = {
  label: string;
  value: string;
  confidence?: number;
};

export type DocumentSummaryProps = {
  fileName: string;
  status: 'accepted' | 'needs_attention' | 'processing';
  qualityScore?: number;
  riskScore?: number;
  fields?: ExtractionField[];
  suggestions?: string[];
};

export const SummaryPane: React.FC<DocumentSummaryProps> = ({
  fileName,
  status,
  qualityScore,
  riskScore,
  fields = [],
  suggestions = [],
}) => {
  const badgeClass =
    status === 'accepted'
      ? 'bg-green-500/15 text-green-200'
      : status === 'needs_attention'
      ? 'bg-rose-500/15 text-rose-200'
      : 'bg-cc-muted/15 text-cc-muted';

  return (
    <aside className="grid gap-s-8 rounded-r-4 border border-cc-muted/10 bg-cc-surface p-s-12 shadow-cc-md">
      <header className="flex items-start justify-between gap-s-4">
        <div>
          <p className="text-sm text-cc-muted">Document</p>
          <h2 className="text-lg font-semibold leading-tight">{fileName}</h2>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${badgeClass}`}>
          {status.replace('_', ' ')}
        </span>
      </header>
      <section className="grid grid-cols-2 gap-s-4">
        <Metric label="Quality" value={qualityScore} />
        <Metric label="Risk" value={riskScore} invert />
      </section>
      <section aria-label="Extraction summary" className="grid gap-s-4">
        <h3 className="text-sm font-semibold text-cc-text">Extracted fields</h3>
        <dl className="grid gap-s-4">
          {fields.length === 0 && (
            <p className="text-sm text-cc-muted">
              AI extraction running. Hang tight—this usually clears in under two seconds.
            </p>
          )}
          {fields.map(field => (
            <div key={field.label} className="rounded-r-2 border border-cc-muted/10 bg-cc-surface-soft px-s-8 py-s-4">
              <dt className="text-xs uppercase tracking-wide text-cc-muted">{field.label}</dt>
              <dd className="text-sm text-cc-text">
                {field.value}
                {typeof field.confidence === 'number' && (
                  <span className="ml-2 text-xs text-cc-muted">{Math.round(field.confidence * 100)}%</span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </section>
      {suggestions.length > 0 && (
        <section aria-label="Suggestions" className="grid gap-s-4">
          <h3 className="text-sm font-semibold text-cc-text">Recommendations</h3>
          <ul className="space-y-s-2 text-sm text-cc-muted">
            {suggestions.map(suggestion => (
              <li key={suggestion} className="rounded-r-2 border border-cc-muted/15 px-s-8 py-s-4">
                {suggestion}
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  );
};

type MetricProps = {
  label: string;
  value?: number;
  invert?: boolean;
};

const Metric: React.FC<MetricProps> = ({ label, value, invert }) => {
  const display = typeof value === 'number' ? `${value}%` : '--';
  const sentiment =
    typeof value === 'number'
      ? value >= 80
        ? invert
          ? 'text-rose-200'
          : 'text-green-200'
        : value >= 50
        ? 'text-cc-text'
        : invert
        ? 'text-green-200'
        : 'text-rose-200'
      : 'text-cc-muted';

  return (
    <article className="rounded-r-2 border border-cc-muted/10 bg-cc-surface-soft px-s-8 py-s-4">
      <p className="text-xs uppercase tracking-wide text-cc-muted">{label}</p>
      <p className={`text-xl font-semibold ${sentiment}`}>{display}</p>
    </article>
  );
};

export default SummaryPane;
