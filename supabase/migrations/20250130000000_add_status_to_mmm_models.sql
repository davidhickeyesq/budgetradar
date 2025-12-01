-- Add status column to mmm_models table
-- Tracks model fitting status: 'success', 'failed', 'insufficient_data', etc.

ALTER TABLE mmm_models
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'success';

-- Update existing rows to have 'success' status (they were successfully fitted)
UPDATE mmm_models SET status = 'success' WHERE status IS NULL;
