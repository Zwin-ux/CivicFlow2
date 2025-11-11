-- Migration: Create Anomaly Detections Table
-- Description: Stores detected anomalies and potential fraud indicators in applications
-- Created: 2024-01-15

CREATE TABLE IF NOT EXISTS anomaly_detections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  anomaly_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  description TEXT NOT NULL,
  evidence JSONB,
  confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'REVIEWED', 'RESOLVED', 'FALSE_POSITIVE')),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP,
  resolution_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_anomaly_application ON anomaly_detections(application_id);
CREATE INDEX idx_anomaly_document ON anomaly_detections(document_id);
CREATE INDEX idx_anomaly_severity ON anomaly_detections(severity);
CREATE INDEX idx_anomaly_status ON anomaly_detections(status);
CREATE INDEX idx_anomaly_type ON anomaly_detections(anomaly_type);
CREATE INDEX idx_anomaly_created ON anomaly_detections(created_at DESC);
CREATE INDEX idx_anomaly_reviewed ON anomaly_detections(reviewed_at DESC);

-- Composite index for common queries
CREATE INDEX idx_anomaly_app_status ON anomaly_detections(application_id, status);
CREATE INDEX idx_anomaly_severity_status ON anomaly_detections(severity, status);

-- GIN index for JSONB evidence column
CREATE INDEX idx_anomaly_evidence ON anomaly_detections USING GIN (evidence);

-- Comments
COMMENT ON TABLE anomaly_detections IS 'Stores detected anomalies and potential fraud indicators';
COMMENT ON COLUMN anomaly_detections.anomaly_type IS 'Type of anomaly (e.g., IMAGE_MANIPULATION, INCONSISTENCY, MISSING_INFO)';
COMMENT ON COLUMN anomaly_detections.severity IS 'Severity level of the anomaly';
COMMENT ON COLUMN anomaly_detections.description IS 'Detailed description of the anomaly';
COMMENT ON COLUMN anomaly_detections.evidence IS 'Supporting evidence for the anomaly (JSON)';
COMMENT ON COLUMN anomaly_detections.confidence IS 'Confidence score of detection (0-1)';
COMMENT ON COLUMN anomaly_detections.status IS 'Current status of anomaly review';
COMMENT ON COLUMN anomaly_detections.reviewed_by IS 'User who reviewed the anomaly';
COMMENT ON COLUMN anomaly_detections.reviewed_at IS 'Timestamp when anomaly was reviewed';
COMMENT ON COLUMN anomaly_detections.resolution_notes IS 'Notes from reviewer about resolution';
