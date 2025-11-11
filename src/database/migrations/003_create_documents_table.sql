-- Migration: Create documents table
-- Description: Stores uploaded document metadata with classification results

CREATE TYPE document_type AS ENUM (
  'W9',
  'EIN_VERIFICATION',
  'BANK_STATEMENT',
  'TAX_RETURN',
  'BUSINESS_LICENSE',
  'OTHER'
);

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  storage_url TEXT NOT NULL, -- encrypted S3/Blob URL
  document_type document_type,
  classification_confidence DECIMAL(5, 2),
  extracted_data JSONB,
  requires_manual_review BOOLEAN DEFAULT FALSE,
  uploaded_at TIMESTAMP DEFAULT NOW(),
  classified_at TIMESTAMP,
  reviewed_at TIMESTAMP,
  reviewed_by UUID, -- references staff_members(id)
  
  -- Constraints
  CONSTRAINT chk_file_size_positive CHECK (file_size > 0),
  CONSTRAINT chk_classification_confidence_range CHECK (
    classification_confidence IS NULL OR 
    (classification_confidence >= 0 AND classification_confidence <= 100)
  )
);

-- Indexes for performance
CREATE INDEX idx_documents_application_id ON documents(application_id);
CREATE INDEX idx_documents_document_type ON documents(document_type);
CREATE INDEX idx_documents_uploaded_at ON documents(uploaded_at);
CREATE INDEX idx_documents_requires_review ON documents(requires_manual_review) WHERE requires_manual_review = TRUE;
CREATE INDEX idx_documents_classification_confidence ON documents(classification_confidence);

-- Composite indexes
CREATE INDEX idx_documents_app_type ON documents(application_id, document_type);

-- GIN index for JSONB extracted data
CREATE INDEX idx_documents_extracted_data ON documents USING GIN (extracted_data);

-- Comments for documentation
COMMENT ON TABLE documents IS 'Stores uploaded document metadata with ML classification results';
COMMENT ON COLUMN documents.storage_url IS 'Encrypted URL to cloud storage (S3/Azure Blob)';
COMMENT ON COLUMN documents.classification_confidence IS 'ML model confidence score (0-100) for document type classification';
COMMENT ON COLUMN documents.extracted_data IS 'JSON object containing structured data extracted from document (e.g., EIN, business name, account numbers)';
COMMENT ON COLUMN documents.requires_manual_review IS 'Flag set to TRUE when confidence score < 80';
