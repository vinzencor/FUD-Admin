import React, { useState, useEffect } from 'react';
import { Users, ShoppingBag, Store, ArrowUpRight, MessageSquare, FileText } from 'lucide-react';
import { StatCard } from '../components/dashboard/StatCard';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../supabaseClient';
import { Link } from 'react-router-dom';
import { fetchDashboardStats, fetchRecentOrders as fetchRecentOrdersFromService } from '../services/dataService';
import { getAdminAssignedLocation, AdminLocation } from '../services/locationAdminService';

interface DashboardStats {
  members: number;
  farmers: number;
  orders: number;
  feedback: number;
  reports: number;
}

interface Order {
  id: string;
  buyer: string;
  seller: string;
  product: string;
  status: 'pending' | 'accepted' | 'rejected' | 'in_discussion' | 'completed';
  created_at?: string;
}

interface DetailedOrder {
  id: string;
  quantity: number;
  status: string;
  created_at: string;
  updated_at: string;
  note?: string;
  reject_reason?: string;
  buyer?: {
    full_name?: string;
    email?: string;
    mobile_phone?: string;
    city?: string;
    state?: string;
  };
  listing?: {
    name?: string;
    seller_name?: string;
    price?: string;
    unit?: string;
    type?: string;
  };
}

export function Dashboard() {
  const user = useAuthStore((state) => state.user);
  const isSuperAdmin = user?.role === 'super_admin';
  const [stats, setStats] = useState<DashboardStats>({
    members: 0,
    farmers: 0,
    orders: 0,
    feedback: 0,
    reports: 0
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshingCache, setRefreshingCache] = useState(false);
  const [adminLocation, setAdminLocation] = useState<AdminLocation | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<DetailedOrder | null>(null);
  
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

      // Get admin's assigned location for filtering
      let adminLocationFilter: AdminLocation | null = null;
      if (user?.role === 'admin' && user?.id) {
        adminLocationFilter = await getAdminAssignedLocation(user.id);
      }

      // Set the admin location state for display
      setAdminLocation(adminLocationFilter);

      // Fetch stats based on user role with location filtering
      const statsData = await fetchStats(adminLocationFilter);
      setStats(statsData);

      // Fetch recent orders with location filtering
      const orders = await fetchRecentOrdersFromService(adminLocationFilter);
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

  const fetchStats = async (adminLocationFilter?: AdminLocation | null): Promise<DashboardStats> => {
    try {
      // Use the centralized data service with location filtering
      return await fetchDashboardStats(adminLocationFilter);
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Return fallback data if there's an error
      return isSuperAdmin
        ? { members: 8976, farmers: 1245, orders: 367, feedback: 89, reports: 12 }
        : { members: 1856, farmers: 234, orders: 86, feedback: 23, reports: 3 };
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

  const getStatusColor = (status: string) => {
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

  const fetchOrderDetails = async (orderId: string) => {
    try {
      // Check if it's an interest (prefixed with 'interest_')
      const isInterest = orderId.startsWith('interest_');
      const actualId = isInterest ? orderId.replace('interest_', '') : orderId;

      let query;
      if (isInterest) {
        // Fetch from interests table
        query = supabase
          .from('interests')
          .select(`
            *,
            buyer:users!buyer_id(
              full_name,
              email,
              mobile_phone,
              city,
              state
            ),
            listing:listings!listing_id(
              name,
              seller_name,
              price,
              unit,
              type
            )
          `)
          .eq('id', actualId)
          .single();
      } else {
        // Fetch from orders table
        query = supabase
          .from('orders')
          .select(`
            *,
            buyer:users!buyer_id(
              full_name,
              email,
              mobile_phone,
              city,
              state
            ),
            listing:listings!listing_id(
              name,
              seller_name,
              price,
              unit,
              type
            )
          `)
          .eq('id', actualId)
          .single();
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching order details:', error);
        return;
      }

      if (data) {
        setSelectedOrder(data);
        setShowDetailModal(true);
      }
    } catch (err) {
      console.error('Error fetching order details:', err);
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
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">
            {isSuperAdmin ? 'Global Overview' : `${regionName} Overview`}
          </h2>
          {adminLocation ? (
            <div className="mt-2 text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full inline-block">
              📍 Viewing data for: {adminLocation.zipcode ? `Zipcode ${adminLocation.zipcode}, ` : ''}{adminLocation.city}, {adminLocation.district}, {adminLocation.country}
            </div>
          ) : user?.role === 'super_admin' ? (
            <div className="mt-2 text-sm text-purple-600 bg-purple-50 px-3 py-1 rounded-full inline-block">
              🌍 Global Access - All Locations
            </div>
          ) : null}
        </div>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
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
        {/* <StatCard
          title="Reports"
          value={stats.reports}
          icon={FileText}
          description="Generated reports"
          to={`${basePath}/reports`}
        /> */}
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
                      <button
                        onClick={() => fetchOrderDetails(order.id)}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        View Details
                      </button>
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

      {/* Order Detail Modal */}
      {showDetailModal && selectedOrder && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Order Details</h3>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Buyer Information</h4>
                    <div className="bg-gray-50 p-3 rounded">
                      <p><strong>Name:</strong> {selectedOrder.buyer?.full_name || 'Unknown'}</p>
                      <p><strong>Email:</strong> {selectedOrder.buyer?.email || 'Unknown'}</p>
                      {selectedOrder.buyer?.mobile_phone && (
                        <p><strong>Phone:</strong> {selectedOrder.buyer.mobile_phone}</p>
                      )}
                      {selectedOrder.buyer?.city && selectedOrder.buyer?.state && (
                        <p><strong>Location:</strong> {selectedOrder.buyer.city}, {selectedOrder.buyer.state}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Product Information</h4>
                    <div className="bg-gray-50 p-3 rounded">
                      <p><strong>Product:</strong> {selectedOrder.listing?.name || 'Unknown'}</p>
                      <p><strong>Seller:</strong> {selectedOrder.listing?.seller_name || 'Unknown'}</p>
                      <p><strong>Price:</strong> ${selectedOrder.listing?.price || '0'} per {selectedOrder.listing?.unit || 'unit'}</p>
                      <p><strong>Type:</strong> {selectedOrder.listing?.type || 'Unknown'}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Order Details</h4>
                  <div className="bg-gray-50 p-3 rounded">
                    <p><strong>Quantity:</strong> {selectedOrder.quantity} {selectedOrder.listing?.unit || 'units'}</p>
                    <p><strong>Total Value:</strong> ${(parseFloat(selectedOrder.listing?.price || '0') * selectedOrder.quantity).toFixed(2)}</p>
                    <p><strong>Status:</strong>
                      <span className={`ml-2 px-2 py-1 text-xs rounded-full ${getStatusColor(selectedOrder.status)}`}>
                        {selectedOrder.status.split('_').map(word =>
                          word.charAt(0).toUpperCase() + word.slice(1)
                        ).join(' ')}
                      </span>
                    </p>
                    <p><strong>Created:</strong> {new Date(selectedOrder.created_at).toLocaleString()}</p>
                    {selectedOrder.updated_at !== selectedOrder.created_at && (
                      <p><strong>Updated:</strong> {new Date(selectedOrder.updated_at).toLocaleString()}</p>
                    )}
                  </div>
                </div>

                {selectedOrder.note && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Buyer's Note</h4>
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="text-gray-700">{selectedOrder.note}</p>
                    </div>
                  </div>
                )}

                {selectedOrder.reject_reason && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Rejection Reason</h4>
                    <div className="bg-red-50 p-3 rounded">
                      <p className="text-red-700">{selectedOrder.reject_reason}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

