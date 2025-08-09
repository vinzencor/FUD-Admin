-- Audit Logs Setup Script for Supabase
-- Run this script in the Supabase SQL Editor to set up audit logging

-- 1. Create the exec_sql function (needed for dynamic table creation)
CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;

-- 2. Create the audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'low',
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_name ON audit_logs(user_name);

-- 4. Enable Row Level Security
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 5. Create policy for super admins to access all audit logs
CREATE POLICY IF NOT EXISTS "Super admins can access all audit logs" ON audit_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid()::text 
      AND users.role = 'super_admin'
    )
  );

-- 6. Create policy for admins to access their own audit logs
CREATE POLICY IF NOT EXISTS "Admins can access their own audit logs" ON audit_logs
  FOR SELECT USING (
    user_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid()::text 
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- 7. Grant necessary permissions
GRANT ALL ON audit_logs TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- 8. Insert initial system event
INSERT INTO audit_logs (
  user_id,
  user_name,
  user_email,
  action,
  resource_type,
  details,
  severity
) VALUES (
  'system',
  'System',
  'system@admin.com',
  'system_initialized',
  'system',
  '{"message": "Audit logging system initialized", "setup_date": "' || NOW()::text || '"}',
  'medium'
);

-- 9. Create a function to get audit log statistics (optional)
CREATE OR REPLACE FUNCTION get_audit_log_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_events', (SELECT COUNT(*) FROM audit_logs),
    'today_events', (SELECT COUNT(*) FROM audit_logs WHERE DATE(timestamp) = CURRENT_DATE),
    'critical_events', (SELECT COUNT(*) FROM audit_logs WHERE severity = 'critical'),
    'unique_users', (SELECT COUNT(DISTINCT user_id) FROM audit_logs),
    'last_event', (SELECT MAX(timestamp) FROM audit_logs)
  ) INTO result;
  
  RETURN result;
END;
$$;

-- 10. Create a function to clean old audit logs (optional)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM audit_logs 
  WHERE timestamp < NOW() - INTERVAL '1 day' * days_to_keep
  AND severity NOT IN ('critical', 'high'); -- Keep important events longer
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log the cleanup action
  INSERT INTO audit_logs (
    user_id,
    user_name,
    user_email,
    action,
    resource_type,
    details,
    severity
  ) VALUES (
    'system',
    'System',
    'system@admin.com',
    'audit_logs_cleanup',
    'system',
    json_build_object('deleted_count', deleted_count, 'days_kept', days_to_keep),
    'low'
  );
  
  RETURN deleted_count;
END;
$$;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Audit logging system setup completed successfully!';
  RAISE NOTICE 'Table: audit_logs created with proper indexes and RLS policies';
  RAISE NOTICE 'Functions: exec_sql, get_audit_log_stats, cleanup_old_audit_logs created';
  RAISE NOTICE 'Initial system event logged';
END $$;
