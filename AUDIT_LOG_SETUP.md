# Audit Log Setup Instructions

## Quick Setup

To enable audit logging in your admin panel, you need to create the `audit_logs` table in your Supabase database.

### Step 1: Go to Supabase Dashboard
1. Open your Supabase project dashboard
2. Navigate to **SQL Editor**

### Step 2: Run the Setup Script
Copy and paste the following SQL script into the SQL Editor and run it:

```sql
-- Create audit_logs table
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_name ON audit_logs(user_name);

-- Enable Row Level Security
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for super admins to access all audit logs
CREATE POLICY IF NOT EXISTS "Super admins can access all audit logs" ON audit_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid()::text 
      AND users.role = 'super_admin'
    )
  );

-- Create policy for admins to access their own audit logs
CREATE POLICY IF NOT EXISTS "Admins can access their own audit logs" ON audit_logs
  FOR SELECT USING (
    user_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid()::text 
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- Grant necessary permissions
GRANT ALL ON audit_logs TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Insert initial system event
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
```

### Step 3: Verify Setup
1. After running the script, go to your admin panel
2. Navigate to **Audit Log** (visible only to super admins)
3. You should see the initial system event

## What Gets Logged

Once set up, the audit log will automatically track:

### User Management
- ✅ User login and logout events
- ✅ User creation, updates, and deletions
- ✅ Password changes (self and admin-initiated)
- ✅ Profile updates

### Admin Management
- ✅ Admin role assignments and demotions
- ✅ Location assignments for regional admins
- ✅ Permission changes

### Order Management
- ✅ Interest/order status changes
- ✅ Order approvals and rejections

### System Events
- ✅ Cover image updates
- ✅ Data exports
- ✅ Configuration changes

### Security Events
- ✅ Failed login attempts
- ✅ Unauthorized access attempts
- ✅ Suspicious activities

## Features Available

### For Super Admins
- **Complete Audit Trail**: View all system activities
- **Advanced Filtering**: Filter by user, action, resource type, severity, date range
- **Search Functionality**: Search across all audit events
- **Statistics Dashboard**: View activity statistics and trends
- **Export Capability**: Export audit logs to CSV for compliance
- **Real-time Monitoring**: See activities as they happen

### Security & Compliance
- **IP Address Tracking**: Records user IP addresses
- **User Agent Logging**: Tracks browser/device information
- **Severity Levels**: Categorizes events by importance (low, medium, high, critical)
- **Detailed Context**: Stores comprehensive event details in JSON format
- **Tamper-proof**: Audit logs cannot be modified by users

## Troubleshooting

### If Audit Log Page Shows Setup Screen
1. Verify the `audit_logs` table exists in your database
2. Check that RLS policies are properly configured
3. Ensure your user has super_admin role

### If No Events Are Being Logged
1. Check browser console for any errors
2. Verify table permissions are correctly set
3. Ensure the user performing actions is properly authenticated

### Performance Considerations
- The audit log table includes optimized indexes
- Consider periodic cleanup of old logs (script provided in `/sql/setup-audit-logs.sql`)
- Monitor table size for high-activity systems

## Support

If you encounter any issues with the audit log setup:
1. Check the browser console for error messages
2. Verify all SQL commands executed successfully
3. Ensure your Supabase project has the latest schema updates

The audit logging system provides comprehensive tracking for compliance, security monitoring, and administrative oversight of your application.
