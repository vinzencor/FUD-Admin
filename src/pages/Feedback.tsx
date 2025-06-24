import React, { useState, useEffect } from 'react';
import { MessageSquare, User, Store, Search, Filter, Loader2, RefreshCw, Download, Star, Trash2, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../supabaseClient';

interface Feedback {
  id: string;
  type: 'customer' | 'farmer' | 'review';
  userName: string;
  subject: string;
  message: string;
  status: 'new' | 'in_progress' | 'resolved';
  date: string;
  region: string;
  response?: string;
  responseDate?: string;
  rating?: number;
  reviewType?: 'product' | 'seller' | 'service';
  productName?: string;
  sellerName?: string;
}

const mockFeedback: Feedback[] = [
  {
    id: '1',
    type: 'customer',
    userName: 'John Doe',
    subject: 'Delivery Issue',
    message: 'My order was delayed by 2 days without any notification.',
    status: 'new',
    date: '2024-03-10',
    region: 'California'
  },
  {
    id: '2',
    type: 'farmer',
    userName: 'Green Valley Farm',
    subject: 'Technical Problem',
    message: 'Unable to update product prices in the system.',
    status: 'in_progress',
    date: '2024-03-09',
    region: 'Texas'
  },
  {
    id: '3',
    type: 'customer',
    userName: 'Sarah Smith',
    subject: 'Product Quality',
    message: 'Received damaged fruits in my last order.',
    status: 'resolved',
    date: '2024-03-08',
    region: 'California'
  },
  {
    id: '4',
    type: 'farmer',
    userName: 'Fresh Fields',
    subject: 'Account Access',
    message: 'Need help resetting my password.',
    status: 'new',
    date: '2024-03-11',
    region: 'Florida'
  }
];

export function Feedback() {
  const user = useAuthStore((state) => state.user);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedReviewType, setSelectedReviewType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [responseModal, setResponseModal] = useState<{
    isOpen: boolean;
    feedbackId: string;
    feedbackSubject: string;
  }>({
    isOpen: false,
    feedbackId: '',
    feedbackSubject: ''
  });
  const [responseText, setResponseText] = useState('');
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    feedbackId: string;
    feedbackSubject: string;
    feedbackType: string;
  }>({
    isOpen: false,
    feedbackId: '',
    feedbackSubject: '',
    feedbackType: ''
  });
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch feedback data from database
  const fetchFeedback = async () => {
    try {
      setLoading(true);
      setError(null);

      const allFeedback: Feedback[] = [];

      // Fetch from feedback table
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('feedback')
        .select(`
          id,
          type,
          user_name,
          subject,
          message,
          status,
          created_at,
          region,
          user_id,
          response,
          response_date,
          users!user_id(
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (!feedbackError && feedbackData) {
        const transformedFeedback: Feedback[] = feedbackData.map((item: any) => ({
          id: item.id,
          type: item.type,
          userName: item.user_name || item.users?.full_name || item.users?.email || 'Unknown User',
          subject: item.subject,
          message: item.message,
          status: item.status,
          date: new Date(item.created_at).toISOString().split('T')[0],
          region: item.region || 'Unknown',
          response: item.response,
          responseDate: item.response_date ? new Date(item.response_date).toISOString().split('T')[0] : undefined
        }));
        allFeedback.push(...transformedFeedback);
      }

      // Fetch from reviews table
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select(`
          id,
          user_id,
          listing_id,
          seller_id,
          review_type,
          rating,
          comment,
          created_at,
          users!user_id(
            full_name,
            email,
            city,
            state
          ),
          listings!listing_id(
            name,
            seller_name
          ),
          seller:users!seller_id(
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (!reviewsError && reviewsData) {
        const transformedReviews: Feedback[] = reviewsData.map((item: any) => {
          const userName = item.users?.full_name || item.users?.email || 'Unknown User';
          const region = item.users?.state || item.users?.city || 'Unknown';

          let subject = '';
          let productName = '';
          let sellerName = '';

          if (item.review_type === 'product' && item.listings) {
            subject = `Product Review: ${item.listings.name}`;
            productName = item.listings.name;
            sellerName = item.listings.seller_name;
          } else if (item.review_type === 'seller' && item.seller) {
            subject = `Seller Review: ${item.seller.full_name || item.seller.email}`;
            sellerName = item.seller.full_name || item.seller.email;
          } else if (item.review_type === 'service') {
            subject = 'Service Review';
          } else {
            subject = `${item.review_type} Review`;
          }

          return {
            id: item.id,
            type: 'review' as const,
            userName,
            subject,
            message: item.comment || `${item.rating}/5 star rating`,
            status: 'new' as const, // Reviews start as new
            date: new Date(item.created_at).toISOString().split('T')[0],
            region,
            rating: item.rating,
            reviewType: item.review_type,
            productName,
            sellerName
          };
        });
        allFeedback.push(...transformedReviews);
      }

      // Sort all feedback by date (newest first)
      allFeedback.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      if (allFeedback.length === 0) {
        // No data found, use mock data
        setFeedbacks(mockFeedback);
      } else {
        setFeedbacks(allFeedback);
      }
    } catch (err) {
      console.error('Error fetching feedback:', err);
      setError('Failed to load feedback data');
      // Fall back to mock data on error
      setFeedbacks(mockFeedback);
    } finally {
      setLoading(false);
    }
  };

  // Update feedback status in database
  const updateFeedbackStatus = async (feedbackId: string, newStatus: Feedback['status']) => {
    try {
      // Only update status for feedback table items, not reviews
      const feedbackItem = feedbacks.find(f => f.id === feedbackId);
      if (feedbackItem?.type !== 'review') {
        const { error } = await supabase
          .from('feedback')
          .update({ status: newStatus })
          .eq('id', feedbackId);

        if (error) {
          console.error('Error updating feedback status:', error);
        }
      }
      // For reviews, we just update the local state
    } catch (err) {
      console.error('Error updating feedback status:', err);
    }
  };

  // Add response to feedback
  const addResponse = async (feedbackId: string, response: string) => {
    try {
      const feedbackItem = feedbacks.find(f => f.id === feedbackId);

      if (feedbackItem?.type === 'review') {
        // For reviews, we could create a separate response system or just update local state
        // For now, we'll just update the local state to show the response
        setFeedbacks(prev => prev.map(f =>
          f.id === feedbackId
            ? {
                ...f,
                response,
                responseDate: new Date().toISOString().split('T')[0],
                status: 'resolved' as const
              }
            : f
        ));
        return true;
      } else {
        // For regular feedback, update the database
        const { error } = await supabase
          .from('feedback')
          .update({
            response: response,
            response_date: new Date().toISOString(),
            responded_by: user?.id,
            status: 'resolved' // Automatically mark as resolved when response is added
          })
          .eq('id', feedbackId);

        if (error) {
          console.error('Error adding response:', error);
          return false;
        }

        // Refresh feedback data
        await fetchFeedback();
        return true;
      }
    } catch (err) {
      console.error('Error adding response:', err);
      return false;
    }
  };

  // Handle opening response modal
  const openResponseModal = (feedbackId: string, subject: string) => {
    setResponseModal({
      isOpen: true,
      feedbackId,
      feedbackSubject: subject
    });
    setResponseText('');
  };

  // Handle submitting response
  const handleSubmitResponse = async () => {
    if (!responseText.trim()) return;

    const success = await addResponse(responseModal.feedbackId, responseText);
    if (success) {
      setResponseModal({ isOpen: false, feedbackId: '', feedbackSubject: '' });
      setResponseText('');
    }
  };

  // Delete feedback function
  const deleteFeedback = async (feedbackId: string, feedbackType: string) => {
    try {
      setIsDeleting(true);

      if (feedbackType === 'review') {
        // Delete from reviews table
        const { error } = await supabase
          .from('reviews')
          .delete()
          .eq('id', feedbackId);

        if (error) {
          console.error('Error deleting review:', error);
          return false;
        }
      } else {
        // Delete from feedback table
        const { error } = await supabase
          .from('feedback')
          .delete()
          .eq('id', feedbackId);

        if (error) {
          console.error('Error deleting feedback:', error);
          return false;
        }
      }

      // Remove from local state immediately for better UX
      setFeedbacks(prev => prev.filter(f => f.id !== feedbackId));
      return true;
    } catch (err) {
      console.error('Error deleting feedback:', err);
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle opening delete modal
  const openDeleteModal = (feedbackId: string, subject: string, type: string) => {
    setDeleteModal({
      isOpen: true,
      feedbackId,
      feedbackSubject: subject,
      feedbackType: type
    });
  };

  // Handle confirming delete
  const handleConfirmDelete = async () => {
    const success = await deleteFeedback(deleteModal.feedbackId, deleteModal.feedbackType);
    if (success) {
      setDeleteModal({ isOpen: false, feedbackId: '', feedbackSubject: '', feedbackType: '' });
    }
  };

  // Export feedback to CSV
  const exportToCSV = () => {
    const headers = ['ID', 'Type', 'User Name', 'Subject', 'Message', 'Status', 'Date', 'Region', 'Rating', 'Review Type', 'Product', 'Seller', 'Response', 'Response Date'];
    const csvContent = [
      headers.join(','),
      ...filteredFeedback.map(feedback => [
        feedback.id,
        feedback.type,
        `"${feedback.userName}"`,
        `"${feedback.subject}"`,
        `"${feedback.message.replace(/"/g, '""')}"`,
        feedback.status,
        feedback.date,
        feedback.region,
        feedback.rating || '',
        feedback.reviewType || '',
        feedback.productName ? `"${feedback.productName}"` : '',
        feedback.sellerName ? `"${feedback.sellerName}"` : '',
        feedback.response ? `"${feedback.response.replace(/"/g, '""')}"` : '',
        feedback.responseDate || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `feedback-export-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    fetchFeedback();
  }, []);

  const getStatusColor = (status: Feedback['status']) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleStatusChange = async (feedbackId: string, newStatus: Feedback['status']) => {
    // Update local state immediately for better UX
    setFeedbacks(feedbacks.map(feedback =>
      feedback.id === feedbackId ? { ...feedback, status: newStatus } : feedback
    ));

    // Update in database
    await updateFeedbackStatus(feedbackId, newStatus);
  };

  const filteredFeedback = feedbacks.filter(feedback => {
    // Filter by region for admin users
    if (user?.role === 'admin' && user.regions) {
      if (!user.regions.some(r => r.name === feedback.region)) {
        return false;
      }
    }

    // Filter by status
    if (selectedStatus !== 'all' && feedback.status !== selectedStatus) {
      return false;
    }

    // Filter by type
    if (selectedType !== 'all' && feedback.type !== selectedType) {
      return false;
    }

    // Filter by review type (only for reviews)
    if (selectedReviewType !== 'all' && feedback.type === 'review' && feedback.reviewType !== selectedReviewType) {
      return false;
    }

    // Search term
    const searchLower = searchTerm.toLowerCase();
    return (
      feedback.userName.toLowerCase().includes(searchLower) ||
      feedback.subject.toLowerCase().includes(searchLower) ||
      feedback.message.toLowerCase().includes(searchLower) ||
      (feedback.productName && feedback.productName.toLowerCase().includes(searchLower)) ||
      (feedback.sellerName && feedback.sellerName.toLowerCase().includes(searchLower))
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        <span className="ml-2 text-gray-600">Loading feedback...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading feedback</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
            <div className="mt-4">
              <button
                onClick={fetchFeedback}
                className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Feedback Management</h2>
          <p className="text-sm text-gray-600 mt-1">
            Showing {filteredFeedback.length} of {feedbacks.length} feedback items
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchFeedback}
            disabled={loading}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          {/* <button
            onClick={exportToCSV}
            disabled={filteredFeedback.length === 0}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </button> */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value="all">All Types</option>
            <option value="customer">Customer Feedback</option>
            <option value="farmer">Farmer Feedback</option>
            <option value="review">Product/Service Reviews</option>
          </select>
          {selectedType === 'review' && (
            <select
              value={selectedReviewType}
              onChange={(e) => setSelectedReviewType(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="all">All Review Types</option>
              <option value="product">Product Reviews</option>
              <option value="seller">Seller Reviews</option>
              <option value="service">Service Reviews</option>
            </select>
          )}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value="all">All Status</option>
            <option value="new">New</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      {/* Feedback Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-semibold text-sm">
                  {feedbacks.filter(f => f.status === 'new').length}
                </span>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-blue-900">New</p>
              <p className="text-xs text-blue-600">Pending review</p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <span className="text-yellow-600 font-semibold text-sm">
                  {feedbacks.filter(f => f.status === 'in_progress').length}
                </span>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-yellow-900">In Progress</p>
              <p className="text-xs text-yellow-600">Being handled</p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 font-semibold text-sm">
                  {feedbacks.filter(f => f.status === 'resolved').length}
                </span>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-900">Resolved</p>
              <p className="text-xs text-green-600">Completed</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                <span className="text-gray-600 font-semibold text-sm">
                  {feedbacks.length}
                </span>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">Total</p>
              <p className="text-xs text-gray-600">All feedback</p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        <input
          type="text"
          placeholder="Search by name, subject, or message..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      <div className="grid gap-4">
        {filteredFeedback.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No feedback found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {feedbacks.length === 0
                ? "No feedback has been submitted yet."
                : "No feedback matches your current filters."}
            </p>
            {feedbacks.length > 0 && (
              <button
                onClick={() => {
                  setSelectedStatus('all');
                  setSelectedType('all');
                  setSelectedReviewType('all');
                  setSearchTerm('');
                }}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-primary-600 bg-primary-100 hover:bg-primary-200"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          filteredFeedback.map((feedback) => (
          <div key={feedback.id} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4">
                {feedback.type === 'customer' ? (
                  <User className="h-10 w-10 text-gray-400 bg-gray-100 rounded-full p-2" />
                ) : feedback.type === 'farmer' ? (
                  <Store className="h-10 w-10 text-gray-400 bg-gray-100 rounded-full p-2" />
                ) : (
                  <MessageSquare className="h-10 w-10 text-gray-400 bg-gray-100 rounded-full p-2" />
                )}
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-medium text-gray-900">{feedback.userName}</h3>
                    <span className="text-sm text-gray-500">
                      ({feedback.type === 'review' ? `${feedback.reviewType} review` : feedback.type})
                    </span>
                    {feedback.rating && (
                      <div className="flex items-center space-x-1">
                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                        <span className="text-sm font-medium text-gray-700">{feedback.rating}/5</span>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{feedback.date}</p>
                  {feedback.productName && (
                    <p className="text-sm text-gray-500">Product: {feedback.productName}</p>
                  )}
                  {feedback.sellerName && (
                    <p className="text-sm text-gray-500">Seller: {feedback.sellerName}</p>
                  )}
                  {user?.role === 'super_admin' && (
                    <p className="text-sm text-gray-500">Region: {feedback.region}</p>
                  )}
                </div>
              </div>
              {/* <select
                value={feedback.status}
                onChange={(e) => handleStatusChange(feedback.id, e.target.value as Feedback['status'])}
                className={`px-3 py-1 rounded-full text-sm ${getStatusColor(feedback.status)}`}
              >
                <option value="new">New</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select> */}
            </div>
            <div className="mt-4">
              <h4 className="text-md font-medium text-gray-900">{feedback.subject}</h4>
              <p className="mt-1 text-gray-600">{feedback.message}</p>
            </div>
            {feedback.response && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <h5 className="text-sm font-medium text-green-800">Admin Response:</h5>
                <p className="mt-1 text-sm text-green-700">{feedback.response}</p>
                {feedback.responseDate && (
                  <p className="mt-1 text-xs text-green-600">Responded on: {feedback.responseDate}</p>
                )}
              </div>
            )}
            <div className="mt-4 flex justify-between items-center">
              {/* <div className="flex space-x-2">
                <button
                  onClick={() => openResponseModal(feedback.id, feedback.subject)}
                  className="px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-700"
                >
                  {feedback.response ? 'Update Response' : 'Add Response'}
                </button>
              </div> */}
              <div className="flex space-x-2">
                {/* Only super admins can delete feedback */}
                {user?.role === 'super_admin' && (
                  <button
                    onClick={() => openDeleteModal(feedback.id, feedback.subject, feedback.type)}
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
          ))
        )}
      </div>

      {/* Response Modal */}
      {responseModal.isOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Add Response to: {responseModal.feedbackSubject}
              </h3>
              <textarea
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder="Enter your response..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <div className="flex justify-end space-x-3 mt-4">
                <button
                  onClick={() => setResponseModal({ isOpen: false, feedbackId: '', feedbackSubject: '' })}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitResponse}
                  disabled={!responseText.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Submit Response
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600 mr-3" />
                <h3 className="text-lg font-medium text-gray-900">
                  Confirm Delete
                </h3>
              </div>
              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  Are you sure you want to delete this {deleteModal.feedbackType === 'review' ? 'review' : 'feedback'}?
                </p>
                <p className="text-sm font-medium text-gray-900 mt-2">
                  "{deleteModal.feedbackSubject}"
                </p>
                <p className="text-xs text-red-600 mt-2">
                  This action cannot be undone.
                </p>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setDeleteModal({ isOpen: false, feedbackId: '', feedbackSubject: '', feedbackType: '' })}
                  disabled={isDeleting}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}