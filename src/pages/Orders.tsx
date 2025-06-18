import React, { useState, useEffect } from 'react';
import { OrderTable } from '../components/orders/OrderTable';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../supabaseClient';
import { Search, Download, RefreshCw } from 'lucide-react';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalOrders, setTotalOrders] = useState(0);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [page, pageSize, statusFilter, dateFilter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Fetching orders with filters:', { statusFilter, dateFilter, searchTerm });

      // Start building the query for interests table (which represents orders)
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

      // Apply filters
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

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

      if (searchTerm) {
        // Search in note field and related data
        query = query.ilike('note', `%${searchTerm}%`);
      }

      // First, get the count
      const { count, error: countError } = await supabase
        .from('interests')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        console.error('Error counting interests:', countError);
        throw countError;
      }

      setTotalOrders(count || 0);
      console.log('Total interests count:', count);

      // Then get paginated data with relationships
      const { data, error: dataError } = await query
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (dataError) {
        console.error('Error fetching interests data:', dataError);
        throw dataError;
      }

      console.log('Fetched interests data:', data);

      if (data && data.length > 0) {
        // Map the interests data to our Order interface
        const formattedOrders = data.map((interest: any) => {
          console.log('Processing interest:', interest);

          // Extract product name from listing
          const productName = interest.listings?.name || 'Unknown Product';
          const products = [productName];

          // Calculate total from quantity and listing price
          const price = parseFloat(interest.listings?.price || '0');
          const total = price * (interest.quantity || 1);

          return {
            id: interest.id || '',
            customer: interest.buyer?.full_name || interest.buyer?.email || 'Unknown Customer',
            farmer: interest.listings?.seller_name || 'Unknown Farmer',
            products: products,
            total: total,
            status: interest.status || 'pending',
            date: interest.created_at || new Date().toISOString()
          };
        });

        console.log('Formatted orders:', formattedOrders);
        setOrders(formattedOrders);
      } else {
        console.log('No interests found in database');
        setOrders([]);
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('Failed to fetch orders. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: Order['status']) => {
    try {
      setLoading(true);

      // Update in database (interests table)
      const { error } = await supabase
        .from('interests')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      // Update local state
      setOrders(orders.map(order =>
        order.id === orderId ? { ...order, status: newStatus } : order
      ));

      console.log(`Interest ${orderId} status updated to ${newStatus}`);
    } catch (err) {
      console.error('Error updating interest status:', err);
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
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      {/* Header Section - Responsive */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">Orders</h2>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => fetchOrders()}
            className="flex items-center gap-2 px-3 py-2 sm:p-2 rounded-lg hover:bg-gray-100 text-sm sm:text-base"
            title="Refresh orders"
          >
            <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
            <span className="sm:hidden">Refresh</span>
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-2 sm:p-2 rounded-lg hover:bg-gray-100 text-sm sm:text-base"
            title="Export to CSV"
            disabled={orders.length === 0}
          >
            <Download className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
            <span className="sm:hidden">Export</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
        <div className="relative flex-grow">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchOrders()}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full"
          />
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
          <p className="text-lg font-medium">No orders found</p>
          <p className="text-sm mt-2">Try adjusting your filters or adding new orders</p>
        </div>
      ) : (
        <>
          <OrderTable 
            orders={orders} 
            onStatusChange={user?.role === 'super_admin' ? handleStatusChange : undefined}
          />
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4">
              <div className="text-sm text-gray-500 order-2 sm:order-1">
                Showing {Math.min((page - 1) * pageSize + 1, totalOrders)} to {Math.min(page * pageSize, totalOrders)} of {totalOrders} orders
              </div>
              <div className="flex gap-2 order-1 sm:order-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className={`px-3 py-2 text-sm rounded border ${page === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                >
                  Previous
                </button>
                <span className="px-3 py-2 text-sm text-gray-500">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className={`px-3 py-2 text-sm rounded border ${page === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
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



