-- Fix for suspension system unique constraint issue
-- Run this in your Supabase SQL editor to fix the constraint problem

-- Drop the problematic unique constraint
ALTER TABLE suspended_users DROP CONSTRAINT IF EXISTS suspended_users_user_id_is_active_key;

-- Clean up any duplicate records that might exist
-- Keep only the most recent suspension record for each user
DELETE FROM suspended_users 
WHERE id NOT IN (
    SELECT DISTINCT ON (user_id) id 
    FROM suspended_users 
    ORDER BY user_id, created_at DESC
);

-- Optional: Add a partial unique index instead (only for active suspensions)
-- This prevents multiple active suspensions but allows multiple inactive ones
CREATE UNIQUE INDEX IF NOT EXISTS idx_suspended_users_active_unique 
ON suspended_users (user_id) 
WHERE is_active = true;

-- Verify the fix
SELECT 
    user_id,
    COUNT(*) as total_records,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_suspensions,
    MAX(created_at) as latest_record
FROM suspended_users 
GROUP BY user_id
ORDER BY latest_record DESC;
