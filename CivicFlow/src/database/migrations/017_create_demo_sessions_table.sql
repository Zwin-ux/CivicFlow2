-- Migration: Create Demo Sessions Table
-- Description: Tracks demo mode sessions for analytics and session management
-- Created: 2024-01-15

CREATE TABLE IF NOT EXISTS demo_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(100) UNIQUE NOT NULL,
  user_role VARCHAR(20) NOT NULL CHECK (user_role IN ('APPLICANT', 'REVIEWER', 'APPROVER', 'ADMIN')),
  started_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  last_activity_at TIMESTAMP DEFAULT NOW(),
  interactions JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_demo_session_id ON demo_sessions(session_id);
CREATE INDEX idx_demo_expires ON demo_sessions(expires_at);
CREATE INDEX idx_demo_active ON demo_sessions(is_active);
CREATE INDEX idx_demo_started ON demo_sessions(started_at DESC);
CREATE INDEX idx_demo_role ON demo_sessions(user_role);
CREATE INDEX idx_demo_last_activity ON demo_sessions(last_activity_at DESC);

-- Composite index for active session queries
CREATE INDEX idx_demo_active_expires ON demo_sessions(is_active, expires_at);

-- GIN index for interactions
CREATE INDEX idx_demo_interactions ON demo_sessions USING GIN (interactions);

-- Comments
COMMENT ON TABLE demo_sessions IS 'Tracks demo mode sessions for analytics and management';
COMMENT ON COLUMN demo_sessions.session_id IS 'Unique session identifier';
COMMENT ON COLUMN demo_sessions.user_role IS 'Role selected for demo session';
COMMENT ON COLUMN demo_sessions.started_at IS 'When the demo session started';
COMMENT ON COLUMN demo_sessions.expires_at IS 'When the demo session expires (typically 30 minutes)';
COMMENT ON COLUMN demo_sessions.last_activity_at IS 'Last activity timestamp for session timeout';
COMMENT ON COLUMN demo_sessions.interactions IS 'Array of user interactions during demo (JSON)';
COMMENT ON COLUMN demo_sessions.is_active IS 'Whether the session is currently active';
COMMENT ON COLUMN demo_sessions.ip_address IS 'IP address of demo user';
COMMENT ON COLUMN demo_sessions.user_agent IS 'Browser user agent string';

-- Function to automatically expire old sessions
CREATE OR REPLACE FUNCTION expire_demo_sessions()
RETURNS void AS $$
BEGIN
  UPDATE demo_sessions
  SET is_active = false
  WHERE is_active = true
    AND (expires_at < NOW() OR last_activity_at < NOW() - INTERVAL '30 minutes');
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION expire_demo_sessions IS 'Automatically expires demo sessions that have timed out';

-- Create a view for active demo sessions
CREATE OR REPLACE VIEW active_demo_sessions AS
SELECT
  id,
  session_id,
  user_role,
  started_at,
  expires_at,
  last_activity_at,
  EXTRACT(EPOCH FROM (NOW() - started_at)) AS duration_seconds,
  EXTRACT(EPOCH FROM (expires_at - NOW())) AS time_remaining_seconds,
  jsonb_array_length(interactions) AS interaction_count
FROM demo_sessions
WHERE is_active = true
  AND expires_at > NOW();

COMMENT ON VIEW active_demo_sessions IS 'Currently active demo sessions with calculated durations';
