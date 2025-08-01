import React from 'react';
import { X, User, MapPin, Clock, Globe, Star, Calendar, Phone, Mail, Building, Store, Crown, Tag, Package } from 'lucide-react';

interface UserProfileData {
  // Basic user info
  id: string;
  name: string;
  email: string;
  phone?: string;
  defaultMode?: string;
  role?: string;

  // Location info
  address?: string;
  street_address?: string;
  apartment_unit?: string;
  city?: string;
  state?: string;
  district?: string;
  country?: string;
  zipcode?: string;
  location?: string;
  coordinates?: any;
  // Business address (for sellers)
  business_address?: string;
  business_street_address?: string;
  business_apartment_unit?: string;
  business_city?: string;
  business_state?: string;
  business_district?: string;
  business_country?: string;
  business_zipcode?: string;
  has_business_address?: boolean;

  // Dates
  registrationDate?: string;
  lastActive?: string;
  created_at?: string;

  // Seller specific
  store_name?: string;
  store_description?: string;
  is_approved?: boolean;
  seller_approved?: boolean;
  features?: string[];
  business_type?: string;
  website?: string;
  certifications?: string[];

  // Additional fields
  profile_image?: string;
  average_rating?: number;
  total_reviews?: number;

  // Default address from user_addresses table
  default_address?: {
    id: string;
    label: string;
    street?: string;
    city: string;
    state: string;
    zip_code: string;
    country: string;
    coordinates?: any;
  };
}

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfileData | null;
  title?: string;
  showBusinessAddress?: boolean;
}



export function UserProfileModal({ isOpen, onClose, user, title = "User Profile", showBusinessAddress = false }: UserProfileModalProps) {
  if (!isOpen || !user) return null;

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not available';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getUserTypeIcon = () => {
    if (user.defaultMode === 'seller' || user.store_name) return <Store className="h-5 w-5" />;
    if (user.defaultMode === 'both') return <Crown className="h-5 w-5" />;
    return <User className="h-5 w-5" />;
  };

  const getUserTypeBadge = () => {
    const mode = user.defaultMode || (user.store_name ? 'seller' : 'buyer');
    const colors = {
      buyer: 'bg-blue-100 text-blue-800',
      seller: 'bg-green-100 text-green-800',
      both: 'bg-purple-100 text-purple-800'
    };
    
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${colors[mode as keyof typeof colors] || colors.buyer}`}>
        {mode}
      </span>
    );
  };

  const getRoleBadge = () => {
    if (!user.role || user.role === 'user') return null;
    
    const colors = {
      admin: 'bg-orange-100 text-orange-800',
      super_admin: 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${colors[user.role as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
        {user.role.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-xl border border-gray-200">
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 rounded-full p-2">
                {getUserTypeIcon()}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
                <p className="text-gray-600 text-sm">User profile information</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          <div className="p-6 space-y-6">
            {/* User Header Card */}
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-4">
                  <div className="bg-white rounded-full p-3 shadow-sm">
                    {getUserTypeIcon()}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">{user.name}</h3>
                    <div className="flex items-center space-x-2 mt-2">
                      {getUserTypeBadge()}
                      {getRoleBadge()}
                    </div>
                    {user.average_rating && (
                      <div className="flex items-center mt-2">
                        <Star className="h-4 w-4 text-yellow-400 fill-current mr-1" />
                        <span className="text-sm text-gray-600">
                          {user.average_rating} ({user.total_reviews} reviews)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right text-sm text-gray-600">
                  <div className="flex items-center mb-1">
                    <Calendar className="h-4 w-4 mr-1" />
                    Joined {formatDate(user.registrationDate)}
                  </div>
                  {user.lastActive && (
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      Last active {formatDate(user.lastActive)}
                    </div>
                  )}
                </div>
              </div>

              {/* Seller Store Info */}
              {user.store_name && (
                <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3 mb-2">
                    <Store className="h-5 w-5 text-blue-600" />
                    <h4 className="text-lg font-medium text-gray-900">{user.store_name}</h4>
                    {user.is_approved && (
                      <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                        Approved
                      </span>
                    )}
                  </div>
                  {user.store_description && (
                    <p className="text-gray-700 text-sm">{user.store_description}</p>
                  )}
                </div>
              )}
            </div>

            {/* Contact Information */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Phone className="h-5 w-5 text-blue-600" />
                Contact Information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Email</p>
                    <p className="text-gray-900 text-sm">{user.email}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Phone</p>
                    <p className="text-gray-900 text-sm">{user.phone || 'Not provided'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-blue-600" />
                Address Information
              </h3>

              {/* Scrollable Address Container */}
              <div className="max-h-80 overflow-y-auto space-y-4 pr-2" style={{scrollbarWidth: 'thin'}}>
                <style jsx>{`
                  div::-webkit-scrollbar {
                    width: 6px;
                  }
                  div::-webkit-scrollbar-track {
                    background: #f1f5f9;
                    border-radius: 3px;
                  }
                  div::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 3px;
                  }
                  div::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8;
                  }
                `}</style>
                {/* Business Address (if available) */}
                {user.has_business_address && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Building className="h-4 w-4 text-blue-600" />
                      <h4 className="text-base font-medium text-gray-900">Business Address</h4>
                    </div>

                    {/* Complete Business Address Display */}
                    {user.business_address && user.business_address !== 'Address not provided' && (
                      <div className="bg-white rounded-lg p-3 mb-3 border border-blue-100">
                        <p className="text-xs font-medium text-blue-700 mb-1">Complete Address</p>
                        <p className="text-gray-900 text-sm">{user.business_address}</p>
                      </div>
                    )}

                    {/* Individual Business Address Components */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {user.business_street_address && (
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <p className="text-xs font-medium text-gray-600 mb-1">Street Address</p>
                          <p className="text-gray-900 text-sm">{user.business_street_address}</p>
                        </div>
                      )}

                      {user.business_apartment_unit && (
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <p className="text-xs font-medium text-gray-600 mb-1">Apartment/Unit</p>
                          <p className="text-gray-900 text-sm">{user.business_apartment_unit}</p>
                        </div>
                      )}

                      {user.business_city && (
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <p className="text-xs font-medium text-gray-600 mb-1">City</p>
                          <p className="text-gray-900 text-sm">{user.business_city}</p>
                        </div>
                      )}

                      {user.business_state && (
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <p className="text-xs font-medium text-gray-600 mb-1">State/Province</p>
                          <p className="text-gray-900 text-sm">{user.business_state}</p>
                        </div>
                      )}

                      {user.business_district && (
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <p className="text-xs font-medium text-gray-600 mb-1">District</p>
                          <p className="text-gray-900 text-sm">{user.business_district}</p>
                        </div>
                      )}

                      {user.business_country && (
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <p className="text-xs font-medium text-gray-600 mb-1">Country</p>
                          <p className="text-gray-900 text-sm">{user.business_country}</p>
                        </div>
                      )}

                      {user.business_zipcode && (
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <p className="text-xs font-medium text-gray-600 mb-1">Zipcode/Postal Code</p>
                          <p className="text-gray-900 text-sm">{user.business_zipcode}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Personal Address */}
                <div className={`${user.has_business_address ? 'bg-gray-50' : 'bg-green-50'} border ${user.has_business_address ? 'border-gray-200' : 'border-green-200'} rounded-lg p-4`}>
                  <div className="flex items-center gap-2 mb-3">
                    <User className={`h-4 w-4 ${user.has_business_address ? 'text-gray-600' : 'text-green-600'}`} />
                    <h4 className="text-base font-medium text-gray-900">
                      {user.has_business_address ? 'Personal Address' : 'Address'}
                    </h4>
                  </div>

                  {/* Complete Personal Address Display */}
                  {user.address && user.address !== 'Address not provided' && !user.has_business_address && (
                    <div className="bg-white rounded-lg p-3 mb-3 border border-green-100">
                      <p className="text-xs font-medium text-green-700 mb-1">Complete Address</p>
                      <p className="text-gray-900 text-sm">{user.address}</p>
                    </div>
                  )}

                  {/* Individual Personal Address Components */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {user.street_address && (
                      <div className="bg-white rounded-lg p-3 border border-gray-200">
                        <p className="text-xs font-medium text-gray-600 mb-1">Street Address</p>
                        <p className="text-gray-900 text-sm">{user.street_address}</p>
                      </div>
                    )}

                    {user.apartment_unit && (
                      <div className="bg-white rounded-lg p-3 border border-gray-200">
                        <p className="text-xs font-medium text-gray-600 mb-1">Apartment/Unit</p>
                        <p className="text-gray-900 text-sm">{user.apartment_unit}</p>
                      </div>
                    )}

                    {user.city && (
                      <div className="bg-white rounded-lg p-3 border border-gray-200">
                        <p className="text-xs font-medium text-gray-600 mb-1">City</p>
                        <p className="text-gray-900 text-sm">{user.city}</p>
                      </div>
                    )}

                    {user.state && (
                      <div className="bg-white rounded-lg p-3 border border-gray-200">
                        <p className="text-xs font-medium text-gray-600 mb-1">State/Province</p>
                        <p className="text-gray-900 text-sm">{user.state}</p>
                      </div>
                    )}

                    {user.district && (
                      <div className="bg-white rounded-lg p-3 border border-gray-200">
                        <p className="text-xs font-medium text-gray-600 mb-1">District</p>
                        <p className="text-gray-900 text-sm">{user.district}</p>
                      </div>
                    )}

                    {user.country && (
                      <div className="bg-white rounded-lg p-3 border border-gray-200">
                        <p className="text-xs font-medium text-gray-600 mb-1">Country</p>
                        <p className="text-gray-900 text-sm">{user.country}</p>
                      </div>
                    )}

                    {user.zipcode && (
                      <div className="bg-white rounded-lg p-3 border border-gray-200">
                        <p className="text-xs font-medium text-gray-600 mb-1">Zipcode/Postal Code</p>
                        <p className="text-gray-900 text-sm">{user.zipcode}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Default Address (for buyers) */}
                {user.default_address && (user.defaultMode === 'buyer' || user.defaultMode === 'both') && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <MapPin className="h-4 w-4 text-blue-600" />
                      <h4 className="text-base font-medium text-gray-900">Default Address</h4>
                      <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                        {user.default_address.label}
                      </span>
                    </div>

                    <div className="bg-white rounded-lg p-3 border border-blue-100">
                      <div className="text-sm text-gray-900">
                        {user.default_address.street && (
                          <div className="mb-1">{user.default_address.street}</div>
                        )}
                        <div>
                          {user.default_address.city}, {user.default_address.state} {user.default_address.zip_code}
                        </div>
                        <div>{user.default_address.country}</div>
                      </div>
                    </div>

                    <div className="text-xs text-blue-600 mt-2">
                      📍 This is the user's chosen default address from their address book
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Seller Information (if applicable) */}
            {(user.store_name || user.defaultMode === 'seller' || user.defaultMode === 'both') && (
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <Store className="h-5 w-5 text-blue-600" />
                Seller Information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  {user.store_name && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Store Name</label>
                      <div className="text-sm text-gray-900">{user.store_name}</div>
                    </div>
                  )}

                  {user.store_description && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Store Description</label>
                      <div className="text-sm text-gray-900">{user.store_description}</div>
                    </div>
                  )}

                  {user.business_type && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Business Type</label>
                      <div className="text-sm text-gray-900">{user.business_type}</div>
                    </div>
                  )}

                  {user.website && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Website</label>
                      <div className="text-sm text-blue-600">
                        <a href={user.website} target="_blank" rel="noopener noreferrer" className="hover:underline">
                          {user.website}
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Approval Status</label>
                    <div>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        (user.is_approved || user.seller_approved)
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {(user.is_approved || user.seller_approved) ? 'Approved' : 'Pending Approval'}
                      </span>
                    </div>
                  </div>

                  {user.features && user.features.length > 0 && (
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Package className="h-4 w-4 text-blue-600" />
                        <label className="text-sm font-semibold text-gray-900">
                          Products & Services ({user.features.length})
                        </label>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {user.features.map((feature, index) => (
                          <div key={index} className="bg-white rounded-lg p-3 border border-blue-100 shadow-sm">
                            <div className="flex items-center gap-2">
                              <Tag className="h-3 w-3 text-blue-600" />
                              <span className="text-sm font-medium text-gray-900">{feature}</span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Available product/service
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 text-xs text-blue-600 font-medium">
                        💼 {user.features.length} product{user.features.length !== 1 ? 's' : ''} & service{user.features.length !== 1 ? 's' : ''} offered
                      </div>
                    </div>
                  )}

                  {user.certifications && user.certifications.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Certifications</label>
                      <div className="flex flex-wrap gap-1">
                        {user.certifications.map((cert, index) => (
                          <span key={index} className="inline-flex px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                            {cert}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Account Information */}
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5 text-blue-600" />
              Account Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">Registration Date</label>
                <div className="text-sm text-gray-900 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  {formatDate(user.registrationDate || user.created_at)}
                </div>
              </div>

              {user.lastActive && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Last Active</label>
                  <div className="text-sm text-gray-900 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    {formatDate(user.lastActive)}
                  </div>
                </div>
              )}

              <div className="bg-gray-50 rounded-lg p-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">User ID</label>
                <div className="text-sm text-gray-900 font-mono">{user.id}</div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">Account Status</label>
                <div>
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                    Active
                  </span>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              Profile information • Last updated {formatDate(user.registrationDate)}
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
