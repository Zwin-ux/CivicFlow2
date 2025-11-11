-- Create email template type enum
CREATE TYPE email_template_type AS ENUM (
  'APPLICATION_SUBMITTED',
  'APPLICATION_UNDER_REVIEW',
  'MISSING_DOCUMENTS',
  'APPLICATION_APPROVED',
  'APPLICATION_REJECTED',
  'APPLICATION_DEFERRED',
  'STAFF_SUMMARY'
);

-- Create email_templates table
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type email_template_type NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT NOT NULL,
  variables JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_email_templates_type ON email_templates(template_type);
CREATE INDEX idx_email_templates_active ON email_templates(is_active) WHERE is_active = TRUE;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_email_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_email_templates_updated_at();

-- Add comment
COMMENT ON TABLE email_templates IS 'Stores email templates for applicant and staff notifications';
