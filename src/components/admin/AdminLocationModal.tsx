import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader } from '../ui/dialog';
import { Button } from '../ui/button';
import { Crown, MapPin, Loader2, AlertCircle, Check } from 'lucide-react';
import { 
  AdminLocation, 
  promoteUserToAdmin, 
  setAdminAssignedLocation,
  getAllCountries,
  getStatesForCountry,
  getCitiesForState,
  formatLocationDisplay
} from '../../services/locationAdminService';

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
  const [countries, setCountries] = useState<string[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string>('');

  // Initialize location from user's current assignment
  useEffect(() => {
    if (isOpen && user.currentLocation) {
      setLocation(user.currentLocation);
    } else if (isOpen) {
      setLocation({});
    }
  }, [isOpen, user.currentLocation]);

  // Load countries on modal open
  useEffect(() => {
    if (isOpen) {
      loadCountries();
    }
  }, [isOpen]);

  // Load states when country changes
  useEffect(() => {
    if (location.country) {
      loadStates(location.country);
    } else {
      setStates([]);
      setCities([]);
    }
  }, [location.country]);

  // Load cities when state changes
  useEffect(() => {
    if (location.country && location.state) {
      loadCities(location.country, location.state);
    } else {
      setCities([]);
    }
  }, [location.country, location.state]);

  const loadCountries = async () => {
    setLoadingData(true);
    try {
      const countryList = await getAllCountries();
      setCountries(countryList);
    } catch (error) {
      console.error('Error loading countries:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const loadStates = async (country: string) => {
    try {
      const stateList = await getStatesForCountry(country);
      setStates(stateList);
    } catch (error) {
      console.error('Error loading states:', error);
    }
  };

  const loadCities = async (country: string, state: string) => {
    try {
      const cityList = await getCitiesForState(country, state);
      setCities(cityList);
    } catch (error) {
      console.error('Error loading cities:', error);
    }
  };

  const handleCountryChange = (country: string) => {
    setLocation({
      country,
      state: '',
      city: ''
    });
  };

  const handleStateChange = (state: string) => {
    setLocation(prev => ({
      ...prev,
      state,
      city: ''
    }));
  };

  const handleCityChange = (city: string) => {
    setLocation(prev => ({
      ...prev,
      city
    }));
  };

  const handleSubmit = async () => {
    if (!location.country) {
      setError('Please select at least a country');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let success = false;

      if (mode === 'promote') {
        success = await promoteUserToAdmin(user.id, location);
      } else {
        success = await setAdminAssignedLocation(user.id, location);
      }

      if (success) {
        onSuccess();
        onClose();
      } else {
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
    setStates([]);
    setCities([]);
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
              {mode === 'promote' ? 'Promote to Admin' : 'Edit Admin Location'}
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
                Current: {formatLocationDisplay(user.currentLocation)}
              </p>
            )}
          </div>

          {/* Location Selection */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Country *
              </label>
              <select
                value={location.country || ''}
                onChange={(e) => handleCountryChange(e.target.value)}
                disabled={loadingData}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Select Country</option>
                {countries.map(country => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
            </div>

            {location.country && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State/Province
                </label>
                <select
                  value={location.state || ''}
                  onChange={(e) => handleStateChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Select State/Province (Optional)</option>
                  {states.map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>
            )}

            {location.country && location.state && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City
                </label>
                <select
                  value={location.city || ''}
                  onChange={(e) => handleCityChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Select City (Optional)</option>
                  {cities.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Preview */}
          {location.country && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Admin will manage:</strong> {formatLocationDisplay(location)}
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-md">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
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
                  {mode === 'promote' ? 'Promote to Admin' : 'Update Location'}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
