import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, RefreshCw, MapPin, Calendar, Phone, User } from 'lucide-react';
import { fetchUsersWithAddresses, UserAddressData } from '../services/dataService';
import { exportWithLoading, generateFilename, formatDateForExport } from '../utils/exportUtils';
import { useAuthStore } from '../store/authStore';
import { UserProfileModal } from '../components/shared/UserProfileModal';
import {
  getAdminAssignedLocation,
  AdminLocation,
  formatLocationDisplay,
  doesUserMatchLocation
} from '../services/locationAdminService';
import { supabase } from '../supabaseClient';

interface Buyer {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  defaultMode: string;
  registrationDate: string;
  lastActive: string;
  fullAddress?: string;
  coordinates?: any;
  // Individual address fields (personal)
  street_address?: string;
  apartment_unit?: string;
  city?: string;
  state?: string;
  district?: string;
  country?: string;
  zipcode?: string;
  // Business address fields (if user is also a seller)
  business_street_address?: string;
  business_apartment_unit?: string;
  business_city?: string;
  business_state?: string;
  business_district?: string;
  business_country?: string;
  business_zipcode?: string;
  has_business_address?: boolean;
}

export function Buyers() {
  const user = useAuthStore((state) => state.user);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedBuyer, setSelectedBuyer] = useState<Buyer | null>(null);
  const [selectedUserData, setSelectedUserData] = useState<UserAddressData | null>(null);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [usersData, setUsersData] = useState<UserAddressData[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [adminLocation, setAdminLocation] = useState<AdminLocation | null>(null);

  useEffect(() => {
    loadBuyers();
  }, []);

  const loadBuyers = async () => {
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

      // Fetch all users first
      const fetchedUsersData = await fetchUsersWithAddresses();

      // Apply location filtering if admin has location restrictions
      let filteredUsersData = fetchedUsersData;
      if (adminLocationFilter) {
        filteredUsersData = fetchedUsersData.filter(userData => {
          return doesUserMatchLocation(
            {
              country: userData.country,
              state: userData.state,
              city: userData.city,
              zipcode: userData.zipcode
            },
            adminLocationFilter
          );
        });
      }

      // Store the filtered users data for profile viewing
      setUsersData(filteredUsersData);

      // Filter for buyers only
      const buyersData: Buyer[] = filteredUsersData
        .filter(userData => {
          // Include users who are buyers or have buyer/both as default mode
          // If is_seller is false, they are buyers
          // If is_seller is true but defaultMode is 'buyer' or 'both', include them
          return !userData.is_seller || userData.defaultMode === 'buyer' || userData.defaultMode === 'both';
        })
        .map(userData => {
          // Parse business address from seller profile JSON address field
          let businessAddress: any = null;
          let hasBusinessAddress = false;

          if (userData.seller_profile?.address) {
            try {
              businessAddress = typeof userData.seller_profile.address === 'string'
                ? JSON.parse(userData.seller_profile.address)
                : userData.seller_profile.address;
              hasBusinessAddress = !!(businessAddress && (
                businessAddress.street ||
                businessAddress.street_address ||
                businessAddress.city ||
                businessAddress.state ||
                businessAddress.country
              ));
            } catch (error) {
              console.warn('Failed to parse business address:', error);
              hasBusinessAddress = false;
            }
          }

          // Build complete personal address from all available fields
          const personalAddressParts = [
            userData.street_address,
            userData.apartment_unit,
            userData.city,
            userData.district,
            userData.state,
            userData.country,
            userData.zipcode || userData.postal_code
          ].filter(Boolean);

          // Build complete business address if available
          const businessAddressParts = hasBusinessAddress && businessAddress ? [
            businessAddress.street || businessAddress.street_address,
            businessAddress.apartment_unit || businessAddress.unit,
            businessAddress.city,
            businessAddress.district,
            businessAddress.state,
            businessAddress.country,
            businessAddress.zipcode || businessAddress.postal_code
          ].filter(Boolean) : [];

          // Use business address if available and more complete, otherwise personal address
          const primaryAddressParts = businessAddressParts.length > personalAddressParts.length
            ? businessAddressParts
            : personalAddressParts;

          const completeAddress = primaryAddressParts.length > 0
            ? primaryAddressParts.join(', ')
            : userData.full_address || userData.display_address || 'Address not provided';

          // Create a shorter location display for table (prefer business location for sellers)
          const locationParts = hasBusinessAddress && businessAddress ? [
            businessAddress.city || userData.city,
            businessAddress.state || userData.state,
            businessAddress.country || userData.country
          ].filter(Boolean) : [
            userData.city,
            userData.state,
            userData.country
          ].filter(Boolean);

          const locationDisplay = locationParts.length > 0
            ? locationParts.join(', ')
            : 'Location not provided';

          return {
            id: userData.id,
            name: userData.full_name || 'Unknown User',
            email: userData.email || '',
            phone: userData.mobile_phone || '',
            location: locationDisplay,
            defaultMode: userData.defaultMode || 'buyer',
            registrationDate: userData.created_at || '',
            lastActive: userData.created_at || '', // UserAddressData doesn't have last_sign_in_at
            fullAddress: completeAddress,
            coordinates: userData.coordinates,
            // Individual personal address fields
            street_address: userData.street_address,
            apartment_unit: userData.apartment_unit,
            city: userData.city,
            state: userData.state,
            district: userData.district,
            country: userData.country,
            zipcode: userData.zipcode || userData.postal_code,
            // Business address fields (parsed from JSON)
            business_street_address: businessAddress?.street || businessAddress?.street_address,
            business_apartment_unit: businessAddress?.apartment_unit || businessAddress?.unit,
            business_city: businessAddress?.city,
            business_state: businessAddress?.state,
            business_district: businessAddress?.district,
            business_country: businessAddress?.country,
            business_zipcode: businessAddress?.zipcode || businessAddress?.postal_code,
            has_business_address: hasBusinessAddress
          };
        });

      setBuyers(buyersData);
    } catch (err) {
      console.error('Error loading buyers:', err);
      setError(err instanceof Error ? err.message : 'Failed to load buyers');
    } finally {
      setLoading(false);
    }
  };

  const handleExportBuyers = async () => {
    const filename = generateFilename('buyers');

    // Define export columns for buyers
    const exportColumns = [
      { key: 'name', label: 'Name' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'location', label: 'Location' },
      { key: 'default_mode', label: 'Default Mode' },
      { key: 'registration_date', label: 'Registration Date' },
      { key: 'last_active', label: 'Last Active' },
      { key: 'city', label: 'City' },
      { key: 'state', label: 'State' },
      { key: 'country', label: 'Country' },
      { key: 'zipcode', label: 'Zipcode' }
    ];

    await exportWithLoading(
      () => Promise.resolve(
        filteredBuyers.map(buyer => ({
          name: buyer.name,
          email: buyer.email,
          phone: buyer.phone,
          location: buyer.location,
          full_address: buyer.fullAddress || buyer.location,
          default_mode: buyer.defaultMode,
          registration_date: formatDateForExport(buyer.registrationDate),
          last_active: formatDateForExport(buyer.lastActive)
        }))
      ),
      exportColumns,
      filename,
      setExporting,
      (count) => {
        setExportMessage(`Successfully exported ${count} buyers`);
        setTimeout(() => setExportMessage(null), 3000);
      },
      (error) => {
        setExportMessage(`Export failed: ${error}`);
        setTimeout(() => setExportMessage(null), 5000);
      }
    );
  };

  const handleViewProfile = (buyer: Buyer) => {
    setSelectedBuyer(buyer);
    // Find the corresponding user data
    const userData = usersData.find(u => u.id === buyer.id);
    setSelectedUserData(userData || null);
    setShowProfileModal(true);
  };

  // Filter buyers based on search term
  const filteredBuyers = buyers.filter(buyer => {
    const matchesSearch = searchTerm === '' || 
      buyer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      buyer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      buyer.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      buyer.location.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
          <span className="text-lg text-gray-600">Loading buyers...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 text-lg mb-4">Error loading buyers</div>
          <div className="text-gray-600 mb-4">{error}</div>
          <button
            onClick={loadBuyers}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Buyers Management</h1>
          <p className="text-gray-600 mt-1">
            Manage and view buyer accounts ({filteredBuyers.length} total)
          </p>
          {adminLocation && (
            <div className="mt-2 text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full inline-block">
              <MapPin className="h-3 w-3 inline mr-1" />
              Viewing: {formatLocationDisplay(adminLocation)}
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button
            onClick={loadBuyers}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={handleExportBuyers}
            disabled={exporting || filteredBuyers.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-4 w-4" />
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>
      </div>

      {/* Export Message */}
      {exportMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800 text-sm">{exportMessage}</p>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search buyers by name, email, phone, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Buyers List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {filteredBuyers.length === 0 ? (
          <div className="text-center py-12">
            <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No buyers found</h3>
            <p className="text-gray-500">
              {searchTerm ? 'Try adjusting your search terms' : 'No buyers have been registered yet'}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile View */}
            <div className="block sm:hidden">
              <div className="divide-y divide-gray-200">
                {filteredBuyers.map((buyer) => (
                  <div
                    key={buyer.id}
                    className="p-4 space-y-3 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => handleViewProfile(buyer)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <User className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900 text-sm">{buyer.name}</h3>
                          <p className="text-xs text-gray-500 mt-1">{buyer.email}</p>
                        </div>
                      </div>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        buyer.defaultMode === 'buyer'
                          ? 'bg-blue-100 text-blue-800'
                          : buyer.defaultMode === 'both'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {buyer.defaultMode}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-2 text-xs">
                      <div className="flex items-center text-gray-600">
                        <Phone className="h-3 w-3 mr-2" />
                        {buyer.phone || 'No phone'}
                      </div>
                      <div className="flex items-center text-gray-600">
                        <MapPin className="h-3 w-3 mr-2" />
                        {buyer.fullAddress || buyer.location}
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Calendar className="h-3 w-3 mr-2" />
                        Registered: {new Date(buyer.registrationDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Desktop View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Buyer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mode
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Registration
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredBuyers.map((buyer) => (
                    <tr
                      key={buyer.id}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => handleViewProfile(buyer)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <User className="h-5 w-5 text-blue-600" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{buyer.name}</div>
                            <div className="text-sm text-gray-500">ID: {buyer.id.slice(0, 8)}...</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{buyer.email}</div>
                        <div className="text-sm text-gray-500">{buyer.phone || 'No phone'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          <div className="max-w-xs">
                            <div className="font-medium truncate" title={buyer.fullAddress}>
                              {buyer.fullAddress}
                            </div>
                            {buyer.fullAddress !== buyer.location && (
                              <div className="text-xs text-gray-500 truncate" title={buyer.location}>
                                {buyer.location}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          buyer.defaultMode === 'buyer'
                            ? 'bg-blue-100 text-blue-800'
                            : buyer.defaultMode === 'both'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {buyer.defaultMode}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {new Date(buyer.registrationDate).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-gray-500">
                          Last active: {new Date(buyer.lastActive).toLocaleDateString()}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Profile Modal */}
      <UserProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        user={selectedBuyer ? {
          id: selectedBuyer.id,
          name: selectedBuyer.name,
          email: selectedBuyer.email,
          phone: selectedBuyer.phone,
          defaultMode: selectedBuyer.defaultMode,
          address: selectedBuyer.fullAddress,
          // Personal address fields
          street_address: selectedBuyer.street_address,
          apartment_unit: selectedBuyer.apartment_unit,
          city: selectedBuyer.city,
          state: selectedBuyer.state,
          district: selectedBuyer.district,
          country: selectedBuyer.country,
          zipcode: selectedBuyer.zipcode,
          // Business address fields (if available)
          has_business_address: selectedBuyer.has_business_address,
          business_address: selectedBuyer.has_business_address ? (() => {
            const parts = [
              selectedBuyer.business_street_address,
              selectedBuyer.business_apartment_unit,
              selectedBuyer.business_city,
              selectedBuyer.business_district,
              selectedBuyer.business_state,
              selectedBuyer.business_country,
              selectedBuyer.business_zipcode
            ].filter(Boolean);
            return parts.length > 0 ? parts.join(', ') : undefined;
          })() : undefined,
          business_street_address: selectedBuyer.business_street_address,
          business_apartment_unit: selectedBuyer.business_apartment_unit,
          business_city: selectedBuyer.business_city,
          business_state: selectedBuyer.business_state,
          business_district: selectedBuyer.business_district,
          business_country: selectedBuyer.business_country,
          business_zipcode: selectedBuyer.business_zipcode,
          coordinates: selectedBuyer.coordinates,
          registrationDate: selectedBuyer.registrationDate,
          lastActive: selectedBuyer.lastActive
        } : null}
        title="Buyer Profile"
      />
    </div>
  );
}
