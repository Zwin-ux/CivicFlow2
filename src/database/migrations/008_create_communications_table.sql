-- Create communication type enum
CREATE TYPE communication_type AS ENUM (
  'EMAIL',
  'SMS',
  'PORTAL_MESSAGE'
);

-- Create communication status enum
CREATE TYPE communication_status AS ENUM (
  'PENDING',
  'SENT',
  'FAILED',
  'BOUNCED'
);

-- Create communications table
CREATE TABLE IF NOT EXISTS communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  recipient VARCHAR(255) NOT NULL,
  type communication_type NOT NULL,
  template_type email_template_type,
  subject TEXT,
  body TEXT NOT NULL,
  status communication_status NOT NULL DEFAULT 'PENDING',
  sent_at TIMESTAMP,
  failure_reason TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_communications_application_id ON communications(application_id);
CREATE INDEX idx_communications_recipient ON communications(recipient);
CREATE INDEX idx_communications_status ON communications(status);
CREATE INDEX idx_communications_type ON communications(type);
CREATE INDEX idx_communications_created_at ON communications(created_at DESC);
CREATE INDEX idx_communications_app_created ON communications(application_id, created_at DESC);
CREATE INDEX idx_communications_metadata ON communications USING GIN(metadata);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_communications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_communications_updated_at
  BEFORE UPDATE ON communications
  FOR EACH ROW
  EXECUTE FUNCTION update_communications_updated_at();

-- Add comment
COMMENT ON TABLE communications IS 'Stores all communications sent to applicants and staff with delivery status tracking';
