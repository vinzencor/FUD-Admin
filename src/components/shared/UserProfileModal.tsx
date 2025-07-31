import React from 'react';
import { X, User, MapPin, Clock, Globe, Star, Calendar, Phone, Mail, Building, Store, Crown } from 'lucide-react';

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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[95vh] overflow-hidden shadow-2xl border border-gray-100">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                {getUserTypeIcon()}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">{title}</h2>
                <p className="text-blue-100 text-sm">Complete profile information</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-all duration-200 p-2 hover:bg-white/10 rounded-full"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(95vh-120px)]">
          <div className="p-8 space-y-8">
            {/* User Header Card */}
            <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-6 border border-gray-200">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-4">
                  <div className="bg-white rounded-full p-4 shadow-lg">
                    {getUserTypeIcon()}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{user.name}</h3>
                    <div className="flex items-center space-x-3 mt-2">
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
                <div className="text-right">
                  <div className="flex items-center text-gray-600 mb-1">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span className="text-sm">Joined {formatDate(user.registrationDate)}</span>
                  </div>
                  {user.lastActive && (
                    <div className="flex items-center text-gray-600">
                      <Clock className="h-4 w-4 mr-2" />
                      <span className="text-sm">Last active {formatDate(user.lastActive)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
              <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-3">
                <div className="bg-blue-100 rounded-full p-2">
                  <Mail className="h-5 w-5 text-blue-600" />
                </div>
                Contact Information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-xl">
                  <Mail className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Email Address</p>
                    <p className="text-gray-900">{user.email}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-xl">
                  <Phone className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Phone Number</p>
                    <p className="text-gray-900">{user.phone || 'Not provided'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
              <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-3">
                <div className="bg-green-100 rounded-full p-2">
                  <MapPin className="h-5 w-5 text-green-600" />
                </div>
                Address Information
              </h3>

              <div className="space-y-6">
                {/* Business Address (if available) */}
                {user.has_business_address && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="bg-blue-100 rounded-full p-2">
                        <Building className="h-5 w-5 text-blue-600" />
                      </div>
                      <h4 className="text-lg font-semibold text-blue-900">Business Address</h4>
                    </div>

                    {/* Complete Business Address Display */}
                    {user.business_address && user.business_address !== 'Address not provided' && (
                      <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 mb-4 border border-blue-100">
                        <p className="text-sm font-medium text-blue-700 mb-2">Complete Business Address</p>
                        <p className="text-gray-900 leading-relaxed">{user.business_address}</p>
                      </div>
                    )}

                    {/* Individual Business Address Components */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {user.business_street_address && (
                        <div className="bg-white/60 rounded-lg p-3">
                          <p className="text-xs font-medium text-blue-700 mb-1">Street Address</p>
                          <p className="text-gray-900 text-sm">{user.business_street_address}</p>
                        </div>
                      )}

                      {user.business_apartment_unit && (
                        <div className="bg-white/60 rounded-lg p-3">
                          <p className="text-xs font-medium text-blue-700 mb-1">Apartment/Unit</p>
                          <p className="text-gray-900 text-sm">{user.business_apartment_unit}</p>
                        </div>
                      )}

                      {user.business_city && (
                        <div className="bg-white/60 rounded-lg p-3">
                          <p className="text-xs font-medium text-blue-700 mb-1">City</p>
                          <p className="text-gray-900 text-sm">{user.business_city}</p>
                        </div>
                      )}

                      {user.business_state && (
                        <div className="bg-white/60 rounded-lg p-3">
                          <p className="text-xs font-medium text-blue-700 mb-1">State/Province</p>
                          <p className="text-gray-900 text-sm">{user.business_state}</p>
                        </div>
                      )}

                      {user.business_district && (
                        <div className="bg-white/60 rounded-lg p-3">
                          <p className="text-xs font-medium text-blue-700 mb-1">District</p>
                          <p className="text-gray-900 text-sm">{user.business_district}</p>
                        </div>
                      )}

                      {user.business_country && (
                        <div className="bg-white/60 rounded-lg p-3">
                          <p className="text-xs font-medium text-blue-700 mb-1">Country</p>
                          <p className="text-gray-900 text-sm">{user.business_country}</p>
                        </div>
                      )}

                      {user.business_zipcode && (
                        <div className="bg-white/60 rounded-lg p-3">
                          <p className="text-xs font-medium text-blue-700 mb-1">Zipcode/Postal Code</p>
                          <p className="text-gray-900 text-sm">{user.business_zipcode}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Personal Address */}
                <div className={`${user.has_business_address ? 'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200' : 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'} border rounded-xl p-6`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`${user.has_business_address ? 'bg-gray-100' : 'bg-green-100'} rounded-full p-2`}>
                      <User className={`h-5 w-5 ${user.has_business_address ? 'text-gray-600' : 'text-green-600'}`} />
                    </div>
                    <h4 className={`text-lg font-semibold ${user.has_business_address ? 'text-gray-900' : 'text-green-900'}`}>
                      {user.has_business_address ? 'Personal Address' : 'Address'}
                    </h4>
                  </div>

                  {/* Complete Personal Address Display */}
                  {user.address && user.address !== 'Address not provided' && !user.has_business_address && (
                    <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 mb-4 border border-green-100">
                      <p className="text-sm font-medium text-green-700 mb-2">Complete Address</p>
                      <p className="text-gray-900 leading-relaxed">{user.address}</p>
                    </div>
                  )}

                  {/* Individual Personal Address Components */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {user.street_address && (
                      <div className="bg-white/60 rounded-lg p-3">
                        <p className={`text-xs font-medium mb-1 ${user.has_business_address ? 'text-gray-700' : 'text-green-700'}`}>Street Address</p>
                        <p className="text-gray-900 text-sm">{user.street_address}</p>
                      </div>
                    )}

                    {user.apartment_unit && (
                      <div className="bg-white/60 rounded-lg p-3">
                        <p className={`text-xs font-medium mb-1 ${user.has_business_address ? 'text-gray-700' : 'text-green-700'}`}>Apartment/Unit</p>
                        <p className="text-gray-900 text-sm">{user.apartment_unit}</p>
                      </div>
                    )}

                    {user.city && (
                      <div className="bg-white/60 rounded-lg p-3">
                        <p className={`text-xs font-medium mb-1 ${user.has_business_address ? 'text-gray-700' : 'text-green-700'}`}>City</p>
                        <p className="text-gray-900 text-sm">{user.city}</p>
                      </div>
                    )}

                    {user.state && (
                      <div className="bg-white/60 rounded-lg p-3">
                        <p className={`text-xs font-medium mb-1 ${user.has_business_address ? 'text-gray-700' : 'text-green-700'}`}>State/Province</p>
                        <p className="text-gray-900 text-sm">{user.state}</p>
                      </div>
                    )}

                    {user.district && (
                      <div className="bg-white/60 rounded-lg p-3">
                        <p className={`text-xs font-medium mb-1 ${user.has_business_address ? 'text-gray-700' : 'text-green-700'}`}>District</p>
                        <p className="text-gray-900 text-sm">{user.district}</p>
                      </div>
                    )}

                    {user.country && (
                      <div className="bg-white/60 rounded-lg p-3">
                        <p className={`text-xs font-medium mb-1 ${user.has_business_address ? 'text-gray-700' : 'text-green-700'}`}>Country</p>
                        <p className="text-gray-900 text-sm">{user.country}</p>
                      </div>
                    )}

                    {user.zipcode && (
                      <div className="bg-white/60 rounded-lg p-3">
                        <p className={`text-xs font-medium mb-1 ${user.has_business_address ? 'text-gray-700' : 'text-green-700'}`}>Zipcode/Postal Code</p>
                        <p className="text-gray-900 text-sm">{user.zipcode}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Seller Information (if applicable) */}
            {(user.store_name || user.defaultMode === 'seller' || user.defaultMode === 'both') && (
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2 mb-4">
                <Store className="h-5 w-5" />
                Seller Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  {user.store_name && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Store Name</label>
                      <div className="mt-1 text-sm text-gray-900">{user.store_name}</div>
                    </div>
                  )}

                  {user.store_description && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Store Description</label>
                      <div className="mt-1 text-sm text-gray-900">{user.store_description}</div>
                    </div>
                  )}

                  {user.business_type && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Business Type</label>
                      <div className="mt-1 text-sm text-gray-900">{user.business_type}</div>
                    </div>
                  )}

                  {user.website && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Website</label>
                      <div className="mt-1 text-sm text-blue-600">
                        <a href={user.website} target="_blank" rel="noopener noreferrer" className="hover:underline">
                          {user.website}
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Approval Status</label>
                    <div className="mt-1">
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Features/Products</label>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {user.features.map((feature, index) => (
                          <span key={index} className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {user.certifications && user.certifications.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Certifications</label>
                      <div className="mt-1 flex flex-wrap gap-1">
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
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5" />
              Account Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Registration Date</label>
                <div className="mt-1 text-sm text-gray-900 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  {formatDate(user.registrationDate || user.created_at)}
                </div>
              </div>
              
              {user.lastActive && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Active</label>
                  <div className="mt-1 text-sm text-gray-900 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    {formatDate(user.lastActive)}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700">User ID</label>
                <div className="mt-1 text-sm text-gray-900 font-mono">{user.id}</div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Account Status</label>
                <div className="mt-1">
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
        <div className="bg-gray-50 border-t border-gray-200 px-8 py-4 rounded-b-2xl">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              Profile information • Last updated {formatDate(user.registrationDate)}
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-medium shadow-lg"
            >
              Close Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
