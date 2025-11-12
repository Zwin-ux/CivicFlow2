# Demo Documents

This directory contains generic sample documents used for demonstration purposes when the system is running in demo mode.

## Document Types

### Tax Returns
- `sample-tax-return-2023.pdf` - Generic business tax return form
- `sample-tax-return-2022.pdf` - Previous year tax return

### Bank Statements
- `sample-bank-statement-q4-2023.pdf` - Recent quarterly bank statement
- `sample-bank-statement-q3-2023.pdf` - Previous quarter statement

### Business Documents
- `sample-business-license.pdf` - Generic business license
- `sample-articles-of-incorporation.pdf` - Company formation documents
- `sample-business-plan.pdf` - Generic business plan template

### Financial Documents
- `sample-profit-loss-statement.pdf` - P&L statement
- `sample-balance-sheet.pdf` - Balance sheet
- `sample-cash-flow-statement.pdf` - Cash flow projection

## Usage

These documents are referenced by the demo data service when applications are viewed in demo mode. They provide realistic document previews without exposing any real applicant data.

## Creating Demo Documents

To add new demo documents:

1. Create a generic, non-sensitive document (no real PII)
2. Save as PDF in this directory
3. Update `src/services/demoDataService.ts` to reference the new document
4. Add appropriate demo indicators when displaying

## Notes

- All documents should be generic and contain no real personal information
- Documents should look professional and realistic
- File sizes should be kept reasonable (< 1MB each)
- Documents are served statically from the public directory
