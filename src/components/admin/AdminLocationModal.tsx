import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader } from '../ui/dialog';
import { Button } from '../ui/button';
import { Crown, MapPin, Loader2, AlertCircle, Check } from 'lucide-react';
import {
  AdminLocation,
  promoteUserToAdmin,
  setAdminAssignedLocation,
  formatLocationDisplay,
  formatLocationDisplayDetailed
} from '../../services/locationAdminService';
import { HierarchicalLocationSelector } from './HierarchicalLocationSelector';
import { validateAdminLocationAssignment } from '../../services/hierarchicalLocationService';

interface AdminLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user: {
    id: string;
    name: string;
    email: string;
    role?: string;
    currentLocation?: AdminLocation;
  };
  mode: 'promote' | 'edit';
}

export function AdminLocationModal({
  isOpen,
  onClose,
  onSuccess,
  user,
  mode
}: AdminLocationModalProps) {
  const [location, setLocation] = useState<AdminLocation>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [validationError, setValidationError] = useState<string>('');

  // Initialize location from user's current assignment
  useEffect(() => {
    if (isOpen) {
      if (user.currentLocation) {
        setLocation(user.currentLocation);
      } else {
        setLocation({});
      }
      setError('');
      setValidationError('');
      setLoading(false);
    }
  }, [isOpen, user.currentLocation]);

  const handleLocationChange = (newLocation: AdminLocation) => {
    setLocation(newLocation);
    setValidationError('');
  };

  const validateLocation = async (location: AdminLocation): Promise<boolean> => {
    // At minimum, country is required
    if (!location.country) {
      setValidationError('Please select at least a country for admin assignment');
      return false;
    }

    // Validate based on assignment level
    if (location.assignmentLevel === 'zipcode' && (!location.state || !location.city || !location.zipcode)) {
      setValidationError('Zipcode-level assignment requires country, state, city, and zipcode');
      return false;
    }

    if (location.assignmentLevel === 'city' && (!location.state || !location.city)) {
      setValidationError('City-level assignment requires country, state, and city');
      return false;
    }

    if (location.assignmentLevel === 'state' && !location.state) {
      setValidationError('State-level assignment requires country and state');
      return false;
    }

    try {
      const validation = await validateAdminLocationAssignment(
        location.country,
        location.city,
        location.zipcode,
        location.state,
        mode === 'edit' ? user.id : undefined // Exclude current admin when editing
      );

      if (!validation.isValid) {
        if (validation.assignedTo) {
          setValidationError(
            `${validation.error} Currently assigned to: ${validation.assignedTo.name} (${validation.assignedTo.email})`
          );
        } else {
          setValidationError(validation.error || 'Location validation failed');
        }
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error validating location:', error);
      setValidationError('Error validating location. Please try again.');
      return false;
    }
  };

  const handleSubmit = async () => {
    setError('');
    setValidationError('');

    // Validate location has users
    const isValid = await validateLocation(location);
    if (!isValid) {
      return;
    }

    setLoading(true);

    try {
      let success = false;

      if (mode === 'promote') {
        success = await promoteUserToAdmin(user.id, location);
      } else {
        success = await setAdminAssignedLocation(user.id, location);
      }

      if (success) {
        console.log('Admin promotion/update successful, closing modal');

        // Call success callback first
        onSuccess();

        // Reset form state
        resetForm();

        // Close modal after a brief delay to ensure state is updated
        setTimeout(() => {
          onClose();
        }, 100);
      } else {
        console.error('Admin promotion/update failed');
        setError(`Failed to ${mode === 'promote' ? 'promote user' : 'update location'}`);
      }
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setLocation({});
    setError('');
    setValidationError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            {mode === 'promote' ? (
              <Crown className="h-5 w-5 text-purple-600" />
            ) : (
              <MapPin className="h-5 w-5 text-blue-600" />
            )}
            <h2 className="text-lg font-semibold">
              {mode === 'promote' ? 'Promote to Regional Admin' : 'Edit Regional Admin Location'}
            </h2>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* User Info */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <h3 className="font-medium text-gray-900">{user.name}</h3>
            <p className="text-sm text-gray-600">{user.email}</p>
            {mode === 'edit' && user.currentLocation && (
              <p className="text-xs text-gray-500 mt-1">
                Current: {formatLocationDisplayDetailed(user.currentLocation)}
              </p>
            )}
          </div>

          {/* Hierarchical Location Selection */}
          <HierarchicalLocationSelector
            value={location}
            onChange={handleLocationChange}
            disabled={loading}
            showUserCounts={true}
            excludeCurrentAdmin={mode === 'edit' ? user.id : undefined}
            placeholder={{
              country: 'Select Country...',
              state: 'Select State/Province...',
              city: 'Select City...',
              zipcode: 'Select Zipcode/Pincode...'
            }}
          />

          {/* Preview */}
          {location.country && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Admin will manage users in:</strong>
              </p>
              <div className="mt-2 text-xs text-blue-700">
                {location.assignmentLevel && (
                  <div className="mb-2 font-medium text-blue-800">
                    Assignment Level: {location.assignmentLevel.charAt(0).toUpperCase() + location.assignmentLevel.slice(1)}
                  </div>
                )}
                <div><strong>Country:</strong> {location.country}</div>
                {location.state && <div><strong>State:</strong> {location.state}</div>}
                {location.city && <div><strong>City:</strong> {location.city}</div>}
                {location.zipcode && <div><strong>Zipcode:</strong> {location.zipcode}</div>}
              </div>
            </div>
          )}

          {/* Error Messages */}
          {error && (
            <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-md">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {validationError && (
            <div className="flex items-center space-x-2 text-orange-600 bg-orange-50 p-3 rounded-md">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{validationError}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!location.country || loading}
              className="flex items-center"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {mode === 'promote' ? 'Promoting...' : 'Updating...'}
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  {mode === 'promote' ? 'Promote to Regional Admin' : 'Update Location'}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
