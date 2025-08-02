import React, { useState, useEffect } from 'react';
import { Search, Filter, CheckCircle, XCircle, AlertCircle, Download, RefreshCw, X, MapPin, Clock, Globe, Star, Calendar, Phone, Mail, Building } from 'lucide-react';
import { fetchAllSellers, SellerData } from '../services/dataService';
import { exportWithLoading, generateFilename, formatDateForExport, formatArrayForExport, EXPORT_COLUMNS } from '../utils/exportUtils';
import { useAuthStore } from '../store/authStore';
import {
  getAdminAssignedLocation,
  AdminLocation,
  getLocationFilteredData,
  LocationFilterOptions
} from '../services/locationAdminService';
import { supabase } from '../supabaseClient';
import { UserProfileModal } from '../components/shared/UserProfileModal';

interface Farmer {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  products: string[];
  status: 'pending' | 'approved' | 'suspended';
  registrationDate: string;
  business_type?: string;
  description?: string;
  website?: string;
  certifications?: string[];
  fullAddress?: string;
  coordinates?: any;
  // Business address fields (from seller profile)
  business_street_address?: string;
  business_apartment_unit?: string;
  business_city?: string;
  business_state?: string;
  business_district?: string;
  business_country?: string;
  business_zipcode?: string;
  business_coordinates?: any;
  // Individual address fields (personal - fallback)
  street_address?: string;
  apartment_unit?: string;
  city?: string;
  state?: string;
  district?: string;
  country?: string;
  zipcode?: string;
}

export function Farmers() {
  const user = useAuthStore((state) => state.user);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedFarmer, setSelectedFarmer] = useState<Farmer | null>(null);
  const [selectedSellerData, setSelectedSellerData] = useState<SellerData | null>(null);
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [sellersData, setSellersData] = useState<SellerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [saving, setSaving] = useState(false);
  const [adminLocation, setAdminLocation] = useState<AdminLocation | null>(null);
  const [featuredSellers, setFeaturedSellers] = useState<Set<string>>(new Set());
  const [processingFeatured, setProcessingFeatured] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Form state for editing
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    location: ''
  });

  // Load featured sellers
  const loadFeaturedSellers = async () => {
    try {
      const { data, error } = await supabase
        .from('featured_sellers')
        .select('user_id')
        .eq('is_active', true);

      if (error) throw error;

      const featuredUserIds = new Set(data?.map(fs => fs.user_id) || []);
      setFeaturedSellers(featuredUserIds);
    } catch (error) {
      console.error('Error loading featured sellers:', error);
    }
  };

  // Toggle featured seller status
  const toggleFeaturedStatus = async (userId: string, userName: string) => {
    if (!user?.id) return;

    try {
      setProcessingFeatured(userId);

      const { data, error } = await supabase.rpc('toggle_featured_seller', {
        p_user_id: userId,
        p_admin_id: user.id,
        p_notes: `Featured/unfeatured by ${user.email} from Farmers section`
      });

      if (error) throw error;

      if (data?.success) {
        // Update local state
        const newFeaturedSellers = new Set(featuredSellers);
        if (data.action === 'featured') {
          newFeaturedSellers.add(userId);
          alert(`${userName} has been added to featured sellers!`);
        } else {
          newFeaturedSellers.delete(userId);
          alert(`${userName} has been removed from featured sellers.`);
        }
        setFeaturedSellers(newFeaturedSellers);
      } else {
        alert(data?.message || 'Failed to update featured status');
      }
    } catch (error) {
      console.error('Error toggling featured status:', error);
      alert('Failed to update featured status');
    } finally {
      setProcessingFeatured(null);
    }
  };

  useEffect(() => {
    loadFarmers();
    loadFeaturedSellers();
  }, []);

  const loadFarmers = async () => {
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

      const fetchedSellersData = await fetchAllSellers(adminLocationFilter);

      // Store the raw sellers data for profile viewing
      setSellersData(fetchedSellersData);

      // Transform seller data to farmer format
      const farmersData: Farmer[] = fetchedSellersData.map(seller => ({
        id: seller.user_id,
        name: seller.store_name || 'Unknown Store',
        email: seller.user_email || '',
        phone: seller.user_phone || '',
        location: `${seller.user_city || ''}, ${seller.user_state || ''}, ${seller.user_country || ''}`.replace(/^,\s*|,\s*$/g, '').replace(/,\s*,/g, ','),
        products: seller.features || [], // Use features as products for now
        status: seller.is_approved ? 'approved' : 'pending',
        registrationDate: seller.user_created_at || '',
        description: seller.description,
        fullAddress: seller.user_full_address,
        coordinates: seller.user_coordinates,
        // Business address fields (from seller profile) - preferred for farmers
        business_street_address: (() => {
          try {
            const address = typeof seller.address === 'string' ? JSON.parse(seller.address) : seller.address;
            return address?.street || address?.street_address;
          } catch {
            return undefined;
          }
        })(),
        business_apartment_unit: (() => {
          try {
            const address = typeof seller.address === 'string' ? JSON.parse(seller.address) : seller.address;
            return address?.apartment_unit || address?.unit;
          } catch {
            return undefined;
          }
        })(),
        business_city: (() => {
          try {
            const address = typeof seller.address === 'string' ? JSON.parse(seller.address) : seller.address;
            return address?.city;
          } catch {
            return undefined;
          }
        })(),
        business_state: (() => {
          try {
            const address = typeof seller.address === 'string' ? JSON.parse(seller.address) : seller.address;
            return address?.state;
          } catch {
            return undefined;
          }
        })(),
        business_district: (() => {
          try {
            const address = typeof seller.address === 'string' ? JSON.parse(seller.address) : seller.address;
            return address?.district;
          } catch {
            return undefined;
          }
        })(),
        business_country: (() => {
          try {
            const address = typeof seller.address === 'string' ? JSON.parse(seller.address) : seller.address;
            return address?.country;
          } catch {
            return undefined;
          }
        })(),
        business_zipcode: (() => {
          try {
            const address = typeof seller.address === 'string' ? JSON.parse(seller.address) : seller.address;
            return address?.zipcode || address?.postal_code;
          } catch {
            return undefined;
          }
        })(),
        business_coordinates: seller.coordinates,
        // Individual address fields (personal - fallback)
        street_address: seller.user_street_address,
        apartment_unit: seller.user_apartment_unit,
        city: seller.user_city,
        state: seller.user_state,
        district: seller.user_district,
        country: seller.user_country,
        zipcode: seller.user_zipcode
      }));
      setFarmers(farmersData);
    } catch (err) {
      console.error('Error loading farmers:', err);
      setError(err instanceof Error ? err.message : 'Failed to load farmers');
    } finally {
      setLoading(false);
    }
  };

  const handleExportFarmers = async () => {
    const filename = generateFilename('farmers');

    await exportWithLoading(
      () => Promise.resolve(farmers),
      EXPORT_COLUMNS.SELLERS,
      filename,
      setExporting,
      (count) => {
        setExportMessage(`Successfully exported ${count} farmers`);
        setTimeout(() => setExportMessage(null), 3000);
      },
      (error) => {
        setExportMessage(`Export failed: ${error}`);
        setTimeout(() => setExportMessage(null), 5000);
      }
    );
  };

  const getStatusIcon = (status: Farmer['status']) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'suspended':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusBadgeColor = (status: Farmer['status']) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const handleEditFarmer = (farmer: Farmer) => {
    setSelectedFarmer(farmer);
    setEditForm({
      name: farmer.name,
      email: farmer.email,
      phone: farmer.phone,
      location: farmer.location
    });
    setShowEditModal(true);
  };

  const handleViewProfile = async (farmer: Farmer) => {
    try {
      // Find the corresponding seller data
      const sellerData = sellersData.find(seller =>
        seller.user_name === farmer.name ||
        seller.user_email === farmer.email ||
        seller.user_id === farmer.id
      );

      if (sellerData) {
        setSelectedSellerData(sellerData);
        setSelectedFarmer(farmer);
        setShowProfileModal(true);
      } else {
        console.warn('Seller data not found for farmer:', farmer);
        // Still show the modal with available farmer data
        setSelectedFarmer(farmer);
        setSelectedSellerData(null);
        setShowProfileModal(true);
      }
    } catch (error) {
      console.error('Error loading seller profile:', error);
    }
  };

  const handleStatusChange = (farmerId: string, newStatus: Farmer['status']) => {
    setFarmers(farmers.map(farmer =>
      farmer.id === farmerId ? { ...farmer, status: newStatus } : farmer
    ));
  };

  const handleSaveFarmer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFarmer) return;

    // Validate form data
    if (!editForm.name.trim()) {
      setError('Business name is required');
      return;
    }
    if (!editForm.email.trim()) {
      setError('Email is required');
      return;
    }
    if (!editForm.phone.trim()) {
      setError('Phone number is required');
      return;
    }
    if (!editForm.location.trim()) {
      setError('Location is required');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editForm.email)) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      console.log('Updating farmer in database...', {
        farmerId: selectedFarmer.id,
        formData: editForm
      });

      // Parse location string to extract city, state, country
      // Handle various location formats: "City", "City, State", "City, State, Country"
      const locationParts = editForm.location.split(',').map(part => part.trim()).filter(part => part.length > 0);
      const city = locationParts[0] || '';
      const state = locationParts[1] || '';
      const country = locationParts[2] || locationParts[1] || ''; // If only 2 parts, second could be country

      // Update user table (personal information)
      const { error: userError } = await supabase
        .from('users')
        .update({
          full_name: editForm.name,
          email: editForm.email,
          mobile_phone: editForm.phone,
          city: city,
          state: state,
          country: country
        })
        .eq('id', selectedFarmer.id);

      if (userError) {
        console.error('Error updating user table:', userError);
        throw new Error(`Failed to update user information: ${userError.message}`);
      }

      // Update seller_profiles table (business information)
      const { error: sellerError } = await supabase
        .from('seller_profiles')
        .update({
          store_name: editForm.name
        })
        .eq('user_id', selectedFarmer.id);

      if (sellerError) {
        console.error('Error updating seller_profiles table:', sellerError);
        throw new Error(`Failed to update seller profile: ${sellerError.message}`);
      }

      console.log('Database update successful');

      // Verify the update was successful
      const verificationSuccess = await verifyDatabaseUpdate(selectedFarmer.id);
      if (!verificationSuccess) {
        throw new Error('Database update verification failed');
      }

      // Update the farmer in the local state
      const updatedFarmer = {
        ...selectedFarmer,
        name: editForm.name,
        email: editForm.email,
        phone: editForm.phone,
        location: editForm.location
      };

      setFarmers(farmers.map(farmer =>
        farmer.id === selectedFarmer.id ? updatedFarmer : farmer
      ));

      // Close the modal
      setShowEditModal(false);
      setSelectedFarmer(null);

      // Refresh farmer data from database to ensure we have the latest data
      await loadFarmers();

      // Show success message
      setExportMessage('Farmer profile updated and verified successfully in database!');
      setTimeout(() => setExportMessage(null), 3000);

    } catch (error) {
      console.error('Error updating farmer:', error);
      setError(error instanceof Error ? error.message : 'Failed to update farmer profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleFormChange = (field: keyof typeof editForm, value: string) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Helper function to verify database update
  const verifyDatabaseUpdate = async (farmerId: string) => {
    try {
      // Check if the user data was updated
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('full_name, email, mobile_phone, city, state, country')
        .eq('id', farmerId)
        .single();

      if (userError) {
        console.error('Error verifying user update:', userError);
        return false;
      }

      // Check if the seller profile was updated
      const { data: sellerData, error: sellerError } = await supabase
        .from('seller_profiles')
        .select('store_name')
        .eq('user_id', farmerId)
        .single();

      if (sellerError) {
        console.error('Error verifying seller profile update:', sellerError);
        return false;
      }

      console.log('Database verification successful:', {
        user: userData,
        seller: sellerData
      });

      return true;
    } catch (error) {
      console.error('Error during database verification:', error);
      return false;
    }
  };

  // Filter farmers by status and search term
  const filteredFarmers = farmers.filter(farmer => {
    // Status filter
    const matchesStatus = statusFilter === 'all' || farmer.status === statusFilter;

    // Search filter
    const matchesSearch = searchTerm === '' ||
      farmer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      farmer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      farmer.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      farmer.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (farmer.fullAddress && farmer.fullAddress.toLowerCase().includes(searchTerm.toLowerCase())) ||
      farmer.products.some(product => product.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesStatus && matchesSearch;
  });
  console.log(filteredFarmers,"farmersa")

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        <span className="ml-3 text-gray-600">Loading farmers...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Seller</h2>
          <p className="text-gray-600 mt-1">
            Manage seller profiles and farmer accounts
            ({filteredFarmers.length} {searchTerm || statusFilter !== 'all' ? 'filtered' : 'total'}
            {farmers.length !== filteredFarmers.length ? ` of ${farmers.length}` : ''})
          </p>
          {adminLocation ? (
            <div className="mt-2 text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full inline-block">
              📍 Viewing farmers from: {adminLocation.zipcode ? `Zipcode ${adminLocation.zipcode}, ` : ''}{adminLocation.city}, {adminLocation.district}, {adminLocation.country}
            </div>
          ) : user?.role === 'super_admin' ? (
            <div className="mt-2 text-sm text-purple-600 bg-purple-50 px-3 py-1 rounded-full inline-block">
              🌍 Global Access - All Locations
            </div>
          ) : null}
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadFarmers}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-5 w-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleExportFarmers}
            disabled={exporting || farmers.length === 0}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            <Download className={`h-5 w-5 mr-2 ${exporting ? 'animate-spin' : ''}`} />
            {exporting ? 'Exporting...' : 'Export Farmers'}
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}

      {exportMessage && (
        <div className={`p-4 rounded-lg ${
          exportMessage.includes('failed') || exportMessage.includes('Error')
            ? 'bg-red-50 border border-red-200 text-red-700'
            : 'bg-green-50 border border-green-200 text-green-700'
        }`}>
          {exportMessage}
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search farmers by name, email, phone, location, or products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredFarmers.map((farmer) => (
              <tr
                key={farmer.id}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => handleViewProfile(farmer)}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{farmer.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{farmer.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {farmer.phone}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {/* Show full address */}
                  <div className="max-w-xs truncate" title={farmer.location}>
                    {farmer.location}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showEditModal && selectedFarmer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Edit Farmer Profile</h3>
            <form onSubmit={handleSaveFarmer} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Name
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => handleFormChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => handleFormChange('email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => handleFormChange('phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={editForm.location}
                  onChange={(e) => handleFormChange('location', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
              <div className="flex justify-end space-x-2 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedFarmer(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Profile View Modal */}
      <UserProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        user={selectedFarmer ? {
          id: selectedFarmer.id,
          name: selectedFarmer.name,
          email: selectedFarmer.email,
          phone: selectedFarmer.phone,
          defaultMode: 'seller',
          address: selectedFarmer.fullAddress,
          // Personal address fields (fallback)
          street_address: selectedFarmer.street_address,
          apartment_unit: selectedFarmer.apartment_unit,
          city: selectedFarmer.city,
          state: selectedFarmer.state,
          district: selectedFarmer.district,
          country: selectedFarmer.country,
          zipcode: selectedFarmer.zipcode,
          // Business address fields (primary for farmers)
          has_business_address: !!(
            selectedFarmer.business_street_address ||
            selectedFarmer.business_city ||
            selectedFarmer.business_state ||
            selectedFarmer.business_country
          ),
          business_address: (() => {
            const parts = [
              selectedFarmer.business_street_address,
              selectedFarmer.business_apartment_unit,
              selectedFarmer.business_city,
              selectedFarmer.business_district,
              selectedFarmer.business_state,
              selectedFarmer.business_country,
              selectedFarmer.business_zipcode
            ].filter(Boolean);
            return parts.length > 0 ? parts.join(', ') : undefined;
          })(),
          business_street_address: selectedFarmer.business_street_address,
          business_apartment_unit: selectedFarmer.business_apartment_unit,
          business_city: selectedFarmer.business_city,
          business_state: selectedFarmer.business_state,
          business_district: selectedFarmer.business_district,
          business_country: selectedFarmer.business_country,
          business_zipcode: selectedFarmer.business_zipcode,
          coordinates: selectedFarmer.business_coordinates || selectedFarmer.coordinates,
          registrationDate: selectedFarmer.registrationDate,
          store_name: selectedFarmer.name,
          store_description: selectedFarmer.description,
          is_approved: selectedFarmer.status === 'approved',
          features: selectedFarmer.products,
          business_type: selectedFarmer.business_type,
          website: selectedFarmer.website,
          certifications: selectedFarmer.certifications
        } : null}
        title="Farmer/Seller Profile"
      />

      {/* Keep the old modal structure for reference but make it conditional on a different state */}
      {false && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Building className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {selectedSellerData?.store_name || selectedFarmer?.name || ''}
                  </h2>
                  <p className="text-sm text-gray-500">Seller Profile Details</p>
                </div>
              </div>
              <button
                onClick={() => setShowProfileModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Building className="h-5 w-5 text-blue-600" />
                    Business Information
                  </h3>

                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Building className="h-4 w-4 text-gray-400 mt-1" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Store Name</p>
                        <p className="text-sm text-gray-900">{selectedSellerData?.store_name || selectedFarmer?.name}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Mail className="h-4 w-4 text-gray-400 mt-1" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Email</p>
                        <p className="text-sm text-gray-900">{selectedSellerData?.user_email || selectedFarmer?.email}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Phone className="h-4 w-4 text-gray-400 mt-1" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Phone</p>
                        <p className="text-sm text-gray-900">{selectedSellerData?.user_phone || selectedFarmer?.phone || 'Not provided'}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <MapPin className="h-4 w-4 text-gray-400 mt-1" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Location</p>
                        <p className="text-sm text-gray-900">
                          {selectedSellerData ?
                            `${selectedSellerData?.user_city || ''}, ${selectedSellerData?.user_state || ''}, ${selectedSellerData?.user_country || ''}`.replace(/^,\s*|,\s*$/g, '').replace(/,\s*,/g, ',') :
                            selectedFarmer?.location
                          }
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Calendar className="h-4 w-4 text-gray-400 mt-1" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Registration Date</p>
                        <p className="text-sm text-gray-900">
                          {selectedSellerData?.user_created_at ?
                            new Date(selectedSellerData?.user_created_at ?? '').toLocaleDateString() :
                            selectedFarmer?.registrationDate ?
                            new Date(selectedFarmer?.registrationDate || '').toLocaleDateString() :
                            'Not available'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Star className="h-5 w-5 text-yellow-600" />
                    Status & Details
                  </h3>

                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="h-4 w-4 mt-1">
                        {selectedFarmer?.status === 'approved' ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : selectedFarmer?.status === 'suspended' ? (
                          <XCircle className="h-4 w-4 text-red-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-yellow-500" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Account Status</p>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          selectedFarmer?.status === 'approved' ? 'bg-green-100 text-green-800' :
                          selectedFarmer?.status === 'suspended' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {selectedFarmer?.status
                            ? selectedFarmer?.status?.charAt(0).toUpperCase() + selectedFarmer?.status?.slice(1)
                            : ''}
                        </span>
                      </div>
                    </div>

                    {selectedSellerData?.is_approved !== undefined && (
                      <div className="flex items-start gap-3">
                        <div className="h-4 w-4 mt-1">
                          {selectedSellerData?.is_approved ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-yellow-500" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">Seller Approval</p>
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            selectedSellerData?.is_approved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {selectedSellerData?.is_approved ? 'Approved' : 'Pending Approval'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              {(selectedSellerData?.description || selectedFarmer?.description) && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900">Description</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {selectedSellerData?.description || selectedFarmer?.description}
                    </p>
                  </div>
                </div>
              )}

              {/* Features/Products */}
              {(selectedSellerData?.features && selectedSellerData.features.length > 0) && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900">Features & Services</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedSellerData?.features?.map((feature, index) => (
                      <span
                        key={index}
                        className="inline-flex px-3 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Working Hours */}
              {selectedSellerData?.working_hours && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-600" />
                    Working Hours
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    {(() => {
                      try {
                        const workingHours = typeof selectedSellerData.working_hours === 'string'
                          ? JSON.parse(selectedSellerData.working_hours)
                          : selectedSellerData.working_hours;

                        if (typeof workingHours === 'object' && workingHours !== null) {
                          return (
                            <div className="space-y-2">
                              {Object.entries(workingHours).map(([day, hours]) => (
                                <div key={day} className="flex justify-between items-center">
                                  <span className="text-sm font-medium text-gray-700 capitalize">
                                    {day}:
                                  </span>
                                  <span className="text-sm text-gray-900">
                                    {typeof hours === 'object' && hours !== null
                                      ? `${(hours as any).open || 'Closed'} - ${(hours as any).close || 'Closed'}`
                                      : String(hours) || 'Closed'
                                    }
                                  </span>
                                </div>
                              ))}
                            </div>
                          );
                        } else {
                          return (
                            <p className="text-sm text-gray-700">
                              {workingHours || 'Working hours not specified'}
                            </p>
                          );
                        }
                      } catch (error) {
                        return (
                          <p className="text-sm text-gray-700">
                            {selectedSellerData.working_hours || 'Working hours not specified'}
                          </p>
                        );
                      }
                    })()}
                  </div>
                </div>
              )}

              {/* Address Details */}
              {selectedSellerData?.address && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-red-600" />
                    Address Details
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    {(() => {
                      try {
                        const address = typeof selectedSellerData.address === 'string'
                          ? JSON.parse(selectedSellerData.address)
                          : selectedSellerData.address;

                        if (typeof address === 'object' && address !== null) {
                          return (
                            <div className="space-y-3">
                              {address.street && (
                                <div className="flex items-start gap-3">
                                  <span className="text-sm font-medium text-gray-700 min-w-[80px]">Street:</span>
                                  <span className="text-sm text-gray-900">{address.street}</span>
                                </div>
                              )}
                              {address.city && (
                                <div className="flex items-start gap-3">
                                  <span className="text-sm font-medium text-gray-700 min-w-[80px]">City:</span>
                                  <span className="text-sm text-gray-900">{address.city}</span>
                                </div>
                              )}
                              {address.state && (
                                <div className="flex items-start gap-3">
                                  <span className="text-sm font-medium text-gray-700 min-w-[80px]">State:</span>
                                  <span className="text-sm text-gray-900">{address.state}</span>
                                </div>
                              )}
                              {address.country && (
                                <div className="flex items-start gap-3">
                                  <span className="text-sm font-medium text-gray-700 min-w-[80px]">Country:</span>
                                  <span className="text-sm text-gray-900">{address.country}</span>
                                </div>
                              )}
                              {address.zipcode && (
                                <div className="flex items-start gap-3">
                                  <span className="text-sm font-medium text-gray-700 min-w-[80px]">Zipcode:</span>
                                  <span className="text-sm text-gray-900">{address.zipcode}</span>
                                </div>
                              )}
                              {address.postal_code && (
                                <div className="flex items-start gap-3">
                                  <span className="text-sm font-medium text-gray-700 min-w-[80px]">Postal Code:</span>
                                  <span className="text-sm text-gray-900">{address.postal_code}</span>
                                </div>
                              )}
                              {/* Show any other address fields */}
                              {Object.entries(address).map(([key, value]) => {
                                if (!['street', 'city', 'state', 'country', 'zipcode', 'postal_code'].includes(key) && value) {
                                  return (
                                    <div key={key} className="flex items-start gap-3">
                                      <span className="text-sm font-medium text-gray-700 min-w-[80px] capitalize">
                                        {key.replace(/_/g, ' ')}:
                                      </span>
                                      <span className="text-sm text-gray-900">{String(value)}</span>
                                    </div>
                                  );
                                }
                                return null;
                              })}
                            </div>
                          );
                        } else {
                          return (
                            <p className="text-sm text-gray-700">
                              {address || 'Address not specified'}
                            </p>
                          );
                        }
                      } catch (error) {
                        return (
                          <p className="text-sm text-gray-700">
                            {selectedSellerData.address || 'Address not specified'}
                          </p>
                        );
                      }
                    })()}
                  </div>
                </div>
              )}

              {/* Images */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {selectedSellerData?.profile_image && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-gray-900">Profile Image</h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <img
                        src={selectedSellerData.profile_image}
                        alt="Profile"
                        className="w-full h-48 object-cover rounded-lg"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  </div>
                )}

                {selectedSellerData?.cover_image && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-gray-900">Cover Image</h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <img
                        src={selectedSellerData.cover_image}
                        alt="Cover"
                        className="w-full h-48 object-cover rounded-lg"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowProfileModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowProfileModal(false);
                  handleEditFarmer(selectedFarmer);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Edit Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}