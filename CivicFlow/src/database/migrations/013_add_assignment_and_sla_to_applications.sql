-- Migration: Add assignment and SLA tracking columns to applications table
-- Description: Extends applications table with assignment and SLA deadline tracking

-- Add assignment tracking columns
ALTER TABLE applications 
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS sla_deadline TIMESTAMP;

-- Create indexes for dashboard performance
CREATE INDEX IF NOT EXISTS idx_applications_assigned_to_new ON applications(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_applications_sla_deadline ON applications(sla_deadline) WHERE sla_deadline IS NOT NULL;

-- Comments for documentation
COMMENT ON COLUMN applications.assigned_to IS 'User ID of the loan officer assigned to this application';
COMMENT ON COLUMN applications.assigned_at IS 'Timestamp when the application was assigned';
COMMENT ON COLUMN applications.sla_deadline IS 'Calculated SLA deadline based on program rules and submission time';
