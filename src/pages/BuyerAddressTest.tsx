import React, { useState, useEffect } from 'react';
import { fetchUsersWithAddresses, UserAddressData, fetchUserAddresses } from '../services/dataService';
import { MapPin, User, Home, Building } from 'lucide-react';

export function BuyerAddressTest() {
  const [buyers, setBuyers] = useState<UserAddressData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBuyer, setSelectedBuyer] = useState<UserAddressData | null>(null);
  const [allAddresses, setAllAddresses] = useState<any[]>([]);

  useEffect(() => {
    loadBuyers();
  }, []);

  const loadBuyers = async () => {
    try {
      setLoading(true);
      const data = await fetchUsersWithAddresses();
      // Filter only buyers
      const buyersOnly = data.filter(user => 
        user.defaultMode === 'buyer' || user.defaultMode === 'both'
      );
      setBuyers(buyersOnly);
    } catch (error) {
      console.error('Error loading buyers:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAllAddresses = async (userId: string) => {
    try {
      const addresses = await fetchUserAddresses(userId);
      setAllAddresses(addresses);
    } catch (error) {
      console.error('Error loading addresses:', error);
      setAllAddresses([]);
    }
  };

  const handleBuyerClick = (buyer: UserAddressData) => {
    setSelectedBuyer(buyer);
    loadAllAddresses(buyer.id);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading buyers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Buyer Default Address Test</h1>
          <p className="mt-2 text-gray-600">
            Testing the default address functionality for buyers. Click on a buyer to see all their addresses.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Buyers List */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Buyers ({buyers.length})
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {buyers.map((buyer) => (
                  <div
                    key={buyer.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedBuyer?.id === buyer.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => handleBuyerClick(buyer)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {buyer.full_name}
                          </h3>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            buyer.defaultMode === 'buyer'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            {buyer.defaultMode}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{buyer.email}</p>
                        
                        {/* Default Address Display */}
                        <div className="flex items-start gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-900">
                                {buyer.display_address}
                              </span>
                              {buyer.default_address && (
                                <span className="inline-flex px-1.5 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded">
                                  Default
                                </span>
                              )}
                            </div>
                            {buyer.default_address?.label && (
                              <div className="text-xs text-blue-600 font-medium mt-1">
                                📍 {buyer.default_address.label}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Selected Buyer Details */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {selectedBuyer ? `${selectedBuyer.full_name}'s Addresses` : 'Select a Buyer'}
              </h2>
            </div>
            <div className="p-6">
              {selectedBuyer ? (
                <div className="space-y-6">
                  {/* Default Address from fetchUsersWithAddresses */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">
                      Current Default Address (from fetchUsersWithAddresses)
                    </h3>
                    {selectedBuyer.default_address ? (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Home className="h-5 w-5 text-green-600" />
                          <span className="font-medium text-green-900">
                            {selectedBuyer.default_address.label}
                          </span>
                          <span className="inline-flex px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                            Default
                          </span>
                        </div>
                        <div className="text-sm text-gray-700">
                          <div>{selectedBuyer.default_address.street}</div>
                          <div>
                            {selectedBuyer.default_address.city}, {selectedBuyer.default_address.state} {selectedBuyer.default_address.zip_code}
                          </div>
                          <div>{selectedBuyer.default_address.country}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <p className="text-gray-600">No default address found</p>
                      </div>
                    )}
                  </div>

                  {/* All Addresses from fetchUserAddresses */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">
                      All Addresses (from fetchUserAddresses)
                    </h3>
                    {allAddresses.length > 0 ? (
                      <div className="space-y-3">
                        {allAddresses.map((address) => (
                          <div
                            key={address.id}
                            className={`border rounded-lg p-4 ${
                              address.is_default
                                ? 'bg-green-50 border-green-200'
                                : 'bg-gray-50 border-gray-200'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <Building className="h-4 w-4 text-gray-600" />
                              <span className="font-medium text-gray-900">
                                {address.label}
                              </span>
                              {address.is_default && (
                                <span className="inline-flex px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                                  Default
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-700">
                              <div>{address.street}</div>
                              <div>
                                {address.city}, {address.state} {address.zip_code}
                              </div>
                              <div>{address.country}</div>
                            </div>
                            <div className="text-xs text-gray-500 mt-2">
                              Created: {new Date(address.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <p className="text-gray-600">No addresses found</p>
                      </div>
                    )}
                  </div>

                  {/* Raw Data Display */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">
                      Raw Data (for debugging)
                    </h3>
                    <div className="bg-gray-100 rounded-lg p-4">
                      <pre className="text-xs text-gray-700 overflow-auto">
                        {JSON.stringify({
                          display_address: selectedBuyer.display_address,
                          full_address: selectedBuyer.full_address,
                          default_address: selectedBuyer.default_address,
                          coordinates: selectedBuyer.coordinates
                        }, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-12">
                  <User className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Select a buyer from the list to view their address details</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
