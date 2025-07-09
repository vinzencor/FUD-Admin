import { supabase } from '../supabaseClient';
import { AdminLocation } from './locationAdminService';

/**
 * Super Admin Service
 * Provides unrestricted access to all data for super admin users
 * Bypasses all location-based restrictions
 */

export interface SuperAdminAccess {
  canAccessAllUsers: boolean;
  canAccessAllLocations: boolean;
  canManageAllAdmins: boolean;
  canViewAllReports: boolean;
  canExportAllData: boolean;
  canModifySystemSettings: boolean;
}

/**
 * Check if user is super admin
 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error checking super admin status:', error);
      return false;
    }

    return data?.role === 'super_admin';
  } catch (error) {
    console.error('Error in isSuperAdmin:', error);
    return false;
  }
}

/**
 * Get super admin access permissions
 */
export async function getSuperAdminAccess(userId: string): Promise<SuperAdminAccess> {
  const isSuper = await isSuperAdmin(userId);

  return {
    canAccessAllUsers: isSuper,
    canAccessAllLocations: isSuper,
    canManageAllAdmins: isSuper,
    canViewAllReports: isSuper,
    canExportAllData: isSuper,
    canModifySystemSettings: isSuper
  };
}

/**
 * Get all users without location restrictions (super admin only)
 */
export async function getAllUsersUnrestricted(userId: string) {
  const isSuper = await isSuperAdmin(userId);
  
  if (!isSuper) {
    throw new Error('Access denied: Super admin privileges required');
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching all users:', error);
    throw error;
  }
}

/**
 * Get all sellers without location restrictions (super admin only)
 */
export async function getAllSellersUnrestricted(userId: string) {
  const isSuper = await isSuperAdmin(userId);
  
  if (!isSuper) {
    throw new Error('Access denied: Super admin privileges required');
  }

  try {
    const { data: sellerProfiles, error: sellerError } = await supabase
      .from('seller_profiles')
      .select('*');

    if (sellerError) throw sellerError;

    if (!sellerProfiles || sellerProfiles.length === 0) {
      return [];
    }

    // Get user data for all sellers
    const userIds = sellerProfiles.map(sp => sp.user_id);
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .in('id', userIds);

    if (usersError) throw usersError;

    // Combine seller profiles with user data
    return sellerProfiles.map(seller => {
      const user = users?.find(u => u.id === seller.user_id);
      return {
        ...seller,
        user_name: user?.full_name,
        user_email: user?.email,
        user_phone: user?.mobile_phone,
        user_city: user?.city,
        user_state: user?.state,
        user_country: user?.country,
        user_created_at: user?.created_at
      };
    });
  } catch (error) {
    console.error('Error fetching all sellers:', error);
    throw error;
  }
}

/**
 * Get all orders/interests without location restrictions (super admin only)
 */
export async function getAllOrdersUnrestricted(userId: string) {
  const isSuper = await isSuperAdmin(userId);
  
  if (!isSuper) {
    throw new Error('Access denied: Super admin privileges required');
  }

  try {
    const { data, error } = await supabase
      .from('interests')
      .select(`
        *,
        listing:listings!inner(
          id,
          name,
          price,
          seller_name,
          type,
          unit
        ),
        buyer:users!buyer_id(
          id,
          full_name,
          email,
          mobile_phone,
          city,
          state,
          country
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching all orders:', error);
    throw error;
  }
}

/**
 * Get all feedback/reviews without location restrictions (super admin only)
 */
export async function getAllFeedbackUnrestricted(userId: string) {
  const isSuper = await isSuperAdmin(userId);
  
  if (!isSuper) {
    throw new Error('Access denied: Super admin privileges required');
  }

  try {
    const { data, error } = await supabase
      .from('product_reviews')
      .select(`
        *,
        user:users!user_id(
          id,
          full_name,
          email,
          city,
          state,
          country
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching all feedback:', error);
    throw error;
  }
}

/**
 * Get comprehensive analytics data without location restrictions (super admin only)
 */
export async function getGlobalAnalytics(userId: string) {
  const isSuper = await isSuperAdmin(userId);
  
  if (!isSuper) {
    throw new Error('Access denied: Super admin privileges required');
  }

  try {
    // Get user counts by location
    const { data: usersByLocation, error: usersError } = await supabase
      .from('users')
      .select('country, state, city, default_mode')
      .not('country', 'is', null);

    if (usersError) throw usersError;

    // Get order counts by location
    const { data: ordersByLocation, error: ordersError } = await supabase
      .from('interests')
      .select(`
        status,
        buyer:users!buyer_id(country, state, city)
      `);

    if (ordersError) throw ordersError;

    // Get seller counts by location
    const { data: sellersByLocation, error: sellersError } = await supabase
      .from('seller_profiles')
      .select(`
        is_approved,
        user:users!user_id(country, state, city)
      `);

    if (sellersError) throw sellersError;

    return {
      usersByLocation: usersByLocation || [],
      ordersByLocation: ordersByLocation || [],
      sellersByLocation: sellersByLocation || [],
      totalUsers: usersByLocation?.length || 0,
      totalOrders: ordersByLocation?.length || 0,
      totalSellers: sellersByLocation?.length || 0
    };
  } catch (error) {
    console.error('Error fetching global analytics:', error);
    throw error;
  }
}

/**
 * Bypass location restrictions for data queries (super admin only)
 */
export function bypassLocationRestrictions(userId: string) {
  return {
    async applyToQuery(query: any): Promise<any> {
      const isSuper = await isSuperAdmin(userId);
      
      if (!isSuper) {
        throw new Error('Access denied: Super admin privileges required');
      }

      // Return query without any location filtering
      return query;
    },

    async validateAccess(): Promise<boolean> {
      return await isSuperAdmin(userId);
    }
  };
}

/**
 * Super admin data export functions
 */
export const superAdminExports = {
  async exportAllUsers(userId: string) {
    const users = await getAllUsersUnrestricted(userId);
    return users.map(user => ({
      id: user.id,
      name: user.full_name,
      email: user.email,
      phone: user.mobile_phone,
      role: user.role,
      defaultMode: user.default_mode,
      country: user.country,
      state: user.state,
      city: user.city,
      zipcode: user.zipcode,
      createdAt: user.created_at
    }));
  },

  async exportAllSellers(userId: string) {
    const sellers = await getAllSellersUnrestricted(userId);
    return sellers.map(seller => ({
      id: seller.user_id,
      storeName: seller.store_name,
      ownerName: seller.user_name,
      email: seller.user_email,
      phone: seller.user_phone,
      country: seller.user_country,
      state: seller.user_state,
      city: seller.user_city,
      isApproved: seller.is_approved,
      description: seller.description,
      createdAt: seller.user_created_at
    }));
  },

  async exportAllOrders(userId: string) {
    const orders = await getAllOrdersUnrestricted(userId);
    return orders.map(order => ({
      id: order.id,
      buyerName: order.buyer?.full_name,
      buyerEmail: order.buyer?.email,
      buyerLocation: `${order.buyer?.city || ''}, ${order.buyer?.state || ''}, ${order.buyer?.country || ''}`,
      productName: order.listing?.name,
      productPrice: order.listing?.price,
      sellerName: order.listing?.seller_name,
      quantity: order.quantity,
      status: order.status,
      note: order.note,
      createdAt: order.created_at
    }));
  },

  async exportAllFeedback(userId: string) {
    const feedback = await getAllFeedbackUnrestricted(userId);
    return feedback.map(review => ({
      id: review.id,
      userName: review.user?.full_name,
      userEmail: review.user?.email,
      userLocation: `${review.user?.city || ''}, ${review.user?.state || ''}, ${review.user?.country || ''}`,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.created_at
    }));
  }
};

/**
 * Check if current user can perform super admin actions
 */
export async function canPerformSuperAdminAction(userId: string, action: string): Promise<boolean> {
  const isSuper = await isSuperAdmin(userId);
  
  if (!isSuper) {
    console.warn(`Super admin action '${action}' attempted by non-super admin user: ${userId}`);
    return false;
  }

  return true;
}
