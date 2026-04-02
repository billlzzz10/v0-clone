-- Migration: Add API Key management fields to users table
-- Purpose: Enable storage and management of Kilogateway API keys

-- Add API key columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS api_key_encrypted VARCHAR(512),
ADD COLUMN IF NOT EXISTS api_key_source VARCHAR(32),
ADD COLUMN IF NOT EXISTS api_key_validated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS api_key_rotation_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS kilogateway_user_id VARCHAR(255);

-- Add index on api_key_source for faster lookups by source
CREATE INDEX IF NOT EXISTS idx_users_api_key_source 
ON users(api_key_source);

-- Add index on kilogateway_user_id for linking Kilogateway identities
CREATE INDEX IF NOT EXISTS idx_users_kilogateway_user_id 
ON users(kilogateway_user_id);

-- Add index on api_key_validated_at for tracking key validation history
CREATE INDEX IF NOT EXISTS idx_users_api_key_validated_at 
ON users(api_key_validated_at);

-- Add comments for documentation
COMMENT ON COLUMN users.api_key_encrypted IS 'Encrypted Kilogateway API key (encrypted at rest)';
COMMENT ON COLUMN users.api_key_source IS 'Source of API key: "kilogateway" (OAuth), "manual" (user entered), or null (no key)';
COMMENT ON COLUMN users.api_key_validated_at IS 'Timestamp when API key was last validated against Kilogateway';
COMMENT ON COLUMN users.api_key_rotation_date IS 'Timestamp when API key was created or rotated';
COMMENT ON COLUMN users.kilogateway_user_id IS 'Kilogateway user ID for OAuth session linking';
