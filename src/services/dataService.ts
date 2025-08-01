import { supabase } from '../supabaseClient';
import { AdminLocation } from './locationAdminService';

/**
 * Get user IDs that match the admin's location filter (including zipcode-level filtering)
 * This is a centralized function to ensure consistent filtering across all data services
 */
async function getLocationFilteredUserIds(adminLocation?: AdminLocation | null): Promise<string[]> {
  try {
    if (!adminLocation) {
      // No location filter, return empty array to indicate no filtering needed
      return [];
    }

    let userQuery = supabase
      .from('users')
      .select('id')
      .not('full_name', 'is', null)
      .not('email', 'is', null);

    // Apply location filters in order of specificity
    if (adminLocation.country) {
      userQuery = userQuery.ilike('country', `%${adminLocation.country}%`);
    }
    if (adminLocation.city) {
      userQuery = userQuery.ilike('city', `%${adminLocation.city}%`);
    }
    if (adminLocation.district) {
      userQuery = userQuery.ilike('state', `%${adminLocation.district}%`);
    }

    // Apply zipcode filtering (most specific)
    if (adminLocation.zipcode) {
      // For generated zipcodes (like "NYC001"), we don't filter by zipcode field
      // since users don't have these values - city/country filtering is sufficient
      if (!adminLocation.zipcode.match(/^[A-Z]{3}\d{3}$/)) {
        // Real zipcode from database - try to filter by zipcode field
        try {
          userQuery = userQuery.eq('zipcode', adminLocation.zipcode);
          console.log('Applied zipcode filter:', adminLocation.zipcode);
        } catch (error) {
          console.warn('Zipcode field filtering failed, using city/country only:', error);
          // Continue with city/country filtering
        }
      } else {
        console.log('Using generated zipcode, filtering by city/country only:', adminLocation.zipcode);
      }
    }

    const { data: users, error } = await userQuery;

    if (error) {
      console.error('Error fetching location-filtered users:', error);
      return [];
    }

    const userIds = users?.map(user => user.id) || [];
    console.log(`Found ${userIds.length} users matching location filter:`, adminLocation);
    return userIds;
  } catch (error) {
    console.error('Error in getLocationFilteredUserIds:', error);
    return [];
  }
}

/**
 * Data fetching services for admin panel
 */

export interface UserData {
  id: string;
  full_name: string;
  email: string;
  role: string;
  defaultMode: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zipcode?: string;
  created_at: string;
  updated_at: string;
}

export interface UserAddressData {
  id: string;
  full_name: string;
  email: string;
  role: string;
  defaultMode: 'buyer' | 'seller' | 'both';
  mobile_phone?: string;
  street_address?: string;
  apartment_unit?: string;
  city?: string;
  state?: string;
  district?: string;
  country?: string;
  zipcode?: string;
  postal_code?: string;
  coordinates?: any;
  seller_profile?: {
    store_name: string;
    description?: string;
    address?: any;
    coordinates?: any;
    is_approved?: boolean;
  };
  created_at: string;
  is_seller: boolean;
  is_buyer: boolean;
  display_address: string;
  full_address: string;
  location_complete: boolean;
  default_address?: {
    id: string;
    label: string;
    street?: string;
    city: string;
    state: string;
    zip_code: string;
    country: string;
    coordinates?: any;
  };
}

export interface SellerData {
  user_id: string;
  store_name: string;
  description?: string;
  features?: string[];
  profile_image?: string;
  cover_image?: string;
  address?: any; // Legacy field - may contain JSON
  coordinates?: any;
  working_hours?: any;
  is_approved?: boolean;
  // User personal address fields
  user_name?: string;
  user_email?: string;
  user_phone?: string;
  user_street_address?: string;
  user_apartment_unit?: string;
  user_city?: string;
  user_state?: string;
  user_district?: string;
  user_country?: string;
  user_zipcode?: string;
  user_postal_code?: string;
  user_coordinates?: any;
  user_created_at?: string;
  user_full_address?: string;
}

export interface InterestData {
  id: string;
  buyer_id: string;
  listing_id: string;
  status: string;
  message?: string;
  created_at: string;
  updated_at: string;
  buyer_name?: string;
  buyer_email?: string;
  seller_name?: string;
  listing_name?: string;
  price?: number;
}

export interface ReportData {
  farmer_id: string;
  farmer_name: string;
  business_name: string;
  total_orders: number;
  accepted_orders: number;
  total_revenue: number;
  state?: string;
  country?: string;
  city?: string;
}

export interface LocationStats {
  location: string;
  total_orders: number;
  total_revenue: number;
  unique_farmers: number;
}

/**
 * Fetch all users with complete profile data
 */
export async function fetchAllUsers(): Promise<UserData[]> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
}

/**
 * Fetch all seller profiles with user data
 * @param adminLocation - Optional location filter for regional admins
 */
export async function fetchAllSellers(adminLocation?: AdminLocation | null): Promise<SellerData[]> {
  try {
    // First get seller profiles - using only existing columns
    const { data: sellerProfiles, error: sellerError } = await supabase
      .from('seller_profiles')
      .select(`
        user_id,
        store_name,
        description,
        features,
        profile_image,
        cover_image,
        address,
        coordinates,
        working_hours,
        is_approved
      `);

    if (sellerError) throw sellerError;

    if (!sellerProfiles || sellerProfiles.length === 0) {
      return [];
    }

    // Get user IDs
    const userIds = sellerProfiles.map(sp => sp.user_id);

    // Build user query with location filter if provided
    let userQuery = supabase
      .from('users')
      .select('id, full_name, email, mobile_phone, street_address, apartment_unit, city, state, district, country, zip_code, postal_code, coordinates, created_at')
      .in('id', userIds);

    // Apply location filter for regional admins with zipcode-level granularity
    if (adminLocation) {
      if (adminLocation.country) {
        userQuery = userQuery.ilike('country', `%${adminLocation.country}%`);
      }
      if (adminLocation.city) {
        userQuery = userQuery.ilike('city', `%${adminLocation.city}%`);
      }
      if (adminLocation.district) {
        userQuery = userQuery.ilike('state', `%${adminLocation.district}%`); // Using state field as district
      }
      if (adminLocation.zipcode) {
        // For generated zipcodes (like "NYC001"), we need a different approach
        if (adminLocation.zipcode.match(/^[A-Z]{3}\d{3}$/)) {
          // This is a generated zipcode, so we don't filter by it since users don't have these values
          // The filtering by country and city is sufficient for generated zipcodes
          console.log('Using generated zipcode, filtering by city/country only');
        } else {
          // Real zipcode from database, filter by it
          // Use a simpler approach to avoid or() syntax issues with special characters
          userQuery = userQuery.eq('zipcode', adminLocation.zipcode);
        }
      }
    }

    const { data: users, error: userError } = await userQuery;

    if (userError) throw userError;

    // Create user lookup map
    const userMap = new Map();
    (users || []).forEach(user => {
      userMap.set(user.id, user);
    });

    // Combine seller profiles with user data
    const result = sellerProfiles
      .map(seller => {
        const user = userMap.get(seller.user_id);

        // Build full address string from all available fields
        const addressParts = [
          user?.street_address,
          user?.apartment_unit,
          user?.city,
          user?.district,
          user?.state,
          user?.country,
          user?.postal_code || user?.zip_code
        ].filter(Boolean);

        const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : 'Address not provided';

        return {
          ...seller,
          user_name: user?.full_name,
          user_email: user?.email,
          user_phone: user?.mobile_phone,
          user_street_address: user?.street_address,
          user_apartment_unit: user?.apartment_unit,
          user_city: user?.city,
          user_state: user?.state,
          user_district: user?.district,
          user_country: user?.country,
          user_zipcode: user?.zip_code,
          user_postal_code: user?.postal_code,
          user_coordinates: user?.coordinates,
          user_created_at: user?.created_at,
          user_full_address: fullAddress
        };
      })
      .filter(seller => {
        // If location filtering is applied, only include sellers with user data (meaning they passed the location filter)
        if (adminLocation) {
          return !!seller.user_name; // Only include if user data exists (passed location filter)
        }
        return true; // No location filter, include all
      });

    console.log(`fetchAllSellers: Found ${result.length} sellers after zipcode filtering`);
    return result;
  } catch (error) {
    console.error('Error fetching sellers:', error);
    throw error;
  }
}

/**
 * Fetch all interests with related data
 */
export async function fetchAllInterests(): Promise<InterestData[]> {
  try {
    const { data, error } = await supabase
      .from('interests')
      .select(`
        *,
        buyer:users!buyer_id(
          full_name,
          email
        ),
        listing:listings!listing_id(
          name,
          price,
          seller_name
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(interest => ({
      ...interest,
      buyer_name: interest.buyer?.full_name,
      buyer_email: interest.buyer?.email,
      seller_name: interest.listing?.seller_name,
      listing_name: interest.listing?.name,
      price: interest.listing?.price
    }));
  } catch (error) {
    console.error('Error fetching interests:', error);
    throw error;
  }
}

/**
 * Fetch farmer revenue data for reports - Real database data
 * Now supports location-based filtering for regional admins and date range filtering
 */
export async function fetchFarmerRevenueData(
  adminLocation?: AdminLocation | null,
  dateRange?: { startDate: string; endDate: string }
): Promise<ReportData[]> {
  try {
    console.log('Fetching real farmer revenue data from database...');

    // Step 1: Get all interests with complete data
    let interestsQuery = supabase
      .from('interests')
      .select(`
        id,
        status,
        quantity,
        seller_id,
        listing_id,
        created_at,
        listing:listings!inner(
          id,
          name,
          price,
          seller_name,
          type
        ),
        buyer:users!buyer_id(
          id,
          full_name,
          email
        )
      `);

    // Add date range filtering if provided
    if (dateRange) {
      interestsQuery = interestsQuery
        .gte('created_at', dateRange.startDate)
        .lte('created_at', dateRange.endDate);
    }

    const { data: allInterests, error: interestsError } = await interestsQuery;

    if (interestsError) {
      console.error('Error fetching interests:', interestsError);
      throw new Error(`Database error: ${interestsError.message}`);
    }

    console.log('Total interests found:', allInterests?.length || 0);

    if (!allInterests || allInterests.length === 0) {
      console.log('No interests found in database');
      return []; // Return empty array instead of mock data
    }

    // Step 2: Get all seller profiles
    const { data: sellerProfiles, error: sellerError } = await supabase
      .from('seller_profiles')
      .select('user_id, store_name, is_approved');

    if (sellerError) {
      console.error('Error fetching seller profiles:', sellerError);
      // Continue without seller profiles if they don't exist
    }

    // Step 3: Get location-filtered user IDs and filter sellers
    const locationFilteredUserIds = await getLocationFilteredUserIds(adminLocation);
    const sellerIds = [...new Set(allInterests.map(interest => interest.seller_id))];

    // Apply location filtering to seller IDs
    let filteredSellerIds = sellerIds;
    if (adminLocation && locationFilteredUserIds.length > 0) {
      // Only include sellers that are in the location-filtered user IDs
      filteredSellerIds = sellerIds.filter(sellerId => locationFilteredUserIds.includes(sellerId));
    } else if (adminLocation && locationFilteredUserIds.length === 0) {
      // Admin has location restrictions but no users match - return empty
      return [];
    }

    if (filteredSellerIds.length === 0) {
      console.log('No sellers found in the specified location');
      return [];
    }

    // Get seller user data
    const { data: sellers, error: sellersError } = await supabase
      .from('users')
      .select('id, full_name, email, city, state, country')
      .in('id', filteredSellerIds);

    if (sellersError) {
      console.error('Error fetching sellers:', sellersError);
      throw new Error(`Error fetching seller data: ${sellersError.message}`);
    }

    console.log('Found sellers:', sellers?.length || 0);
    console.log('Found seller profiles:', sellerProfiles?.length || 0);

    // Step 4: Process real data into report format
    return processRealInterestsData(allInterests, sellers || [], sellerProfiles || []);

  } catch (error) {
    console.error('Error fetching farmer revenue data:', error);
    throw error; // Throw error instead of returning mock data
  }
}

/**
 * Process real interests data into report format
 */
function processRealInterestsData(
  interests: any[],
  sellers: any[],
  sellerProfiles: any[]
): ReportData[] {
  try {
    console.log('Processing real interests data...');

    // Create lookup maps for efficient data access
    const sellerMap = new Map();
    sellers.forEach(seller => {
      sellerMap.set(seller.id, seller);
    });

    const sellerProfileMap = new Map();
    sellerProfiles.forEach(profile => {
      sellerProfileMap.set(profile.user_id, profile);
    });

    // Group interests by seller and calculate real metrics
    const sellerStats = new Map<string, ReportData>();

    interests.forEach((interest: any) => {
      const sellerId = interest.seller_id;
      const seller = sellerMap.get(sellerId);
      const sellerProfile = sellerProfileMap.get(sellerId);
      const listing = interest.listing;

      if (!seller || !listing) {
        console.log('Missing seller or listing data for interest:', interest.id);
        return;
      }

      // Calculate revenue based on listing price and quantity
      const price = parseFloat(listing.price || '0');
      const quantity = interest.quantity || 1;
      const revenue = price * quantity;

      // Initialize seller stats if not exists
      if (!sellerStats.has(sellerId)) {
        sellerStats.set(sellerId, {
          farmer_id: sellerId,
          farmer_name: seller.full_name || listing.seller_name || 'Unknown Seller',
          business_name: sellerProfile?.store_name || listing.seller_name || 'Unknown Business',
          total_orders: 0,
          accepted_orders: 0,
          total_revenue: 0,
          state: seller.state,
          country: seller.country,
          city: seller.city
        });
      }

      const stats = sellerStats.get(sellerId)!;

      // Count all orders
      stats.total_orders += 1;

      // Count accepted orders and add revenue
      if (interest.status === 'accepted' || interest.status === 'completed') {
        stats.accepted_orders += 1;
        stats.total_revenue += revenue;
      }
    });

    const result = Array.from(sellerStats.values())
      .sort((a, b) => b.total_revenue - a.total_revenue);

    console.log('Processed seller stats:', result.length);
    console.log('Sample data:', result.slice(0, 2));

    return result;

  } catch (error) {
    console.error('Error processing real interests data:', error);
    return [];
  }
}



/**
 * Fetch location-based statistics with optional location filtering and date range
 */
export async function fetchLocationStats(
  adminLocation?: AdminLocation | null,
  dateRange?: { startDate: string; endDate: string }
): Promise<{
  byState: LocationStats[];
  byCountry: LocationStats[];
}> {
  try {
    const farmerData = await fetchFarmerRevenueData(adminLocation, dateRange);
    
    // Group by state
    const stateStats = new Map<string, LocationStats>();
    const countryStats = new Map<string, LocationStats>();

    farmerData.forEach(farmer => {
      // State stats
      if (farmer.state) {
        const stateKey = `${farmer.state}, ${farmer.country || 'Unknown'}`;
        if (!stateStats.has(stateKey)) {
          stateStats.set(stateKey, {
            location: stateKey,
            total_orders: 0,
            total_revenue: 0,
            unique_farmers: 0
          });
        }
        const stateStat = stateStats.get(stateKey)!;
        stateStat.total_orders += farmer.total_orders;
        stateStat.total_revenue += farmer.total_revenue;
        stateStat.unique_farmers += 1;
      }

      // Country stats
      if (farmer.country) {
        if (!countryStats.has(farmer.country)) {
          countryStats.set(farmer.country, {
            location: farmer.country,
            total_orders: 0,
            total_revenue: 0,
            unique_farmers: 0
          });
        }
        const countryStat = countryStats.get(farmer.country)!;
        countryStat.total_orders += farmer.total_orders;
        countryStat.total_revenue += farmer.total_revenue;
        countryStat.unique_farmers += 1;
      }
    });

    return {
      byState: Array.from(stateStats.values()).sort((a, b) => b.total_revenue - a.total_revenue),
      byCountry: Array.from(countryStats.values()).sort((a, b) => b.total_revenue - a.total_revenue)
    };
  } catch (error) {
    console.error('Error fetching location stats:', error);
    throw error;
  }
}

export interface ActivityLogData {
  id: string;
  action: string;
  details: string;
  timestamp: string;
  user_name?: string;
  user_email?: string;
  entity_type: string;
  entity_id?: string;
  status?: string;
}

export interface FeedbackData {
  id: string;
  type: 'feedback' | 'review';
  user_id?: string;
  user_name: string;
  subject: string;
  message: string;
  status?: string;
  region?: string;
  created_at: string;
  updated_at?: string;
  response?: string;
  response_date?: string;
  responded_by?: string;
  rating?: number;
  review_type?: string;
  listing_name?: string;
  seller_name?: string;
}

/**
 * Fetch all feedback and reviews
 */
export async function fetchAllFeedback(): Promise<FeedbackData[]> {
  try {
    const feedbackItems: FeedbackData[] = [];

    // Get feedback from feedback table
    const { data: feedbackData, error: feedbackError } = await supabase
      .from('feedback')
      .select('*')
      .order('created_at', { ascending: false });

    if (feedbackError) throw feedbackError;

    // Transform feedback data
    (feedbackData || []).forEach(feedback => {
      feedbackItems.push({
        id: feedback.id,
        type: 'feedback', // Always set as 'feedback' for items from feedback table
        user_id: feedback.user_id,
        user_name: feedback.user_name || 'Unknown User',
        subject: feedback.subject,
        message: feedback.message,
        status: feedback.status || 'new',
        region: feedback.region,
        created_at: feedback.created_at,
        updated_at: feedback.updated_at,
        response: feedback.response,
        response_date: feedback.response_date,
        responded_by: feedback.responded_by
      });
    });

    // Get reviews from reviews table
    const { data: reviewsData, error: reviewsError } = await supabase
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false });

    if (reviewsError) throw reviewsError;

    if (reviewsData && reviewsData.length > 0) {
      // Get user data for reviews
      const reviewUserIds = [...new Set(reviewsData.map(r => r.user_id))];
      const { data: reviewUsers } = await supabase
        .from('users')
        .select('id, full_name')
        .in('id', reviewUserIds);

      // Get listing data for product reviews
      const listingIds = reviewsData.filter(r => r.listing_id).map(r => r.listing_id);
      const { data: listings } = listingIds.length > 0 ? await supabase
        .from('listings')
        .select('id, name, seller_name')
        .in('id', listingIds) : { data: [] };

      // Get seller data for seller reviews
      const sellerIds = reviewsData.filter(r => r.seller_id).map(r => r.seller_id);
      const { data: sellers } = sellerIds.length > 0 ? await supabase
        .from('seller_profiles')
        .select('user_id, store_name')
        .in('user_id', sellerIds) : { data: [] };

      // Create lookup maps
      const userMap = new Map();
      (reviewUsers || []).forEach(user => {
        userMap.set(user.id, user);
      });

      const listingMap = new Map();
      (listings || []).forEach(listing => {
        listingMap.set(listing.id, listing);
      });

      const sellerMap = new Map();
      (sellers || []).forEach(seller => {
        sellerMap.set(seller.user_id, seller);
      });

      // Transform reviews data
      reviewsData.forEach(review => {
        const user = userMap.get(review.user_id);
        const listing = review.listing_id ? listingMap.get(review.listing_id) : null;
        const seller = review.seller_id ? sellerMap.get(review.seller_id) : null;

        let subject = '';
        let sellerName = '';

        if (review.review_type === 'product' && listing) {
          subject = `Product Review: ${listing.name}`;
          sellerName = listing.seller_name;
        } else if (review.review_type === 'seller' && seller) {
          subject = `Seller Review: ${seller.store_name}`;
          sellerName = seller.store_name;
        } else {
          subject = `${review.review_type} Review`;
        }

        feedbackItems.push({
          id: review.id,
          type: 'review',
          user_id: review.user_id,
          user_name: user?.full_name || 'Unknown User',
          subject: subject,
          message: review.comment || '',
          status: 'resolved', // Reviews are considered resolved
          created_at: review.created_at,
          updated_at: review.updated_at,
          rating: review.rating,
          review_type: review.review_type,
          listing_name: listing?.name,
          seller_name: sellerName
        });
      });
    }

    // Sort all feedback by creation date (most recent first)
    return feedbackItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  } catch (error) {
    console.error('Error fetching feedback:', error);
    throw error;
  }
}

/**
 * Generate activity logs from database activities
 */
export async function fetchActivityLogs(): Promise<ActivityLogData[]> {
  try {
    const activities: ActivityLogData[] = [];

    // Get recent user registrations
    const { data: recentUsers } = await supabase
      .from('users')
      .select('id, full_name, email, created_at, role')
      .order('created_at', { ascending: false })
      .limit(20);

    recentUsers?.forEach(user => {
      activities.push({
        id: `user-${user.id}`,
        action: 'User Registration',
        details: `New user registered: ${user.full_name} (${user.email})${user.role !== 'user' ? ` with role: ${user.role}` : ''}`,
        timestamp: user.created_at,
        user_name: user.full_name,
        user_email: user.email,
        entity_type: 'user',
        entity_id: user.id
      });
    });

    // Get recent seller profile creations (simplified)
    const { data: recentSellers } = await supabase
      .from('seller_profiles')
      .select('user_id, store_name')
      .limit(20);

    if (recentSellers && recentSellers.length > 0) {
      const sellerUserIds = recentSellers.map(s => s.user_id);
      const { data: sellerUsers } = await supabase
        .from('users')
        .select('id, full_name, email, created_at')
        .in('id', sellerUserIds);

      const userMap = new Map();
      (sellerUsers || []).forEach(user => {
        userMap.set(user.id, user);
      });

      recentSellers.forEach(seller => {
        const user = userMap.get(seller.user_id);
        activities.push({
          id: `seller-${seller.user_id}`,
          action: 'Seller Registration',
          details: `New seller profile created: ${seller.store_name}`,
          timestamp: user?.created_at || new Date().toISOString(),
          user_name: user?.full_name,
          user_email: user?.email,
          entity_type: 'seller_profile',
          entity_id: seller.user_id
        });
      });
    }

    // Get recent interests/orders (simplified)
    const { data: recentInterests } = await supabase
      .from('interests')
      .select('id, status, created_at, updated_at, buyer_id, listing_id')
      .order('updated_at', { ascending: false })
      .limit(30);

    if (recentInterests && recentInterests.length > 0) {
      // Get buyer data
      const buyerIds = [...new Set(recentInterests.map(i => i.buyer_id))];
      const { data: buyers } = await supabase
        .from('users')
        .select('id, full_name, email')
        .in('id', buyerIds);

      // Get listing data
      const listingIds = [...new Set(recentInterests.map(i => i.listing_id))];
      const { data: interestListings } = await supabase
        .from('listings')
        .select('id, name, seller_name')
        .in('id', listingIds);

      const buyerMap = new Map();
      (buyers || []).forEach(buyer => {
        buyerMap.set(buyer.id, buyer);
      });

      const listingMap = new Map();
      (interestListings || []).forEach(listing => {
        listingMap.set(listing.id, listing);
      });

      recentInterests.forEach(interest => {
        const buyer = buyerMap.get(interest.buyer_id);
        const listing = listingMap.get(interest.listing_id);

        // Interest creation
        activities.push({
          id: `interest-create-${interest.id}`,
          action: 'Interest Created',
          details: `${buyer?.full_name || 'Unknown'} expressed interest in ${listing?.name || 'Unknown Product'}`,
          timestamp: interest.created_at,
          user_name: buyer?.full_name,
          user_email: buyer?.email,
          entity_type: 'interest',
          entity_id: interest.id,
          status: interest.status
        });

        // Status updates (if updated_at is different from created_at)
        if (interest.updated_at !== interest.created_at && interest.status !== 'pending') {
          activities.push({
            id: `interest-update-${interest.id}`,
            action: 'Interest Status Update',
            details: `Interest for ${listing?.name || 'Unknown Product'} updated to ${interest.status}`,
            timestamp: interest.updated_at,
            user_name: listing?.seller_name,
            user_email: '',
            entity_type: 'interest',
            entity_id: interest.id,
            status: interest.status
          });
        }
      });
    }

    // Get recent product reviews (simplified)
    const { data: recentReviews } = await supabase
      .from('reviews')
      .select('id, rating, created_at, user_id, listing_id, review_type')
      .order('created_at', { ascending: false })
      .limit(20);

    if (recentReviews && recentReviews.length > 0) {
      // Get user data for reviews
      const reviewUserIds = [...new Set(recentReviews.map(r => r.user_id))];
      const { data: reviewUsers } = await supabase
        .from('users')
        .select('id, full_name, email')
        .in('id', reviewUserIds);

      // Get listing data for reviews
      const reviewListingIds = [...new Set(recentReviews.map(r => r.listing_id))];
      const { data: reviewListings } = await supabase
        .from('listings')
        .select('id, name')
        .in('id', reviewListingIds);

      const reviewUserMap = new Map();
      (reviewUsers || []).forEach(user => {
        reviewUserMap.set(user.id, user);
      });

      const reviewListingMap = new Map();
      (reviewListings || []).forEach(listing => {
        reviewListingMap.set(listing.id, listing);
      });

      recentReviews.forEach(review => {
        const user = reviewUserMap.get(review.user_id);
        const listing = reviewListingMap.get(review.listing_id);

        activities.push({
          id: `review-${review.id}`,
          action: `${review.review_type} Review`,
          details: `${user?.full_name || 'Unknown'} left a ${review.rating}-star ${review.review_type} review${listing ? ` for ${listing.name}` : ''}`,
          timestamp: review.created_at,
          user_name: user?.full_name,
          user_email: user?.email,
          entity_type: 'review',
          entity_id: review.id
        });
      });
    }

    // Sort all activities by timestamp (most recent first)
    return activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  } catch (error) {
    console.error('Error fetching activity logs:', error);
    throw error;
  }
}

/**
 * Fetch all users with complete address information for admin assignment
 * This includes both buyers and sellers with their location data
 * For buyers, it fetches their default address from the user_addresses table
 */
export async function fetchUsersWithAddresses(): Promise<UserAddressData[]> {
  try {
    // First, get all users with their basic information
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select(`
        id,
        full_name,
        email,
        role,
        default_mode,
        mobile_phone,
        street_address,
        apartment_unit,
        city,
        state,
        district,
        country,
        zip_code,
        postal_code,
        coordinates,
        created_at
      `)
      .not('full_name', 'is', null)
      .not('email', 'is', null)
      .order('created_at', { ascending: false });

    if (usersError) {
      console.error('Error fetching users:', usersError);
      throw usersError;
    }

    // Fetch default addresses from user_addresses table
    const { data: defaultAddresses, error: addressError } = await supabase
      .from('user_addresses')
      .select(`
        user_id,
        label,
        street,
        city,
        state,
        zip_code,
        country,
        coordinates
      `)
      .eq('is_default', true);

    if (addressError) {
      console.error('Error fetching default addresses:', addressError);
      // Don't throw error, just log it and continue without default addresses
    }

    if (!users || users.length === 0) {
      return [];
    }

    // Get seller profiles for users who are sellers
    const { data: sellerProfiles, error: sellerError } = await supabase
      .from('seller_profiles')
      .select(`
        user_id,
        store_name,
        description,
        address,
        coordinates,
        is_approved
      `);

    if (sellerError) {
      console.error('Error fetching seller profiles:', sellerError);
    }

    // Create maps for quick lookup
    const sellerProfileMap = new Map();
    sellerProfiles?.forEach(profile => {
      sellerProfileMap.set(profile.user_id, profile);
    });

    const defaultAddressMap = new Map();
    defaultAddresses?.forEach(address => {
      defaultAddressMap.set(address.user_id, address);
    });

    // Process and enrich user data
    const enrichedUsers: UserAddressData[] = users.map(user => {
      const sellerProfile = sellerProfileMap.get(user.id);
      const defaultAddress = defaultAddressMap.get(user.id);
      const isSeller = !!sellerProfile || user.default_mode === 'seller' || user.default_mode === 'both';
      const isBuyer = user.default_mode === 'buyer' || user.default_mode === 'both';

      // Determine the best address to use
      let displayAddress = '';
      let addressData = {
        street_address: user.street_address,
        apartment_unit: user.apartment_unit,
        city: user.city,
        state: user.state,
        district: user.district,
        country: user.country,
        zipcode: user.zip_code || user.postal_code,
        coordinates: user.coordinates
      };

      // For buyers, prefer their chosen default address from user_addresses table
      if (isBuyer && defaultAddress) {
        displayAddress = [
          defaultAddress.street,
          defaultAddress.city,
          defaultAddress.state,
          defaultAddress.country,
          defaultAddress.zip_code
        ].filter(Boolean).join(', ');

        // Update address data with default address info
        addressData = {
          street_address: defaultAddress.street,
          apartment_unit: null, // user_addresses table doesn't have apartment_unit
          city: defaultAddress.city,
          state: defaultAddress.state,
          district: null, // user_addresses table doesn't have district
          country: defaultAddress.country,
          zipcode: defaultAddress.zip_code,
          coordinates: defaultAddress.coordinates
        };
      }
      // For sellers, prefer seller profile address if available and more complete
      else if (sellerProfile?.address && typeof sellerProfile.address === 'object') {
        const sellerAddr = sellerProfile.address;
        displayAddress = [
          sellerAddr.street,
          sellerAddr.city || user.city,
          sellerAddr.state || user.state,
          sellerAddr.country || user.country,
          sellerAddr.zipcode
        ].filter(Boolean).join(', ');

        // Update address data with seller profile info
        addressData = {
          street_address: sellerAddr.street,
          apartment_unit: sellerAddr.apartment_unit,
          city: sellerAddr.city || user.city,
          state: sellerAddr.state || user.state,
          district: sellerAddr.district,
          country: sellerAddr.country || user.country,
          zipcode: sellerAddr.zipcode,
          coordinates: sellerProfile.coordinates || user.coordinates
        };
      } else {
        // Fallback to user's basic address information
        displayAddress = [
          user.street_address,
          user.city,
          user.state,
          user.country,
          user.zip_code || user.postal_code
        ].filter(Boolean).join(', ');
      }

      // Check if location information is complete enough for mapping
      const locationComplete = !!(
        addressData.city &&
        addressData.state &&
        addressData.country
      );

      // Build full address string from all available fields
      const addressParts = [
        addressData.street_address,
        addressData.apartment_unit,
        addressData.city,
        addressData.district,
        addressData.state,
        addressData.country,
        addressData.zipcode
      ].filter(Boolean);

      const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : displayAddress || 'Address not provided';

      return {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role || 'user',
        defaultMode: user.default_mode || 'buyer',
        mobile_phone: user.mobile_phone,
        street_address: addressData.street_address,
        apartment_unit: addressData.apartment_unit,
        city: addressData.city,
        state: addressData.state,
        district: addressData.district,
        country: addressData.country,
        zipcode: addressData.zipcode,
        postal_code: addressData.zipcode, // Use zipcode for postal_code as well
        coordinates: addressData.coordinates,
        seller_profile: sellerProfile ? {
          store_name: sellerProfile.store_name,
          description: sellerProfile.description,
          address: sellerProfile.address,
          coordinates: sellerProfile.coordinates,
          is_approved: sellerProfile.is_approved
        } : undefined,
        created_at: user.created_at,
        is_seller: isSeller,
        is_buyer: isBuyer,
        display_address: displayAddress || 'Address not provided',
        full_address: fullAddress,
        location_complete: locationComplete,
        // Add default address info for buyers
        default_address: defaultAddress ? {
          id: defaultAddress.id,
          label: defaultAddress.label,
          street: defaultAddress.street,
          city: defaultAddress.city,
          state: defaultAddress.state,
          zip_code: defaultAddress.zip_code,
          country: defaultAddress.country,
          coordinates: defaultAddress.coordinates
        } : undefined
      };
    });

    return enrichedUsers;
  } catch (error) {
    console.error('Error fetching users with addresses:', error);
    throw error;
  }
}

/**
 * Fetch all addresses for a specific user
 */
export async function fetchUserAddresses(userId: string) {
  try {
    const { data: addresses, error } = await supabase
      .from('user_addresses')
      .select(`
        id,
        label,
        street,
        city,
        state,
        zip_code,
        country,
        coordinates,
        is_default,
        created_at,
        updated_at
      `)
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user addresses:', error);
      throw error;
    }

    return addresses || [];
  } catch (error) {
    console.error('Error fetching user addresses:', error);
    throw error;
  }
}

/**
 * Fetch users filtered by location for admin assignment
 * This helps show only relevant users when assigning regional admins
 */
export async function fetchUsersInLocation(location: AdminLocation): Promise<UserAddressData[]> {
  try {
    const allUsers = await fetchUsersWithAddresses();

    // Filter users based on location criteria
    return allUsers.filter(user => {
      // Check country match
      if (location.country && user.country) {
        if (!user.country.toLowerCase().includes(location.country.toLowerCase())) {
          return false;
        }
      }

      // Check city match
      if (location.city && user.city) {
        if (!user.city.toLowerCase().includes(location.city.toLowerCase())) {
          return false;
        }
      }

      // Check state/district match
      if (location.district && user.state) {
        if (!user.state.toLowerCase().includes(location.district.toLowerCase())) {
          return false;
        }
      }

      return true;
    });
  } catch (error) {
    console.error('Error fetching users in location:', error);
    throw error;
  }
}

/**
 * Fetch dashboard statistics with optional location filtering
 */
export async function fetchDashboardStats(adminLocation?: AdminLocation | null) {
  try {
    // Get location-filtered user IDs if admin has location restrictions
    const locationFilteredUserIds = await getLocationFilteredUserIds(adminLocation);

    if (adminLocation && locationFilteredUserIds.length === 0) {
      // Admin has location restrictions but no users match - return zero counts
      return {
        members: 0,
        farmers: 0,
        orders: 0,
        feedback: 0,
        reports: 0
      };
    }

    // Build queries with location filtering if provided
    let usersQuery = supabase.from('users').select('*', { count: 'exact', head: true });
    let sellersQuery = supabase.from('seller_profiles').select('*', { count: 'exact', head: true });
    let interestsQuery = supabase.from('interests').select('*', { count: 'exact', head: true });
    let feedbackQuery = supabase.from('feedback').select('*', { count: 'exact', head: true });
    let reviewsQuery = supabase.from('reviews').select('*', { count: 'exact', head: true });

    // Apply location filtering for regional admins using the filtered user IDs
    if (adminLocation && locationFilteredUserIds.length > 0) {
      // Filter users by the location-filtered IDs
      usersQuery = usersQuery.in('id', locationFilteredUserIds);

      // Filter seller profiles by user location
      sellersQuery = sellersQuery.in('user_id', locationFilteredUserIds);

      // Filter interests by buyer or seller location
      interestsQuery = interestsQuery.or(`buyer_id.in.(${locationFilteredUserIds.join(',')}),seller_id.in.(${locationFilteredUserIds.join(',')})`);

      // Filter feedback and reviews by user location
      feedbackQuery = feedbackQuery.in('user_id', locationFilteredUserIds);
      reviewsQuery = reviewsQuery.in('user_id', locationFilteredUserIds);
    }

    const [usersCount, sellersCount, interestsCount, feedbackCount, reviewsCount] = await Promise.all([
      usersQuery,
      sellersQuery,
      interestsQuery,
      feedbackQuery,
      reviewsQuery
    ]);

    return {
      members: usersCount.count || 0,
      farmers: sellersCount.count || 0,
      orders: interestsCount.count || 0,
      feedback: (feedbackCount.count || 0) + (reviewsCount.count || 0), // Combined feedback and reviews
      reports: 0 // Placeholder - implement when reports table is created
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    throw error;
  }
}

/**
 * Fetch recent orders with location filtering for dashboard
 */
export async function fetchRecentOrders(adminLocation?: AdminLocation | null): Promise<any[]> {
  try {
    // Get location-filtered user IDs if admin has location restrictions
    const locationFilteredUserIds = await getLocationFilteredUserIds(adminLocation);

    if (adminLocation && locationFilteredUserIds.length === 0) {
      // Admin has location restrictions but no users match - return empty
      return [];
    }

    // Build interests query with location filtering
    let interestsQuery = supabase
      .from('interests')
      .select(`
        *,
        listings!inner(
          id,
          name,
          price,
          seller_name,
          type
        ),
        buyer:users!buyer_id(
          id,
          full_name,
          email,
          city,
          state,
          country
        )
      `);

    // Apply location filtering for regional admins using the filtered user IDs
    if (adminLocation && locationFilteredUserIds.length > 0) {
      // Filter interests by buyer or seller location
      interestsQuery = interestsQuery.or(`buyer_id.in.(${locationFilteredUserIds.join(',')}),seller_id.in.(${locationFilteredUserIds.join(',')})`);
    }

    const { data: interests, error } = await interestsQuery
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('Error fetching recent orders:', error);
      return [];
    }

    if (!interests || interests.length === 0) {
      return [];
    }

    // Transform the data to match the expected Dashboard format
    return interests.map((interest: any) => ({
      id: interest.id,
      buyer: interest.buyer?.full_name || interest.buyer?.email || 'Unknown Customer',
      seller: interest.listings?.seller_name || 'Unknown Seller',
      product: interest.listings?.name || 'Unknown Product',
      status: interest.status || 'pending',
      created_at: interest.created_at
    }));

  } catch (error) {
    console.error('Error in fetchRecentOrders:', error);
    return [];
  }
}
