import React from 'react';
import { render, screen } from '@testing-library/react';
import { SummaryPane } from '../DocumentViewer/SummaryPane';

describe('SummaryPane', () => {
  it('renders document info and metrics', () => {
    render(
      <SummaryPane
        fileName="tax-returns.pdf"
        status="accepted"
        qualityScore={92}
        riskScore={18}
        fields={[{ label: 'Borrower', value: 'Jane Doe', confidence: 0.92 }]}
        suggestions={['Request signed Schedule E']}
      />
    );
    expect(screen.getByText(/tax-returns\.pdf/i)).toBeTruthy();
    expect(screen.getAllByText('92%')[0]).toBeTruthy();
    expect(screen.getAllByText('18%')[0]).toBeTruthy();
    expect(screen.getByText(/Jane Doe/i)).toBeTruthy();
    expect(screen.getByText(/Request signed Schedule E/i)).toBeTruthy();
  });

  it('shows placeholder when fields absent', () => {
    render(<SummaryPane fileName="app.pdf" status="processing" />);
    expect(screen.getByText(/AI extraction running/i)).toBeTruthy();
  });
});
