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
  city?: string;
  state?: string;
  district?: string;
  country?: string;
  zipcode?: string;
  location?: string;
  coordinates?: any;

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
}



export function UserProfileModal({ isOpen, onClose, user, title = "User Profile" }: UserProfileModalProps) {
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
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
                {getUserTypeIcon()}
                Basic Information
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Full Name</label>
                  <div className="mt-1 text-sm text-gray-900">{user.name}</div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <div className="mt-1 text-sm text-gray-900 flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    {user.email}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <div className="mt-1 text-sm text-gray-900 flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    {user.phone || 'Not provided'}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">User Type</label>
                  <div className="mt-1 flex items-center gap-2">
                    {getUserTypeBadge()}
                    {getRoleBadge()}
                  </div>
                </div>

                {user.average_rating && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Rating</label>
                    <div className="mt-1 flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-400 fill-current" />
                      <span className="text-sm text-gray-900">
                        {user.average_rating} ({user.total_reviews} reviews)
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Location Information
              </h3>
              
              <div className="space-y-3">
                {/* Show street address if available */}
                {user.address && user.address !== 'Address not provided' && user.address.includes(',') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Street Address</label>
                    <div className="mt-1 text-sm text-gray-900">
                      {user.address.split(', ')[0] || 'Not provided'}
                    </div>
                  </div>
                )}

                {/* Show apartment/unit if available */}
                {user.address && user.address.includes(',') && user.address.split(', ').length > 1 && user.address.split(', ')[1] && !user.address.split(', ')[1].match(/^[A-Z][a-z]/) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Apartment/Unit</label>
                    <div className="mt-1 text-sm text-gray-900">
                      {user.address.split(', ')[1]}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700">City</label>
                  <div className="mt-1 text-sm text-gray-900">
                    {user.city || 'Not provided'}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">State/Province</label>
                  <div className="mt-1 text-sm text-gray-900">
                    {user.state || 'Not provided'}
                  </div>
                </div>

                {user.district && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">District</label>
                    <div className="mt-1 text-sm text-gray-900">{user.district}</div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700">Country</label>
                  <div className="mt-1 text-sm text-gray-900 flex items-center gap-2">
                    <Globe className="h-4 w-4 text-gray-400" />
                    {user.country || 'Not provided'}
                  </div>
                </div>

                {user.zipcode && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Zipcode/Postal Code</label>
                    <div className="mt-1 text-sm text-gray-900">
                      {user.zipcode}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700">Full Address</label>
                  <div className="mt-1 text-sm text-gray-900">
                    {user.address || user.location || 'Address not provided'}
                  </div>
                </div>

                {user.coordinates && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Coordinates</label>
                    <div className="mt-1 text-sm text-gray-900 font-mono">
                      {typeof user.coordinates === 'object'
                        ? `${user.coordinates.latitude || user.coordinates.lat || 'N/A'}, ${user.coordinates.longitude || user.coordinates.lng || 'N/A'}`
                        : user.coordinates
                      }
                    </div>
                  </div>
                )}
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

        <div className="flex justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
