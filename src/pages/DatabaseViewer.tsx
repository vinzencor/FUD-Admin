import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Database, Users, MapPin, Home } from 'lucide-react';

export function DatabaseViewer() {
  const [users, setUsers] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Fetch users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, full_name, email, default_mode, city, state, country')
        .not('full_name', 'is', null)
        .order('full_name');

      if (usersError) {
        console.error('Error fetching users:', usersError);
      } else {
        setUsers(usersData || []);
      }

      // Fetch addresses
      const { data: addressesData, error: addressesError } = await supabase
        .from('user_addresses')
        .select(`
          id,
          user_id,
          label,
          street,
          city,
          state,
          zip_code,
          country,
          is_default,
          created_at
        `)
        .order('user_id')
        .order('is_default', { ascending: false });

      if (addressesError) {
        console.error('Error fetching addresses:', addressesError);
      } else {
        setAddresses(addressesData || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUserAddresses = (userId: string) => {
    return addresses.filter(addr => addr.user_id === userId);
  };

  const getDefaultAddress = (userId: string) => {
    return addresses.find(addr => addr.user_id === userId && addr.is_default);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading database data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Database className="h-8 w-8" />
            Database Viewer - User Addresses
          </h1>
          <p className="mt-2 text-gray-600">
            View all users and their addresses from the database. This shows the raw data structure.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Users Table */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Users className="h-5 w-5" />
                Users Table ({users.length})
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {users.map((user) => {
                  const userAddresses = getUserAddresses(user.id);
                  const defaultAddress = getDefaultAddress(user.id);
                  
                  return (
                    <div key={user.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900">{user.full_name}</h3>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.default_mode === 'buyer'
                            ? 'bg-blue-100 text-blue-800'
                            : user.default_mode === 'seller'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {user.default_mode}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{user.email}</p>
                      <p className="text-xs text-gray-500 mb-2">ID: {user.id}</p>
                      
                      {/* User's basic location */}
                      <div className="text-sm text-gray-700 mb-2">
                        <strong>Basic Location:</strong> {[user.city, user.state, user.country].filter(Boolean).join(', ') || 'Not set'}
                      </div>
                      
                      {/* Address count */}
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-gray-600">
                          📍 {userAddresses.length} address(es)
                        </span>
                        {defaultAddress && (
                          <span className="text-green-600 font-medium">
                            ✓ Has default
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Addresses Table */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                User Addresses Table ({addresses.length})
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {addresses.map((address) => {
                  const user = users.find(u => u.id === address.user_id);
                  
                  return (
                    <div
                      key={address.id}
                      className={`border rounded-lg p-4 ${
                        address.is_default
                          ? 'border-green-300 bg-green-50'
                          : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Home className="h-4 w-4 text-gray-600" />
                        <span className="font-medium text-gray-900">{address.label}</span>
                        {address.is_default && (
                          <span className="inline-flex px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                            Default
                          </span>
                        )}
                      </div>
                      
                      <div className="text-sm text-gray-700 mb-2">
                        <strong>User:</strong> {user?.full_name || 'Unknown'} ({user?.email || 'No email'})
                      </div>
                      
                      <div className="text-sm text-gray-700 mb-2">
                        <strong>Address:</strong>
                        <div className="ml-2">
                          {address.street && <div>{address.street}</div>}
                          <div>{address.city}, {address.state} {address.zip_code}</div>
                          <div>{address.country}</div>
                        </div>
                      </div>
                      
                      <div className="text-xs text-gray-500">
                        <div>Address ID: {address.id}</div>
                        <div>User ID: {address.user_id}</div>
                        <div>Created: {new Date(address.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-blue-600">{users.length}</div>
            <div className="text-sm text-gray-600">Total Users</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-green-600">{addresses.length}</div>
            <div className="text-sm text-gray-600">Total Addresses</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-purple-600">
              {addresses.filter(addr => addr.is_default).length}
            </div>
            <div className="text-sm text-gray-600">Default Addresses</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-orange-600">
              {users.filter(user => user.default_mode === 'buyer' || user.default_mode === 'both').length}
            </div>
            <div className="text-sm text-gray-600">Buyers</div>
          </div>
        </div>
      </div>
    </div>
  );
}
