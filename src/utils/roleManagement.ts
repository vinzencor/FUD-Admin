import { supabase } from '../supabaseClient';

export type UserRole = 'user' | 'admin' | 'super_admin';

/**
 * Check if the current user has a specific role
 */
export async function hasRole(role: UserRole): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error checking user role:', error);
      return false;
    }

    return data?.role === role;
  } catch (error) {
    console.error('Error in hasRole:', error);
    return false;
  }
}

/**
 * Check if the current user is an admin or super admin
 */
export async function isAdminOrSuperAdmin(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error checking user role:', error);
      return false;
    }

    return ['admin', 'super_admin'].includes(data?.role || 'user');
  } catch (error) {
    console.error('Error in isAdminOrSuperAdmin:', error);
    return false;
  }
}

/**
 * Check if the current user is a super admin
 */
export async function isSuperAdmin(): Promise<boolean> {
  return hasRole('super_admin');
}

/**
 * Get the current user's role
 */
export async function getCurrentUserRole(): Promise<UserRole> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 'user';

    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error getting user role:', error);
      return 'user';
    }

    return (data?.role as UserRole) || 'user';
  } catch (error) {
    console.error('Error in getCurrentUserRole:', error);
    return 'user';
  }
}

/**
 * Update a user's role (only super admin can do this)
 */
export async function updateUserRole(userId: string, newRole: UserRole): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if current user is super admin
    const isSuper = await isSuperAdmin();
    if (!isSuper) {
      return { success: false, error: 'Only Super Admins can assign roles.' };
    }

    const { error } = await supabase
      .from('users')
      .update({ role: newRole })
      .eq('id', userId);

    if (error) {
      console.error('Error updating user role:', error);
      
      if (error.message?.includes('column "role" of relation "users" does not exist')) {
        return { 
          success: false, 
          error: 'Role management is not set up. Please run the database migration first.' 
        };
      }
      
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error in updateUserRole:', error);
    return { success: false, error: error.message || 'Unknown error occurred' };
  }
}

/**
 * Initialize role management - sets up the first super admin
 * This should be called once during setup
 */
export async function initializeRoleManagement(adminEmail: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Get the user by email
    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', adminEmail)
      .limit(1);

    if (fetchError) {
      return { success: false, error: fetchError.message };
    }

    if (!users || users.length === 0) {
      return { success: false, error: 'User not found with that email' };
    }

    const user = users[0];

    // Update the user to be super admin
    const { error: updateError } = await supabase
      .from('users')
      .update({ role: 'super_admin' })
      .eq('id', user.id);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error in initializeRoleManagement:', error);
    return { success: false, error: error.message || 'Unknown error occurred' };
  }
}

/**
 * Role labels for display
 */
export const roleLabels: Record<UserRole, string> = {
  user: 'User',
  admin: 'Admin',
  super_admin: 'Super Admin'
};

/**
 * Role descriptions
 */
export const roleDescriptions: Record<UserRole, string> = {
  user: 'Basic platform access for buying and selling',
  admin: 'View-only access to admin features - can see members, orders, and interests but cannot edit or delete',
  super_admin: 'Full system access including user management, role assignment, and direct password changes'
};

/**
 * Role colors for UI
 */
export const roleColors: Record<UserRole, string> = {
  user: 'bg-gray-100 text-gray-800',
  admin: 'bg-blue-100 text-blue-800',
  super_admin: 'bg-purple-100 text-purple-800'
};
