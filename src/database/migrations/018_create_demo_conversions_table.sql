-- Migration: Create Demo Conversions Table
-- Description: Tracks conversion events from demo sessions (e.g., demo to signup)
-- Created: 2024-01-15

CREATE TABLE IF NOT EXISTS demo_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(100) NOT NULL,
  conversion_type VARCHAR(50) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (session_id) REFERENCES demo_sessions(session_id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_demo_conversions_session ON demo_conversions(session_id);
CREATE INDEX idx_demo_conversions_type ON demo_conversions(conversion_type);
CREATE INDEX idx_demo_conversions_created ON demo_conversions(created_at DESC);

-- Composite index for conversion rate queries
CREATE INDEX idx_demo_conversions_type_created ON demo_conversions(conversion_type, created_at DESC);

-- GIN index for metadata
CREATE INDEX idx_demo_conversions_metadata ON demo_conversions USING GIN (metadata);

-- Comments
COMMENT ON TABLE demo_conversions IS 'Tracks conversion events from demo sessions';
COMMENT ON COLUMN demo_conversions.session_id IS 'Reference to demo session';
COMMENT ON COLUMN demo_conversions.conversion_type IS 'Type of conversion (e.g., SIGNUP, CONTACT_SALES, DOWNLOAD)';
COMMENT ON COLUMN demo_conversions.metadata IS 'Additional conversion metadata (JSON)';

-- Create a view for conversion analytics
CREATE OR REPLACE VIEW demo_conversion_analytics AS
SELECT
  dc.conversion_type,
  COUNT(*) AS conversion_count,
  COUNT(DISTINCT dc.session_id) AS unique_sessions,
  AVG(EXTRACT(EPOCH FROM (dc.created_at - ds.started_at))) AS avg_time_to_convert,
  ds.user_role,
  DATE(dc.created_at) AS conversion_date
FROM demo_conversions dc
JOIN demo_sessions ds ON dc.session_id = ds.session_id
GROUP BY dc.conversion_type, ds.user_role, DATE(dc.created_at);

COMMENT ON VIEW demo_conversion_analytics IS 'Aggregated conversion analytics by type and role';
