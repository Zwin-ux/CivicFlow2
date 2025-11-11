-- Migration: Create AI Model Metrics Table
-- Description: Stores performance metrics for AI models to track accuracy and performance over time
-- Created: 2024-01-15

CREATE TABLE IF NOT EXISTS ai_model_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name VARCHAR(100) NOT NULL,
  model_version VARCHAR(50) NOT NULL,
  metric_type VARCHAR(50) NOT NULL,
  metric_value DECIMAL(10,4),
  sample_size INTEGER,
  measurement_date DATE NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_model_metrics_name ON ai_model_metrics(model_name, measurement_date DESC);
CREATE INDEX idx_model_metrics_type ON ai_model_metrics(metric_type);
CREATE INDEX idx_model_metrics_date ON ai_model_metrics(measurement_date DESC);
CREATE INDEX idx_model_metrics_name_version ON ai_model_metrics(model_name, model_version);

-- Composite index for time-series queries
CREATE INDEX idx_model_metrics_name_type_date ON ai_model_metrics(model_name, metric_type, measurement_date DESC);

-- GIN index for metadata
CREATE INDEX idx_model_metrics_metadata ON ai_model_metrics USING GIN (metadata);

-- Comments
COMMENT ON TABLE ai_model_metrics IS 'Stores performance metrics for AI models';
COMMENT ON COLUMN ai_model_metrics.model_name IS 'Name of the AI model (e.g., document-analyzer, fraud-detector)';
COMMENT ON COLUMN ai_model_metrics.model_version IS 'Version of the model';
COMMENT ON COLUMN ai_model_metrics.metric_type IS 'Type of metric (e.g., accuracy, precision, recall, processing_time)';
COMMENT ON COLUMN ai_model_metrics.metric_value IS 'Value of the metric';
COMMENT ON COLUMN ai_model_metrics.sample_size IS 'Number of samples used to calculate metric';
COMMENT ON COLUMN ai_model_metrics.measurement_date IS 'Date when metric was measured';
COMMENT ON COLUMN ai_model_metrics.metadata IS 'Additional metadata about the measurement (JSON)';

-- Create a view for latest metrics by model
CREATE OR REPLACE VIEW ai_model_latest_metrics AS
SELECT DISTINCT ON (model_name, metric_type)
  id,
  model_name,
  model_version,
  metric_type,
  metric_value,
  sample_size,
  measurement_date,
  metadata,
  created_at
FROM ai_model_metrics
ORDER BY model_name, metric_type, measurement_date DESC;

COMMENT ON VIEW ai_model_latest_metrics IS 'Latest metrics for each model and metric type';
