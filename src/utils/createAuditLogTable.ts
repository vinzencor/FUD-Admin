import { supabase } from '../supabaseClient';

/**
 * Create the audit_logs table in Supabase
 * This function should be called once to set up the audit logging system
 */
export async function createAuditLogTable(): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('Creating audit_logs table...');

    // Since we can't execute complex SQL from the client, we'll provide instructions
    return {
      success: false,
      error: 'Please run the SQL setup script manually in Supabase. Check the /sql/setup-audit-logs.sql file for the complete setup script.'
    };

  } catch (error: any) {
    console.error('Error in createAuditLogTable:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Check if audit_logs table exists
 */
export async function checkAuditLogTableExists(): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('audit_logs')
      .select('id')
      .limit(1);

    // If no error, table exists
    return !error;
  } catch (error) {
    return false;
  }
}

/**
 * Initialize audit logging system
 * Creates table if it doesn't exist and inserts initial system event
 */
export async function initializeAuditLogging(): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if table exists
    const tableExists = await checkAuditLogTableExists();
    
    if (!tableExists) {
      console.log('Audit logs table does not exist, creating...');
      const createResult = await createAuditLogTable();
      
      if (!createResult.success) {
        return createResult;
      }
    }

    // Insert initial system event
    const { error: insertError } = await supabase
      .from('audit_logs')
      .insert({
        user_id: 'system',
        user_name: 'System',
        user_email: 'system@admin.com',
        action: 'system_initialized',
        resource_type: 'system',
        details: JSON.stringify({
          message: 'Audit logging system initialized',
          timestamp: new Date().toISOString()
        }),
        severity: 'medium'
      });

    if (insertError) {
      console.error('Error inserting initial audit log:', insertError);
      return { success: false, error: insertError.message };
    }

    console.log('Audit logging system initialized successfully!');
    return { success: true };

  } catch (error: any) {
    console.error('Error initializing audit logging:', error);
    return { success: false, error: error.message };
  }
}

/**
 * SQL function to execute raw SQL (needs to be created in Supabase)
 * This should be created manually in the Supabase SQL editor:
 * 
 * CREATE OR REPLACE FUNCTION exec_sql(sql text)
 * RETURNS void
 * LANGUAGE plpgsql
 * SECURITY DEFINER
 * AS $$
 * BEGIN
 *   EXECUTE sql;
 * END;
 * $$;
 */
