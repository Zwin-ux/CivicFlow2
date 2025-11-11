-- Migration: Create assignment_rules table
-- Description: Stores auto-assignment rules for distributing applications to loan officers

CREATE TABLE IF NOT EXISTS assignment_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  condition JSONB NOT NULL,
  assign_to JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_assignment_rules_priority ON assignment_rules(priority DESC) WHERE is_active = true;
CREATE INDEX idx_assignment_rules_is_active ON assignment_rules(is_active);
CREATE INDEX idx_assignment_rules_name ON assignment_rules(name);

-- Comments for documentation
COMMENT ON TABLE assignment_rules IS 'Stores auto-assignment rules for distributing applications to loan officers';
COMMENT ON COLUMN assignment_rules.name IS 'Descriptive name for the assignment rule';
COMMENT ON COLUMN assignment_rules.priority IS 'Rule priority (higher number = higher priority)';
COMMENT ON COLUMN assignment_rules.condition IS 'JSONB conditions for rule matching (programTypes, amountRange, riskScoreRange, etc.)';
COMMENT ON COLUMN assignment_rules.assign_to IS 'JSONB assignment target configuration (type: USER/ROUND_ROBIN/LEAST_LOADED, userId, userPool)';
COMMENT ON COLUMN assignment_rules.is_active IS 'Whether this rule is currently active';
