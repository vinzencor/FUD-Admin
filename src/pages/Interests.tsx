import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../supabaseClient';
import { Search, Download, RefreshCw, Eye, MessageSquare, User, Package } from 'lucide-react';
import { exportWithLoading, generateFilename, formatDateForExport, formatCurrencyForExport, ExportColumn } from '../utils/exportUtils';
import {
  getAdminAssignedLocation,
  AdminLocation,
  getLocationFilteredUserIds
} from '../services/locationAdminService';
import { useAuditLog } from '../hooks/useAuditLog';

/**
 * Interests Page - Displays all interests from all users
 * 
 * This page shows all order inquiries/interests submitted by users across the platform.
 * Interests represent potential orders where buyers have expressed interest in products.
 * 
 * Features:
 * - Complete list of all user interests
 * - Detailed interest information including buyer, seller, product, and notes
 * - Filtering by status and date range
 * - Search across buyer names, seller names, products, and notes
 * - Pagination for large datasets
 * - Export to CSV functionality
 * - Status management for super admins
 * - Detailed view modal for each interest
 */

// Define the Interest type
interface Interest {
  id: string;
  buyer_id: string;
  seller_id: string;
  listing_id: string;
  quantity: number;
  note: string;
  status: "pending" | "accepted" | "rejected" | "in_discussion" | "completed";
  reject_reason?: string;
  created_at: string;
  updated_at: string;
  // Related data
  buyer: {
    id: string;
    full_name: string;
    email: string;
    mobile_phone?: string;
    city?: string;
    state?: string;
  };
  listing: {
    id: string;
    name: string;
    price: string;
    seller_name: string;
    type: string;
    unit?: string;
  };
}

export function Interests() {
  const [interests, setInterests] = useState<Interest[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalInterests, setTotalInterests] = useState(0);
  const [selectedInterest, setSelectedInterest] = useState<Interest | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const user = useAuthStore((state) => state.user);
  const { logOrderStatusChanged } = useAuditLog();

  useEffect(() => {
    fetchInterests();
  }, []);

  useEffect(() => {
    fetchInterests();
  }, [page, pageSize, statusFilter, dateFilter, searchTerm]);

  const fetchInterests = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Fetching interests with filters:', { statusFilter, dateFilter, searchTerm });

      // Get admin's assigned location for filtering
      let adminLocation: AdminLocation | null = null;
      if (user?.role === 'admin' && user?.id) {
        adminLocation = await getAdminAssignedLocation(user.id);
      }

      // Get location-filtered user IDs if admin has location restrictions
      let locationFilteredUserIds: string[] = [];
      if (adminLocation) {
        locationFilteredUserIds = await getLocationFilteredUserIds(adminLocation);
        if (locationFilteredUserIds.length === 0) {
          // No users in admin's location, return empty results
          setInterests([]);
          setTotalInterests(0);
          setLoading(false);
          return;
        }
      }

      // Build query for interests table with all related data
      let query = supabase
        .from('interests')
        .select(`
          *,
          listing:listings!inner(
            id,
            name,
            price,
            seller_name,
            type,
            unit
          ),
          buyer:users!buyer_id(
            id,
            full_name,
            email,
            mobile_phone,
            city,
            state
          )
        `);

      // Apply location filter for regional admins
      if (adminLocation && locationFilteredUserIds.length > 0) {
        query = query.or(`buyer_id.in.(${locationFilteredUserIds.join(',')}),seller_id.in.(${locationFilteredUserIds.join(',')})`);
      }

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
        // Search across multiple fields
        query = query.or(`note.ilike.%${searchTerm}%,listing.name.ilike.%${searchTerm}%,listing.seller_name.ilike.%${searchTerm}%,buyer.full_name.ilike.%${searchTerm}%,buyer.email.ilike.%${searchTerm}%`);
      }

      // First, get the count for pagination
      const { count, error: countError } = await supabase
        .from('interests')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        console.error('Error counting interests:', countError);
        throw countError;
      }

      setTotalInterests(count || 0);

      // Then get paginated data
      const { data, error: dataError } = await query
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (dataError) {
        console.error('Error fetching interests data:', dataError);
        throw dataError;
      }

      console.log('Fetched interests data:', data);
      setInterests(data || []);

    } catch (err) {
      console.error('Error fetching interests:', err);
      setError('Failed to fetch interests. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (interestId: string, newStatus: Interest['status']) => {
    try {
      setLoading(true);

      // Get the interest details for audit logging
      const interest = interests.find(i => i.id === interestId);
      const oldStatus = interest?.status;

      // Update in database
      const { error } = await supabase
        .from('interests')
        .update({ status: newStatus })
        .eq('id', interestId);

      if (error) throw error;

      // Log the status change
      await logOrderStatusChanged(interestId, {
        old_status: oldStatus,
        new_status: newStatus,
        changed_by: user?.id,
        buyer_name: interest?.buyer?.full_name,
        seller_name: interest?.listing?.seller_name,
        product_name: interest?.listing?.name,
        quantity: interest?.quantity
      });

      // Update local state
      setInterests(interests.map(interest =>
        interest.id === interestId ? { ...interest, status: newStatus } : interest
      ));

      console.log(`Interest ${interestId} status updated to ${newStatus}`);
    } catch (err) {
      console.error('Error updating interest status:', err);
      setError('Failed to update interest status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    const filename = generateFilename('interests');

    // Transform interests data for export
    const exportData = interests.map(interest => ({
      id: interest.id,
      buyer_name: interest.buyer?.full_name || 'Unknown',
      buyer_email: interest.buyer?.email || 'Unknown',
      seller_name: interest.listing?.seller_name || 'Unknown',
      listing_name: interest.listing?.name || 'Unknown',
      quantity: interest.quantity,
      price: parseFloat(interest.listing?.price || '0'),
      total_value: parseFloat(interest.listing?.price || '0') * interest.quantity,
      status: interest.status,
      message: interest.note || '',
      created_at: interest.created_at,
      updated_at: interest.updated_at
    }));

    await exportWithLoading(
      () => Promise.resolve(exportData),
      EXPORT_COLUMNS.INTERESTS,
      filename,
      setExporting,
      (count) => {
        setExportMessage(`Successfully exported ${count} interests`);
        setTimeout(() => setExportMessage(null), 3000);
      },
      (error) => {
        setExportMessage(`Export failed: ${error}`);
        setTimeout(() => setExportMessage(null), 5000);
      }
    );
  };

  const getStatusIcon = (status: Interest['status']) => {
    switch (status) {
      case 'completed':
        return <div className="w-3 h-3 bg-green-500 rounded-full"></div>;
      case 'rejected':
        return <div className="w-3 h-3 bg-red-500 rounded-full"></div>;
      case 'in_discussion':
        return <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>;
      case 'accepted':
        return <div className="w-3 h-3 bg-blue-500 rounded-full"></div>;
      default: // pending
        return <div className="w-3 h-3 bg-gray-500 rounded-full"></div>;
    }
  };

  const getStatusColor = (status: Interest['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'in_discussion':
        return 'bg-yellow-100 text-yellow-800';
      case 'accepted':
        return 'bg-indigo-100 text-indigo-800';
      default: // pending
        return 'bg-gray-100 text-gray-800';
    }
  };

  const totalPages = Math.ceil(totalInterests / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">All User Interests</h2>
          <p className="text-sm text-gray-600 mt-1">
            Complete list of order inquiries and interests from all users
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => fetchInterests()}
            className="p-2 rounded-lg hover:bg-gray-100"
            title="Refresh interests"
          >
            <RefreshCw className="h-5 w-5 text-gray-500" />
          </button>
          <button
            onClick={handleExport}
            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Export to CSV"
            disabled={interests.length === 0 || exporting}
          >
            <Download className={`h-5 w-5 text-gray-500 ${exporting ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Export Message */}
      {exportMessage && (
        <div className={`p-4 rounded-lg ${
          exportMessage.includes('failed') || exportMessage.includes('Error')
            ? 'bg-red-50 border border-red-200 text-red-700'
            : 'bg-green-50 border border-green-200 text-green-700'
        }`}>
          {exportMessage}
        </div>
      )}

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
        <div className="relative flex-grow">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search by buyer, seller, product, or notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setPage(1);
                fetchInterests();
              }
            }}
            className="pl-10 pr-12 py-2 border border-gray-300 rounded-lg w-full"
          />
          <button
            onClick={() => {
              setPage(1);
              fetchInterests();
            }}
            className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-primary-600"
            title="Search"
          >
            <Search className="h-4 w-4 text-gray-500" />
          </button>
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

      {/* Loading, Error, and Content */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      ) : interests.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 text-gray-700 px-4 py-8 rounded text-center">
          <p className="text-lg font-medium">No interests found</p>
          <p className="text-sm mt-2">Try adjusting your filters or check back later</p>
        </div>
      ) : (
        <>
          {/* Interests Table */}
          <div className="bg-white shadow-sm border border-gray-100 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-gray-200 table-fixed" style={{ minWidth: '1100px' }}>
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                      Interest ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
                      Buyer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                      Seller
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                      Total Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {interests.map((interest) => {
                    const totalValue = parseFloat(interest.listing?.price || '0') * interest.quantity;

                    return (
                      <tr key={interest.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 w-28">
                          <span className="font-mono text-xs">{interest.id.slice(0, 8)}...</span>
                        </td>
                        <td className="px-6 py-4 w-48">
                          <div className="flex items-center">
                            <User className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium text-gray-900 truncate" title={interest.buyer?.full_name || 'Unknown'}>
                                {interest.buyer?.full_name || 'Unknown'}
                              </div>
                              <div className="text-sm text-gray-500 truncate" title={interest.buyer?.email}>
                                {interest.buyer?.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 w-32">
                          <div className="truncate" title={interest.listing?.seller_name || 'Unknown'}>
                            {interest.listing?.seller_name || 'Unknown'}
                          </div>
                        </td>
                        <td className="px-6 py-4 w-48">
                          <div className="flex items-center">
                            <Package className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium text-gray-900 truncate" title={interest.listing?.name || 'Unknown Product'}>
                                {interest.listing?.name || 'Unknown Product'}
                              </div>
                              <div className="text-sm text-gray-500 truncate">
                                ${interest.listing?.price || '0'} per {interest.listing?.unit || 'unit'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 w-24">
                          {interest.quantity} {interest.listing?.unit || 'units'}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 w-28">
                          ${totalValue.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 w-32">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(interest.status)}
                            {user?.role === 'super_admin' ? (
                              <select
                                value={interest.status}
                                onChange={(e) => handleStatusChange(interest.id, e.target.value as Interest['status'])}
                                className={`text-xs rounded-full px-2 py-1 ${getStatusColor(interest.status)}`}
                              >
                                <option value="pending">Pending</option>
                                <option value="in_discussion">In Discussion</option>
                                <option value="accepted">Accepted</option>
                                <option value="completed">Completed</option>
                                <option value="rejected">Rejected</option>
                              </select>
                            ) : (
                              <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(interest.status)}`}>
                                {interest.status.split('_').map(word =>
                                  word.charAt(0).toUpperCase() + word.slice(1)
                                ).join(' ')}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 w-40">
                          {new Date(interest.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 w-20">
                          <button
                            onClick={() => {
                              setSelectedInterest(interest);
                              setShowDetailModal(true);
                            }}
                            className="text-indigo-600 hover:text-indigo-900 p-1"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4">
              <div className="text-sm text-gray-500">
                Showing {Math.min((page - 1) * pageSize + 1, totalInterests)} to {Math.min(page * pageSize, totalInterests)} of {totalInterests} interests
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  className={`px-3 py-1 rounded border ${page === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                >
                  First
                </button>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className={`px-3 py-1 rounded border ${page === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                >
                  Previous
                </button>

                {/* Page numbers */}
                <div className="flex items-center gap-1">
                  {(() => {
                    const maxVisiblePages = 5;
                    const halfVisible = Math.floor(maxVisiblePages / 2);
                    let startPage = Math.max(1, page - halfVisible);
                    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

                    // Adjust start if we're near the end
                    if (endPage - startPage < maxVisiblePages - 1) {
                      startPage = Math.max(1, endPage - maxVisiblePages + 1);
                    }

                    const pages = [];

                    // Add ellipsis at start if needed
                    if (startPage > 1) {
                      pages.push(
                        <button
                          key={1}
                          onClick={() => setPage(1)}
                          className="px-3 py-1 rounded border bg-white text-gray-700 hover:bg-gray-50"
                        >
                          1
                        </button>
                      );
                      if (startPage > 2) {
                        pages.push(<span key="start-ellipsis" className="px-2 text-gray-500">...</span>);
                      }
                    }

                    // Add visible page numbers
                    for (let i = startPage; i <= endPage; i++) {
                      pages.push(
                        <button
                          key={i}
                          onClick={() => setPage(i)}
                          className={`px-3 py-1 rounded border ${
                            i === page
                              ? 'bg-primary-600 text-white border-primary-600'
                              : 'bg-white text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {i}
                        </button>
                      );
                    }

                    // Add ellipsis at end if needed
                    if (endPage < totalPages) {
                      if (endPage < totalPages - 1) {
                        pages.push(<span key="end-ellipsis" className="px-2 text-gray-500">...</span>);
                      }
                      pages.push(
                        <button
                          key={totalPages}
                          onClick={() => setPage(totalPages)}
                          className="px-3 py-1 rounded border bg-white text-gray-700 hover:bg-gray-50"
                        >
                          {totalPages}
                        </button>
                      );
                    }

                    return pages;
                  })()}
                </div>

                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className={`px-3 py-1 rounded border ${page === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                >
                  Next
                </button>
                <button
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                  className={`px-3 py-1 rounded border ${page === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                >
                  Last
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedInterest && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Interest Details</h3>
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
                      <p><strong>Name:</strong> {selectedInterest.buyer?.full_name || 'Unknown'}</p>
                      <p><strong>Email:</strong> {selectedInterest.buyer?.email || 'Unknown'}</p>
                      {selectedInterest.buyer?.mobile_phone && (
                        <p><strong>Phone:</strong> {selectedInterest.buyer.mobile_phone}</p>
                      )}
                      {selectedInterest.buyer?.city && selectedInterest.buyer?.state && (
                        <p><strong>Location:</strong> {selectedInterest.buyer.city}, {selectedInterest.buyer.state}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Product Information</h4>
                    <div className="bg-gray-50 p-3 rounded">
                      <p><strong>Product:</strong> {selectedInterest.listing?.name || 'Unknown'}</p>
                      <p><strong>Seller:</strong> {selectedInterest.listing?.seller_name || 'Unknown'}</p>
                      <p><strong>Price:</strong> ${selectedInterest.listing?.price || '0'} per {selectedInterest.listing?.unit || 'unit'}</p>
                      <p><strong>Type:</strong> {selectedInterest.listing?.type || 'Unknown'}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Interest Details</h4>
                  <div className="bg-gray-50 p-3 rounded">
                    <p><strong>Quantity:</strong> {selectedInterest.quantity} {selectedInterest.listing?.unit || 'units'}</p>
                    <p><strong>Total Value:</strong> ${(parseFloat(selectedInterest.listing?.price || '0') * selectedInterest.quantity).toFixed(2)}</p>
                    <p><strong>Status:</strong>
                      <span className={`ml-2 px-2 py-1 text-xs rounded-full ${getStatusColor(selectedInterest.status)}`}>
                        {selectedInterest.status.split('_').map(word =>
                          word.charAt(0).toUpperCase() + word.slice(1)
                        ).join(' ')}
                      </span>
                    </p>
                    <p><strong>Created:</strong> {new Date(selectedInterest.created_at).toLocaleString()}</p>
                    {selectedInterest.updated_at !== selectedInterest.created_at && (
                      <p><strong>Updated:</strong> {new Date(selectedInterest.updated_at).toLocaleString()}</p>
                    )}
                  </div>
                </div>

                {selectedInterest.note && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Buyer's Note</h4>
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="text-gray-700">{selectedInterest.note}</p>
                    </div>
                  </div>
                )}

                {selectedInterest.reject_reason && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Rejection Reason</h4>
                    <div className="bg-red-50 p-3 rounded">
                      <p className="text-red-700">{selectedInterest.reject_reason}</p>
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
