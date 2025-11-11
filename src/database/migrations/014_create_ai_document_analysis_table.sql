-- Migration: Create AI Document Analysis Table
-- Description: Stores AI analysis results for documents including quality scores, extracted data, and anomalies
-- Created: 2024-01-15

CREATE TABLE IF NOT EXISTS ai_document_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  analysis_type VARCHAR(50) NOT NULL,
  quality_score INTEGER CHECK (quality_score >= 0 AND quality_score <= 100),
  extracted_data JSONB,
  anomalies JSONB,
  summary TEXT,
  recommendations JSONB,
  confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  processing_time_ms INTEGER,
  ai_provider VARCHAR(50),
  model_version VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_ai_analysis_document ON ai_document_analysis(document_id);
CREATE INDEX idx_ai_analysis_quality ON ai_document_analysis(quality_score);
CREATE INDEX idx_ai_analysis_created ON ai_document_analysis(created_at DESC);
CREATE INDEX idx_ai_analysis_type ON ai_document_analysis(analysis_type);
CREATE INDEX idx_ai_analysis_provider ON ai_document_analysis(ai_provider);

-- GIN index for JSONB columns for efficient querying
CREATE INDEX idx_ai_analysis_extracted_data ON ai_document_analysis USING GIN (extracted_data);
CREATE INDEX idx_ai_analysis_anomalies ON ai_document_analysis USING GIN (anomalies);
CREATE INDEX idx_ai_analysis_recommendations ON ai_document_analysis USING GIN (recommendations);

-- Comments
COMMENT ON TABLE ai_document_analysis IS 'Stores AI analysis results for uploaded documents';
COMMENT ON COLUMN ai_document_analysis.analysis_type IS 'Type of analysis performed (e.g., document_intelligence, ocr, classification)';
COMMENT ON COLUMN ai_document_analysis.quality_score IS 'Document quality score from 0-100';
COMMENT ON COLUMN ai_document_analysis.extracted_data IS 'Structured data extracted from document (JSON)';
COMMENT ON COLUMN ai_document_analysis.anomalies IS 'Detected anomalies and issues (JSON array)';
COMMENT ON COLUMN ai_document_analysis.summary IS 'AI-generated summary of document';
COMMENT ON COLUMN ai_document_analysis.recommendations IS 'AI recommendations for document improvement (JSON array)';
COMMENT ON COLUMN ai_document_analysis.confidence IS 'Confidence score of analysis (0-1)';
COMMENT ON COLUMN ai_document_analysis.processing_time_ms IS 'Time taken to process in milliseconds';
COMMENT ON COLUMN ai_document_analysis.ai_provider IS 'AI service provider used (e.g., azure, openai)';
COMMENT ON COLUMN ai_document_analysis.model_version IS 'Version of AI model used';
