import React, { useState, useEffect } from 'react';
import { Search, Star, StarOff, Eye, X, MapPin, Clock, User, Store, Crown, RefreshCw, Check } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../supabaseClient';

interface FeaturedSeller {
  id: string;
  user_id: string;
  featured_by: string;
  featured_at: string;
  is_active: boolean;
  priority: number;
  notes?: string;
  full_name: string;
  email: string;
  mobile_phone?: string;
  default_mode: string;
  city?: string;
  state?: string;
  country?: string;
  profile_image?: string;
  average_rating?: number;
  total_reviews?: number;
  store_name?: string;
  store_description?: string;
  seller_approved?: boolean;
  store_profile_image?: string;
  store_cover_image?: string;
  featured_by_name: string;
  featured_by_email: string;
}

interface User {
  id: string;
  full_name: string;
  email: string;
  mobile_phone?: string;
  default_mode: string;
  city?: string;
  state?: string;
  country?: string;
  profile_image?: string;
  store_name?: string;
  store_description?: string;
  seller_approved?: boolean;
}

export function FeaturedSellers() {
  const user = useAuthStore((state) => state.user);
  const [featuredSellers, setFeaturedSellers] = useState<FeaturedSeller[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUserModal, setShowUserModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedFeaturedSeller, setSelectedFeaturedSeller] = useState<FeaturedSeller | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [isPromoting, setIsPromoting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadFeaturedSellers(), loadAllUsers()]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFeaturedSellers = async () => {
    try {
      const { data, error } = await supabase
        .from('featured_sellers_with_details')
        .select('*')
        .order('priority', { ascending: false })
        .order('featured_at', { ascending: false });

      if (error) throw error;
      setFeaturedSellers(data || []);
    } catch (error) {
      console.error('Error loading featured sellers:', error);
    }
  };

  const loadAllUsers = async () => {
    try {
      // Only load users who are sellers (have seller profiles or default_mode includes seller)
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select(`
          id,
          full_name,
          email,
          mobile_phone,
          default_mode,
          city,
          state,
          country,
          profile_image
        `)
        .not('full_name', 'is', null)
        .or('default_mode.eq.seller,default_mode.eq.both') // Only sellers or both
        .order('full_name');

      if (usersError) throw usersError;

      // Get seller profiles
      const { data: sellerProfiles, error: sellerError } = await supabase
        .from('seller_profiles')
        .select('user_id, store_name, description, is_approved');

      if (sellerError) {
        console.error('Error loading seller profiles:', sellerError);
      }

      // Merge user data with seller profiles
      const enrichedUsers = users?.map(user => {
        const sellerProfile = sellerProfiles?.find(sp => sp.user_id === user.id);
        return {
          ...user,
          store_name: sellerProfile?.store_name,
          store_description: sellerProfile?.description,
          seller_approved: sellerProfile?.is_approved
        };
      }) || [];

      setAllUsers(enrichedUsers);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const toggleFeaturedStatus = async (userId: string, notes?: string) => {
    if (!user?.id) return;

    try {
      setProcessing(userId);
      
      const { data, error } = await supabase.rpc('toggle_featured_seller', {
        p_user_id: userId,
        p_admin_id: user.id,
        p_notes: notes || null
      });

      if (error) throw error;

      if (data?.success) {
        await loadFeaturedSellers();
        setShowUserModal(false);
      } else {
        alert(data?.message || 'Failed to update featured status');
      }
    } catch (error) {
      console.error('Error toggling featured status:', error);
      alert('Failed to update featured status');
    } finally {
      setProcessing(null);
    }
  };

  const handleViewProfile = (featuredSeller: FeaturedSeller) => {
    setSelectedFeaturedSeller(featuredSeller);
    setShowProfileModal(true);
  };

  const handlePromoteUser = (user: User) => {
    setSelectedUser(user);
    setShowUserModal(false);
    toggleFeaturedStatus(user.id, `Promoted by ${user?.email}`);
  };

  // Multi-select handlers
  const handleUserSelect = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map(user => user.id)));
    }
  };

  const handlePromoteSelected = async () => {
    if (selectedUsers.size === 0) return;

    try {
      setIsPromoting(true);
      const selectedUsersList = filteredUsers.filter(user => selectedUsers.has(user.id));

      // Promote users one by one
      for (const user of selectedUsersList) {
        await toggleFeaturedStatus(user.id, `Bulk promoted by ${user?.email}`);
      }

      // Clear selection and close modal
      setSelectedUsers(new Set());
      setShowUserModal(false);
      alert(`Successfully promoted ${selectedUsers.size} seller(s) to featured!`);
    } catch (error) {
      console.error('Error promoting selected users:', error);
      alert('Failed to promote some users. Please try again.');
    } finally {
      setIsPromoting(false);
    }
  };

  // Filter users for selection modal - Only sellers
  const filteredUsers = allUsers.filter(u => {
    const matchesSearch = searchTerm === '' ||
      u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.store_name && u.store_name.toLowerCase().includes(searchTerm.toLowerCase()));

    // Only show sellers (users with default_mode 'seller' or 'both')
    const isSeller = u.default_mode === 'seller' || u.default_mode === 'both';

    // Exclude already featured users
    const isNotFeatured = !featuredSellers.some(fs => fs.user_id === u.id && fs.is_active);

    return matchesSearch && isSeller && isNotFeatured;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
          <span className="text-lg text-gray-600">Loading featured sellers...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Featured Sellers Management</h1>
          <p className="text-gray-600 mt-1">
            Manage featured sellers for the home page ({featuredSellers.length} featured)
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={() => {
              setShowUserModal(true);
              setSelectedUsers(new Set());
              setSearchTerm('');
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Crown className="h-4 w-4" />
            Add Featured Sellers
          </button>
        </div>
      </div>

      {/* Featured Sellers List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {featuredSellers.length === 0 ? (
          <div className="text-center py-12">
            <Crown className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No featured sellers</h3>
            <p className="text-gray-500 mb-4">Start by promoting users to featured sellers</p>
            <button
              onClick={() => {
                setShowUserModal(true);
                setSelectedUsers(new Set());
                setSearchTerm('');
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Crown className="h-4 w-4" />
              Add Featured Sellers
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Featured Seller
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Featured By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Featured Date
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {featuredSellers.map((seller) => (
                  <tr key={seller.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0">
                          {seller.profile_image || seller.store_profile_image ? (
                            <img
                              className="h-10 w-10 rounded-full object-cover"
                              src={seller.profile_image || seller.store_profile_image}
                              alt={seller.full_name}
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                              <Crown className="h-5 w-5 text-yellow-600" />
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {seller.store_name || seller.full_name}
                          </div>
                          <div className="text-sm text-gray-500">{seller.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          seller.default_mode === 'seller' 
                            ? 'bg-green-100 text-green-800'
                            : seller.default_mode === 'both'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {seller.default_mode}
                        </span>
                        {seller.seller_approved && (
                          <span className="text-xs text-green-600 mt-1">✓ Approved</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {[seller.city, seller.state, seller.country].filter(Boolean).join(', ') || 'Not specified'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{seller.featured_by_name}</div>
                      <div className="text-sm text-gray-500">{seller.featured_by_email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {new Date(seller.featured_at).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(seller.featured_at).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => handleViewProfile(seller)}
                          className="inline-flex items-center px-2 py-1 border border-gray-300 rounded text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </button>
                        <button
                          onClick={() => toggleFeaturedStatus(seller.user_id, 'Removed from featured')}
                          disabled={processing === seller.user_id}
                          className="inline-flex items-center px-2 py-1 border border-red-300 rounded text-sm font-medium text-red-700 bg-white hover:bg-red-50 disabled:opacity-50"
                        >
                          <StarOff className="h-4 w-4 mr-1" />
                          {processing === seller.user_id ? 'Removing...' : 'Remove'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User Selection Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Select Sellers to Feature</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedUsers.size > 0 ? `${selectedUsers.size} seller(s) selected` : 'Select sellers to promote as featured'}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowUserModal(false);
                  setSelectedUsers(new Set());
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6">
              {/* Search and Filter */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search sellers by name, email, or store name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-gray-600">
                    Only sellers are shown in this list. Buyers cannot be featured.
                  </p>
                  {filteredUsers.length > 0 && (
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      Select All ({filteredUsers.length})
                    </label>
                  )}
                </div>
              </div>

              {/* Users List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-8">
                    <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">
                      {searchTerm
                        ? 'No sellers match your search criteria'
                        : 'All eligible sellers are already featured'}
                    </p>
                  </div>
                ) : (
                  filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                        selectedUsers.has(user.id)
                          ? 'border-blue-300 bg-blue-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={selectedUsers.has(user.id)}
                          onChange={() => handleUserSelect(user.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                          {user.profile_image ? (
                            <img
                              className="h-10 w-10 rounded-full object-cover"
                              src={user.profile_image}
                              alt={user.full_name}
                            />
                          ) : (
                            <User className="h-5 w-5 text-gray-600" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">
                            {user.store_name || user.full_name}
                          </h3>
                          <p className="text-sm text-gray-500">{user.email}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              user.default_mode === 'seller'
                                ? 'bg-green-100 text-green-800'
                                : user.default_mode === 'both'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {user.default_mode}
                            </span>
                            {user.seller_approved && (
                              <span className="text-xs text-green-600">✓ Approved</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedUsers.has(user.id) && (
                          <div className="flex items-center text-blue-600">
                            <Check className="h-4 w-4 mr-1" />
                            <span className="text-sm font-medium">Selected</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  {selectedUsers.size > 0 ? (
                    <span className="font-medium text-blue-600">
                      {selectedUsers.size} seller(s) selected for promotion
                    </span>
                  ) : (
                    'Select sellers to promote as featured'
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowUserModal(false);
                      setSelectedUsers(new Set());
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePromoteSelected}
                    disabled={selectedUsers.size === 0 || isPromoting}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Crown className="h-4 w-4" />
                    {isPromoting
                      ? `Promoting ${selectedUsers.size} seller(s)...`
                      : `Promote ${selectedUsers.size} seller(s)`
                    }
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {showProfileModal && selectedFeaturedSeller && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Featured Seller Profile</h2>
              <button
                onClick={() => setShowProfileModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                    <Crown className="h-5 w-5 text-yellow-500" />
                    Featured Seller Information
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Name</label>
                      <div className="mt-1 text-sm text-gray-900">
                        {selectedFeaturedSeller.store_name || selectedFeaturedSeller.full_name}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <div className="mt-1 text-sm text-gray-900">{selectedFeaturedSeller.email}</div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Phone</label>
                      <div className="mt-1 text-sm text-gray-900">
                        {selectedFeaturedSeller.mobile_phone || 'Not provided'}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">User Type</label>
                      <div className="mt-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          selectedFeaturedSeller.default_mode === 'seller'
                            ? 'bg-green-100 text-green-800'
                            : selectedFeaturedSeller.default_mode === 'both'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {selectedFeaturedSeller.default_mode}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Location & Store Details
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Location</label>
                      <div className="mt-1 text-sm text-gray-900">
                        {[selectedFeaturedSeller.city, selectedFeaturedSeller.state, selectedFeaturedSeller.country]
                          .filter(Boolean).join(', ') || 'Not specified'}
                      </div>
                    </div>

                    {selectedFeaturedSeller.store_name && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Store Name</label>
                        <div className="mt-1 text-sm text-gray-900">{selectedFeaturedSeller.store_name}</div>
                      </div>
                    )}

                    {selectedFeaturedSeller.store_description && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Store Description</label>
                        <div className="mt-1 text-sm text-gray-900">{selectedFeaturedSeller.store_description}</div>
                      </div>
                    )}

                    {selectedFeaturedSeller.average_rating && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Rating</label>
                        <div className="mt-1 flex items-center">
                          <Star className="h-4 w-4 text-yellow-400 fill-current" />
                          <span className="ml-1 text-sm text-gray-900">
                            {selectedFeaturedSeller.average_rating} ({selectedFeaturedSeller.total_reviews} reviews)
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Featured Information */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2 mb-4">
                  <Clock className="h-5 w-5" />
                  Featured Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Featured Date</label>
                    <div className="mt-1 text-sm text-gray-900">
                      {new Date(selectedFeaturedSeller.featured_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Featured By</label>
                    <div className="mt-1 text-sm text-gray-900">
                      {selectedFeaturedSeller.featured_by_name}
                    </div>
                    <div className="text-sm text-gray-500">{selectedFeaturedSeller.featured_by_email}</div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Priority</label>
                    <div className="mt-1 text-sm text-gray-900">{selectedFeaturedSeller.priority}</div>
                  </div>

                  {selectedFeaturedSeller.notes && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Notes</label>
                      <div className="mt-1 text-sm text-gray-900">{selectedFeaturedSeller.notes}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end p-6 border-t border-gray-200">
              <button
                onClick={() => setShowProfileModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
