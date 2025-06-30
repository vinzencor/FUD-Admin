import { supabase } from '../supabaseClient';

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
 */
export async function fetchAllSellers(): Promise<SellerData[]> {
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

    // Get user data
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, full_name, email, mobile_phone, city, state, country, created_at')
      .in('id', userIds);

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
 * Fetch farmer revenue data for reports
 */
export async function fetchFarmerRevenueData(): Promise<ReportData[]> {
  try {
    // Get all accepted interests
    const { data: acceptedInterests, error: interestsError } = await supabase
      .from('interests')
      .select('id, status, quantity, seller_id, listing_id')
      .eq('status', 'accepted');

    if (interestsError) throw interestsError;

    if (!acceptedInterests || acceptedInterests.length === 0) {
      return [];
    }

    // Get listing data
    const listingIds = acceptedInterests.map(i => i.listing_id);
    const { data: listings, error: listingsError } = await supabase
      .from('listings')
      .select('id, name, price, seller_name')
      .in('id', listingIds);

    if (listingsError) throw listingsError;

    // Get seller profiles
    const sellerIds = [...new Set(acceptedInterests.map(i => i.seller_id))];
    const { data: sellerProfiles, error: sellersError } = await supabase
      .from('seller_profiles')
      .select('user_id, store_name')
      .in('user_id', sellerIds);

    if (sellersError) throw sellersError;

    // Get user data for sellers
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, full_name, city, state, country')
      .in('id', sellerIds);

    if (usersError) throw usersError;

    // Create lookup maps
    const listingMap = new Map();
    (listings || []).forEach(listing => {
      listingMap.set(listing.id, listing);
    });

    const sellerMap = new Map();
    (sellerProfiles || []).forEach(seller => {
      sellerMap.set(seller.user_id, seller);
    });

    const userMap = new Map();
    (users || []).forEach(user => {
      userMap.set(user.id, user);
    });

    // Group by farmer and calculate revenue
    const farmerStats = new Map<string, ReportData>();

    acceptedInterests.forEach(interest => {
      const listing = listingMap.get(interest.listing_id);
      const seller = sellerMap.get(interest.seller_id);
      const user = userMap.get(interest.seller_id);

      if (!listing) return;

      const sellerId = interest.seller_id;
      const price = parseFloat(listing.price || '0');
      const quantity = interest.quantity || 1;
      const revenue = price * quantity;

      if (!farmerStats.has(sellerId)) {
        farmerStats.set(sellerId, {
          farmer_id: sellerId,
          farmer_name: user?.full_name || listing.seller_name || 'Unknown',
          business_name: seller?.store_name || listing.seller_name || 'Unknown Business',
          total_orders: 0,
          accepted_orders: 0,
          total_revenue: 0,
          state: user?.state,
          country: user?.country,
          city: user?.city
        });
      }

      const stats = farmerStats.get(sellerId)!;
      stats.total_orders += 1;
      stats.accepted_orders += 1;
      stats.total_revenue += revenue;
    });

    return Array.from(farmerStats.values()).sort((a, b) => b.total_revenue - a.total_revenue);
  } catch (error) {
    console.error('Error fetching farmer revenue data:', error);
    throw error;
  }
}

/**
 * Fetch location-based statistics
 */
export async function fetchLocationStats(): Promise<{
  byState: LocationStats[];
  byCountry: LocationStats[];
}> {
  try {
    const farmerData = await fetchFarmerRevenueData();
    
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
 * Fetch dashboard statistics
 */
export async function fetchDashboardStats() {
  try {
    const [usersCount, sellersCount, interestsCount, feedbackCount, reviewsCount, activityLogs] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('seller_profiles').select('*', { count: 'exact', head: true }),
      supabase.from('interests').select('*', { count: 'exact', head: true }),
      supabase.from('feedback').select('*', { count: 'exact', head: true }),
      supabase.from('reviews').select('*', { count: 'exact', head: true }),
      fetchActivityLogs()
    ]);

    return {
      members: usersCount.count || 0,
      farmers: sellersCount.count || 0,
      orders: interestsCount.count || 0,
      feedback: (feedbackCount.count || 0) + (reviewsCount.count || 0), // Combined feedback and reviews
      reports: 0, // Placeholder - implement when reports table is created
      activityLog: activityLogs.length
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    throw error;
  }
}
