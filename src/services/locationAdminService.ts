import { supabase } from '../supabaseClient';

export interface AdminLocation {
  country?: string;
  city?: string;
  district?: string;
  streets?: string[];
}

export interface LocationFilterOptions {
  country?: string;
  city?: string;
  district?: string;
  streets?: string[];
}

export interface LocationHierarchy {
  country: string;
  cities: {
    name: string;
    districts: {
      name: string;
      streets: string[];
    }[];
  }[];
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'super_admin';
  assignedLocation: AdminLocation | null;
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'inactive';
  assignedBy?: string; // ID of super admin who assigned the location
  assignedByName?: string; // Name of super admin who assigned the location
  assignedDate?: string; // Date when location was assigned
}

export interface AdminActivityStats {
  managedUsers: number;
  managedFarmers: number;
  managedOrders: number;
  lastActivity: string;
}

/**
 * Get admin's assigned location
 */
export async function getAdminAssignedLocation(userId: string): Promise<AdminLocation | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('admin_assigned_location')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching admin location:', error);
      return null;
    }

    return data?.admin_assigned_location || null;
  } catch (error) {
    console.error('Error in getAdminAssignedLocation:', error);
    return null;
  }
}

/**
 * Set admin's assigned location (super admin only)
 */
export async function setAdminAssignedLocation(
  userId: string, 
  location: AdminLocation
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('users')
      .update({ admin_assigned_location: location })
      .eq('id', userId);

    if (error) {
      console.error('Error setting admin location:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in setAdminAssignedLocation:', error);
    return false;
  }
}

/**
 * Promote user to admin with location assignment
 */
export async function promoteUserToAdmin(
  userId: string, 
  location: AdminLocation
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('users')
      .update({ 
        role: 'admin',
        admin_assigned_location: location 
      })
      .eq('id', userId);

    if (error) {
      console.error('Error promoting user to admin:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in promoteUserToAdmin:', error);
    return false;
  }
}

/**
 * Demote admin to regular user
 */
export async function demoteAdminToUser(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('users')
      .update({ 
        role: 'user',
        admin_assigned_location: null 
      })
      .eq('id', userId);

    if (error) {
      console.error('Error demoting admin to user:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in demoteAdminToUser:', error);
    return false;
  }
}



/**
 * Get all unique countries from users table
 */
export async function getAllCountries(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('country')
      .not('country', 'is', null)
      .not('country', 'eq', '');

    if (error) {
      console.error('Error fetching countries:', error);
      return [];
    }

    const countries = [...new Set(data?.map(user => user.country).filter(Boolean))] as string[];
    return countries.sort();
  } catch (error) {
    console.error('Error in getAllCountries:', error);
    return [];
  }
}

/**
 * Get all unique cities for a country from users table
 */
export async function getCitiesForCountry(country: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('city')
      .ilike('country', `%${country}%`)
      .not('city', 'is', null)
      .not('city', 'eq', '');

    if (error) {
      console.error('Error fetching cities:', error);
      return [];
    }

    const cities = [...new Set(data?.map(user => user.city).filter(Boolean))] as string[];
    return cities.sort();
  } catch (error) {
    console.error('Error in getCitiesForCountry:', error);
    return [];
  }
}

/**
 * Get all unique districts for a city from users table
 * Note: Since we don't have a district field yet, we'll extract from address or use state as district
 */
export async function getDistrictsForCity(country: string, city: string): Promise<string[]> {
  try {
    // For now, we'll use state as district until we add proper district field
    const { data, error } = await supabase
      .from('users')
      .select('state')
      .ilike('country', `%${country}%`)
      .ilike('city', `%${city}%`)
      .not('state', 'is', null)
      .not('state', 'eq', '');

    if (error) {
      console.error('Error fetching districts:', error);
      return [];
    }

    const districts = [...new Set(data?.map(user => user.state).filter(Boolean))] as string[];
    return districts.sort();
  } catch (error) {
    console.error('Error in getDistrictsForCity:', error);
    return [];
  }
}

/**
 * Get all unique streets for a district from users table
 * Note: Since we don't have a street field yet, we'll extract from address field
 */
export async function getStreetsForDistrict(country: string, city: string, district: string): Promise<string[]> {
  try {
    // Try to get addresses and extract street information
    const { data, error } = await supabase
      .from('users')
      .select('mobile_phone') // Using phone as placeholder for address until we add proper address field
      .ilike('country', `%${country}%`)
      .ilike('city', `%${city}%`)
      .ilike('state', `%${district}%`)
      .not('mobile_phone', 'is', null)
      .not('mobile_phone', 'eq', '');

    if (error) {
      console.error('Error fetching streets:', error);
      return [];
    }

    // For now, return mock street data based on the location
    // In a real implementation, you would parse actual address data
    const mockStreets = [
      `Main Street, ${city}`,
      `King Street, ${city}`,
      `Queen Street, ${city}`,
      `First Avenue, ${city}`,
      `Second Avenue, ${city}`,
      `Central Boulevard, ${city}`,
      `Park Road, ${city}`,
      `Market Street, ${city}`
    ];

    return mockStreets.slice(0, Math.min(5, data?.length || 3)); // Return subset based on actual user count
  } catch (error) {
    console.error('Error in getStreetsForDistrict:', error);
    return [];
  }
}

/**
 * Build location filter for SQL queries with street-level granularity
 */
export function buildLocationFilter(location: AdminLocation | null): string {
  if (!location) return '';

  const conditions: string[] = [];

  if (location.country) {
    conditions.push(`country ILIKE '%${location.country}%'`);
  }
  if (location.city) {
    conditions.push(`city ILIKE '%${location.city}%'`);
  }
  if (location.district) {
    conditions.push(`state ILIKE '%${location.district}%'`); // Using state field as district for now
  }
  // Note: Street filtering would require additional address parsing once we have proper address fields

  return conditions.length > 0 ? `AND (${conditions.join(' AND ')})` : '';
}

/**
 * Get location-filtered user IDs for complex queries with street-level filtering
 */
export async function getLocationFilteredUserIds(location: AdminLocation | null): Promise<string[]> {
  if (!location) return [];

  try {
    let query = supabase.from('users').select('id');

    if (location.country) {
      query = query.ilike('country', `%${location.country}%`);
    }
    if (location.city) {
      query = query.ilike('city', `%${location.city}%`);
    }
    if (location.district) {
      query = query.ilike('state', `%${location.district}%`); // Using state field as district for now
    }
    // TODO: Add street-level filtering once we have proper address fields

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching location-filtered user IDs:', error);
      return [];
    }

    return data?.map(user => user.id) || [];
  } catch (error) {
    console.error('Error in getLocationFilteredUserIds:', error);
    return [];
  }
}

/**
 * Check if user has location-based admin restrictions
 */
export function hasLocationRestrictions(userRole: string, assignedLocation: AdminLocation | null): boolean {
  return userRole === 'admin' && assignedLocation !== null;
}

/**
 * Format location for display with street-level hierarchy
 */
export function formatLocationDisplay(location: AdminLocation | null): string {
  if (!location) return 'Global Access';

  const parts: string[] = [];

  // Add streets if available
  if (location.streets && location.streets.length > 0) {
    if (location.streets.length === 1) {
      parts.push(location.streets[0]);
    } else {
      parts.push(`${location.streets.length} streets`);
    }
  }

  // Add district, city, country in hierarchy order
  if (location.district) {
    const districtName = location.district.includes('District')
      ? location.district
      : `${location.district} District`;
    parts.push(districtName);
  }
  if (location.city) parts.push(location.city);
  if (location.country) parts.push(location.country);

  return parts.length > 0 ? parts.join(', ') : 'Global Access';
}

/**
 * Format location for compact display (for tables/cards)
 */
export function formatLocationCompact(location: AdminLocation | null): string {
  if (!location) return 'Global Access';

  const parts: string[] = [];

  // For compact display, show streets count and district
  if (location.streets && location.streets.length > 0) {
    parts.push(`${location.streets.length} street${location.streets.length > 1 ? 's' : ''}`);
  }

  if (location.district) {
    parts.push(`in ${location.district}`);
  }

  if (location.city) {
    parts.push(location.city);
  }

  return parts.length > 0 ? parts.join(' ') : 'Global Access';
}

/**
 * Format location for detailed display showing all streets
 */
export function formatLocationDisplayDetailed(location: AdminLocation | null): string {
  if (!location) return 'Global Access';

  const parts: string[] = [];

  // Add all streets
  if (location.streets && location.streets.length > 0) {
    parts.push(`Streets: ${location.streets.join(', ')}`);
  }

  // Add district, city, country
  if (location.district) parts.push(`District: ${location.district}`);
  if (location.city) parts.push(`City: ${location.city}`);
  if (location.country) parts.push(`Country: ${location.country}`);

  return parts.length > 0 ? parts.join(' | ') : 'Global Access';
}

/**
 * Manually assign admin role to a user by email (for testing/setup)
 */
export async function assignAdminRole(email: string, role: 'admin' | 'super_admin' = 'admin'): Promise<{ success: boolean; message: string }> {
  try {
    console.log(`Assigning ${role} role to ${email}...`);

    // Check if user exists
    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('email', email);

    if (fetchError) {
      return { success: false, message: `Database error: ${fetchError.message}` };
    }

    if (!users || users.length === 0) {
      return { success: false, message: `User with email ${email} not found in database` };
    }

    const user = users[0];

    // Update role
    const { error: updateError } = await supabase
      .from('users')
      .update({ role })
      .eq('id', user.id);

    if (updateError) {
      return { success: false, message: `Error updating role: ${updateError.message}` };
    }

    console.log(`Successfully assigned ${role} role to ${email}`);
    return { success: true, message: `Successfully assigned ${role} role to ${email}` };

  } catch (error) {
    console.error('Error in assignAdminRole:', error);
    return { success: false, message: `Unexpected error: ${error}` };
  }
}

/**
 * Debug function to check what users exist in the database
 */
export async function debugDatabaseUsers(): Promise<void> {
  try {
    console.log('=== DATABASE DEBUG INFO ===');

    const { data: allUsers, error } = await supabase
      .from('users')
      .select('id, full_name, email, role, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users for debug:', error);
      return;
    }

    console.log('Total users in database:', allUsers?.length || 0);

    if (allUsers && allUsers.length > 0) {
      console.log('All users:');
      allUsers.forEach((user, index) => {
        console.log(`${index + 1}. Email: ${user.email}, Role: ${user.role || 'null'}, Name: ${user.full_name || 'null'}`);
      });

      const adminUsers = allUsers.filter(u => ['admin', 'super_admin'].includes(u.role));
      console.log(`Admin users found: ${adminUsers.length}`);

      if (adminUsers.length > 0) {
        console.log('Admin users:');
        adminUsers.forEach((user, index) => {
          console.log(`${index + 1}. ${user.email} - ${user.role}`);
        });
      }
    } else {
      console.log('No users found in database');
    }

    console.log('=== END DEBUG INFO ===');
  } catch (error) {
    console.error('Error in debugDatabaseUsers:', error);
  }
}

/**
 * Get all admin users with their location assignments and assignment details
 */
export async function getAllAdminUsers(): Promise<AdminUser[]> {
  try {
    console.log('Fetching admin users from database...');

    // Get all users from database
    const { data: allUsers, error: allUsersError } = await supabase
      .from('users')
      .select('id, full_name, email, role, admin_assigned_location, created_at');

    if (allUsersError) {
      console.error('Error fetching all users:', allUsersError);
      console.log('Database error occurred. Please check your database connection.');
      throw new Error(`Database error: ${allUsersError.message}`);
    }

    console.log('Total users in database:', allUsers?.length || 0);

    if (!allUsers || allUsers.length === 0) {
      console.log('No users found in database');
      return [];
    }

    // Log all users for debugging
    console.log('All users in database:', allUsers.map(u => ({
      email: u.email,
      role: u.role,
      name: u.full_name
    })));

    // Get users with admin roles
    const adminUsers = allUsers.filter(user => {
      const hasAdminRole = ['admin', 'super_admin'].includes(user.role);
      if (hasAdminRole) {
        console.log(`Found admin user: ${user.email} with role: ${user.role}`);
      }
      return hasAdminRole;
    });

    console.log('Found admin users:', adminUsers.length);

    // If no admin users found, check if we need to assign super admin role
    if (adminUsers.length === 0) {
      console.log('No admin users found. Checking for super admin assignment...');

      const superAdminUser = allUsers.find(user => user.email === 'rahulpradeepan77@gmail.com');
      if (superAdminUser && superAdminUser.role !== 'super_admin') {
        console.log('Assigning super admin role to rahulpradeepan77@gmail.com...');

        const { error: updateError } = await supabase
          .from('users')
          .update({ role: 'super_admin' })
          .eq('email', 'rahulpradeepan77@gmail.com');

        if (updateError) {
          console.error('Error updating super admin role:', updateError);
        } else {
          console.log('Super admin role assigned successfully');
          // Refetch after update
          return getAllAdminUsers();
        }
      }

      // Instead of returning mock data, return empty array to show real state
      console.log('No admin users found in database. Returning empty array.');
      return [];
    }

    // Sort admin users (super admins first, then by creation date)
    adminUsers.sort((a, b) => {
      if (a.role === 'super_admin' && b.role !== 'super_admin') return -1;
      if (b.role === 'super_admin' && a.role !== 'super_admin') return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    console.log('Processing admin users for display...');

    // Get all super admin users for assignment tracking
    const superAdmins = adminUsers.filter(user => user.role === 'super_admin');
    const superAdminMap = new Map(superAdmins.map(admin => [admin.id, admin.full_name || 'Unknown']));

    // Process each admin user
    const processedAdmins: AdminUser[] = adminUsers.map(user => {
      const assignedLocation = parseAdminLocation(user.admin_assigned_location);

      // For regional admins, try to determine who assigned their location
      let assignedBy: string | undefined;
      let assignedByName: string | undefined;
      let assignedDate: string | undefined;

      if (user.role === 'admin' && assignedLocation) {
        // For now, we'll use the created_at date as assignment date
        // In a real system, you'd have a separate assignment tracking table
        assignedDate = user.created_at;

        // If there's only one super admin, assume they made the assignment
        if (superAdmins.length === 1) {
          assignedBy = superAdmins[0].id;
          assignedByName = superAdmins[0].full_name || 'Unknown';
        } else {
          // For multiple super admins, we'd need additional tracking
          assignedByName = 'Super Admin';
        }
      }

      return {
        id: user.id,
        name: user.full_name || 'Unknown',
        email: user.email || '',
        role: user.role as 'admin' | 'super_admin',
        assignedLocation,
        createdAt: user.created_at,
        updatedAt: user.created_at, // Use created_at since updated_at doesn't exist
        status: 'active',
        assignedBy,
        assignedByName,
        assignedDate
      };
    });

    return processedAdmins;
  } catch (error) {
    console.error('Error in getAllAdminUsers:', error);
    // Return empty array instead of mock data to show real database state
    return [];
  }
}

/**
 * Parse admin location data from database, handling both old and new formats
 */
function parseAdminLocation(locationData: any): AdminLocation | null {
  if (!locationData) return null;

  try {
    // Handle both string and object formats
    const location = typeof locationData === 'string'
      ? JSON.parse(locationData)
      : locationData;

    // Handle old format (country, state, city) and convert to new format
    if (location.state && !location.district) {
      return {
        country: location.country,
        city: location.city,
        district: location.state, // Convert old state to district
        streets: location.streets || []
      };
    }

    // Handle new format (country, city, district, streets)
    return {
      country: location.country,
      city: location.city,
      district: location.district,
      streets: Array.isArray(location.streets) ? location.streets : []
    };
  } catch (error) {
    console.error('Error parsing admin location data:', error);
    return null;
  }
}

/**
 * Get admin activity stats
 */
export async function getAdminActivityStats(adminId: string): Promise<AdminActivityStats> {
  try {
    // Get admin's assigned location
    const adminLocation = await getAdminAssignedLocation(adminId);

    // Get location-filtered user IDs
    const userIds = adminLocation ? await getLocationFilteredUserIds(adminLocation) : [];

    // Count users managed by this admin
    const managedUsersCount = userIds.length;

    // For now, return basic stats - can be expanded later
    return {
      managedUsers: managedUsersCount,
      managedFarmers: 0, // TODO: Implement farmer count
      managedOrders: 0,  // TODO: Implement order count
      lastActivity: new Date().toISOString() // TODO: Implement real last activity
    };
  } catch (error) {
    console.error('Error getting admin activity stats:', error);
    return {
      managedUsers: 0,
      managedFarmers: 0,
      managedOrders: 0,
      lastActivity: new Date().toISOString()
    };
  }
}

/**
 * Generate mock admin users for testing when no real data is available
 */
function getMockAdminUsers(): AdminUser[] {
  console.log('Generating mock admin users...');
  return [
    {
      id: 'mock-super-admin',
      name: 'Rahul Pradeepan',
      email: 'rahulpradeepan77@gmail.com',
      role: 'super_admin',
      assignedLocation: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active'
    },
    {
      id: 'mock-regional-admin-1',
      name: 'Regional Admin Toronto',
      email: 'admin.toronto@example.com',
      role: 'admin',
      assignedLocation: {
        country: 'Canada',
        city: 'Toronto',
        district: 'Downtown',
        streets: ['Main Street', 'King Street', 'Queen Street']
      },
      createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      updatedAt: new Date(Date.now() - 86400000).toISOString(),
      status: 'active',
      assignedBy: 'mock-super-admin',
      assignedByName: 'Rahul Pradeepan',
      assignedDate: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: 'mock-regional-admin-2',
      name: 'Regional Admin Vancouver',
      email: 'admin.vancouver@example.com',
      role: 'admin',
      assignedLocation: {
        country: 'Canada',
        city: 'Vancouver',
        district: 'Downtown',
        streets: ['Granville Street', 'Robson Street']
      },
      createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
      updatedAt: new Date(Date.now() - 172800000).toISOString(),
      status: 'active',
      assignedBy: 'mock-super-admin',
      assignedByName: 'Rahul Pradeepan',
      assignedDate: new Date(Date.now() - 172800000).toISOString()
    }
  ];
}
