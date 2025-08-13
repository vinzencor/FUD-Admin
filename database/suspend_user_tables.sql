-- SQL script to create tables for user suspension functionality
-- Run this in your Supabase SQL editor

-- Table to track suspended users
CREATE TABLE IF NOT EXISTS suspended_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    suspended_by UUID REFERENCES users(id),
    suspended_at TIMESTAMP DEFAULT NOW(),
    reason TEXT DEFAULT 'Suspended by admin',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
    -- Removed unique constraint to allow multiple suspension records
);

-- Table to track admin actions (fallback for tracking)
CREATE TABLE IF NOT EXISTS admin_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_type TEXT NOT NULL,
    target_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    performed_by UUID REFERENCES users(id),
    performed_at TIMESTAMP DEFAULT NOW(),
    details JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_suspended_users_user_id ON suspended_users(user_id);
CREATE INDEX IF NOT EXISTS idx_suspended_users_is_active ON suspended_users(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_actions_target_user ON admin_actions(target_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_type ON admin_actions(action_type);

-- Enable Row Level Security (RLS)
ALTER TABLE suspended_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;

-- Create policies for suspended_users table
CREATE POLICY "Super admins can view all suspended users" ON suspended_users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'super_admin'
        )
    );

CREATE POLICY "Users can check their own suspension status" ON suspended_users
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Super admins can insert suspended users" ON suspended_users
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'super_admin'
        )
    );

CREATE POLICY "Super admins can update suspended users" ON suspended_users
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'super_admin'
        )
    );

-- Create policies for admin_actions table
CREATE POLICY "Super admins can view all admin actions" ON admin_actions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'super_admin'
        )
    );

CREATE POLICY "Super admins can insert admin actions" ON admin_actions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'super_admin'
        )
    );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for suspended_users table
CREATE TRIGGER update_suspended_users_updated_at 
    BEFORE UPDATE ON suspended_users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions (adjust as needed for your setup)
-- GRANT ALL ON suspended_users TO authenticated;
-- GRANT ALL ON admin_actions TO authenticated;

-- Optional: Create a view for easy querying of currently suspended users
CREATE OR REPLACE VIEW currently_suspended_users AS
SELECT
    su.user_id,
    u.full_name,
    u.email,
    su.suspended_by,
    admin.full_name as suspended_by_name,
    su.suspended_at,
    su.reason
FROM suspended_users su
JOIN users u ON su.user_id = u.id
LEFT JOIN users admin ON su.suspended_by = admin.id
WHERE su.is_active = true;

-- Grant access to the view
-- GRANT SELECT ON currently_suspended_users TO authenticated;

-- Function to check if user is suspended (for use in RLS policies)
CREATE OR REPLACE FUNCTION is_user_suspended(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM suspended_users
        WHERE suspended_users.user_id = $1
        AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Optional: Add RLS policy to prevent suspended users from accessing data
-- Uncomment these if you want to automatically block suspended users at database level
/*
-- Example: Prevent suspended users from accessing their own data
CREATE POLICY "Suspended users cannot access data" ON users
    FOR ALL USING (
        NOT is_user_suspended(auth.uid())
    );

-- You can add similar policies to other tables as needed
*/
