-- Migration: Create program_rules table
-- Description: Stores configurable eligibility rules for different grant/loan programs

CREATE TABLE IF NOT EXISTS program_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_type VARCHAR(100) NOT NULL,
  program_name VARCHAR(255) NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  rules JSONB NOT NULL,
  active_from TIMESTAMP NOT NULL DEFAULT NOW(),
  active_to TIMESTAMP,
  created_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT chk_version_positive CHECK (version > 0),
  CONSTRAINT chk_active_dates CHECK (active_to IS NULL OR active_to > active_from),
  CONSTRAINT chk_rules_not_empty CHECK (jsonb_typeof(rules) = 'object')
);

-- Indexes for performance
CREATE INDEX idx_program_rules_program_type ON program_rules(program_type);
CREATE INDEX idx_program_rules_active_from ON program_rules(active_from);
CREATE INDEX idx_program_rules_active_to ON program_rules(active_to);
CREATE INDEX idx_program_rules_version ON program_rules(program_type, version DESC);

-- Composite index for finding active rules
CREATE INDEX idx_program_rules_active ON program_rules(program_type, active_from, active_to)
  WHERE active_to IS NULL OR active_to > NOW();

-- GIN index for JSONB rules
CREATE INDEX idx_program_rules_rules ON program_rules USING GIN (rules);

-- Unique constraint to prevent duplicate active versions
CREATE UNIQUE INDEX idx_program_rules_unique_active ON program_rules(program_type, version);

-- Comments for documentation
COMMENT ON TABLE program_rules IS 'Configurable eligibility rules for grant/loan programs with versioning';
COMMENT ON COLUMN program_rules.rules IS 'JSON object containing eligibility criteria, required documents, scoring weights, and thresholds';
COMMENT ON COLUMN program_rules.version IS 'Version number for rule changes (incremented on updates)';
COMMENT ON COLUMN program_rules.active_from IS 'Timestamp when these rules become effective';
COMMENT ON COLUMN program_rules.active_to IS 'Timestamp when these rules expire (NULL for current active rules)';

-- Example rules structure:
-- {
--   "minCreditScore": 600,
--   "maxLoanAmount": 50000,
--   "requiredDocuments": ["W9", "EIN_VERIFICATION", "BANK_STATEMENT"],
--   "eligibilityCriteria": [
--     {"field": "businessAge", "operator": ">=", "value": 1, "weight": 20},
--     {"field": "annualRevenue", "operator": ">=", "value": 25000, "weight": 30}
--   ],
--   "passingScore": 70
-- }
