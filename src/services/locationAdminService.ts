import { supabase } from '../supabaseClient';

export interface AdminLocation {
  country?: string;
  state?: string;
  city?: string;
}

export interface LocationFilterOptions {
  country?: string;
  state?: string;
  city?: string;
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
 * Build location filter for SQL queries
 */
export function buildLocationFilter(location: AdminLocation | null): string {
  if (!location) return '';

  const conditions: string[] = [];

  if (location.country) {
    conditions.push(`country ILIKE '%${location.country}%'`);
  }
  if (location.state) {
    conditions.push(`state ILIKE '%${location.state}%'`);
  }
  if (location.city) {
    conditions.push(`city ILIKE '%${location.city}%'`);
  }

  return conditions.length > 0 ? `AND (${conditions.join(' AND ')})` : '';
}

/**
 * Get location-filtered user IDs for complex queries
 */
export async function getLocationFilteredUserIds(location: AdminLocation | null): Promise<string[]> {
  if (!location) return [];

  try {
    let query = supabase.from('users').select('id');

    if (location.country) {
      query = query.ilike('country', `%${location.country}%`);
    }
    if (location.state) {
      query = query.ilike('state', `%${location.state}%`);
    }
    if (location.city) {
      query = query.ilike('city', `%${location.city}%`);
    }

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
 * Get all unique states for a country
 */
export async function getStatesForCountry(country: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('state')
      .ilike('country', `%${country}%`)
      .not('state', 'is', null)
      .not('state', 'eq', '');

    if (error) {
      console.error('Error fetching states:', error);
      return [];
    }

    const states = [...new Set(data?.map(user => user.state).filter(Boolean))] as string[];
    return states.sort();
  } catch (error) {
    console.error('Error in getStatesForCountry:', error);
    return [];
  }
}

/**
 * Get all unique cities for a state
 */
export async function getCitiesForState(country: string, state: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('city')
      .ilike('country', `%${country}%`)
      .ilike('state', `%${state}%`)
      .not('city', 'is', null)
      .not('city', 'eq', '');

    if (error) {
      console.error('Error fetching cities:', error);
      return [];
    }

    const cities = [...new Set(data?.map(user => user.city).filter(Boolean))] as string[];
    return cities.sort();
  } catch (error) {
    console.error('Error in getCitiesForState:', error);
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
 * Format location for display
 */
export function formatLocationDisplay(location: AdminLocation | null): string {
  if (!location) return 'Global Access';

  const parts: string[] = [];
  if (location.city) parts.push(location.city);
  if (location.state) parts.push(location.state);
  if (location.country) parts.push(location.country);

  return parts.length > 0 ? parts.join(', ') : 'Global Access';
}
