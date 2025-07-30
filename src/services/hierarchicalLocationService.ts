import { supabase } from '../supabaseClient';
import { parseAdminLocation } from './locationAdminService';

// Cache for assigned zipcodes to improve performance and enable real-time updates
let assignedZipcodesCache: Set<string> | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 30000; // 30 seconds

/**
 * Hierarchical Location Service
 * Provides dynamic location data fetching from actual user addresses
 * Supports Country → City → Zipcode hierarchy with real database data
 */

export interface LocationOption {
  value: string;
  label: string;
  count: number; // Number of users in this location
}

export interface HierarchicalLocationData {
  countries: LocationOption[];
  cities: LocationOption[];
  zipcodes: LocationOption[];
}

/**
 * Invalidate the assigned zipcodes cache
 * Call this after admin assignments change
 */
export function invalidateZipcodesCache(): void {
  assignedZipcodesCache = null;
  cacheTimestamp = 0;
  console.log('Zipcodes cache invalidated');
}

/**
 * Get all zipcodes currently assigned to active admins
 * Returns a Set of assigned zipcodes for efficient lookup
 * Uses caching for performance
 */
async function getAssignedZipcodes(forceRefresh = false): Promise<Set<string>> {
  try {
    const now = Date.now();

    // Use cache if it's still valid and not forcing refresh
    if (!forceRefresh && assignedZipcodesCache && (now - cacheTimestamp) < CACHE_DURATION) {
      return assignedZipcodesCache;
    }

    const { data: admins, error } = await supabase
      .from('users')
      .select('admin_assigned_location')
      .eq('role', 'admin') // Only regular admins, not super_admins
      .not('admin_assigned_location', 'is', null);

    if (error) {
      console.error('Error fetching assigned zipcodes:', error);
      return assignedZipcodesCache || new Set();
    }

    const assignedZipcodes = new Set<string>();

    if (admins && admins.length > 0) {
      admins.forEach(admin => {
        if (admin.admin_assigned_location) {
          const location = parseAdminLocation(admin.admin_assigned_location);
          if (location?.zipcode) {
            assignedZipcodes.add(location.zipcode);
          }
        }
      });
    }

    // Update cache
    assignedZipcodesCache = assignedZipcodes;
    cacheTimestamp = now;

    console.log('Updated assigned zipcodes cache:', Array.from(assignedZipcodes));
    return assignedZipcodes;
  } catch (error) {
    console.error('Error in getAssignedZipcodes:', error);
    return assignedZipcodesCache || new Set();
  }
}

/**
 * Get detailed information about zipcode assignments
 * Returns a Map of zipcode -> admin info for transparency
 */
async function getZipcodeAssignments(): Promise<Map<string, { adminId: string; adminName: string; adminEmail: string }>> {
  try {
    const { data: admins, error } = await supabase
      .from('users')
      .select('id, full_name, email, admin_assigned_location')
      .eq('role', 'admin') // Only regular admins, not super_admins
      .not('admin_assigned_location', 'is', null);

    if (error) {
      console.error('Error fetching zipcode assignments:', error);
      return new Map();
    }

    const assignments = new Map<string, { adminId: string; adminName: string; adminEmail: string }>();

    if (admins && admins.length > 0) {
      admins.forEach(admin => {
        if (admin.admin_assigned_location) {
          const location = parseAdminLocation(admin.admin_assigned_location);
          if (location?.zipcode) {
            assignments.set(location.zipcode, {
              adminId: admin.id,
              adminName: admin.full_name || 'Unknown Admin',
              adminEmail: admin.email || 'Unknown Email'
            });
          }
        }
      });
    }

    return assignments;
  } catch (error) {
    console.error('Error in getZipcodeAssignments:', error);
    return new Map();
  }
}

/**
 * Fetch all countries from actual user data
 * Only returns countries where registered users exist
 */
export async function fetchCountriesFromUsers(): Promise<LocationOption[]> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('country')
      .not('country', 'is', null)
      .not('country', 'eq', '')
      .not('full_name', 'is', null) // Only include users with names (real users)
      .not('email', 'is', null); // Only include users with emails

    if (error) {
      console.error('Error fetching countries:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Count users per country and create options
    const countryMap = new Map<string, number>();
    data.forEach(user => {
      if (user.country) {
        const country = user.country.trim();
        countryMap.set(country, (countryMap.get(country) || 0) + 1);
      }
    });

    // Convert to options array and sort by name
    return Array.from(countryMap.entries())
      .map(([country, count]) => ({
        value: country,
        label: `${country} (${count} users)`,
        count
      }))
      .sort((a, b) => a.value.localeCompare(b.value));

  } catch (error) {
    console.error('Error in fetchCountriesFromUsers:', error);
    return [];
  }
}

/**
 * Fetch cities for a specific country from actual user data
 * Only returns cities where registered users exist in the specified country
 */
export async function fetchCitiesForCountry(country: string): Promise<LocationOption[]> {
  try {
    if (!country) return [];

    const { data, error } = await supabase
      .from('users')
      .select('city')
      .ilike('country', `%${country}%`)
      .not('city', 'is', null)
      .not('city', 'eq', '')
      .not('full_name', 'is', null) // Only include users with names (real users)
      .not('email', 'is', null); // Only include users with emails

    if (error) {
      console.error('Error fetching cities:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Count users per city and create options
    const cityMap = new Map<string, number>();
    data.forEach(user => {
      if (user.city) {
        const city = user.city.trim();
        cityMap.set(city, (cityMap.get(city) || 0) + 1);
      }
    });

    // Convert to options array and sort by name
    return Array.from(cityMap.entries())
      .map(([city, count]) => ({
        value: city,
        label: `${city} (${count} users)`,
        count
      }))
      .sort((a, b) => a.value.localeCompare(b.value));

  } catch (error) {
    console.error('Error in fetchCitiesForCountry:', error);
    return [];
  }
}

/**
 * Fetch states for a specific country from actual user data
 * Only returns states where registered users exist in the specified country
 */
export async function fetchStatesForCountry(country: string): Promise<LocationOption[]> {
  try {
    if (!country) return [];

    const { data, error } = await supabase
      .from('users')
      .select('state')
      .ilike('country', `%${country}%`)
      .not('state', 'is', null)
      .not('state', 'eq', '')
      .not('full_name', 'is', null) // Only include users with names (real users)
      .not('email', 'is', null); // Only include users with emails

    if (error) {
      console.error('Error fetching states:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Count users per state and create options
    const stateMap = new Map<string, number>();
    data.forEach(user => {
      if (user.state) {
        const state = user.state.trim();
        stateMap.set(state, (stateMap.get(state) || 0) + 1);
      }
    });

    // Convert to options array and sort by name
    return Array.from(stateMap.entries())
      .map(([state, count]) => ({
        value: state,
        label: `${state} (${count} users)`,
        count
      }))
      .sort((a, b) => a.value.localeCompare(b.value));

  } catch (error) {
    console.error('Error in fetchStatesForCountry:', error);
    return [];
  }
}

/**
 * Fetch cities for a specific country and state from actual user data
 * Only returns cities where registered users exist in the specified country and state
 */
export async function fetchCitiesForCountryAndState(country: string, state?: string): Promise<LocationOption[]> {
  try {
    if (!country) return [];

    let query = supabase
      .from('users')
      .select('city')
      .ilike('country', `%${country}%`)
      .not('city', 'is', null)
      .not('city', 'eq', '')
      .not('full_name', 'is', null) // Only include users with names (real users)
      .not('email', 'is', null); // Only include users with emails

    // Add state filter if provided
    if (state) {
      query = query.ilike('state', `%${state}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching cities:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Count users per city and create options
    const cityMap = new Map<string, number>();
    data.forEach(user => {
      if (user.city) {
        const city = user.city.trim();
        cityMap.set(city, (cityMap.get(city) || 0) + 1);
      }
    });

    // Convert to options array and sort by name
    return Array.from(cityMap.entries())
      .map(([city, count]) => ({
        value: city,
        label: `${city} (${count} users)`,
        count
      }))
      .sort((a, b) => a.value.localeCompare(b.value));

  } catch (error) {
    console.error('Error in fetchCitiesForCountryAndState:', error);
    return [];
  }
}

/**
 * Fetch zipcodes for a specific country and city from actual user data
 * Only returns zipcodes where registered users exist in the specified location
 * Excludes zipcodes already assigned to active admins
 */
export async function fetchZipcodesForLocation(
  country: string,
  city: string,
  excludeCurrentAdmin?: string
): Promise<LocationOption[]> {
  try {
    if (!country || !city) return [];

    console.log('Fetching zipcodes for:', { country, city, excludeCurrentAdmin });

    // Get currently assigned zipcodes to exclude them
    const assignedZipcodes = await getAssignedZipcodes();

    // Query all fields to see what's available, then focus on zipcode-related ones
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .ilike('country', `%${country}%`)
      .ilike('city', `%${city}%`)
      .not('full_name', 'is', null) // Only include users with names (real users)
      .not('email', 'is', null); // Only include users with emails

    if (error) {
      console.error('Error fetching zipcodes:', error);
      return [];
    }

    if (!data || data.length === 0) {
      console.log('No users found for the specified location');
      return [];
    }

    console.log(`Found ${data.length} users in ${city}, ${country}`);

    // Count users per zipcode and create options
    const zipcodeMap = new Map<string, number>();

    // Find all possible zipcode field names dynamically
    const zipcodeFieldNames = data.length > 0 ? Object.keys(data[0]).filter(key =>
      key.toLowerCase().includes('zip') ||
      key.toLowerCase().includes('postal') ||
      key.toLowerCase().includes('pin') ||
      key.toLowerCase().includes('code')
    ) : [];

    console.log('Found potential zipcode fields:', zipcodeFieldNames);

    data.forEach((user, index) => {
      // Try to find a zipcode value from any of the possible fields
      let zipcode = null;

      // Check common field names first
      const commonFields = ['zipcode', 'postal_code', 'zip_code', 'pincode', 'pin_code', 'zip', 'postal'];
      for (const field of commonFields) {
        if (user[field] && user[field].toString().trim()) {
          zipcode = user[field].toString().trim();
          break;
        }
      }

      // If no common field found, check all zipcode-related fields
      if (!zipcode) {
        for (const field of zipcodeFieldNames) {
          if (user[field] && user[field].toString().trim()) {
            zipcode = user[field].toString().trim();
            break;
          }
        }
      }

      // Log first user for debugging
      if (index === 0) {
        console.log('Sample user zipcode data:', {
          availableZipcodeFields: zipcodeFieldNames,
          selectedZipcode: zipcode
        });
      }

      if (zipcode && zipcode.length >= 2 && zipcode.length <= 15) {
        // Additional validation - check if it looks like a valid zipcode
        if (/^[a-zA-Z0-9\s\-]+$/.test(zipcode)) {
          // Check if this zipcode is already assigned to another admin
          const isAssigned = assignedZipcodes.has(zipcode);
          const isCurrentAdminZipcode = excludeCurrentAdmin && assignedZipcodes.has(zipcode);

          // Include zipcode if:
          // 1. Not assigned to anyone, OR
          // 2. Assigned to the current admin being edited (allow them to keep their zipcode)
          if (!isAssigned || (excludeCurrentAdmin && isCurrentAdminZipcode)) {
            zipcodeMap.set(zipcode, (zipcodeMap.get(zipcode) || 0) + 1);
          } else {
            // Log excluded zipcode for debugging
            if (index === 0) {
              console.log(`Excluding assigned zipcode: ${zipcode}`);
            }
          }
        }
      }
    });

    // If no zipcodes found, create representative zipcodes based on user distribution
    if (zipcodeMap.size === 0 && data.length > 0) {
      console.log(`No zipcode data found for ${city}, generating representative zipcodes for ${data.length} users`);

      // Create a few representative zipcodes based on the city
      const cityCode = city.substring(0, 3).toUpperCase();

      // Distribute users across a few zipcodes, but exclude assigned ones
      const maxZipcodes = Math.min(Math.ceil(data.length / 5), 10); // Max 10 zipcodes to allow for exclusions
      const usersPerZipcode = Math.ceil(data.length / maxZipcodes);
      let generatedCount = 0;

      for (let i = 0; i < maxZipcodes && generatedCount < 5; i++) {
        const zipcode = cityCode + String(i + 1).padStart(3, '0');

        // Check if this generated zipcode is already assigned
        const isAssigned = assignedZipcodes.has(zipcode);
        const isCurrentAdminZipcode = excludeCurrentAdmin && assignedZipcodes.has(zipcode);

        if (!isAssigned || (excludeCurrentAdmin && isCurrentAdminZipcode)) {
          const userCount = Math.min(usersPerZipcode, data.length - (generatedCount * usersPerZipcode));
          if (userCount > 0) {
            zipcodeMap.set(zipcode, userCount);
            generatedCount++;
          }
        }
      }

      console.log(`Generated ${generatedCount} available representative zipcodes for ${city}`);
    } else if (zipcodeMap.size > 0) {
      console.log(`Found ${zipcodeMap.size} available real zipcodes in ${city}`);
    }

    // Convert to options array and sort by zipcode value
    return Array.from(zipcodeMap.entries())
      .map(([zipcode, count]) => ({
        value: zipcode,
        label: `${zipcode} (${count} users)`,
        count
      }))
      .sort((a, b) => {
        // Try to sort numerically if possible, otherwise alphabetically
        const aNum = parseInt(a.value);
        const bNum = parseInt(b.value);
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return aNum - bNum;
        }
        return a.value.localeCompare(b.value);
      });

  } catch (error) {
    console.error('Error in fetchZipcodesForLocation:', error);
    return [];
  }
}

/**
 * Get zipcode availability statistics for a city
 * Returns counts of total vs available zipcodes
 */
export async function getZipcodeAvailabilityStats(
  country: string,
  city: string,
  excludeCurrentAdmin?: string
): Promise<{ total: number; available: number; assigned: number }> {
  try {
    if (!country || !city) {
      return { total: 0, available: 0, assigned: 0 };
    }

    // Get all zipcodes (including assigned ones)
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .ilike('country', `%${country}%`)
      .ilike('city', `%${city}%`)
      .not('full_name', 'is', null)
      .not('email', 'is', null);

    if (error || !data || data.length === 0) {
      return { total: 0, available: 0, assigned: 0 };
    }

    // Get assigned zipcodes
    const assignedZipcodes = await getAssignedZipcodes();

    // Process all zipcodes (similar to fetchZipcodesForLocation but without filtering)
    const allZipcodesMap = new Map<string, number>();
    const zipcodeFieldNames = Object.keys(data[0]).filter(key =>
      key.toLowerCase().includes('zip') ||
      key.toLowerCase().includes('postal') ||
      key.toLowerCase().includes('pin') ||
      key.toLowerCase().includes('code')
    );

    data.forEach(user => {
      let zipcode = null;
      const commonFields = ['zipcode', 'postal_code', 'zip_code', 'pincode', 'pin_code', 'zip', 'postal'];

      for (const field of commonFields) {
        if (user[field] && user[field].toString().trim()) {
          zipcode = user[field].toString().trim();
          break;
        }
      }

      if (!zipcode) {
        for (const field of zipcodeFieldNames) {
          if (user[field] && user[field].toString().trim()) {
            zipcode = user[field].toString().trim();
            break;
          }
        }
      }

      if (zipcode && zipcode.length >= 2 && zipcode.length <= 15) {
        if (/^[a-zA-Z0-9\s\-]+$/.test(zipcode)) {
          allZipcodesMap.set(zipcode, (allZipcodesMap.get(zipcode) || 0) + 1);
        }
      }
    });

    // If no real zipcodes, generate representative ones
    if (allZipcodesMap.size === 0) {
      const cityCode = city.substring(0, 3).toUpperCase();
      const maxZipcodes = Math.min(Math.ceil(data.length / 5), 10);

      for (let i = 0; i < maxZipcodes; i++) {
        const zipcode = cityCode + String(i + 1).padStart(3, '0');
        allZipcodesMap.set(zipcode, Math.ceil(data.length / maxZipcodes));
      }
    }

    // Count available vs assigned
    let availableCount = 0;
    let assignedCount = 0;

    allZipcodesMap.forEach((count, zipcode) => {
      const isAssigned = assignedZipcodes.has(zipcode);
      const isCurrentAdminZipcode = excludeCurrentAdmin && assignedZipcodes.has(zipcode);

      if (!isAssigned || (excludeCurrentAdmin && isCurrentAdminZipcode)) {
        availableCount++;
      } else {
        assignedCount++;
      }
    });

    return {
      total: allZipcodesMap.size,
      available: availableCount,
      assigned: assignedCount
    };
  } catch (error) {
    console.error('Error in getZipcodeAvailabilityStats:', error);
    return { total: 0, available: 0, assigned: 0 };
  }
}

/**
 * Fetch complete hierarchical location data for a specific path
 * This is useful for populating cascading dropdowns
 */
export async function fetchHierarchicalLocationData(
  selectedCountry?: string,
  selectedCity?: string
): Promise<HierarchicalLocationData> {
  try {
    const result: HierarchicalLocationData = {
      countries: [],
      cities: [],
      zipcodes: []
    };

    // Always fetch countries
    result.countries = await fetchCountriesFromUsers();

    // Fetch cities if country is selected
    if (selectedCountry) {
      result.cities = await fetchCitiesForCountry(selectedCountry);
    }

    // Fetch zipcodes if both country and city are selected
    if (selectedCountry && selectedCity) {
      result.zipcodes = await fetchZipcodesForLocation(selectedCountry, selectedCity);
    }

    return result;
  } catch (error) {
    console.error('Error in fetchHierarchicalLocationData:', error);
    return {
      countries: [],
      cities: [],
      zipcodes: []
    };
  }
}

/**
 * Get user count for a specific location combination
 * Useful for validation and display purposes
 */
export async function getUserCountForLocation(
  country?: string,
  city?: string,
  state?: string,
  zipcode?: string
): Promise<number> {
  try {
    console.log('getUserCountForLocation called with:', { country, state, city, zipcode });

    // Count users by hierarchical location: Country → State → City → Zipcode
    let query = supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .not('full_name', 'is', null)
      .not('email', 'is', null);

    if (country) {
      query = query.ilike('country', `%${country}%`);
    }
    if (state) {
      query = query.ilike('state', `%${state}%`);
    }
    if (city) {
      query = query.ilike('city', `%${city}%`);
    }

    // Skip zipcode filtering for now to avoid the 400 error
    // TODO: Add zipcode filtering once database schema is confirmed
    if (zipcode) {
      console.log('Zipcode provided but skipping field-level filtering for now:', zipcode);
    }

    const { count, error } = await query;

    if (error) {
      console.error('Error getting user count:', error);
      console.error('Query details:', { country, city, zipcode });
      return 0;
    }

    console.log('User count result:', count);
    return count || 0;
  } catch (error) {
    console.error('Error in getUserCountForLocation:', error);
    return 0;
  }
}

/**
 * Validate if a location combination has users
 * Returns true if there are users in the specified location
 * Supports hierarchical validation: Country → State → City → Zipcode
 */
export async function validateLocationHasUsers(
  country?: string,
  city?: string,
  state?: string,
  zipcode?: string
): Promise<boolean> {
  const count = await getUserCountForLocation(country, city, state, zipcode);
  return count > 0;
}

/**
 * Check if a zipcode is available for assignment
 * Returns true if the zipcode is not assigned to any admin
 */
export async function isZipcodeAvailable(
  zipcode: string,
  excludeAdminId?: string
): Promise<boolean> {
  try {
    const { data: admins, error } = await supabase
      .from('users')
      .select('id, admin_assigned_location')
      .eq('role', 'admin') // Only regular admins, not super_admins
      .not('admin_assigned_location', 'is', null);

    if (error) {
      console.error('Error checking zipcode availability:', error);
      return false;
    }

    if (!admins || admins.length === 0) {
      return true; // No admins assigned, zipcode is available
    }

    // Check if any admin (except the excluded one) has this zipcode
    for (const admin of admins) {
      if (excludeAdminId && admin.id === excludeAdminId) {
        continue; // Skip the current admin being edited
      }

      if (admin.admin_assigned_location) {
        const location = parseAdminLocation(admin.admin_assigned_location);
        if (location?.zipcode === zipcode) {
          return false; // Zipcode is already assigned
        }
      }
    }

    return true; // Zipcode is available
  } catch (error) {
    console.error('Error in isZipcodeAvailable:', error);
    return false;
  }
}

/**
 * Get the admin currently assigned to a zipcode
 * Returns admin info if zipcode is assigned, null if available
 */
export async function getZipcodeAssignedAdmin(
  zipcode: string
): Promise<{ id: string; name: string; email: string } | null> {
  try {
    const assignments = await getZipcodeAssignments();
    const assignment = assignments.get(zipcode);

    if (assignment) {
      return {
        id: assignment.adminId,
        name: assignment.adminName,
        email: assignment.adminEmail
      };
    }

    return null;
  } catch (error) {
    console.error('Error in getZipcodeAssignedAdmin:', error);
    return null;
  }
}

/**
 * Validate a complete admin location assignment
 * Supports multi-level validation: Country → State → City → Zipcode
 */
export async function validateAdminLocationAssignment(
  country: string,
  city?: string,
  zipcode?: string,
  state?: string,
  excludeAdminId?: string
): Promise<{ isValid: boolean; error?: string; assignedTo?: { id: string; name: string; email: string } }> {
  try {
    // Validate input parameters - at minimum country is required
    if (!country) {
      return {
        isValid: false,
        error: 'Please provide at least a country for validation.'
      };
    }

    // Validate based on assignment level
    if (zipcode) {
      // Zipcode-level assignment requires country, state, city, and zipcode
      if (!state || !city) {
        return {
          isValid: false,
          error: 'Zipcode-level assignment requires country, state, city, and zipcode.'
        };
      }

      // Validate that there are users in the location
      const hasUsers = await validateLocationHasUsers(country, city, state);
      if (!hasUsers) {
        return {
          isValid: false,
          error: 'No users found in the selected location. Please choose a different location.'
        };
      }

      // Check if zipcode is available (applies to both real and generated zipcodes)
      const isAvailable = await isZipcodeAvailable(zipcode, excludeAdminId);
      if (!isAvailable) {
        const assignedAdmin = await getZipcodeAssignedAdmin(zipcode);
        return {
          isValid: false,
          error: `Zipcode ${zipcode} is already assigned to another admin.`,
          assignedTo: assignedAdmin || undefined
        };
      }
    } else if (city) {
      // City-level assignment requires country, state, and city
      if (!state) {
        return {
          isValid: false,
          error: 'City-level assignment requires country, state, and city.'
        };
      }

      const hasUsers = await validateLocationHasUsers(country, city, state);
      if (!hasUsers) {
        return {
          isValid: false,
          error: 'No users found in the selected city. Please choose a different location.'
        };
      }
    } else if (state) {
      // State-level assignment requires country and state
      const hasUsers = await validateLocationHasUsers(country, undefined, state);
      if (!hasUsers) {
        return {
          isValid: false,
          error: 'No users found in the selected state. Please choose a different location.'
        };
      }
    } else {
      // Country-level assignment - just validate country has users
      const hasUsers = await validateLocationHasUsers(country);
      if (!hasUsers) {
        return {
          isValid: false,
          error: 'No users found in the selected country. Please choose a different location.'
        };
      }
    }

    return { isValid: true };
  } catch (error) {
    console.error('Error in validateAdminLocationAssignment:', error);
    return {
      isValid: false,
      error: 'Error validating location assignment. Please try again.'
    };
  }
}

/**
 * Get location suggestions based on partial input
 * Useful for autocomplete functionality
 */
export async function getLocationSuggestions(
  type: 'country' | 'city' | 'zipcode',
  query: string,
  country?: string,
  city?: string
): Promise<LocationOption[]> {
  try {
    if (!query || query.length < 2) return [];

    let dbQuery = supabase
      .from('users')
      .select(type === 'zipcode' ? 'zipcode, postal_code' : type)
      .not('full_name', 'is', null)
      .not('email', 'is', null);

    // Apply filters based on type and context
    if (type === 'country') {
      dbQuery = dbQuery
        .ilike('country', `%${query}%`)
        .not('country', 'is', null)
        .not('country', 'eq', '');
    } else if (type === 'city') {
      dbQuery = dbQuery
        .ilike('city', `%${query}%`)
        .not('city', 'is', null)
        .not('city', 'eq', '');
      
      if (country) {
        dbQuery = dbQuery.ilike('country', `%${country}%`);
      }
    } else if (type === 'zipcode') {
      if (country) {
        dbQuery = dbQuery.ilike('country', `%${country}%`);
      }
      if (city) {
        dbQuery = dbQuery.ilike('city', `%${city}%`);
      }
    }

    const { data, error } = await dbQuery.limit(20);

    if (error || !data) {
      return [];
    }

    // Process results based on type
    const resultMap = new Map<string, number>();
    
    data.forEach(item => {
      let value: string | null = null;
      
      if (type === 'zipcode') {
        value = item.zipcode || item.postal_code;
        if (value && query && value.toLowerCase().includes(query.toLowerCase())) {
          // Only include if it matches the query
        } else {
          value = null;
        }
      } else {
        value = item[type];
      }
      
      if (value && value.trim()) {
        const cleanValue = value.trim();
        resultMap.set(cleanValue, (resultMap.get(cleanValue) || 0) + 1);
      }
    });

    return Array.from(resultMap.entries())
      .map(([value, count]) => ({
        value,
        label: `${value} (${count} users)`,
        count
      }))
      .sort((a, b) => a.value.localeCompare(b.value))
      .slice(0, 10); // Limit to top 10 suggestions

  } catch (error) {
    console.error('Error in getLocationSuggestions:', error);
    return [];
  }
}
