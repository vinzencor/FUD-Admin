import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader } from '../ui/dialog';
import { Button } from '../ui/button';
import { Crown, MapPin, Loader2, AlertCircle, Check } from 'lucide-react';
import {
  AdminLocation,
  promoteUserToAdmin,
  setAdminAssignedLocation,
  getAllCountries,
  getCitiesForCountry,
  getDistrictsForCity,
  getStreetsForDistrict,
  formatLocationDisplay,
  formatLocationDisplayDetailed
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
  const [cities, setCities] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [streets, setStreets] = useState<string[]>([]);
  const [selectedStreets, setSelectedStreets] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string>('');

  // Initialize location from user's current assignment
  useEffect(() => {
    if (isOpen && user.currentLocation) {
      setLocation(user.currentLocation);
      setSelectedStreets(user.currentLocation.streets || []);
    } else if (isOpen) {
      setLocation({});
      setSelectedStreets([]);
    }
  }, [isOpen, user.currentLocation]);

  // Load countries on modal open
  useEffect(() => {
    if (isOpen) {
      loadCountries();
    }
  }, [isOpen]);

  // Load cities when country changes
  useEffect(() => {
    if (location.country) {
      loadCities(location.country);
    } else {
      setCities([]);
      setDistricts([]);
      setStreets([]);
    }
  }, [location.country]);

  // Load districts when city changes
  useEffect(() => {
    if (location.country && location.city) {
      loadDistricts(location.country, location.city);
    } else {
      setDistricts([]);
      setStreets([]);
    }
  }, [location.country, location.city]);

  // Load streets when district changes
  useEffect(() => {
    if (location.country && location.city && location.district) {
      loadStreets(location.country, location.city, location.district);
    } else {
      setStreets([]);
    }
  }, [location.country, location.city, location.district]);

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

  const loadCities = async (country: string) => {
    try {
      const cityList = await getCitiesForCountry(country);
      setCities(cityList);
    } catch (error) {
      console.error('Error loading cities:', error);
    }
  };

  const loadDistricts = async (country: string, city: string) => {
    try {
      const districtList = await getDistrictsForCity(country, city);
      setDistricts(districtList);
    } catch (error) {
      console.error('Error loading districts:', error);
    }
  };

  const loadStreets = async (country: string, city: string, district: string) => {
    try {
      const streetList = await getStreetsForDistrict(country, city, district);
      setStreets(streetList);
    } catch (error) {
      console.error('Error loading streets:', error);
    }
  };

  const handleCountryChange = (country: string) => {
    setLocation({
      country,
      city: '',
      district: '',
      streets: []
    });
    setSelectedStreets([]);
  };

  const handleCityChange = (city: string) => {
    setLocation(prev => ({
      ...prev,
      city,
      district: '',
      streets: []
    }));
    setSelectedStreets([]);
  };

  const handleDistrictChange = (district: string) => {
    setLocation(prev => ({
      ...prev,
      district,
      streets: []
    }));
    setSelectedStreets([]);
  };

  const handleStreetToggle = (street: string) => {
    const newSelectedStreets = selectedStreets.includes(street)
      ? selectedStreets.filter(s => s !== street)
      : [...selectedStreets, street];

    setSelectedStreets(newSelectedStreets);
    setLocation(prev => ({
      ...prev,
      streets: newSelectedStreets
    }));
  };

  const handleSubmit = async () => {
    if (!location.country) {
      setError('Please select at least a country');
      return;
    }

    if (!location.city) {
      setError('Please select a city');
      return;
    }

    if (!location.district) {
      setError('Please select a district');
      return;
    }

    if (!selectedStreets.length) {
      setError('Please select at least one street');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let success = false;
      const finalLocation = {
        ...location,
        streets: selectedStreets
      };

      if (mode === 'promote') {
        success = await promoteUserToAdmin(user.id, finalLocation);
      } else {
        success = await setAdminAssignedLocation(user.id, finalLocation);
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
    setSelectedStreets([]);
    setError('');
    setCities([]);
    setDistricts([]);
    setStreets([]);
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
                Current: {formatLocationDisplayDetailed(user.currentLocation)}
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
                  City *
                </label>
                <select
                  value={location.city || ''}
                  onChange={(e) => handleCityChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Select City</option>
                  {cities.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>
            )}

            {location.country && location.city && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  District *
                </label>
                <select
                  value={location.district || ''}
                  onChange={(e) => handleDistrictChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Select District</option>
                  {districts.map(district => (
                    <option key={district} value={district}>{district}</option>
                  ))}
                </select>
              </div>
            )}

            {location.country && location.city && location.district && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Streets * (Select one or more)
                </label>
                <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-md p-2 space-y-2">
                  {streets.map(street => (
                    <label key={street} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedStreets.includes(street)}
                        onChange={() => handleStreetToggle(street)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700">{street}</span>
                    </label>
                  ))}
                </div>
                {selectedStreets.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Selected: {selectedStreets.length} street{selectedStreets.length > 1 ? 's' : ''}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Preview */}
          {location.country && selectedStreets.length > 0 && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Admin will manage:</strong>
              </p>
              <div className="mt-2 text-xs text-blue-700">
                <div><strong>Streets:</strong> {selectedStreets.join(', ')}</div>
                <div><strong>District:</strong> {location.district}</div>
                <div><strong>City:</strong> {location.city}</div>
                <div><strong>Country:</strong> {location.country}</div>
              </div>
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
              disabled={!location.country || !location.city || !location.district || selectedStreets.length === 0 || loading}
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
