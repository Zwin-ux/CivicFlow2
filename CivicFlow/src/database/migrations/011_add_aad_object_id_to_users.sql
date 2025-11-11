-- Add AAD Object ID to users table for Teams integration
-- This allows mapping Teams users to system users

ALTER TABLE users ADD COLUMN IF NOT EXISTS aad_object_id VARCHAR(255);

-- Create unique index on aad_object_id for faster lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_aad_object_id ON users(aad_object_id) WHERE aad_object_id IS NOT NULL;

-- Add comment explaining the field
COMMENT ON COLUMN users.aad_object_id IS 'Azure Active Directory Object ID for Microsoft Teams integration';
