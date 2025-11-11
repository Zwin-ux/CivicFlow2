-- Migration: Create performance metrics tables
-- Description: Tables for tracking classification accuracy, processing times, and privacy breach alerts

-- Classification validations table
CREATE TABLE IF NOT EXISTS classification_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  predicted_type VARCHAR(50) NOT NULL,
  actual_type VARCHAR(50) NOT NULL,
  confidence_score DECIMAL(5,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
  is_correct BOOLEAN NOT NULL,
  validated_by VARCHAR(100) NOT NULL,
  validated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Privacy breach alerts table
CREATE TABLE IF NOT EXISTS privacy_breach_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  user_id VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  evidence JSONB NOT NULL DEFAULT '{}',
  detected_at TIMESTAMP NOT NULL DEFAULT NOW(),
  acknowledged_at TIMESTAMP,
  acknowledged_by VARCHAR(100),
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_at TIMESTAMP,
  resolved_by VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for classification_validations
CREATE INDEX idx_classification_validations_document_id ON classification_validations(document_id);
CREATE INDEX idx_classification_validations_validated_at ON classification_validations(validated_at DESC);
CREATE INDEX idx_classification_validations_is_correct ON classification_validations(is_correct);
CREATE INDEX idx_classification_validations_predicted_type ON classification_validations(predicted_type);
CREATE INDEX idx_classification_validations_actual_type ON classification_validations(actual_type);

-- Indexes for privacy_breach_alerts
CREATE INDEX idx_privacy_breach_alerts_detected_at ON privacy_breach_alerts(detected_at DESC);
CREATE INDEX idx_privacy_breach_alerts_user_id ON privacy_breach_alerts(user_id);
CREATE INDEX idx_privacy_breach_alerts_severity ON privacy_breach_alerts(severity);
CREATE INDEX idx_privacy_breach_alerts_resolved ON privacy_breach_alerts(resolved);
CREATE INDEX idx_privacy_breach_alerts_alert_type ON privacy_breach_alerts(alert_type);
CREATE INDEX idx_privacy_breach_alerts_evidence ON privacy_breach_alerts USING GIN(evidence);

-- Comments
COMMENT ON TABLE classification_validations IS 'Stores manual validation results for ML document classification to track accuracy';
COMMENT ON TABLE privacy_breach_alerts IS 'Stores detected privacy breach alerts for administrator review';
COMMENT ON COLUMN classification_validations.is_correct IS 'TRUE if predicted_type matches actual_type';
COMMENT ON COLUMN privacy_breach_alerts.evidence IS 'JSON object containing supporting evidence for the alert';
