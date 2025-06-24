-- Add role column to users table for role-based access control
-- This migration adds a role column to the users table to support admin and super_admin roles

-- Add role column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' 
CHECK (role IN ('user', 'admin', 'super_admin'));

-- Add comment to the column
COMMENT ON COLUMN public.users.role IS 'User role for access control: user, admin, or super_admin';

-- Create index for better performance when querying by role
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- Update existing users to have 'user' role if null
UPDATE public.users 
SET role = 'user' 
WHERE role IS NULL;

-- Set up Row Level Security (RLS) policies for role management
-- Only super_admin users can update roles

-- Enable RLS on users table if not already enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to read their own data
CREATE POLICY IF NOT EXISTS "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

-- Policy to allow users to update their own basic data (but not role)
CREATE POLICY IF NOT EXISTS "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id AND 
        (OLD.role IS NOT DISTINCT FROM NEW.role OR 
         EXISTS (
             SELECT 1 FROM public.users 
             WHERE id = auth.uid() AND role = 'super_admin'
         ))
    );

-- Policy to allow super_admin to view all users
CREATE POLICY IF NOT EXISTS "Super admin can view all users" ON public.users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

-- Policy to allow super_admin to update any user (including roles)
CREATE POLICY IF NOT EXISTS "Super admin can update all users" ON public.users
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

-- Policy to allow admin to view all users (read-only)
CREATE POLICY IF NOT EXISTS "Admin can view all users" ON public.users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

-- Grant necessary permissions
GRANT SELECT, UPDATE ON public.users TO authenticated;

-- Create a function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role = 'super_admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check if user is admin or super admin
CREATE OR REPLACE FUNCTION public.is_admin_or_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_or_super_admin() TO authenticated;

-- Insert a default super admin user (update the email to your admin email)
-- You should run this manually with your actual admin user ID
-- INSERT INTO public.users (id, email, role) 
-- VALUES ('your-admin-user-id', 'admin@example.com', 'super_admin')
-- ON CONFLICT (id) DO UPDATE SET role = 'super_admin';

COMMENT ON TABLE public.users IS 'Users table with role-based access control';
