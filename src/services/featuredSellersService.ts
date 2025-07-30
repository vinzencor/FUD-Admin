import { supabase } from '../supabaseClient';

export interface FeaturedSeller {
  id: string;
  user_id: string;
  featured_by: string;
  featured_at: string;
  is_active: boolean;
  priority: number;
  notes?: string;
  full_name: string;
  email: string;
  mobile_phone?: string;
  default_mode: string;
  city?: string;
  state?: string;
  country?: string;
  profile_image?: string;
  average_rating?: number;
  total_reviews?: number;
  store_name?: string;
  store_description?: string;
  seller_approved?: boolean;
  store_profile_image?: string;
  store_cover_image?: string;
  featured_by_name: string;
  featured_by_email: string;
}

export interface FeaturedSellerForHome {
  user_id: string;
  full_name: string;
  email: string;
  mobile_phone?: string;
  city?: string;
  state?: string;
  country?: string;
  profile_image?: string;
  average_rating?: number;
  total_reviews?: number;
  store_name?: string;
  store_description?: string;
  store_profile_image?: string;
  store_cover_image?: string;
  featured_at: string;
  priority: number;
}

/**
 * Fetch all featured sellers with complete details
 */
export async function fetchFeaturedSellers(): Promise<FeaturedSeller[]> {
  try {
    const { data, error } = await supabase
      .from('featured_sellers_with_details')
      .select('*')
      .order('priority', { ascending: false })
      .order('featured_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching featured sellers:', error);
    throw error;
  }
}

/**
 * Fetch featured sellers for home page display
 */
export async function fetchFeaturedSellersForHome(limit: number = 10): Promise<FeaturedSellerForHome[]> {
  try {
    const { data, error } = await supabase.rpc('get_featured_sellers_for_home', {
      p_limit: limit
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching featured sellers for home:', error);
    throw error;
  }
}

/**
 * Toggle featured status of a user
 */
export async function toggleFeaturedStatus(
  userId: string, 
  adminId: string, 
  notes?: string
): Promise<{ success: boolean; action: string; message: string }> {
  try {
    const { data, error } = await supabase.rpc('toggle_featured_seller', {
      p_user_id: userId,
      p_admin_id: adminId,
      p_notes: notes || null
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error toggling featured status:', error);
    throw error;
  }
}

/**
 * Update featured seller priority
 */
export async function updateFeaturedSellerPriority(
  userId: string, 
  priority: number
): Promise<void> {
  try {
    const { error } = await supabase
      .from('featured_sellers')
      .update({ priority, updated_at: new Date().toISOString() })
      .eq('user_id', userId);

    if (error) throw error;
  } catch (error) {
    console.error('Error updating featured seller priority:', error);
    throw error;
  }
}

/**
 * Update featured seller notes
 */
export async function updateFeaturedSellerNotes(
  userId: string, 
  notes: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('featured_sellers')
      .update({ notes, updated_at: new Date().toISOString() })
      .eq('user_id', userId);

    if (error) throw error;
  } catch (error) {
    console.error('Error updating featured seller notes:', error);
    throw error;
  }
}

/**
 * Get featured seller statistics
 */
export async function getFeaturedSellerStats(): Promise<{
  total_featured: number;
  active_featured: number;
  by_type: { [key: string]: number };
}> {
  try {
    const { data, error } = await supabase
      .from('featured_sellers_with_details')
      .select('default_mode, is_active');

    if (error) throw error;

    const stats = {
      total_featured: data?.length || 0,
      active_featured: data?.filter(item => item.is_active).length || 0,
      by_type: {} as { [key: string]: number }
    };

    // Count by user type
    data?.forEach(item => {
      if (item.is_active) {
        stats.by_type[item.default_mode] = (stats.by_type[item.default_mode] || 0) + 1;
      }
    });

    return stats;
  } catch (error) {
    console.error('Error fetching featured seller stats:', error);
    throw error;
  }
}

/**
 * Check if a user is currently featured
 */
export async function isUserFeatured(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('featured_sellers')
      .select('is_active')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
    return data?.is_active || false;
  } catch (error) {
    console.error('Error checking if user is featured:', error);
    return false;
  }
}

/**
 * Bulk update featured seller priorities
 */
export async function bulkUpdatePriorities(
  updates: { user_id: string; priority: number }[]
): Promise<void> {
  try {
    const promises = updates.map(update =>
      supabase
        .from('featured_sellers')
        .update({ priority: update.priority, updated_at: new Date().toISOString() })
        .eq('user_id', update.user_id)
    );

    const results = await Promise.all(promises);
    
    // Check for errors
    const errors = results.filter(result => result.error);
    if (errors.length > 0) {
      throw new Error(`Failed to update ${errors.length} priorities`);
    }
  } catch (error) {
    console.error('Error bulk updating priorities:', error);
    throw error;
  }
}

/**
 * Export featured sellers data for reporting
 */
export async function exportFeaturedSellersData(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('featured_sellers_with_details')
      .select('*')
      .order('priority', { ascending: false })
      .order('featured_at', { ascending: false });

    if (error) throw error;

    // Format data for export
    return data?.map(seller => ({
      name: seller.store_name || seller.full_name,
      email: seller.email,
      phone: seller.mobile_phone || 'Not provided',
      type: seller.default_mode,
      location: [seller.city, seller.state, seller.country].filter(Boolean).join(', '),
      featured_date: new Date(seller.featured_at).toLocaleDateString(),
      featured_by: seller.featured_by_name,
      priority: seller.priority,
      status: seller.is_active ? 'Active' : 'Inactive',
      notes: seller.notes || 'No notes'
    })) || [];
  } catch (error) {
    console.error('Error exporting featured sellers data:', error);
    throw error;
  }
}
