# OctoDoc — SBA 504 / 5(a) Loan Documentation Drop-off — Demo Specification

Status: Draft

Purpose
-------
This document defines a customer-facing demo for an SBA 504/5(a) loan documentation drop-off system branded as OctoDoc. The goal is to showcase an "agentic" experience where OctoDoc helps applicants gather required documents, accepts uploads, performs lightweight validation (including simulated OCR/metadata checks), and guides users through next steps (scheduling, agent handoff, or submission). The demo should be safe to run without production DB/Redis and should work in demo-mode.

High-level goals
- Provide an approachable UI for applicants to select SBA loan type (504 or 5(a)).
- Allow document uploads (drag & drop + browse).
- Show an adaptive checklist driven by loan type (required/optional docs).
- Provide agentic suggestions: detect missing documents, request substitutions, and offer scheduling or live help options — presented as OctoDoc suggestions.
- Simulate server-side validation (file type, size, basic OCR text extraction) and display results.
- Use in-memory/demo services so demo works offline or when DB/Redis are unavailable.

User personas
- Applicant: wants to upload loan documents and get guidance.
- Loan Processor / Agent (demo view): sees uploaded docs and system recommendations.

UX Flow (happy path)
1. Applicant opens `/demo/sba` (static demo page) and selects loan program: "SBA 504" or "SBA 5(a)".
2. UI displays the required document checklist for the selected loan type.
3. Applicant clicks "Start Demo" which calls POST /api/v1/sba-demo/start. Server returns a demo sessionId for OctoDoc.
4. Applicant uploads documents using the page. Each file POSTs to POST /api/v1/sba-demo/upload with sessionId.
5. Server stores file metadata in-memory and returns a document id + simulated processing job id.
6. UI polls GET /api/v1/sba-demo/status/:jobId or uses websockets to get processing results.
7. Processing includes: virus-scan pass, file-type check, page-count estimate, simulated OCR extracting key fields (TIN, names), and a validation pass/fail with reasons.
8. UI marks documents as Accepted / Needs Attention with inline OctoDoc suggestions (e.g., "We couldn't find the borrower's signature on Page 2 — please upload a signed file").
9. If required docs are missing, UI highlights the missing items and the agent suggests next steps (upload, schedule drop-off, contact agent).
10. Applicant can click "Request agent pickup" which simulates scheduling and returns a confirmation summary.

API contract (demo endpoints)
----------------------------
Base path: /api/v1/sba-demo

POST /start
- Request: { loanType: '504' | '5a', applicantName?: string, email?: string }
- Response 201: { sessionId: string, loanType, expiresAt }
- Errors: 400 invalid loanType

POST /upload
- Request: multipart/form-data with fields: sessionId, file (binary), documentType (optional)
- Response 201: { documentId, jobId, fileName, size, uploadedAt }
- Errors: 400 missing sessionId/file, 413 file too large

GET /status/:jobId
- Response 200: { jobId, status: 'queued'|'processing'|'done'|'failed', result?: { accepted: boolean, reasons?: string[], ocrText?: string, extractedFields?: { [k:string]:string } } }

GET /documents/:sessionId
- Response 200: { documents: [{ documentId, documentType, status, validation: {...} }], requiredChecklist: [ { id, title, required } ] }

POST /validate/:documentId
- Trigger re-validation (simulate heuristics)
- Response 200: { documentId, validation: {...} }

POST /schedule-pickup
- Request: { sessionId, preferredDate, contactPhone }
- Response: 200: { confirmationId, scheduledAt }

GET /analysis/:documentId
- Response 200: { document, validation, analysis } where `analysis` includes quality, AI, risk, suggestion, and processing metadata. 404 if document pending.

GET /analytics/:sessionId
- Response 200: Session-level analytics summary (doc counts, averages, recommended actions).

GET /insights/:sessionId
- Response 200: Bundle of session metadata, analytics, and document snapshots (quality/risk scores, AI summaries, suggestions).

GET /stream/:sessionId (Server-Sent Events)
- Stream payload: { analytics, crm, timeline, documents } emitted every few seconds to keep CRM widgets and doc cards fresh.

GET /control-room/overview
- Response 200: { demoMode, redis, sessions, recentDocuments } used for the on-page control room / observability widget.

Agentic behaviors
- Adaptive checklist: required checklist depends on loanType and dynamically updates when the user uploads files or marks substitutions.
- Auto-scan + classification: detect document type from filename and OCR snippets; if documentType missing, propose one.
- Suggestion engine (rule-based for the demo): examples — missing signature; missing proof of income; low-quality scan (small image resolution); more documents recommended for risk mitigation.
- Conversational hinting (UI-level): brief textual suggestions and CTA buttons ("Re-upload signed copy", "Mark as waived by agent").

Data models (simplified)
- Session: { sessionId, loanType, applicantName?, email?, startedAt, expiresAt }
- Document: { documentId, sessionId, originalName, size, mimeType, uploadedAt, status: 'uploaded'|'processing'|'accepted'|'needs_attention'|'rejected', validation: { accepted:boolean, reasons: string[], ocrText?:string, extractedFields?:object } }

Security & PII considerations (demo)
- This is a demo-only implementation; no PII should be persisted to production DB unless explicitly approved.
- In demo mode, store files metadata and simulated content in-memory and purge after session expiry (30 minutes).
- Mask sensitive fields in logs (SSNs/TINs) if OCR returns them — in demo, return only field presence, not full numbers.
- File size limit: enforce a client + server limit (e.g., 25 MB) to avoid resource exhaustion.

Acceptance criteria
- Applicant can start a demo session and receive a sessionId.
- Applicant can upload 1+ files; each file transitions to processed state with a simulated validation result shown in the UI.
- The demo shows at least two agentic suggestions depending on simple heuristics (missing signature, missing doc type, low OCR confidence).
- All demo data is ephemeral and cleared on session end or expiry.

Edge cases & error handling
- Upload without sessionId -> 400
- Unsupported file type or >limit -> 413/400 with helpful message
- Processing failure -> job status 'failed' with reason
- Session expired -> 401 + UI shows a 'start new demo' button

Implementation notes
- Use the existing demo-mode middleware pipeline (detectDemoMode / bypassAuthForDemo). If demo-mode isn't active, the demo endpoints should still work but rely on the in-memory fallback service.
- Keep everything in `src/services/sbaDemoService.ts` using an in-memory Map. Optionally, persist to Redis if available (best-effort). When persisting to Redis, use the key namespace `octodoc:session:<sessionId>`.
- Processing jobs can be simulated with setTimeouts and randomization for varied outcomes. Provide deterministic behavior via a query param (?seed=) for deterministic demos during demos.
- Provide clear console logs for server events: session start, upload received, processing result, scheduling.

Wireframe & UI notes
- Left column: loan selector + checklist (required docs with green/amber/red state)
- Middle: upload area (drag & drop) + list of uploaded files
- Right: agent suggestions panel (collapsible) + schedule pickup CTA
- Use minimal, plain CSS under `public/css/sba-demo.css` and reuse design tokens in `public/css/design-system` where possible.

Next steps (implementation)
1. Create a spec file (this doc) — done.
2. Implement demo service and route handlers (in-memory). Provide a small API harness and log statements.
3. Add `public/demo-sba.html` and `public/css/sba-demo.css` with JS to call the API and render results.
4. Test locally and iterate on heuristics and UI copy.

Appendix: Example response — upload processing
{
  "jobId": "job-abc123",
  "status": "done",
  "result": {
    "accepted": false,
    "reasons": ["Missing signature", "Low OCR confidence (45%)"],
    "extractedFields": { "borrowerName": "Jane Doe", "TIN_present": true }
  }
}

-- End of spec
