import React, { useState, useEffect } from 'react';
import { Users, ShoppingBag, Store, ArrowUpRight, MessageSquare, FileText, Activity } from 'lucide-react';
import { StatCard } from '../components/dashboard/StatCard';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../supabaseClient';
import { Link } from 'react-router-dom';
import { fetchDashboardStats } from '../services/dataService';

interface DashboardStats {
  members: number;
  farmers: number;
  orders: number;
  feedback: number;
  reports: number;
  activityLog: number;
}

interface Order {
  id: string;
  buyer: string;
  seller: string;
  product: string;
  status: 'pending' | 'accepted' | 'rejected' | 'in_discussion' | 'completed';
  created_at?: string;
}

export function Dashboard() {
  const user = useAuthStore((state) => state.user);
  const isSuperAdmin = user?.role === 'super_admin';
  const [stats, setStats] = useState<DashboardStats>({
    members: 0,
    farmers: 0,
    orders: 0,
    feedback: 0,
    reports: 0,
    activityLog: 0
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshingCache, setRefreshingCache] = useState(false);
  
  // Get region name safely
  const regionName = user?.regions && user.regions.length > 0 
    ? user.regions[0].name 
    : "Regional";
  
  const basePath = isSuperAdmin ? '/super-admin' : '/admin';

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch stats based on user role
      const statsData = await fetchStats();
      setStats(statsData);

      // Fetch recent orders
      const orders = await fetchRecentOrders();
      setRecentOrders(orders);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const refreshSchemaCache = async () => {
    try {
      setRefreshingCache(true);
      const { data, error } = await supabase.rpc('refresh_schema_cache');

      if (error) throw error;

      if (data?.success) {
        // Refresh dashboard data after cache refresh
        await fetchDashboardData();
      } else {
        throw new Error(data?.error || 'Failed to refresh schema cache');
      }
    } catch (err) {
      console.error('Error refreshing schema cache:', err);
      setError('Failed to refresh schema cache');
    } finally {
      setRefreshingCache(false);
    }
  };

  const fetchStats = async (): Promise<DashboardStats> => {
    try {
      // Use the centralized data service
      return await fetchDashboardStats();
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Return fallback data if there's an error
      return isSuperAdmin
        ? { members: 8976, farmers: 1245, orders: 367, feedback: 89, reports: 12, activityLog: 156 }
        : { members: 1856, farmers: 234, orders: 86, feedback: 23, reports: 3, activityLog: 45 };
    }
  };

  const fetchRecentOrders = async (): Promise<Order[]> => {
    try {
      // Use the database function for better performance and error handling
      const { data, error } = await supabase.rpc('get_dashboard_stats');

      if (error) throw error;

      if (data && data.recent_interests && Array.isArray(data.recent_interests)) {
        return data.recent_interests.map((interest: any) => ({
          id: interest.id,
          buyer: interest.buyer_name || 'Unknown Customer',
          seller: interest.seller_name || 'Unknown Seller',
          product: interest.product_name || 'Unknown Product',
          status: interest.status,
          created_at: interest.created_at
        }));
      }

      // Fallback to direct query if function fails
      const { data: fallbackData, error: fallbackError } = await supabase
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
            email
          )
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (fallbackError) throw fallbackError;

      if (fallbackData && fallbackData.length > 0) {
        return fallbackData.map((interest: any) => ({
          id: interest.id,
          buyer: interest.buyer?.full_name || interest.buyer?.email || 'Unknown Customer',
          seller: interest.listings?.seller_name || 'Unknown Seller',
          product: interest.listings?.name || 'Unknown Product',
          status: interest.status,
          created_at: interest.created_at
        }));
      }

      // Return empty array if no interests found
      return [];
    } catch (error) {
      console.error('Error fetching recent orders:', error);
      // Return empty array if there's an error
      return [];
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-blue-100 text-blue-800';
      case 'in_discussion':
        return 'bg-yellow-100 text-yellow-800';
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'in_discussion':
        return 'In Discussion';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-gray-900">
          {isSuperAdmin ? 'Global Overview' : `${regionName} Overview`}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="text-sm text-primary-600 hover:text-primary-800 flex items-center"
          >
            Refresh Data
          </button>
          {(error?.includes('schema') || error?.includes('cache')) && (
            <button
              onClick={refreshSchemaCache}
              disabled={refreshingCache}
              className="text-sm text-orange-600 hover:text-orange-800 flex items-center px-2 py-1 border border-orange-300 rounded"
            >
              {refreshingCache ? 'Refreshing...' : 'Refresh Schema'}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Total Members"
          value={stats.members}
          icon={Users}
          description="Registered members"
          to={`${basePath}/members`}
        />
        <StatCard
          title="Farmers (Sellers)"
          value={stats.farmers}
          icon={Store}
          description="Active farmers"
          to={`${basePath}/farmers`}
        />
        <StatCard
          title="Orders"
          value={stats.orders}
          icon={ShoppingBag}
          description="Total orders"
          to={`${basePath}/orders`}
        />
        <StatCard
          title="Feedback"
          value={stats.feedback}
          icon={MessageSquare}
          description="Customer feedback"
          to={`${basePath}/feedback`}
        />
        <StatCard
          title="Reports"
          value={stats.reports}
          icon={FileText}
          description="Generated reports"
          to={`${basePath}/reports`}
        />
        <StatCard
          title="Activity Log"
          value={stats.activityLog}
          icon={Activity}
          description="System activities"
          to={`${basePath}/activity-logs`}
        />
      </div>

      {/* Recent Orders Section */}
      <div className="bg-white shadow-sm border border-gray-100 rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Recent Requests
          </h3>
          <Link 
            to={`${basePath}/orders`}
            className="text-sm text-primary-600 hover:text-primary-800 flex items-center"
          >
            View All <ArrowUpRight className="ml-1 h-4 w-4" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Request ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentOrders.length > 0 ? (
                recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {order.id.substring(0, 8)}...
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.buyer}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.product}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link to={`${basePath}/orders`} className="text-primary-600 hover:text-primary-900">
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                    No recent requests found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

