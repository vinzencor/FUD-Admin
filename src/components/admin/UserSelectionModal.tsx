import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  Users, 
  Map, 
  List, 
  Search, 
  MapPin, 
  Crown, 
  Loader2, 
  AlertCircle,
  Check,
  X,
  RefreshCw
} from 'lucide-react';
import { UserAddressData, fetchUsersWithAddresses, fetchUsersInLocation } from '../../services/dataService';
import { AdminLocation } from '../../services/locationAdminService';
import { UserAddressMap } from './UserAddressMap';
import { UserAddressList } from './UserAddressList';

interface UserSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserSelect: (user: UserAddressData) => void;
  title?: string;
  description?: string;
  allowMultiSelect?: boolean;
  onUsersSelect?: (users: UserAddressData[]) => void;
  filterLocation?: AdminLocation;
  preSelectedUsers?: string[];
  userTypeFilter?: 'all' | 'sellers' | 'buyers';
}

export function UserSelectionModal({
  isOpen,
  onClose,
  onUserSelect,
  title = 'Select User for Admin Assignment',
  description = 'Choose a user to assign admin role and location',
  allowMultiSelect = false,
  onUsersSelect,
  filterLocation,
  preSelectedUsers = [],
  userTypeFilter = 'all'
}: UserSelectionModalProps) {
  const [users, setUsers] = useState<UserAddressData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [selectedUsers, setSelectedUsers] = useState<string[]>(preSelectedUsers);
  const [searchTerm, setSearchTerm] = useState('');
  const [hoveredUser, setHoveredUser] = useState<string | null>(null);

  // Load users when modal opens
  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen, filterLocation]);

  // Update selected users when preSelectedUsers changes
  useEffect(() => {
    setSelectedUsers(preSelectedUsers);
  }, [preSelectedUsers]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      let userData: UserAddressData[];
      
      if (filterLocation) {
        // Fetch users filtered by location
        userData = await fetchUsersInLocation(filterLocation);
      } else {
        // Fetch all users
        userData = await fetchUsersWithAddresses();
      }

      // Apply user type filter
      if (userTypeFilter !== 'all') {
        userData = userData.filter(user => {
          if (userTypeFilter === 'sellers') return user.is_seller;
          if (userTypeFilter === 'buyers') return user.is_buyer;
          return true;
        });
      }

      // Filter out users who already have admin roles
      userData = userData.filter(user => 
        !user.role || (user.role !== 'admin' && user.role !== 'super_admin')
      );

      setUsers(userData);
    } catch (err) {
      console.error('Error loading users:', err);
      setError('Failed to load users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelect = (userId: string) => {
    if (allowMultiSelect) {
      const newSelection = selectedUsers.includes(userId)
        ? selectedUsers.filter(id => id !== userId)
        : [...selectedUsers, userId];
      setSelectedUsers(newSelection);
    } else {
      const user = users.find(u => u.id === userId);
      if (user) {
        onUserSelect(user);
        onClose();
      }
    }
  };

  const handleUsersSelect = (userIds: string[]) => {
    setSelectedUsers(userIds);
  };

  const handleConfirmSelection = () => {
    if (allowMultiSelect && onUsersSelect) {
      const selectedUserObjects = users.filter(user => selectedUsers.includes(user.id));
      onUsersSelect(selectedUserObjects);
      onClose();
    }
  };

  const handleClose = () => {
    setSelectedUsers([]);
    setSearchTerm('');
    setHoveredUser(null);
    onClose();
  };

  // Filter users based on search term
  const filteredUsers = users.filter(user => {
    if (!searchTerm) return true;
    
    const search = searchTerm.toLowerCase();
    return (
      user.full_name.toLowerCase().includes(search) ||
      user.email.toLowerCase().includes(search) ||
      user.display_address.toLowerCase().includes(search) ||
      (user.seller_profile?.store_name?.toLowerCase().includes(search))
    );
  });

  const getLocationSummary = () => {
    if (!filterLocation) return 'All locations';
    
    const parts = [];
    if (filterLocation.country) parts.push(filterLocation.country);
    if (filterLocation.city) parts.push(filterLocation.city);
    if (filterLocation.district) parts.push(filterLocation.district);
    
    return parts.join(', ') || 'All locations';
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-purple-600" />
                <h2 className="text-lg font-semibold">{title}</h2>
              </div>
              <p className="text-sm text-gray-600 mt-1">{description}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Filters and Controls */}
          <div className="flex flex-col sm:flex-row gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search users by name, email, or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 w-full border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="flex items-center gap-2"
              >
                <List className="h-4 w-4" />
                List
              </Button>
              <Button
                variant={viewMode === 'map' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('map')}
                className="flex items-center gap-2"
              >
                <Map className="h-4 w-4" />
                Map
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={loadUsers}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Status Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
            <div className="flex items-center gap-4 text-gray-600">
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{filteredUsers.length} users available</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                <span>{getLocationSummary()}</span>
              </div>
              {selectedUsers.length > 0 && (
                <Badge className="bg-blue-100 text-blue-800">
                  {selectedUsers.length} selected
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2 text-gray-500">
              <span>Sellers: {filteredUsers.filter(u => u.is_seller).length}</span>
              <span>•</span>
              <span>Buyers: {filteredUsers.filter(u => u.is_buyer).length}</span>
            </div>
          </div>

          {/* Content */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                  <p className="text-sm text-gray-600">Loading users...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
                  <p className="text-sm text-red-600 mb-4">{error}</p>
                  <Button variant="outline" size="sm" onClick={loadUsers}>
                    Try Again
                  </Button>
                </div>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Users className="h-8 w-8 text-gray-400 mx-auto mb-4" />
                  <p className="text-sm text-gray-600">No users found</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Try adjusting your search criteria or location filter
                  </p>
                </div>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                {viewMode === 'list' ? (
                  <UserAddressList
                    users={filteredUsers}
                    selectedUsers={selectedUsers}
                    onUserSelect={handleUserSelect}
                    onUsersSelect={handleUsersSelect}
                    allowMultiSelect={allowMultiSelect}
                    showFilters={false}
                    onUserHover={setHoveredUser}
                  />
                ) : (
                  <UserAddressMap
                    users={filteredUsers}
                    selectedUsers={selectedUsers}
                    onUserSelect={handleUserSelect}
                    onUsersSelect={handleUsersSelect}
                    allowMultiSelect={allowMultiSelect}
                    showFilters={false}
                    height="400px"
                    centerLocation={filterLocation}
                  />
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            
            {allowMultiSelect ? (
              <Button
                onClick={handleConfirmSelection}
                disabled={selectedUsers.length === 0}
                className="flex items-center gap-2"
              >
                <Check className="h-4 w-4" />
                Select {selectedUsers.length} User{selectedUsers.length !== 1 ? 's' : ''}
              </Button>
            ) : (
              <Button
                disabled={true}
                className="flex items-center gap-2 opacity-50"
              >
                <Check className="h-4 w-4" />
                Click a user to select
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
