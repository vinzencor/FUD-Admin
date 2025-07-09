import { supabase } from '../supabaseClient';
import { AdminLocation, getLocationFilteredUserIds, hasLocationRestrictions } from './locationAdminService';

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
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zipcode?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
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
  location_complete: boolean;
}

export interface SellerData {
  user_id: string;
  store_name: string;
  description?: string;
  features?: string[];
  profile_image?: string;
  cover_image?: string;
  address?: any;
  coordinates?: any;
  working_hours?: any;
  is_approved?: boolean;
  user_name?: string;
  user_email?: string;
  user_phone?: string;
  user_city?: string;
  user_state?: string;
  user_country?: string;
  user_created_at?: string;
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
    // First get seller profiles
    const { data: sellerProfiles, error: sellerError } = await supabase
      .from('seller_profiles')
      .select('*');

    if (sellerError) throw sellerError;

    if (!sellerProfiles || sellerProfiles.length === 0) {
      return [];
    }

    // Get user IDs
    const userIds = sellerProfiles.map(sp => sp.user_id);

    // Build user query with location filter if provided
    let userQuery = supabase
      .from('users')
      .select('id, full_name, email, mobile_phone, city, state, country, created_at')
      .in('id', userIds);

    // Apply location filter for regional admins with street-level granularity
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
      // TODO: Add street-level filtering once we have proper address fields
      // For now, the filtering is at district level which provides good granularity
    }

    const { data: users, error: userError } = await userQuery;

    if (userError) throw userError;

    // Create user lookup map
    const userMap = new Map();
    (users || []).forEach(user => {
      userMap.set(user.id, user);
    });

    // Combine seller profiles with user data
    return sellerProfiles.map(seller => {
      const user = userMap.get(seller.user_id);
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
 * Now supports location-based filtering for regional admins
 */
export async function fetchFarmerRevenueData(adminLocation?: AdminLocation | null): Promise<ReportData[]> {
  try {
    console.log('Fetching real farmer revenue data from database...');

    // Step 1: Get all interests with complete data
    const { data: allInterests, error: interestsError } = await supabase
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

    // Step 3: Get all users (sellers) with location filtering
    const sellerIds = [...new Set(allInterests.map(interest => interest.seller_id))];
    let sellersQuery = supabase
      .from('users')
      .select('id, full_name, email, city, state, country')
      .in('id', sellerIds);

    // Apply location filtering for regional admins
    if (adminLocation) {
      if (adminLocation.country) {
        sellersQuery = sellersQuery.ilike('country', `%${adminLocation.country}%`);
      }
      if (adminLocation.city) {
        sellersQuery = sellersQuery.ilike('city', `%${adminLocation.city}%`);
      }
      if (adminLocation.district) {
        sellersQuery = sellersQuery.ilike('state', `%${adminLocation.district}%`);
      }
    }

    const { data: sellers, error: sellersError } = await sellersQuery;

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
 * Fetch location-based statistics with optional location filtering
 */
export async function fetchLocationStats(adminLocation?: AdminLocation | null): Promise<{
  byState: LocationStats[];
  byCountry: LocationStats[];
}> {
  try {
    const farmerData = await fetchFarmerRevenueData(adminLocation);
    
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
        address,
        city,
        state,
        country,
        zipcode,
        created_at
      `)
      .not('full_name', 'is', null)
      .not('email', 'is', null)
      .order('created_at', { ascending: false });

    if (usersError) {
      console.error('Error fetching users:', usersError);
      throw usersError;
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

    // Create a map of seller profiles for quick lookup
    const sellerProfileMap = new Map();
    sellerProfiles?.forEach(profile => {
      sellerProfileMap.set(profile.user_id, profile);
    });

    // Process and enrich user data
    const enrichedUsers: UserAddressData[] = users.map(user => {
      const sellerProfile = sellerProfileMap.get(user.id);
      const isSeller = !!sellerProfile || user.default_mode === 'seller' || user.default_mode === 'both';
      const isBuyer = user.default_mode === 'buyer' || user.default_mode === 'both';

      // Determine the best address to use
      let displayAddress = '';
      let coordinates = null;

      // Prefer seller profile address if available and more complete
      if (sellerProfile?.address && typeof sellerProfile.address === 'object') {
        const sellerAddr = sellerProfile.address;
        displayAddress = [
          sellerAddr.street,
          sellerAddr.city || user.city,
          sellerAddr.state || user.state,
          sellerAddr.country || user.country,
          sellerAddr.zipcode || user.zipcode
        ].filter(Boolean).join(', ');

        if (sellerProfile.coordinates) {
          coordinates = sellerProfile.coordinates;
        }
      } else {
        // Use user's basic address information
        displayAddress = [
          user.address,
          user.city,
          user.state,
          user.country,
          user.zipcode
        ].filter(Boolean).join(', ');
      }

      // Check if location information is complete enough for mapping
      const locationComplete = !!(
        (user.city || sellerProfile?.address?.city) &&
        (user.state || sellerProfile?.address?.state) &&
        (user.country || sellerProfile?.address?.country)
      );

      return {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role || 'user',
        defaultMode: user.default_mode || 'buyer',
        mobile_phone: user.mobile_phone,
        address: user.address,
        city: user.city,
        state: user.state,
        country: user.country,
        zipcode: user.zipcode,
        coordinates,
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
        location_complete: locationComplete
      };
    });

    return enrichedUsers;
  } catch (error) {
    console.error('Error fetching users with addresses:', error);
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
    // Build queries with location filtering if provided
    let usersQuery = supabase.from('users').select('*', { count: 'exact', head: true });
    let sellersQuery = supabase.from('seller_profiles').select('*', { count: 'exact', head: true });
    let interestsQuery = supabase.from('interests').select('*', { count: 'exact', head: true });
    let feedbackQuery = supabase.from('feedback').select('*', { count: 'exact', head: true });
    let reviewsQuery = supabase.from('reviews').select('*', { count: 'exact', head: true });

    // Apply location filtering for regional admins
    if (adminLocation) {
      // Filter users by location
      if (adminLocation.country) {
        usersQuery = usersQuery.ilike('country', `%${adminLocation.country}%`);
      }
      if (adminLocation.city) {
        usersQuery = usersQuery.ilike('city', `%${adminLocation.city}%`);
      }
      if (adminLocation.district) {
        usersQuery = usersQuery.ilike('state', `%${adminLocation.district}%`);
      }

      // For seller profiles, we need to filter by user location
      // First get location-filtered user IDs, then filter seller profiles
      const { data: locationUsers } = await supabase
        .from('users')
        .select('id')
        .ilike('country', adminLocation.country ? `%${adminLocation.country}%` : '%')
        .ilike('city', adminLocation.city ? `%${adminLocation.city}%` : '%')
        .ilike('state', adminLocation.district ? `%${adminLocation.district}%` : '%');

      if (locationUsers && locationUsers.length > 0) {
        const userIds = locationUsers.map(u => u.id);
        sellersQuery = sellersQuery.in('user_id', userIds);

        // Filter interests by buyer or seller location
        interestsQuery = interestsQuery.or(`buyer_id.in.(${userIds.join(',')}),seller_id.in.(${userIds.join(',')})`);

        // Filter feedback and reviews by user location
        feedbackQuery = feedbackQuery.in('user_id', userIds);
        reviewsQuery = reviewsQuery.in('user_id', userIds);
      } else {
        // No users in the location, return zero counts
        return {
          members: 0,
          farmers: 0,
          orders: 0,
          feedback: 0,
          reports: 0
        };
      }
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
