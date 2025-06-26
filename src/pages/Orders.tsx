import React, { useState, useEffect, useCallback } from 'react';
import { OrderTable } from '../components/orders/OrderTable';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../supabaseClient';
import { Search, Download, RefreshCw, X } from 'lucide-react';

/**
 * Orders Page - Displays all orders done by users
 *
 * This page fetches and displays orders from two sources:
 * 1. Orders table - Contains actual completed orders with full order details
 * 2. Interests table - Contains order inquiries/interests that may become orders
 *
 * Features:
 * - Combined view of all user orders and interests
 * - Filtering by status and date range
 * - Search across customer names, farmer names, products, and notes
 * - Pagination for large datasets
 * - Export to CSV functionality
 * - Status management for super admins
 */

// Define the Order type
interface Order {
  id: string;
  customer: string;
  farmer: string;
  products: string[];
  total: number;
  status: "pending" | "accepted" | "rejected" | "in_discussion" | "completed";
  date: string;
}

export function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalOrders, setTotalOrders] = useState(0);
  const user = useAuthStore((state) => state.user);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    // Reset to first page when filters change (except page changes)
    if (page !== 1) {
      setPage(1);
    } else {
      fetchOrders();
    }
  }, [statusFilter, dateFilter, searchTerm]);

  useEffect(() => {
    fetchOrders();
  }, [page, pageSize]);

  const fetchOrders = async () => {
    try {
      if (searchTerm) {
        setSearching(true);
      } else {
        setLoading(true);
      }
      setError(null);

      console.log('Fetching orders with filters:', { statusFilter, dateFilter, searchTerm, page, pageSize });

      // Fetch from both orders and interests tables to get all orders done by users
      const [ordersResult, interestsResult] = await Promise.all([
        // Fetch from orders table (actual completed orders)
        fetchFromOrdersTable(),
        // Fetch from interests table (order inquiries/interests)
        fetchFromInterestsTable()
      ]);

      // Combine all orders
      let allOrders = [...ordersResult, ...interestsResult];

      // Apply client-side search if search term exists
      if (searchTerm && searchTerm.trim()) {
        const searchPattern = searchTerm.toLowerCase().trim();
        console.log('Applying client-side search for:', searchPattern);
        console.log('Total orders before search:', allOrders.length);

        allOrders = allOrders.filter(order => {
          const customer = order.customer.toLowerCase();
          const farmer = order.farmer.toLowerCase();
          const products = order.products.join(' ').toLowerCase();

          const matchesCustomer = customer.includes(searchPattern);
          const matchesFarmer = farmer.includes(searchPattern);
          const matchesProducts = products.includes(searchPattern);

          const matches = matchesCustomer || matchesFarmer || matchesProducts;

          if (matches) {
            console.log('Match found:', {
              customer: order.customer,
              farmer: order.farmer,
              products: order.products,
              matchesCustomer,
              matchesFarmer,
              matchesProducts
            });
          }

          return matches;
        });

        console.log('Total orders after search:', allOrders.length);
      }

      // Sort all orders by date
      allOrders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Apply pagination to filtered results
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedOrders = allOrders.slice(startIndex, endIndex);

      setTotalOrders(allOrders.length);
      setOrders(paginatedOrders);

      console.log('Total combined orders:', allOrders.length);
      console.log('Paginated orders:', paginatedOrders);

    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('Failed to fetch orders. Check console for details.');
    } finally {
      setLoading(false);
      setSearching(false);
    }
  };

  const fetchFromOrdersTable = async (): Promise<Order[]> => {
    try {
      // Build simple query for orders table - no search filters here
      let query = supabase
        .from('orders')
        .select(`
          *,
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
          ),
          seller:users!seller_id(
            id,
            full_name,
            email
          )
        `);

      // Apply status filter only
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      // Apply date filter only
      if (dateFilter !== 'all') {
        const now = new Date();
        let fromDate;

        switch (dateFilter) {
          case '7days':
            fromDate = new Date(now.setDate(now.getDate() - 7));
            break;
          case '30days':
            fromDate = new Date(now.setDate(now.getDate() - 30));
            break;
          case '3months':
            fromDate = new Date(now.setMonth(now.getMonth() - 3));
            break;
        }

        if (fromDate) {
          query = query.gte('created_at', fromDate.toISOString());
        }
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching orders:', error);
        return [];
      }

      console.log('Fetched orders data:', data);

      if (data && data.length > 0) {
        return data.map((order: any) => {
          const productName = order.listing?.name || 'Unknown Product';
          const products = [productName];

          return {
            id: order.id || '',
            customer: order.buyer?.full_name || order.buyer?.email || 'Unknown Customer',
            farmer: order.seller?.full_name || order.listing?.seller_name || 'Unknown Farmer',
            products: products,
            total: parseFloat(order.total_amount || '0'),
            status: order.status || 'pending',
            date: order.created_at || new Date().toISOString()
          };
        });
      }

      return [];
    } catch (err) {
      console.error('Error fetching from orders table:', err);
      return [];
    }
  };

  const fetchFromInterestsTable = async (): Promise<Order[]> => {
    try {
      // Build simple query for interests table - no search filters here
      let query = supabase
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
        `);

      // Apply status filter only
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      // Apply date filter only
      if (dateFilter !== 'all') {
        const now = new Date();
        let fromDate;

        switch (dateFilter) {
          case '7days':
            fromDate = new Date(now.setDate(now.getDate() - 7));
            break;
          case '30days':
            fromDate = new Date(now.setDate(now.getDate() - 30));
            break;
          case '3months':
            fromDate = new Date(now.setMonth(now.getMonth() - 3));
            break;
        }

        if (fromDate) {
          query = query.gte('created_at', fromDate.toISOString());
        }
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching interests:', error);
        return [];
      }

      console.log('Fetched interests data:', data);

      if (data && data.length > 0) {
        return data.map((interest: any) => {
          const productName = interest.listings?.name || 'Unknown Product';
          const products = [productName];

          // Calculate total from quantity and listing price
          const price = parseFloat(interest.listings?.price || '0');
          const total = price * (interest.quantity || 1);

          return {
            id: `interest_${interest.id}`, // Prefix to distinguish from actual orders
            customer: interest.buyer?.full_name || interest.buyer?.email || 'Unknown Customer',
            farmer: interest.listings?.seller_name || 'Unknown Farmer',
            products: products,
            total: total,
            status: interest.status || 'pending',
            date: interest.created_at || new Date().toISOString()
          };
        });
      }

      return [];
    } catch (err) {
      console.error('Error fetching from interests table:', err);
      return [];
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: Order['status']) => {
    try {
      setLoading(true);

      // Determine if this is an interest or an actual order based on ID prefix
      const isInterest = orderId.startsWith('interest_');
      const actualId = isInterest ? orderId.replace('interest_', '') : orderId;
      const tableName = isInterest ? 'interests' : 'orders';

      // Update in database
      const { error } = await supabase
        .from(tableName)
        .update({ status: newStatus })
        .eq('id', actualId);

      if (error) throw error;

      // Update local state
      setOrders(orders.map(order =>
        order.id === orderId ? { ...order, status: newStatus } : order
      ));

      console.log(`${isInterest ? 'Interest' : 'Order'} ${orderId} status updated to ${newStatus}`);
    } catch (err) {
      console.error('Error updating order status:', err);
      setError('Failed to update order status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    // Create CSV content
    const headers = ['ID', 'Customer', 'Farmer', 'Products', 'Total', 'Status', 'Date'];
    const csvContent = [
      headers.join(','),
      ...orders.map(order => [
        order.id,
        `"${order.customer}"`,
        `"${order.farmer}"`,
        `"${order.products.join(', ')}"`,
        order.total.toFixed(2),
        order.status,
        new Date(order.date).toLocaleString()
      ].join(','))
    ].join('\n');
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const totalPages = Math.ceil(totalOrders / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">All User Orders</h2>
          <p className="text-sm text-gray-600 mt-1">
            {searchTerm ? (
              <span className="flex items-center gap-2">
                <span>Search results for "{searchTerm}"</span>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                  {totalOrders} found
                </span>
              </span>
            ) : (
              <>Showing completed orders and order inquiries from all users ({totalOrders} total)</>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => fetchOrders()}
            className="p-2 rounded-lg hover:bg-gray-100"
            title="Refresh orders"
          >
            <RefreshCw className="h-5 w-5 text-gray-500" />
          </button>
          {/* <button 
            onClick={handleExport}
            className="p-2 rounded-lg hover:bg-gray-100"
            title="Export to CSV"
            disabled={orders.length === 0}
          >
            <Download className="h-5 w-5 text-gray-500" />
          </button> */}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
        <div className="relative flex-grow">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {searching ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
            ) : (
              <Search className="h-5 w-5 text-gray-400" />
            )}
          </div>
          <input
            type="text"
            placeholder="Search by customer name, product name, or farmer name..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-10 pr-10 py-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
          {searchInput && (
            <button
              onClick={() => {
                setSearchInput('');
                setSearchTerm('');
              }}
              className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-red-600"
              title="Clear search"
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 bg-white"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_discussion">In Discussion</option>
            <option value="accepted">Accepted</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
          </select>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 bg-white"
          >
            <option value="all">All Time</option>
            <option value="7days">Last 7 days</option>
            <option value="30days">Last 30 days</option>
            <option value="3months">Last 3 months</option>
          </select>
        </div>
      </div>

      {/* Search Help */}
      {searchInput && !searchTerm && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            <strong>Search Tips:</strong> You can search by customer name (e.g., "John Smith"),
            product name (e.g., "Tomatoes"), or farmer name.
            The search is case-insensitive and will find partial matches.
          </p>
        </div>
      )}

      {/* Active Search Indicator */}
      {searchTerm && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-green-600" />
            <span className="text-sm text-green-800">
              Active search: <strong>"{searchTerm}"</strong>
            </span>
          </div>
          <button
            onClick={() => {
              setSearchInput('');
              setSearchTerm('');
            }}
            className="text-green-600 hover:text-green-800 text-sm underline"
          >
            Clear search
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 text-gray-700 px-4 py-8 rounded text-center">
          {searchTerm ? (
            <>
              <p className="text-lg font-medium">No orders found for "{searchTerm}"</p>
              <p className="text-sm mt-2">
                Try searching for:
              </p>
              <ul className="text-sm mt-2 space-y-1">
                <li>• Customer names (e.g., "John Smith")</li>
                <li>• Product names (e.g., "Tomatoes", "Apples")</li>
                <li>• Farmer/seller names</li>
                <li>• Email addresses</li>
              </ul>
              <button
                onClick={() => {
                  setSearchInput('');
                  setSearchTerm('');
                }}
                className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm"
              >
                Clear Search
              </button>
            </>
          ) : (
            <>
              <p className="text-lg font-medium">No orders found</p>
              <p className="text-sm mt-2">Try adjusting your filters or check back later for new orders</p>
            </>
          )}
        </div>
      ) : (
        <>
          {/* Legend */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Legend</h3>
            <div className="flex flex-wrap gap-4 text-xs">
              <div className="flex items-center space-x-2">
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full">Order</span>
                <span className="text-gray-600">Completed orders from the orders table</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full">Interest</span>
                <span className="text-gray-600">Order inquiries from the interests table</span>
              </div>
            </div>
          </div>

          <OrderTable
            orders={orders}
            onStatusChange={user?.role === 'super_admin' ? handleStatusChange : undefined}
          />
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-gray-500">
                Showing {Math.min((page - 1) * pageSize + 1, totalOrders)} to {Math.min(page * pageSize, totalOrders)} of {totalOrders} orders
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className={`px-3 py-1 rounded border ${page === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className={`px-3 py-1 rounded border ${page === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}



