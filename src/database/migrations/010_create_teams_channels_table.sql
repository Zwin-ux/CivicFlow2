-- Migration: Create teams_channels table
-- Description: Stores Microsoft Teams channel configuration for program types

CREATE TABLE IF NOT EXISTS teams_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_type VARCHAR(100) NOT NULL UNIQUE,
  team_id VARCHAR(255) NOT NULL,
  channel_id VARCHAR(255) NOT NULL,
  channel_name VARCHAR(255) NOT NULL,
  notification_rules JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_teams_channels_program_type ON teams_channels(program_type);
CREATE INDEX idx_teams_channels_is_active ON teams_channels(is_active) WHERE is_active = true;
CREATE INDEX idx_teams_channels_team_id ON teams_channels(team_id);

-- Comments for documentation
COMMENT ON TABLE teams_channels IS 'Stores Microsoft Teams channel configuration for program types';
COMMENT ON COLUMN teams_channels.program_type IS 'Type of loan program (e.g., SMALL_BUSINESS_LOAN, DISASTER_RELIEF)';
COMMENT ON COLUMN teams_channels.team_id IS 'Microsoft Teams team ID';
COMMENT ON COLUMN teams_channels.channel_id IS 'Microsoft Teams channel ID';
COMMENT ON COLUMN teams_channels.notification_rules IS 'JSONB configuration for notification events (NEW_SUBMISSION, SLA_WARNING, etc.)';
COMMENT ON COLUMN teams_channels.is_active IS 'Whether this Teams integration is currently active';
