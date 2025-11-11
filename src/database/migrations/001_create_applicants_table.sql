-- Migration: Create applicants table
-- Description: Stores micro-business applicant information with encrypted PII

CREATE TABLE IF NOT EXISTS applicants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name VARCHAR(255) NOT NULL,
  ein VARCHAR(20) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  address_line1 VARCHAR(255) NOT NULL,
  address_line2 VARCHAR(255),
  city VARCHAR(100) NOT NULL,
  state VARCHAR(50) NOT NULL,
  zip_code VARCHAR(20) NOT NULL,
  country VARCHAR(100) DEFAULT 'USA',
  owner_first_name VARCHAR(100) NOT NULL,
  owner_last_name VARCHAR(100) NOT NULL,
  owner_ssn TEXT NOT NULL, -- encrypted
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_applicants_ein ON applicants(ein);
CREATE INDEX idx_applicants_email ON applicants(email);
CREATE INDEX idx_applicants_business_name ON applicants(business_name);
CREATE INDEX idx_applicants_created_at ON applicants(created_at);

-- Add unique constraint on EIN
CREATE UNIQUE INDEX idx_applicants_ein_unique ON applicants(ein);

-- Comments for documentation
COMMENT ON TABLE applicants IS 'Stores micro-business applicant information with encrypted PII';
COMMENT ON COLUMN applicants.owner_ssn IS 'Encrypted SSN using AES-256';
COMMENT ON COLUMN applicants.ein IS 'Employer Identification Number';
