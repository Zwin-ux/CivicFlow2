-- Migration: Create audit_logs table
-- Description: Immutable audit trail of all system actions with 7-year retention

CREATE TYPE entity_type AS ENUM (
  'APPLICATION',
  'DOCUMENT',
  'APPLICANT',
  'USER',
  'SYSTEM',
  'PROGRAM_RULE',
  'COMMUNICATION'
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type VARCHAR(100) NOT NULL,
  entity_type entity_type NOT NULL,
  entity_id UUID NOT NULL,
  performed_by VARCHAR(100) NOT NULL, -- user ID or 'SYSTEM'
  confidence_score DECIMAL(5, 2),
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMP DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT chk_confidence_score_range CHECK (
    confidence_score IS NULL OR 
    (confidence_score >= 0 AND confidence_score <= 100)
  )
);

-- Indexes for performance on frequently queried fields
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX idx_audit_logs_performed_by ON audit_logs(performed_by);
CREATE INDEX idx_audit_logs_entity_id ON audit_logs(entity_id);

-- Composite indexes for common query patterns
CREATE INDEX idx_audit_logs_entity_timestamp ON audit_logs(entity_type, entity_id, timestamp DESC);
CREATE INDEX idx_audit_logs_user_timestamp ON audit_logs(performed_by, timestamp DESC);

-- GIN index for JSONB details
CREATE INDEX idx_audit_logs_details ON audit_logs USING GIN (details);

-- Partial index for system actions
CREATE INDEX idx_audit_logs_system_actions ON audit_logs(timestamp DESC) 
  WHERE performed_by = 'SYSTEM';

-- Comments for documentation
COMMENT ON TABLE audit_logs IS 'Immutable audit trail of all automated and manual actions (7-year retention for compliance)';
COMMENT ON COLUMN audit_logs.action_type IS 'Type of action performed (e.g., APPLICATION_SUBMITTED, DOCUMENT_CLASSIFIED, DECISION_MADE)';
COMMENT ON COLUMN audit_logs.confidence_score IS 'Confidence score for automated actions (0-100)';
COMMENT ON COLUMN audit_logs.details IS 'JSON object containing action-specific details and context';
COMMENT ON COLUMN audit_logs.performed_by IS 'User ID for manual actions or SYSTEM for automated actions';

-- Prevent updates and deletes to maintain immutability
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs are immutable and cannot be modified or deleted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_audit_log_update
  BEFORE UPDATE ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_modification();

CREATE TRIGGER trigger_prevent_audit_log_delete
  BEFORE DELETE ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_modification();
