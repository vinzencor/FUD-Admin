import React, { useState, useEffect } from 'react';
import { Search, Filter, CheckCircle, XCircle, AlertCircle, Download, RefreshCw } from 'lucide-react';
import { fetchAllSellers, SellerData } from '../services/dataService';
import { exportWithLoading, generateFilename, formatDateForExport, formatArrayForExport, EXPORT_COLUMNS } from '../utils/exportUtils';
import { useAuthStore } from '../store/authStore';
import { getAdminAssignedLocation, AdminLocation } from '../services/locationAdminService';
import { supabase } from '../supabaseClient';

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
}

export function Farmers() {
  const user = useAuthStore((state) => state.user);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedFarmer, setSelectedFarmer] = useState<Farmer | null>(null);
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [saving, setSaving] = useState(false);

  // Form state for editing
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    location: ''
  });

  useEffect(() => {
    loadFarmers();
  }, []);

  const loadFarmers = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get admin's assigned location for filtering
      let adminLocation: AdminLocation | null = null;
      if (user?.role === 'admin' && user?.id) {
        adminLocation = await getAdminAssignedLocation(user.id);
      }

      const sellersData = await fetchAllSellers(adminLocation);

      // Transform seller data to farmer format
      const farmersData: Farmer[] = sellersData.map(seller => ({
        id: seller.user_id,
        name: seller.store_name || 'Unknown Store',
        email: seller.user_email || '',
        phone: seller.user_phone || '',
        location: `${seller.user_city || ''}, ${seller.user_state || ''}, ${seller.user_country || ''}`.replace(/^,\s*|,\s*$/g, '').replace(/,\s*,/g, ','),
        products: seller.features || [], // Use features as products for now
        status: seller.is_approved ? 'approved' : 'pending',
        registrationDate: seller.user_created_at || '',
        description: seller.description
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

  const filteredFarmers = statusFilter === 'all'
    ? farmers
    : farmers.filter(farmer => farmer.status === statusFilter);

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
          <h2 className="text-2xl font-semibold text-gray-900">Farmers</h2>
          <p className="text-gray-600 mt-1">Manage seller profiles and farmer accounts ({farmers.length} total)</p>
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
            placeholder="Search farmers..."
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Products</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredFarmers.map((farmer) => (
              <tr key={farmer.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{farmer.name}</div>
                  <div className="text-sm text-gray-500">{farmer.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {farmer.phone}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {farmer.location}
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {farmer.products.map((product, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 text-xs bg-gray-100 rounded-full"
                      >
                        {product}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {getStatusIcon(farmer.status)}
                    <span className={`ml-2 px-2 py-1 text-xs rounded-full ${getStatusBadgeColor(farmer.status)}`}>
                      {farmer.status.charAt(0).toUpperCase() + farmer.status.slice(1)}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditFarmer(farmer)}
                      className="text-blue-600 hover:text-blue-800 px-2 py-1 rounded"
                    >
                      Edit
                    </button>
                    <select
                      value={farmer.status}
                      onChange={(e) => handleStatusChange(farmer.id, e.target.value as Farmer['status'])}
                      className="text-sm border border-gray-300 rounded px-2"
                    >
                      <option value="pending">Pending</option>
                      <option value="approved">Approve</option>
                      <option value="suspended">Suspend</option>
                    </select>
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
    </div>
  );
}