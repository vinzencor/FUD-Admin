import { supabase } from '../supabaseClient';
import { useAuthStore } from '../store/authStore';
import { checkAuditLogTableExists, initializeAuditLogging } from '../utils/createAuditLogTable';

export interface AuditLogEntry {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details: any;
  ip_address?: string;
  user_agent?: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface AuditLogFilter {
  user_id?: string;
  action?: string;
  resource_type?: string;
  severity?: string;
  start_date?: string;
  end_date?: string;
  search_term?: string;
}

/**
 * Log an audit event
 */
export async function logAuditEvent(
  action: string,
  resourceType: string,
  details: any = {},
  resourceId?: string,
  severity: 'low' | 'medium' | 'high' | 'critical' = 'low'
): Promise<void> {
  try {
    const user = useAuthStore.getState().user;
    if (!user) return;

    // Check if audit logs table exists, create if needed
    const tableExists = await checkAuditLogTableExists();
    if (!tableExists) {
      console.log('Audit logs table does not exist, initializing...');
      const initResult = await initializeAuditLogging();
      if (!initResult.success) {
        console.error('Failed to initialize audit logging:', initResult.error);
        return;
      }
    }

    const auditEntry = {
      user_id: user.id,
      user_name: user.name,
      user_email: user.email,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      details: JSON.stringify(details),
      ip_address: await getClientIP(),
      user_agent: navigator.userAgent,
      severity,
      timestamp: new Date().toISOString()
    };

    const { error } = await supabase
      .from('audit_logs')
      .insert(auditEntry);

    if (error) {
      console.error('Failed to log audit event:', error);
    }
  } catch (error) {
    console.error('Error in logAuditEvent:', error);
  }
}

/**
 * Get client IP address (simplified version)
 */
async function getClientIP(): Promise<string> {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip || 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Fetch all activities from both apps (audit logs + real-time database activities)
 */
export async function fetchAllActivities(
  filter: AuditLogFilter = {},
  page: number = 1,
  pageSize: number = 50
): Promise<{ data: AuditLogEntry[]; total: number; error?: string }> {
  try {
    // Check if audit logs table exists
    const tableExists = await checkAuditLogTableExists();
    if (!tableExists) {
      console.log('Audit logs table does not exist, returning empty data');
      return { data: [], total: 0 };
    }

    // Fetch audit logs
    const auditResult = await fetchAuditLogs(filter, page, pageSize);

    // If we have audit logs, return them
    if (auditResult.data.length > 0) {
      return auditResult;
    }

    // If no audit logs, try to fetch recent activities from database tables
    return await fetchRecentDatabaseActivities(filter, page, pageSize);
  } catch (error: any) {
    return { data: [], total: 0, error: error.message };
  }
}

/**
 * Fetch audit logs with filtering and pagination
 */
export async function fetchAuditLogs(
  filter: AuditLogFilter = {},
  page: number = 1,
  pageSize: number = 50
): Promise<{ data: AuditLogEntry[]; total: number; error?: string }> {
  try {
    // Check if audit logs table exists
    const tableExists = await checkAuditLogTableExists();
    if (!tableExists) {
      console.log('Audit logs table does not exist, returning empty data');
      return { data: [], total: 0 };
    }

    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' });

    // Apply filters
    if (filter.user_id) {
      query = query.eq('user_id', filter.user_id);
    }

    if (filter.action) {
      query = query.eq('action', filter.action);
    }

    if (filter.resource_type) {
      query = query.eq('resource_type', filter.resource_type);
    }

    if (filter.severity) {
      query = query.eq('severity', filter.severity);
    }

    if (filter.start_date) {
      query = query.gte('timestamp', filter.start_date);
    }

    if (filter.end_date) {
      query = query.lte('timestamp', filter.end_date);
    }

    if (filter.search_term) {
      query = query.or(`action.ilike.%${filter.search_term}%,details.ilike.%${filter.search_term}%,user_name.ilike.%${filter.search_term}%`);
    }

    // Apply pagination and ordering
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await query
      .order('timestamp', { ascending: false })
      .range(from, to);

    if (error) {
      return { data: [], total: 0, error: error.message };
    }

    return {
      data: data || [],
      total: count || 0
    };
  } catch (error: any) {
    return { data: [], total: 0, error: error.message };
  }
}

/**
 * Fetch recent activities directly from database tables when audit logs don't exist
 */
async function fetchRecentDatabaseActivities(
  filter: AuditLogFilter = {},
  page: number = 1,
  pageSize: number = 50
): Promise<{ data: AuditLogEntry[]; total: number; error?: string }> {
  try {
    const activities: AuditLogEntry[] = [];

    // Fetch recent user registrations
    const { data: users } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (users) {
      users.forEach(user => {
        activities.push({
          id: `user_${user.id}`,
          user_id: user.id,
          user_name: user.full_name || 'Unknown User',
          user_email: user.email || 'unknown@email.com',
          action: 'user_registered',
          resource_type: 'user',
          resource_id: user.id,
          details: JSON.stringify({
            user_name: user.full_name,
            user_email: user.email,
            user_role: user.role || 'user',
            default_mode: user.default_mode,
            source: 'main_app'
          }),
          ip_address: 'unknown',
          user_agent: 'Database Activity',
          timestamp: user.created_at,
          severity: 'medium'
        });
      });
    }

    // Fetch recent interests/orders
    const { data: interests } = await supabase
      .from('interests')
      .select(`
        *,
        buyer:buyer_id(full_name, email),
        seller:seller_id(full_name, email),
        listing:listing_id(name, price)
      `)
      .order('created_at', { ascending: false })
      .limit(20);

    if (interests) {
      interests.forEach(interest => {
        activities.push({
          id: `interest_${interest.id}`,
          user_id: interest.buyer_id,
          user_name: interest.buyer?.full_name || 'Unknown Buyer',
          user_email: interest.buyer?.email || 'unknown@email.com',
          action: 'order_placed',
          resource_type: 'order',
          resource_id: interest.id,
          details: JSON.stringify({
            buyer_id: interest.buyer_id,
            seller_id: interest.seller_id,
            listing_id: interest.listing_id,
            product_name: interest.listing?.name,
            quantity: interest.quantity,
            status: interest.status,
            source: 'main_app'
          }),
          ip_address: 'unknown',
          user_agent: 'Database Activity',
          timestamp: interest.created_at,
          severity: 'low'
        });

        // Add status change activity if updated
        if (interest.updated_at && interest.updated_at !== interest.created_at) {
          activities.push({
            id: `interest_update_${interest.id}`,
            user_id: 'system',
            user_name: 'System/Admin',
            user_email: 'system@admin.com',
            action: 'order_status_changed',
            resource_type: 'order',
            resource_id: interest.id,
            details: JSON.stringify({
              buyer_name: interest.buyer?.full_name,
              seller_name: interest.seller?.full_name,
              product_name: interest.listing?.name,
              new_status: interest.status,
              source: 'admin_app'
            }),
            ip_address: 'unknown',
            user_agent: 'Database Activity',
            timestamp: interest.updated_at,
            severity: 'medium'
          });
        }
      });
    }

    // Fetch recent listings/products
    const { data: listings } = await supabase
      .from('listings')
      .select(`
        *,
        seller:seller_id(full_name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(15);

    if (listings) {
      listings.forEach(listing => {
        activities.push({
          id: `listing_${listing.id}`,
          user_id: listing.seller_id,
          user_name: listing.seller?.full_name || 'Unknown Seller',
          user_email: listing.seller?.email || 'unknown@email.com',
          action: 'product_created',
          resource_type: 'product',
          resource_id: listing.id,
          details: JSON.stringify({
            product_name: listing.name,
            seller_id: listing.seller_id,
            price: listing.price,
            category: listing.category,
            source: 'main_app'
          }),
          ip_address: 'unknown',
          user_agent: 'Database Activity',
          timestamp: listing.created_at,
          severity: 'low'
        });
      });
    }

    // Sort all activities by timestamp (most recent first)
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize;
    const paginatedActivities = activities.slice(from, to);

    return {
      data: paginatedActivities,
      total: activities.length
    };

  } catch (error: any) {
    console.error('Error fetching database activities:', error);
    return { data: [], total: 0, error: error.message };
  }
}

/**
 * Get audit log statistics
 */
export async function getAuditLogStats(): Promise<{
  totalEvents: number;
  todayEvents: number;
  criticalEvents: number;
  topActions: Array<{ action: string; count: number }>;
  topUsers: Array<{ user_name: string; count: number }>;
}> {
  try {
    // Check if audit logs table exists
    const tableExists = await checkAuditLogTableExists();
    if (!tableExists) {
      console.log('Audit logs table does not exist, returning empty stats');
      return {
        totalEvents: 0,
        todayEvents: 0,
        criticalEvents: 0,
        topActions: [],
        topUsers: []
      };
    }

    const today = new Date().toISOString().split('T')[0];

    // Get total events
    const { count: totalEvents } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true });

    // Get today's events
    const { count: todayEvents } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .gte('timestamp', today);

    // Get critical events
    const { count: criticalEvents } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('severity', 'critical');

    // Get top actions
    const { data: actionsData } = await supabase
      .from('audit_logs')
      .select('action')
      .limit(1000);

    const actionCounts = actionsData?.reduce((acc: any, item) => {
      acc[item.action] = (acc[item.action] || 0) + 1;
      return acc;
    }, {}) || {};

    const topActions = Object.entries(actionCounts)
      .map(([action, count]) => ({ action, count: count as number }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Get top users
    const { data: usersData } = await supabase
      .from('audit_logs')
      .select('user_name')
      .limit(1000);

    const userCounts = usersData?.reduce((acc: any, item) => {
      acc[item.user_name] = (acc[item.user_name] || 0) + 1;
      return acc;
    }, {}) || {};

    const topUsers = Object.entries(userCounts)
      .map(([user_name, count]) => ({ user_name, count: count as number }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalEvents: totalEvents || 0,
      todayEvents: todayEvents || 0,
      criticalEvents: criticalEvents || 0,
      topActions,
      topUsers
    };
  } catch (error) {
    console.error('Error getting audit log stats:', error);
    return {
      totalEvents: 0,
      todayEvents: 0,
      criticalEvents: 0,
      topActions: [],
      topUsers: []
    };
  }
}

// Predefined audit actions for consistency
export const AUDIT_ACTIONS = {
  // User Management
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  USER_CREATED: 'user_created',
  USER_UPDATED: 'user_updated',
  USER_DELETED: 'user_deleted',
  USER_ROLE_CHANGED: 'user_role_changed',
  USER_SUSPENDED: 'user_suspended',
  USER_ACTIVATED: 'user_activated',
  PASSWORD_CHANGED: 'password_changed',

  // Admin Management
  ADMIN_ASSIGNED: 'admin_assigned',
  ADMIN_LOCATION_UPDATED: 'admin_location_updated',
  ADMIN_PERMISSIONS_CHANGED: 'admin_permissions_changed',

  // Product Management
  PRODUCT_CREATED: 'product_created',
  PRODUCT_UPDATED: 'product_updated',
  PRODUCT_DELETED: 'product_deleted',
  PRODUCT_APPROVED: 'product_approved',
  PRODUCT_REJECTED: 'product_rejected',

  // Order Management
  ORDER_CREATED: 'order_created',
  ORDER_UPDATED: 'order_updated',
  ORDER_CANCELLED: 'order_cancelled',
  ORDER_COMPLETED: 'order_completed',

  // System Management
  COVER_IMAGE_UPDATED: 'cover_image_updated',
  SETTINGS_UPDATED: 'settings_updated',
  DATA_EXPORTED: 'data_exported',
  SYSTEM_BACKUP: 'system_backup',

  // Security Events
  UNAUTHORIZED_ACCESS: 'unauthorized_access',
  FAILED_LOGIN: 'failed_login',
  SUSPICIOUS_ACTIVITY: 'suspicious_activity',
  DATA_BREACH_ATTEMPT: 'data_breach_attempt'
} as const;

// Resource types
export const RESOURCE_TYPES = {
  USER: 'user',
  ADMIN: 'admin',
  PRODUCT: 'product',
  ORDER: 'order',
  REVIEW: 'review',
  FEEDBACK: 'feedback',
  COVER_IMAGE: 'cover_image',
  SYSTEM: 'system',
  SECURITY: 'security'
} as const;
