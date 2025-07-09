import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { 
  AdminLocation, 
  getAdminAssignedLocation,
  getLocationFilteredUserIds,
  getLocationFilteredData,
  LocationFilterOptions,
  applyLocationFilter,
  canAccessLocation
} from '../services/locationAdminService';

/**
 * Hook for location-based access control
 * Provides location filtering capabilities for admin users
 */
export function useLocationAccess() {
  const user = useAuthStore((state) => state.user);
  const [adminLocation, setAdminLocation] = useState<AdminLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load admin's assigned location
  useEffect(() => {
    const loadAdminLocation = async () => {
      try {
        setLoading(true);
        setError(null);

        if (user?.role === 'admin' && user?.id) {
          const location = await getAdminAssignedLocation(user.id);
          setAdminLocation(location);
        } else {
          // Super admin or non-admin users have no location restrictions
          setAdminLocation(null);
        }
      } catch (err) {
        console.error('Error loading admin location:', err);
        setError('Failed to load location restrictions');
      } finally {
        setLoading(false);
      }
    };

    loadAdminLocation();
  }, [user?.id, user?.role]);

  // Check if user is super admin (no location restrictions)
  const isSuperAdmin = user?.role === 'super_admin';

  // Check if user has location restrictions
  const hasLocationRestrictions = user?.role === 'admin' && adminLocation !== null;

  // Get filtered user IDs based on location
  const getFilteredUserIds = useCallback(async (): Promise<string[]> => {
    if (!hasLocationRestrictions || !adminLocation) {
      return []; // No restrictions or no location assigned
    }

    try {
      return await getLocationFilteredUserIds(adminLocation);
    } catch (error) {
      console.error('Error getting filtered user IDs:', error);
      return [];
    }
  }, [hasLocationRestrictions, adminLocation]);

  // Get comprehensive filtered data
  const getFilteredData = useCallback(async (options: LocationFilterOptions = {}) => {
    if (!hasLocationRestrictions || !adminLocation) {
      return {
        userIds: [],
        sellerIds: [],
        buyerIds: [],
        orderIds: [],
        feedbackIds: [],
        listingIds: []
      };
    }

    try {
      return await getLocationFilteredData(adminLocation, options);
    } catch (error) {
      console.error('Error getting filtered data:', error);
      return {
        userIds: [],
        sellerIds: [],
        buyerIds: [],
        orderIds: [],
        feedbackIds: [],
        listingIds: []
      };
    }
  }, [hasLocationRestrictions, adminLocation]);

  // Apply location filter to a query
  const applyLocationFilterToQuery = useCallback((query: any, tableAlias?: string) => {
    if (!hasLocationRestrictions || !adminLocation) {
      return query; // No restrictions
    }

    return applyLocationFilter(query, adminLocation, tableAlias);
  }, [hasLocationRestrictions, adminLocation]);

  // Check if user can access a specific location
  const checkLocationAccess = useCallback(async (
    targetLocation: { country?: string; city?: string; state?: string }
  ): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      return await canAccessLocation(user.id, targetLocation);
    } catch (error) {
      console.error('Error checking location access:', error);
      return false;
    }
  }, [user?.id]);

  // Filter array of items based on location
  const filterItemsByLocation = useCallback(<T extends { country?: string; city?: string; state?: string }>(
    items: T[]
  ): T[] => {
    if (!hasLocationRestrictions || !adminLocation) {
      return items; // No restrictions
    }

    return items.filter(item => {
      // Check country match
      if (adminLocation.country && item.country) {
        if (!item.country.toLowerCase().includes(adminLocation.country.toLowerCase())) {
          return false;
        }
      }

      // Check city match
      if (adminLocation.city && item.city) {
        if (!item.city.toLowerCase().includes(adminLocation.city.toLowerCase())) {
          return false;
        }
      }

      // Check district/state match
      if (adminLocation.district && item.state) {
        if (!item.state.toLowerCase().includes(adminLocation.district.toLowerCase())) {
          return false;
        }
      }

      return true;
    });
  }, [hasLocationRestrictions, adminLocation]);

  // Get location summary for display
  const getLocationSummary = useCallback((): string => {
    if (isSuperAdmin) return 'Global Access';
    if (!adminLocation) return 'No Location Assigned';

    const parts = [];
    if (adminLocation.country) parts.push(adminLocation.country);
    if (adminLocation.city) parts.push(adminLocation.city);
    if (adminLocation.district) parts.push(adminLocation.district);
    
    return parts.join(', ') || 'Location Assigned';
  }, [isSuperAdmin, adminLocation]);

  // Get location details for display
  const getLocationDetails = useCallback(() => {
    return {
      location: adminLocation,
      isSuperAdmin,
      hasRestrictions: hasLocationRestrictions,
      summary: getLocationSummary(),
      canAccessAllLocations: isSuperAdmin
    };
  }, [adminLocation, isSuperAdmin, hasLocationRestrictions, getLocationSummary]);

  return {
    // State
    adminLocation,
    loading,
    error,
    isSuperAdmin,
    hasLocationRestrictions,

    // Methods
    getFilteredUserIds,
    getFilteredData,
    applyLocationFilterToQuery,
    checkLocationAccess,
    filterItemsByLocation,
    getLocationSummary,
    getLocationDetails,

    // Utilities
    refresh: () => {
      // Trigger a re-load of admin location
      if (user?.role === 'admin' && user?.id) {
        getAdminAssignedLocation(user.id).then(setAdminLocation);
      }
    }
  };
}

/**
 * Hook for applying location-based filtering to data queries
 * Simplified version for common use cases
 */
export function useLocationFilter() {
  const { 
    hasLocationRestrictions, 
    adminLocation, 
    applyLocationFilterToQuery,
    getFilteredUserIds 
  } = useLocationAccess();

  // Apply location filter to Supabase query
  const applyFilter = useCallback((query: any, tableAlias?: string) => {
    return applyLocationFilterToQuery(query, tableAlias);
  }, [applyLocationFilterToQuery]);

  // Get user IDs that match location restrictions
  const getUserIds = useCallback(async (): Promise<string[] | null> => {
    if (!hasLocationRestrictions) return null; // No restrictions
    return await getFilteredUserIds();
  }, [hasLocationRestrictions, getFilteredUserIds]);

  return {
    hasRestrictions: hasLocationRestrictions,
    location: adminLocation,
    applyFilter,
    getUserIds
  };
}

/**
 * Hook for checking if current user can perform admin actions
 * Includes location-based access control
 */
export function useAdminAccess() {
  const user = useAuthStore((state) => state.user);
  const { isSuperAdmin, hasLocationRestrictions, checkLocationAccess } = useLocationAccess();

  const canManageUsers = user?.role === 'super_admin' || user?.role === 'admin';
  const canAssignRoles = user?.role === 'super_admin';
  const canManageAllLocations = user?.role === 'super_admin';
  const canExportData = user?.role === 'super_admin' || user?.role === 'admin';

  return {
    user,
    isSuperAdmin,
    hasLocationRestrictions,
    canManageUsers,
    canAssignRoles,
    canManageAllLocations,
    canExportData,
    checkLocationAccess
  };
}
