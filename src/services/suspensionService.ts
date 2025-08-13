import { supabase } from '../supabaseClient';

/**
 * Check if a user is currently suspended using direct SQL query
 */
export async function isUserSuspended(userId: string): Promise<boolean> {
  console.log('🔍 Checking suspension status for user:', userId);

  try {
    // Use direct SQL query since REST API might not be accessible
    const { data, error } = await supabase.rpc('check_user_suspended', {
      user_id_param: userId
    });

    if (error) {
      console.log('❌ RPC call failed, trying direct query:', error);

      // Fallback to direct SQL query
      const { data: queryData, error: queryError } = await supabase
        .from('suspended_users')
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .limit(1);

      if (queryError) {
        console.log('❌ Direct query also failed:', queryError);
        return false;
      }

      const isSuspended = queryData && queryData.length > 0;
      console.log(`🎯 User suspension status (direct): ${isSuspended ? 'SUSPENDED' : 'ACTIVE'}`);
      return isSuspended;
    }

    console.log(`🎯 User suspension status (RPC): ${data ? 'SUSPENDED' : 'ACTIVE'}`);
    return !!data;
  } catch (error) {
    console.error('💥 Error checking user suspension status:', error);
    return false; // Default to not suspended if check fails
  }
}

/**
 * Get suspension details for a user
 */
export async function getUserSuspensionDetails(userId: string) {
  try {
    const { data, error } = await supabase
      .from('suspended_users')
      .select(`
        id,
        suspended_at,
        reason,
        suspended_by,
        users!suspended_by(full_name, email)
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (error) {
      console.log('Could not fetch suspension details:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error fetching suspension details:', error);
    return null;
  }
}

/**
 * Suspend a user using direct SQL
 */
export async function suspendUser(userId: string, suspendedBy: string, reason: string = 'Suspended by admin') {
  try {
    // Use direct SQL to insert suspension record
    const { data, error } = await supabase.rpc('suspend_user_direct', {
      user_id_param: userId,
      suspended_by_param: suspendedBy,
      reason_param: reason
    });

    if (error) {
      console.error('Error suspending user via RPC:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error in suspendUser:', error);
    return { success: false, error: 'Failed to suspend user' };
  }
}

/**
 * Unsuspend a user using direct SQL
 */
export async function unsuspendUser(userId: string) {
  try {
    const { data, error } = await supabase.rpc('unsuspend_user_direct', {
      user_id_param: userId
    });

    if (error) {
      console.error('Error unsuspending user via RPC:', error);
      return { success: false, error: error.message };
    }

    return { success: true, removed: data };
  } catch (error) {
    console.error('Error in unsuspendUser:', error);
    return { success: false, error: 'Failed to unsuspend user' };
  }
}

/**
 * Get all currently suspended users (for admin use)
 */
export async function getAllSuspendedUsers() {
  try {
    const { data, error } = await supabase
      .from('suspended_users')
      .select(`
        id,
        user_id,
        suspended_at,
        reason,
        suspended_by,
        users!user_id(full_name, email),
        admin:users!suspended_by(full_name, email)
      `)
      .eq('is_active', true)
      .order('suspended_at', { ascending: false });

    if (error) {
      console.error('Error fetching suspended users:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getAllSuspendedUsers:', error);
    return [];
  }
}

/**
 * Universal login suspension check - Use this in ANY login process
 * Returns { allowed: boolean, error?: string, details?: any }
 */
export async function checkLoginAllowed(userId: string, userEmail?: string) {
  console.log('🔐 Checking if login is allowed for user:', userId, userEmail);

  try {
    const isSuspended = await isUserSuspended(userId);

    if (isSuspended) {
      const details = await getUserSuspensionDetails(userId);
      const suspendedDate = details?.suspended_at
        ? new Date(details.suspended_at).toLocaleDateString()
        : 'Unknown';

      const errorMessage = `Your account has been suspended on ${suspendedDate}. Reason: ${details?.reason || 'No reason provided'}. Please contact support for assistance.`;

      console.log('🚫 Login blocked - user is suspended');
      return {
        allowed: false,
        error: errorMessage,
        details: details
      };
    }

    console.log('✅ Login allowed - user is not suspended');
    return {
      allowed: true
    };
  } catch (error) {
    console.error('💥 Error checking login permission:', error);
    // If check fails, allow login (fail-safe)
    return {
      allowed: true,
      error: 'Could not verify account status'
    };
  }
}

/**
 * Middleware function to add to any Supabase auth state change
 * Call this whenever a user signs in
 */
export async function validateUserSession(user: any) {
  if (!user?.id) return { valid: true };

  const loginCheck = await checkLoginAllowed(user.id, user.email);

  if (!loginCheck.allowed) {
    // Import Supabase client and sign out the user
    const { supabase } = await import('../supabaseClient');
    await supabase.auth.signOut();

    return {
      valid: false,
      error: loginCheck.error,
      details: loginCheck.details
    };
  }

  return { valid: true };
}

/**
 * Test function to debug suspension system
 */
export async function testSuspensionSystem(userId: string) {
  console.log('🧪 Testing suspension system for user:', userId);

  try {
    // Check all records for this user
    const { data: allRecords, error: allError } = await supabase
      .from('suspended_users')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    console.log('📋 All suspension records:', allRecords);
    console.log('❌ Query errors:', allError);

    // Check active suspensions
    const { data: activeRecords, error: activeError } = await supabase
      .from('suspended_users')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    console.log('🔴 Active suspension records:', activeRecords);
    console.log('❌ Active query errors:', activeError);

    // Test the main function
    const isSuspended = await isUserSuspended(userId);
    console.log('🎯 Final suspension status:', isSuspended);

    return {
      allRecords,
      activeRecords,
      isSuspended,
      errors: { allError, activeError }
    };
  } catch (error) {
    console.error('💥 Test failed:', error);
    return { error };
  }
}
