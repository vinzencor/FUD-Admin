import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  Crown, 
  Users, 
  MapPin, 
  Plus, 
  Search,
  Map,
  List,
  UserPlus,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { UserSelectionModal } from './UserSelectionModal';
import { AdminLocationModal } from './AdminLocationModal';
import { UserAddressData } from '../../services/dataService';
import { AdminLocation, promoteUserToAdmin } from '../../services/locationAdminService';
import { useLocationAccess } from '../../hooks/useLocationAccess';

interface EnhancedAdminAssignmentProps {
  onAdminAssigned?: () => void;
  onError?: (error: string) => void;
  onSuccess?: (message: string) => void;
}

export function EnhancedAdminAssignment({
  onAdminAssigned,
  onError,
  onSuccess
}: EnhancedAdminAssignmentProps) {
  const { isSuperAdmin, getLocationSummary } = useLocationAccess();
  const [showUserSelection, setShowUserSelection] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserAddressData | null>(null);
  const [assigningAdmin, setAssigningAdmin] = useState(false);
  const [previewLocation, setPreviewLocation] = useState<AdminLocation | null>(null);

  // Only super admins can assign admin roles
  if (!isSuperAdmin) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-yellow-800">
          <AlertCircle className="h-5 w-5" />
          <span className="font-medium">Access Restricted</span>
        </div>
        <p className="text-sm text-yellow-700 mt-1">
          Only super administrators can assign admin roles to users.
        </p>
      </div>
    );
  }

  const handleUserSelect = (user: UserAddressData) => {
    setSelectedUser(user);
    setShowUserSelection(false);
    setShowLocationModal(true);
  };

  const handleLocationAssigned = async (location: AdminLocation) => {
    if (!selectedUser) return;

    try {
      setAssigningAdmin(true);
      
      const success = await promoteUserToAdmin(selectedUser.id, location);
      
      if (success) {
        onSuccess?.(`Successfully assigned admin role to ${selectedUser.full_name}`);
        onAdminAssigned?.();
        
        // Reset state
        setSelectedUser(null);
        setPreviewLocation(null);
        setShowLocationModal(false);
      } else {
        onError?.('Failed to assign admin role. Please try again.');
      }
    } catch (error) {
      console.error('Error assigning admin role:', error);
      onError?.('An error occurred while assigning admin role.');
    } finally {
      setAssigningAdmin(false);
    }
  };

  const handleLocationModalClose = () => {
    setShowLocationModal(false);
    setSelectedUser(null);
    setPreviewLocation(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 border border-purple-200">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Crown className="h-6 w-6 text-purple-600" />
              <h2 className="text-xl font-semibold text-gray-900">
                Admin Assignment Center
              </h2>
            </div>
            <p className="text-gray-600">
              Assign admin roles to users with location-based access control
            </p>
          </div>
          
          <div className="text-right">
            <div className="text-sm text-gray-500 mb-1">Your Access Level</div>
            <Badge className="bg-purple-100 text-purple-800">
              Super Administrator
            </Badge>
            <div className="text-xs text-gray-500 mt-1">
              {getLocationSummary()}
            </div>
          </div>
        </div>
      </div>

      {/* Assignment Process */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-blue-600" />
          Assign New Admin
        </h3>

        <div className="space-y-4">
          {/* Step 1: User Selection */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                selectedUser ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
              }`}>
                1
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Select User</h4>
                <p className="text-sm text-gray-600">
                  {selectedUser 
                    ? `Selected: ${selectedUser.full_name} (${selectedUser.email})`
                    : 'Choose a user from the interactive map or list view'
                  }
                </p>
              </div>
            </div>
            
            <Button
              onClick={() => setShowUserSelection(true)}
              variant={selectedUser ? "outline" : "default"}
              className="flex items-center gap-2"
            >
              {selectedUser ? (
                <>
                  <Search className="h-4 w-4" />
                  Change User
                </>
              ) : (
                <>
                  <Users className="h-4 w-4" />
                  Select User
                </>
              )}
            </Button>
          </div>

          {/* Step 2: Location Assignment */}
          <div className={`flex items-center justify-between p-4 rounded-lg transition-colors ${
            selectedUser ? 'bg-gray-50' : 'bg-gray-100'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                previewLocation ? 'bg-green-100 text-green-800' : 
                selectedUser ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-500'
              }`}>
                2
              </div>
              <div>
                <h4 className={`font-medium ${selectedUser ? 'text-gray-900' : 'text-gray-500'}`}>
                  Assign Location
                </h4>
                <p className={`text-sm ${selectedUser ? 'text-gray-600' : 'text-gray-400'}`}>
                  {previewLocation 
                    ? `Location assigned: ${previewLocation.city}, ${previewLocation.country}`
                    : selectedUser 
                      ? 'Define the geographic area this admin will manage'
                      : 'Select a user first to assign location'
                  }
                </p>
              </div>
            </div>
            
            <Button
              onClick={() => selectedUser && setShowLocationModal(true)}
              disabled={!selectedUser || assigningAdmin}
              variant="outline"
              className="flex items-center gap-2"
            >
              <MapPin className="h-4 w-4" />
              {previewLocation ? 'Change Location' : 'Assign Location'}
            </Button>
          </div>

          {/* Assignment Summary */}
          {selectedUser && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Assignment Summary
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-700">User:</span>
                  <span className="text-blue-900 font-medium">{selectedUser.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Email:</span>
                  <span className="text-blue-900">{selectedUser.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Current Role:</span>
                  <Badge className="bg-gray-100 text-gray-800 text-xs">
                    {selectedUser.role || 'User'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">User Type:</span>
                  <Badge className={`text-xs ${
                    selectedUser.is_seller && selectedUser.is_buyer 
                      ? 'bg-purple-100 text-purple-800'
                      : selectedUser.is_seller 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-blue-100 text-blue-800'
                  }`}>
                    {selectedUser.is_seller && selectedUser.is_buyer 
                      ? 'Both Seller & Buyer'
                      : selectedUser.is_seller 
                        ? 'Seller'
                        : 'Buyer'
                    }
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Location:</span>
                  <span className="text-blue-900 text-xs">{selectedUser.display_address}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Features Overview */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Enhanced Assignment Features
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
            <Map className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-green-900">Interactive Map View</h4>
              <p className="text-sm text-green-700">
                Visualize user locations on an interactive map with filtering capabilities
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
            <List className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">Detailed User List</h4>
              <p className="text-sm text-blue-700">
                Browse users with comprehensive address and profile information
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
            <MapPin className="h-5 w-5 text-purple-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-purple-900">Location-Based Access</h4>
              <p className="text-sm text-purple-700">
                Assign specific geographic regions for targeted admin management
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
            <Users className="h-5 w-5 text-orange-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-orange-900">Real User Data</h4>
              <p className="text-sm text-orange-700">
                Select from actual registered users with verified addresses
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* User Selection Modal */}
      <UserSelectionModal
        isOpen={showUserSelection}
        onClose={() => setShowUserSelection(false)}
        onUserSelect={handleUserSelect}
        title="Select User for Admin Assignment"
        description="Choose a user to promote to admin role with location-based access control"
        userTypeFilter="all"
      />

      {/* Location Assignment Modal */}
      {selectedUser && (
        <AdminLocationModal
          isOpen={showLocationModal}
          onClose={handleLocationModalClose}
          onSuccess={() => {
            // Location assignment is handled in the modal
            setShowLocationModal(false);
            onAdminAssigned?.();
          }}
          user={{
            id: selectedUser.id,
            name: selectedUser.full_name,
            email: selectedUser.email
          }}
          mode="promote"
        />
      )}
    </div>
  );
}
