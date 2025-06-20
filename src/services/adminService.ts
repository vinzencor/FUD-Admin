import { supabase, supabaseAdmin } from '../supabaseClient'
import { User } from '../store/authStore'

export interface AdminUser extends User {
  created_at: string;
  last_sign_in_at: string;
}

// Fetch all users (for super admin)
export async function getAllUsers() {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers()
    
    if (error) throw error
    
    // Map Supabase users to your application's user format
    return data.users.map(user => ({
      id: user.id,
      email: user.email || '',
      name: user.user_metadata?.name || user.email || '',
      role: user.app_metadata?.role || 'buyer',
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
      regions: user.user_metadata?.regions || []
    })) as AdminUser[]
  } catch (error) {
    console.error('Error fetching users:', error)
    return []
  }
}

// Get users for a specific region (for regional admin)
export async function getUsersByRegion(regions: { country: string, name: string }[]) {
  try {
    // First get all users
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .in('region_country', regions.map(r => r.country))
      .in('region_name', regions.map(r => r.name))
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching regional users:', error)
    return []
  }
}

// Update user role
export async function updateUserRole(userId: string, role: string) {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { app_metadata: { role } }
    )
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating user role:', error)
    throw error
  }
}

// Assign regions to admin
export async function assignRegionsToAdmin(userId: string, regions: { country: string, name: string }[]) {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { user_metadata: { regions } }
    )
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error assigning regions:', error)
    throw error
  }
}

/**
 * Updates a user's role in Supabase
 * @param email The email of the user to update
 * @param role The new role to assign ('super_admin', 'admin', etc.)
 */
export async function updateUserRoleByEmail(email: string, role: string) {
  try {
    // First, get the user ID from their email
    const { data: users, error: fetchError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (fetchError) throw fetchError;
    
    const user = users.users.find(u => u.email === email);
    
    if (!user) {
      throw new Error(`User with email ${email} not found`);
    }
    
    // Then update the user's role
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { app_metadata: { role } }
    );
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
}
