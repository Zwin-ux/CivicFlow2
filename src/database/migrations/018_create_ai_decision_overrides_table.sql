-- Migration: Create AI Decision Overrides Table
-- Description: Stores human overrides of AI recommendations for model improvement
-- Created: 2024

CREATE TABLE IF NOT EXISTS ai_decision_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  ai_recommendation VARCHAR(20) NOT NULL CHECK (ai_recommendation IN ('APPROVE', 'REJECT', 'REQUEST_MORE_INFO')),
  human_decision VARCHAR(20) NOT NULL CHECK (human_decision IN ('APPROVE', 'REJECT', 'REQUEST_MORE_INFO')),
  override_reason TEXT NOT NULL,
  overridden_by UUID NOT NULL REFERENCES users(id),
  overridden_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ai_confidence DECIMAL(3,2) CHECK (ai_confidence >= 0 AND ai_confidence <= 1),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_ai_overrides_application ON ai_decision_overrides(application_id);
CREATE INDEX idx_ai_overrides_date ON ai_decision_overrides(overridden_at DESC);
CREATE INDEX idx_ai_overrides_recommendations ON ai_decision_overrides(ai_recommendation, human_decision);
CREATE INDEX idx_ai_overrides_user ON ai_decision_overrides(overridden_by);

-- Comments
COMMENT ON TABLE ai_decision_overrides IS 'Tracks human overrides of AI decision recommendations for model improvement';
COMMENT ON COLUMN ai_decision_overrides.ai_recommendation IS 'The recommendation made by the AI system';
COMMENT ON COLUMN ai_decision_overrides.human_decision IS 'The actual decision made by the human reviewer';
COMMENT ON COLUMN ai_decision_overrides.override_reason IS 'Explanation for why the human decision differed from AI recommendation';
COMMENT ON COLUMN ai_decision_overrides.ai_confidence IS 'Confidence level of the AI recommendation (0-1)';
