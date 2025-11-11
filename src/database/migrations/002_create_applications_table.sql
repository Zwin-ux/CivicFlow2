-- Migration: Create applications table
-- Description: Stores grant/loan applications with status tracking and eligibility scoring

CREATE TYPE application_status AS ENUM (
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'PENDING_DOCUMENTS',
  'APPROVED',
  'REJECTED',
  'DEFERRED'
);

CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id UUID NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
  program_type VARCHAR(100) NOT NULL,
  requested_amount DECIMAL(12, 2) NOT NULL,
  status application_status NOT NULL DEFAULT 'DRAFT',
  eligibility_score DECIMAL(5, 2),
  missing_documents JSONB DEFAULT '[]'::jsonb,
  fraud_flags JSONB DEFAULT '[]'::jsonb,
  assigned_to UUID, -- references staff_members(id), will be added later
  submitted_at TIMESTAMP,
  reviewed_at TIMESTAMP,
  decided_at TIMESTAMP,
  decision JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT chk_requested_amount_positive CHECK (requested_amount > 0),
  CONSTRAINT chk_eligibility_score_range CHECK (eligibility_score >= 0 AND eligibility_score <= 100)
);

-- Indexes for performance optimization
CREATE INDEX idx_applications_applicant_id ON applications(applicant_id);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_applications_program_type ON applications(program_type);
CREATE INDEX idx_applications_submitted_at ON applications(submitted_at);
CREATE INDEX idx_applications_assigned_to ON applications(assigned_to);
CREATE INDEX idx_applications_created_at ON applications(created_at);
CREATE INDEX idx_applications_eligibility_score ON applications(eligibility_score);

-- Composite indexes for common queries
CREATE INDEX idx_applications_status_submitted ON applications(status, submitted_at DESC);
CREATE INDEX idx_applications_program_status ON applications(program_type, status);

-- GIN index for JSONB columns
CREATE INDEX idx_applications_missing_documents ON applications USING GIN (missing_documents);
CREATE INDEX idx_applications_fraud_flags ON applications USING GIN (fraud_flags);

-- Comments for documentation
COMMENT ON TABLE applications IS 'Stores grant/loan applications with status tracking and eligibility scoring';
COMMENT ON COLUMN applications.eligibility_score IS 'Calculated score (0-100) based on program rules';
COMMENT ON COLUMN applications.missing_documents IS 'JSON array of required document types not yet uploaded';
COMMENT ON COLUMN applications.fraud_flags IS 'JSON array of fraud detection flags with severity and evidence';
COMMENT ON COLUMN applications.decision IS 'JSON object containing final decision details, justification, and staff member info';
