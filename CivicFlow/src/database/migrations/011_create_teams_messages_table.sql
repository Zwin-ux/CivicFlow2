-- Migration: Create teams_messages table
-- Description: Tracks Microsoft Teams messages posted for applications

CREATE TABLE IF NOT EXISTS teams_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL,
  message_id VARCHAR(255) NOT NULL,
  channel_id VARCHAR(255) NOT NULL,
  card_type VARCHAR(50) NOT NULL,
  posted_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_teams_messages_application
    FOREIGN KEY (application_id)
    REFERENCES applications(id)
    ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_teams_messages_application_id ON teams_messages(application_id);
CREATE INDEX idx_teams_messages_message_id ON teams_messages(message_id);
CREATE INDEX idx_teams_messages_channel_id ON teams_messages(channel_id);
CREATE INDEX idx_teams_messages_card_type ON teams_messages(card_type);
CREATE INDEX idx_teams_messages_posted_at ON teams_messages(posted_at);

-- Unique constraint to prevent duplicate messages for same application and card type
CREATE UNIQUE INDEX idx_teams_messages_app_card_unique ON teams_messages(application_id, card_type);

-- Comments for documentation
COMMENT ON TABLE teams_messages IS 'Tracks Microsoft Teams messages posted for applications';
COMMENT ON COLUMN teams_messages.application_id IS 'Reference to the application';
COMMENT ON COLUMN teams_messages.message_id IS 'Microsoft Teams message ID for updates';
COMMENT ON COLUMN teams_messages.channel_id IS 'Microsoft Teams channel ID where message was posted';
COMMENT ON COLUMN teams_messages.card_type IS 'Type of Adaptive Card (SUBMISSION, SLA_WARNING, DECISION_READY)';
