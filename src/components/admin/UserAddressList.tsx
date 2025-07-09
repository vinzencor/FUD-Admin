import React, { useState } from 'react';
import { UserAddressData } from '../../services/dataService';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { 
  User, 
  Store, 
  MapPin, 
  Phone, 
  Mail, 
  Calendar,
  Search,
  Filter,
  CheckCircle,
  Circle
} from 'lucide-react';

interface UserAddressListProps {
  users: UserAddressData[];
  selectedUsers?: string[];
  onUserSelect?: (userId: string) => void;
  onUsersSelect?: (userIds: string[]) => void;
  allowMultiSelect?: boolean;
  showFilters?: boolean;
  onUserHover?: (userId: string | null) => void;
}

export function UserAddressList({
  users,
  selectedUsers = [],
  onUserSelect,
  onUsersSelect,
  allowMultiSelect = false,
  showFilters = true,
  onUserHover
}: UserAddressListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [userTypeFilter, setUserTypeFilter] = useState<'all' | 'sellers' | 'buyers'>('all');
  const [locationFilter, setLocationFilter] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'created_at' | 'location'>('name');

  // Filter and sort users
  const filteredUsers = users
    .filter(user => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        if (
          !user.full_name.toLowerCase().includes(search) &&
          !user.email.toLowerCase().includes(search) &&
          !user.display_address.toLowerCase().includes(search) &&
          !(user.seller_profile?.store_name?.toLowerCase().includes(search))
        ) {
          return false;
        }
      }

      // User type filter
      if (userTypeFilter === 'sellers' && !user.is_seller) return false;
      if (userTypeFilter === 'buyers' && !user.is_buyer) return false;

      // Location filter
      if (locationFilter) {
        const location = locationFilter.toLowerCase();
        if (
          !user.city?.toLowerCase().includes(location) &&
          !user.state?.toLowerCase().includes(location) &&
          !user.country?.toLowerCase().includes(location)
        ) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.full_name.localeCompare(b.full_name);
        case 'created_at':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'location':
          return a.display_address.localeCompare(b.display_address);
        default:
          return 0;
      }
    });

  const handleUserClick = (userId: string) => {
    if (allowMultiSelect) {
      const newSelection = selectedUsers.includes(userId)
        ? selectedUsers.filter(id => id !== userId)
        : [...selectedUsers, userId];
      onUsersSelect?.(newSelection);
    } else {
      onUserSelect?.(userId);
    }
  };

  const handleSelectAll = () => {
    if (allowMultiSelect) {
      const allUserIds = filteredUsers.map(user => user.id);
      const allSelected = allUserIds.every(id => selectedUsers.includes(id));
      
      if (allSelected) {
        // Deselect all
        onUsersSelect?.(selectedUsers.filter(id => !allUserIds.includes(id)));
      } else {
        // Select all
        const newSelection = [...new Set([...selectedUsers, ...allUserIds])];
        onUsersSelect?.(newSelection);
      }
    }
  };

  const getUserTypeBadge = (user: UserAddressData) => {
    if (user.is_seller && user.is_buyer) return { text: 'Both', color: 'bg-purple-100 text-purple-800' };
    if (user.is_seller) return { text: 'Seller', color: 'bg-green-100 text-green-800' };
    return { text: 'Buyer', color: 'bg-blue-100 text-blue-800' };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      {showFilters && (
        <div className="bg-gray-50 p-4 rounded-lg space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Name, email, or store..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 w-full border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* User Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                User Type
              </label>
              <select
                value={userTypeFilter}
                onChange={(e) => setUserTypeFilter(e.target.value as typeof userTypeFilter)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Users</option>
                <option value="sellers">Sellers Only</option>
                <option value="buyers">Buyers Only</option>
              </select>
            </div>

            {/* Location Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <input
                type="text"
                placeholder="City, state, country..."
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="name">Name</option>
                <option value="created_at">Join Date</option>
                <option value="location">Location</option>
              </select>
            </div>
          </div>

          {/* Multi-select controls */}
          {allowMultiSelect && (
            <div className="flex items-center justify-between pt-2 border-t border-gray-200">
              <div className="text-sm text-gray-600">
                {selectedUsers.length} of {filteredUsers.length} users selected
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className="text-xs"
              >
                {filteredUsers.every(user => selectedUsers.includes(user.id)) ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* User List */}
      <div className="space-y-2">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <User className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No users found matching your criteria</p>
          </div>
        ) : (
          filteredUsers.map((user) => {
            const isSelected = selectedUsers.includes(user.id);
            const badge = getUserTypeBadge(user);

            return (
              <div
                key={user.id}
                className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
                onClick={() => handleUserClick(user.id)}
                onMouseEnter={() => onUserHover?.(user.id)}
                onMouseLeave={() => onUserHover?.(null)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {allowMultiSelect && (
                        <div className="flex-shrink-0">
                          {isSelected ? (
                            <CheckCircle className="h-5 w-5 text-blue-600" />
                          ) : (
                            <Circle className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                      )}
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900">{user.full_name}</h3>
                          <Badge className={`text-xs ${badge.color}`}>
                            {badge.text}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            <span>{user.email}</span>
                          </div>
                          
                          {user.mobile_phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              <span>{user.mobile_phone}</span>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>Joined {formatDate(user.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Address */}
                    <div className="flex items-start gap-2 text-sm text-gray-600 mb-2">
                      <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      <span>{user.display_address}</span>
                      {!user.location_complete && (
                        <Badge variant="outline" className="text-xs text-orange-600 border-orange-200">
                          Incomplete Address
                        </Badge>
                      )}
                    </div>

                    {/* Seller Profile */}
                    {user.seller_profile && (
                      <div className="flex items-center gap-2 text-sm bg-green-50 text-green-800 px-2 py-1 rounded">
                        <Store className="h-3 w-3" />
                        <span className="font-medium">{user.seller_profile.store_name}</span>
                        {user.seller_profile.is_approved && (
                          <Badge className="text-xs bg-green-100 text-green-800">
                            Approved
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Summary */}
      {filteredUsers.length > 0 && (
        <div className="text-sm text-gray-500 text-center pt-4 border-t border-gray-200">
          Showing {filteredUsers.length} of {users.length} users
        </div>
      )}
    </div>
  );
}
