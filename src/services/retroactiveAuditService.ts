import { supabase } from '../supabaseClient';
import { AUDIT_ACTIONS, RESOURCE_TYPES } from './auditLogService';

/**
 * Service to retroactively create audit logs from existing database activities
 */

interface DatabaseActivity {
  id: string;
  created_at: string;
  updated_at?: string;
  [key: string]: any;
}

/**
 * Analyze existing database data and create retroactive audit logs
 */
export async function createRetroactiveAuditLogs(): Promise<{ success: boolean; logsCreated: number; error?: string }> {
  try {
    let totalLogsCreated = 0;

    // 1. Create audit logs for user registrations
    const userLogs = await createUserRegistrationLogs();
    totalLogsCreated += userLogs;

    // 2. Create audit logs for interest/order activities
    const interestLogs = await createInterestActivityLogs();
    totalLogsCreated += interestLogs;

    // 3. Create audit logs for admin role assignments
    const adminLogs = await createAdminRoleLogs();
    totalLogsCreated += adminLogs;

    // 4. Create audit logs for listing/product activities
    const listingLogs = await createListingActivityLogs();
    totalLogsCreated += listingLogs;

    // 5. Create audit logs for review/feedback activities
    const reviewLogs = await createReviewActivityLogs();
    totalLogsCreated += reviewLogs;

    console.log(`Retroactive audit logging completed. Created ${totalLogsCreated} audit entries.`);
    return { success: true, logsCreated: totalLogsCreated };

  } catch (error: any) {
    console.error('Error creating retroactive audit logs:', error);
    return { success: false, logsCreated: 0, error: error.message };
  }
}

/**
 * Create audit logs for user registrations
 */
async function createUserRegistrationLogs(): Promise<number> {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: true });

    if (error || !users) return 0;

    const auditEntries = users.map(user => ({
      user_id: user.id,
      user_name: user.full_name || 'Unknown User',
      user_email: user.email || 'unknown@email.com',
      action: AUDIT_ACTIONS.USER_CREATED,
      resource_type: RESOURCE_TYPES.USER,
      resource_id: user.id,
      details: JSON.stringify({
        user_name: user.full_name,
        user_email: user.email,
        user_role: user.role || 'user',
        default_mode: user.default_mode,
        registration_method: 'main_app',
        retroactive_entry: true
      }),
      ip_address: 'unknown',
      user_agent: 'Retroactive Audit Log',
      severity: 'medium',
      timestamp: user.created_at
    }));

    const { error: insertError } = await supabase
      .from('audit_logs')
      .insert(auditEntries);

    if (insertError) {
      console.error('Error inserting user registration logs:', insertError);
      return 0;
    }

    return auditEntries.length;
  } catch (error) {
    console.error('Error in createUserRegistrationLogs:', error);
    return 0;
  }
}

/**
 * Create audit logs for interest/order activities
 */
async function createInterestActivityLogs(): Promise<number> {
  try {
    const { data: interests, error } = await supabase
      .from('interests')
      .select(`
        *,
        buyer:buyer_id(full_name, email),
        seller:seller_id(full_name, email),
        listing:listing_id(name, price)
      `)
      .order('created_at', { ascending: true });

    if (error || !interests) return 0;

    const auditEntries: any[] = [];

    interests.forEach(interest => {
      // Interest creation log
      auditEntries.push({
        user_id: interest.buyer_id,
        user_name: interest.buyer?.full_name || 'Unknown Buyer',
        user_email: interest.buyer?.email || 'unknown@email.com',
        action: AUDIT_ACTIONS.ORDER_CREATED,
        resource_type: RESOURCE_TYPES.ORDER,
        resource_id: interest.id,
        details: JSON.stringify({
          buyer_id: interest.buyer_id,
          seller_id: interest.seller_id,
          listing_id: interest.listing_id,
          product_name: interest.listing?.name,
          quantity: interest.quantity,
          initial_status: 'pending',
          retroactive_entry: true
        }),
        ip_address: 'unknown',
        user_agent: 'Retroactive Audit Log',
        severity: 'low',
        timestamp: interest.created_at
      });

      // Status change log (if updated)
      if (interest.updated_at && interest.updated_at !== interest.created_at && interest.status !== 'pending') {
        auditEntries.push({
          user_id: 'system', // Status changes are typically done by admins, but we don't know which one
          user_name: 'System/Admin',
          user_email: 'system@admin.com',
          action: AUDIT_ACTIONS.ORDER_UPDATED,
          resource_type: RESOURCE_TYPES.ORDER,
          resource_id: interest.id,
          details: JSON.stringify({
            old_status: 'pending',
            new_status: interest.status,
            buyer_name: interest.buyer?.full_name,
            seller_name: interest.seller?.full_name,
            product_name: interest.listing?.name,
            quantity: interest.quantity,
            retroactive_entry: true
          }),
          ip_address: 'unknown',
          user_agent: 'Retroactive Audit Log',
          severity: 'medium',
          timestamp: interest.updated_at
        });
      }
    });

    if (auditEntries.length > 0) {
      const { error: insertError } = await supabase
        .from('audit_logs')
        .insert(auditEntries);

      if (insertError) {
        console.error('Error inserting interest activity logs:', insertError);
        return 0;
      }
    }

    return auditEntries.length;
  } catch (error) {
    console.error('Error in createInterestActivityLogs:', error);
    return 0;
  }
}

/**
 * Create audit logs for admin role assignments
 */
async function createAdminRoleLogs(): Promise<number> {
  try {
    const { data: admins, error } = await supabase
      .from('users')
      .select('*')
      .in('role', ['admin', 'super_admin'])
      .order('created_at', { ascending: true });

    if (error || !admins) return 0;

    const auditEntries = admins.map(admin => ({
      user_id: admin.id,
      user_name: admin.full_name || 'Unknown Admin',
      user_email: admin.email || 'unknown@email.com',
      action: AUDIT_ACTIONS.USER_ROLE_CHANGED,
      resource_type: RESOURCE_TYPES.ADMIN,
      resource_id: admin.id,
      details: JSON.stringify({
        old_role: 'user',
        new_role: admin.role,
        admin_name: admin.full_name,
        action_type: 'promotion',
        assigned_location: admin.admin_assigned_location,
        retroactive_entry: true
      }),
      ip_address: 'unknown',
      user_agent: 'Retroactive Audit Log',
      severity: 'high',
      timestamp: admin.created_at
    }));

    const { error: insertError } = await supabase
      .from('audit_logs')
      .insert(auditEntries);

    if (insertError) {
      console.error('Error inserting admin role logs:', insertError);
      return 0;
    }

    return auditEntries.length;
  } catch (error) {
    console.error('Error in createAdminRoleLogs:', error);
    return 0;
  }
}

/**
 * Create audit logs for listing/product activities
 */
async function createListingActivityLogs(): Promise<number> {
  try {
    const { data: listings, error } = await supabase
      .from('listings')
      .select(`
        *,
        seller:seller_id(full_name, email)
      `)
      .order('created_at', { ascending: true });

    if (error || !listings) return 0;

    const auditEntries = listings.map(listing => ({
      user_id: listing.seller_id,
      user_name: listing.seller?.full_name || 'Unknown Seller',
      user_email: listing.seller?.email || 'unknown@email.com',
      action: AUDIT_ACTIONS.PRODUCT_CREATED,
      resource_type: RESOURCE_TYPES.PRODUCT,
      resource_id: listing.id,
      details: JSON.stringify({
        product_name: listing.name,
        seller_id: listing.seller_id,
        price: listing.price,
        category: listing.category,
        description: listing.description,
        retroactive_entry: true
      }),
      ip_address: 'unknown',
      user_agent: 'Retroactive Audit Log',
      severity: 'low',
      timestamp: listing.created_at
    }));

    const { error: insertError } = await supabase
      .from('audit_logs')
      .insert(auditEntries);

    if (insertError) {
      console.error('Error inserting listing activity logs:', insertError);
      return 0;
    }

    return auditEntries.length;
  } catch (error) {
    console.error('Error in createListingActivityLogs:', error);
    return 0;
  }
}

/**
 * Create audit logs for review/feedback activities
 */
async function createReviewActivityLogs(): Promise<number> {
  try {
    const { data: reviews, error } = await supabase
      .from('reviews')
      .select(`
        *,
        user:user_id(full_name, email)
      `)
      .order('created_at', { ascending: true });

    if (error || !reviews) return 0;

    const auditEntries = reviews.map(review => ({
      user_id: review.user_id,
      user_name: review.user?.full_name || 'Unknown User',
      user_email: review.user?.email || 'unknown@email.com',
      action: 'review_created',
      resource_type: RESOURCE_TYPES.REVIEW,
      resource_id: review.id,
      details: JSON.stringify({
        product_id: review.product_id,
        rating: review.rating,
        comment: review.comment,
        retroactive_entry: true
      }),
      ip_address: 'unknown',
      user_agent: 'Retroactive Audit Log',
      severity: 'low',
      timestamp: review.created_at
    }));

    const { error: insertError } = await supabase
      .from('audit_logs')
      .insert(auditEntries);

    if (insertError) {
      console.error('Error inserting review activity logs:', insertError);
      return 0;
    }

    return auditEntries.length;
  } catch (error) {
    console.error('Error in createReviewActivityLogs:', error);
    return 0;
  }
}

/**
 * Get summary of activities that can be tracked
 */
export async function getActivitySummary(): Promise<{
  users: number;
  interests: number;
  admins: number;
  listings: number;
  reviews: number;
  totalActivities: number;
}> {
  try {
    const [usersResult, interestsResult, adminsResult, listingsResult, reviewsResult] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('interests').select('id', { count: 'exact', head: true }),
      supabase.from('users').select('id', { count: 'exact', head: true }).in('role', ['admin', 'super_admin']),
      supabase.from('listings').select('id', { count: 'exact', head: true }),
      supabase.from('reviews').select('id', { count: 'exact', head: true })
    ]);

    const users = usersResult.count || 0;
    const interests = interestsResult.count || 0;
    const admins = adminsResult.count || 0;
    const listings = listingsResult.count || 0;
    const reviews = reviewsResult.count || 0;

    return {
      users,
      interests,
      admins,
      listings,
      reviews,
      totalActivities: users + interests + admins + listings + reviews
    };
  } catch (error) {
    console.error('Error getting activity summary:', error);
    return {
      users: 0,
      interests: 0,
      admins: 0,
      listings: 0,
      reviews: 0,
      totalActivities: 0
    };
  }
}
