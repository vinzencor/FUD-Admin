import { supabase } from '../supabaseClient';

/**
 * Set up a single super admin user by email
 * This function should be called once during initial setup
 */
export async function setupSuperAdmin(adminEmail: string): Promise<{ success: boolean; message: string }> {
  try {
    // First, check if there's already a super admin
    const { data: existingSuperAdmins, error: checkError } = await supabase
      .from('users')
      .select('id, email, full_name')
      .eq('role', 'super_admin');

    if (checkError) {
      console.error('Error checking existing super admins:', checkError);
      return { 
        success: false, 
        message: `Error checking existing super admins: ${checkError.message}` 
      };
    }

    // If there's already a super admin, ask for confirmation
    if (existingSuperAdmins && existingSuperAdmins.length > 0) {
      const existingAdmin = existingSuperAdmins[0];
      return {
        success: false,
        message: `A super admin already exists: ${existingAdmin.email} (${existingAdmin.full_name}). Only one super admin is allowed.`
      };
    }

    // Find the user by email
    const { data: users, error: findError } = await supabase
      .from('users')
      .select('id, email, full_name, role')
      .eq('email', adminEmail)
      .limit(1);

    if (findError) {
      console.error('Error finding user:', findError);
      return { 
        success: false, 
        message: `Error finding user: ${findError.message}` 
      };
    }

    if (!users || users.length === 0) {
      return { 
        success: false, 
        message: `No user found with email: ${adminEmail}. Please make sure the user has registered first.` 
      };
    }

    const user = users[0];

    // Update the user's role to super_admin
    const { error: updateError } = await supabase
      .from('users')
      .update({ role: 'super_admin' })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating user role:', updateError);
      return { 
        success: false, 
        message: `Error updating user role: ${updateError.message}` 
      };
    }

    return {
      success: true,
      message: `Successfully set ${user.full_name} (${user.email}) as the super admin!`
    };

  } catch (error) {
    console.error('Unexpected error in setupSuperAdmin:', error);
    return { 
      success: false, 
      message: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

/**
 * Reset all super admin roles (for testing purposes)
 * This will set all super_admin users back to 'user' role
 */
export async function resetSuperAdmins(): Promise<{ success: boolean; message: string }> {
  try {
    const { data, error } = await supabase
      .from('users')
      .update({ role: 'user' })
      .eq('role', 'super_admin')
      .select('email, full_name');

    if (error) {
      console.error('Error resetting super admins:', error);
      return { 
        success: false, 
        message: `Error resetting super admins: ${error.message}` 
      };
    }

    const resetCount = data?.length || 0;
    return {
      success: true,
      message: `Successfully reset ${resetCount} super admin(s) to regular user role.`
    };

  } catch (error) {
    console.error('Unexpected error in resetSuperAdmins:', error);
    return { 
      success: false, 
      message: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

/**
 * Get current super admin information
 */
export async function getCurrentSuperAdmin(): Promise<{ success: boolean; data?: any; message: string }> {
  try {
    const { data: superAdmins, error } = await supabase
      .from('users')
      .select('id, email, full_name, created_at')
      .eq('role', 'super_admin');

    if (error) {
      console.error('Error getting super admin:', error);
      return { 
        success: false, 
        message: `Error getting super admin: ${error.message}` 
      };
    }

    if (!superAdmins || superAdmins.length === 0) {
      return {
        success: true,
        message: 'No super admin currently set.'
      };
    }

    return {
      success: true,
      data: superAdmins[0],
      message: `Current super admin: ${superAdmins[0].full_name} (${superAdmins[0].email})`
    };

  } catch (error) {
    console.error('Unexpected error in getCurrentSuperAdmin:', error);
    return { 
      success: false, 
      message: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

/**
 * List all users with their roles (for admin purposes)
 */
export async function listAllUsers(): Promise<{ success: boolean; data?: any[]; message: string }> {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, full_name, role, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error listing users:', error);
      return { 
        success: false, 
        message: `Error listing users: ${error.message}` 
      };
    }

    return {
      success: true,
      data: users || [],
      message: `Found ${users?.length || 0} users.`
    };

  } catch (error) {
    console.error('Unexpected error in listAllUsers:', error);
    return { 
      success: false, 
      message: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}
