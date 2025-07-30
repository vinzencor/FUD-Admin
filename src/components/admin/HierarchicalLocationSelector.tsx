import React, { useState, useEffect } from 'react';
import { ChevronDown, MapPin, Globe, Building, Hash, Loader2, AlertCircle } from 'lucide-react';
import {
  fetchCountriesFromUsers,
  fetchStatesForCountry,
  fetchCitiesForCountryAndState,
  fetchZipcodesForLocation,
  LocationOption,
  getUserCountForLocation,
  getZipcodeAvailabilityStats
} from '../../services/hierarchicalLocationService';
import { AdminLocation } from '../../services/locationAdminService';

interface HierarchicalLocationSelectorProps {
  value?: AdminLocation;
  onChange: (location: AdminLocation) => void;
  disabled?: boolean;
  showUserCounts?: boolean;
  excludeCurrentAdmin?: string;
  placeholder?: {
    country?: string;
    state?: string;
    city?: string;
    zipcode?: string;
  };
}

export function HierarchicalLocationSelector({
  value,
  onChange,
  disabled = false,
  showUserCounts = true,
  excludeCurrentAdmin,
  placeholder = {}
}: HierarchicalLocationSelectorProps) {
  const [countries, setCountries] = useState<LocationOption[]>([]);
  const [states, setStates] = useState<LocationOption[]>([]);
  const [cities, setCities] = useState<LocationOption[]>([]);
  const [zipcodes, setZipcodes] = useState<LocationOption[]>([]);

  const [selectedCountry, setSelectedCountry] = useState<string>(value?.country || '');
  const [selectedState, setSelectedState] = useState<string>(value?.state || '');
  const [selectedCity, setSelectedCity] = useState<string>(value?.city || '');
  const [selectedZipcode, setSelectedZipcode] = useState<string>(value?.zipcode || '');

  const [loading, setLoading] = useState({
    countries: false,
    states: false,
    cities: false,
    zipcodes: false
  });
  
  const [error, setError] = useState<string | null>(null);
  const [userCount, setUserCount] = useState<number>(0);
  const [zipcodeStats, setZipcodeStats] = useState<{ total: number; available: number; assigned: number }>({ total: 0, available: 0, assigned: 0 });

  // Load countries on component mount
  useEffect(() => {
    loadCountries();
  }, []);

  // Load states when country changes
  useEffect(() => {
    if (selectedCountry) {
      loadStates(selectedCountry);
    } else {
      setStates([]);
      setSelectedState('');
      setSelectedCity('');
      setSelectedZipcode('');
    }
  }, [selectedCountry]);

  // Load cities when country and state change
  useEffect(() => {
    if (selectedCountry && selectedState) {
      loadCities(selectedCountry, selectedState);
    } else {
      setCities([]);
      setSelectedCity('');
      setSelectedZipcode('');
    }
  }, [selectedCountry, selectedState]);

  // Load zipcodes when city changes
  useEffect(() => {
    if (selectedCountry && selectedState && selectedCity) {
      loadZipcodes(selectedCountry, selectedCity);
    } else {
      setZipcodes([]);
      setSelectedZipcode('');
    }
  }, [selectedCountry, selectedState, selectedCity]);

  // Update user count when location changes
  useEffect(() => {
    if (showUserCounts) {
      updateUserCount();
    }
  }, [selectedCountry, selectedState, selectedCity, selectedZipcode, showUserCounts]);

  // Emit changes to parent
  useEffect(() => {
    const location: AdminLocation = {};
    if (selectedCountry) location.country = selectedCountry;
    if (selectedState) location.state = selectedState;
    if (selectedCity) location.city = selectedCity;
    if (selectedZipcode) location.zipcode = selectedZipcode;

    // Determine assignment level based on what's selected
    if (selectedZipcode) {
      location.assignmentLevel = 'zipcode';
    } else if (selectedCity) {
      location.assignmentLevel = 'city';
    } else if (selectedState) {
      location.assignmentLevel = 'state';
    } else if (selectedCountry) {
      location.assignmentLevel = 'country';
    }

    onChange(location);
  }, [selectedCountry, selectedState, selectedCity, selectedZipcode, onChange]);

  const loadCountries = async () => {
    try {
      setLoading(prev => ({ ...prev, countries: true }));
      setError(null);
      const countryData = await fetchCountriesFromUsers();
      setCountries(countryData);
    } catch (err) {
      console.error('Error loading countries:', err);
      setError('Failed to load countries');
    } finally {
      setLoading(prev => ({ ...prev, countries: false }));
    }
  };

  const loadStates = async (country: string) => {
    try {
      setLoading(prev => ({ ...prev, states: true }));
      const stateData = await fetchStatesForCountry(country);
      setStates(stateData);
    } catch (err) {
      console.error('Error loading states:', err);
      setError('Failed to load states');
    } finally {
      setLoading(prev => ({ ...prev, states: false }));
    }
  };

  const loadCities = async (country: string, state: string) => {
    try {
      setLoading(prev => ({ ...prev, cities: true }));
      const cityData = await fetchCitiesForCountryAndState(country, state);
      setCities(cityData);
    } catch (err) {
      console.error('Error loading cities:', err);
      setError('Failed to load cities');
    } finally {
      setLoading(prev => ({ ...prev, cities: false }));
    }
  };

  const loadZipcodes = async (country: string, city: string) => {
    try {
      setLoading(prev => ({ ...prev, zipcodes: true }));

      // Load both zipcode data and availability stats
      const [zipcodeData, stats] = await Promise.all([
        fetchZipcodesForLocation(country, city, excludeCurrentAdmin),
        getZipcodeAvailabilityStats(country, city, excludeCurrentAdmin)
      ]);

      setZipcodes(zipcodeData);
      setZipcodeStats(stats);
    } catch (err) {
      console.error('Error loading zipcodes:', err);
      setError('Failed to load zipcodes');
    } finally {
      setLoading(prev => ({ ...prev, zipcodes: false }));
    }
  };

  const updateUserCount = async () => {
    try {
      const count = await getUserCountForLocation(
        selectedCountry || undefined,
        selectedCity || undefined,
        selectedState || undefined,
        selectedZipcode || undefined
      );
      setUserCount(count);
    } catch (err) {
      console.error('Error getting user count:', err);
    }
  };

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const country = e.target.value;
    setSelectedCountry(country);
    setSelectedState('');
    setSelectedCity('');
    setSelectedZipcode('');
  };

  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const state = e.target.value;
    setSelectedState(state);
    setSelectedCity('');
    setSelectedZipcode('');
  };

  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const city = e.target.value;
    setSelectedCity(city);
    setSelectedZipcode('');
  };

  const handleZipcodeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedZipcode(e.target.value);
  };

  // Admin can be assigned at different levels: country, state, city, or zipcode
  const isComplete = selectedCountry && (
    // Country-level assignment
    (!selectedState && !selectedCity && !selectedZipcode) ||
    // State-level assignment
    (selectedState && !selectedCity && !selectedZipcode) ||
    // City-level assignment
    (selectedState && selectedCity && !selectedZipcode) ||
    // Zipcode-level assignment
    (selectedState && selectedCity && selectedZipcode)
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <MapPin className="h-4 w-4" />
        <span>Select Location Hierarchy</span>
        {showUserCounts && userCount > 0 && (
          <span className="text-blue-600 bg-blue-50 px-2 py-1 rounded text-xs">
            {userCount} users in selected area
          </span>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Country Selection */}
      <div className="space-y-2">
        <label className="flex text-sm font-medium text-gray-700 items-center gap-2">
          <Globe className="h-4 w-4" />
          Country
        </label>
        <div className="relative">
          <select
            value={selectedCountry}
            onChange={handleCountryChange}
            disabled={disabled || loading.countries}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed appearance-none pr-10"
          >
            <option value="">{placeholder.country || 'Select Country...'}</option>
            {countries.map(country => (
              <option key={country.value} value={country.value}>
                {country.label}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            {loading.countries ? (
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            )}
          </div>
        </div>
      </div>

      {/* State Selection */}
      <div className="space-y-2">
        <label className="flex text-sm font-medium text-gray-700 items-center gap-2">
          <Building className="h-4 w-4" />
          State/Province
        </label>
        <div className="relative">
          <select
            value={selectedState}
            onChange={handleStateChange}
            disabled={disabled || loading.states || !selectedCountry}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed appearance-none pr-10"
          >
            <option value="">{placeholder.state || 'Select State/Province...'}</option>
            {states.map(state => (
              <option key={state.value} value={state.value}>
                {state.label}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            {loading.states ? (
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            )}
          </div>
        </div>
        {selectedCountry && states.length === 0 && !loading.states && (
          <p className="text-xs text-gray-500">No states found for selected country</p>
        )}
      </div>

      {/* City Selection */}
      <div className="space-y-2">
        <label className="flex text-sm font-medium text-gray-700 items-center gap-2">
          <Building className="h-4 w-4" />
          City
        </label>
        <div className="relative">
          <select
            value={selectedCity}
            onChange={handleCityChange}
            disabled={disabled || loading.cities || !selectedState}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed appearance-none pr-10"
          >
            <option value="">{placeholder.city || 'Select City...'}</option>
            {cities.map(city => (
              <option key={city.value} value={city.value}>
                {city.label}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            {loading.cities ? (
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            )}
          </div>
        </div>
        {selectedState && cities.length === 0 && !loading.cities && (
          <p className="text-xs text-gray-500">No cities found for selected state</p>
        )}
      </div>

      {/* Zipcode Selection */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="flex text-sm font-medium text-gray-700 items-center gap-2">
            <Hash className="h-4 w-4" />
            Zipcode/Pincode
          </label>
          {selectedCity && zipcodeStats.total > 0 && (
            <div className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
              {zipcodeStats.available} of {zipcodeStats.total} available
              {zipcodeStats.assigned > 0 && (
                <span className="text-orange-600 ml-1">
                  ({zipcodeStats.assigned} assigned)
                </span>
              )}
            </div>
          )}
        </div>
        <div className="relative">
          <select
            value={selectedZipcode}
            onChange={handleZipcodeChange}
            disabled={disabled || loading.zipcodes || !selectedCity}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed appearance-none pr-10"
          >
            <option value="">{placeholder.zipcode || 'Select Zipcode/Pincode...'}</option>
            {zipcodes.map(zipcode => (
              <option key={zipcode.value} value={zipcode.value}>
                {zipcode.label}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            {loading.zipcodes ? (
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            )}
          </div>
        </div>
        {selectedCity && zipcodes.length === 0 && !loading.zipcodes && (
          <div className="text-xs text-orange-600 bg-orange-50 p-3 rounded border border-orange-200">
            <div className="font-medium mb-1">No available zipcodes in {selectedCity}</div>
            {zipcodeStats.total > 0 ? (
              <div>
                All {zipcodeStats.total} zipcodes in this city are already assigned to other admins.
                Please choose a different city or contact your super admin.
              </div>
            ) : (
              <div>
                No zipcodes found for this city. This may be because users in this city
                don't have zipcode information in their profiles.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selection Summary */}
      {(selectedCountry || selectedState || selectedCity || selectedZipcode) && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Selected Location:</h4>
          <div className="space-y-1 text-sm text-gray-600">
            {selectedCountry && (
              <div className="flex items-center gap-2">
                <Globe className="h-3 w-3" />
                <span>Country: {selectedCountry}</span>
              </div>
            )}
            {selectedState && (
              <div className="flex items-center gap-2">
                <Building className="h-3 w-3" />
                <span>State: {selectedState}</span>
              </div>
            )}
            {selectedCity && (
              <div className="flex items-center gap-2">
                <Building className="h-3 w-3" />
                <span>City: {selectedCity}</span>
              </div>
            )}
            {selectedZipcode && (
              <div className="flex items-center gap-2">
                <Hash className="h-3 w-3" />
                <span>Zipcode: {selectedZipcode}</span>
              </div>
            )}
          </div>

          {/* Assignment Level Display */}
          <div className="mt-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
            {selectedZipcode ? 'Zipcode-level assignment' :
             selectedCity ? 'City-level assignment' :
             selectedState ? 'State-level assignment' :
             selectedCountry ? 'Country-level assignment' : 'No assignment'}
          </div>

          {/* Completion Status */}
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className={`text-xs font-medium ${
              isComplete
                ? 'text-green-600'
                : 'text-orange-600'
            }`}>
              {isComplete
                ? '✓ Location selection complete'
                : '⚠ Please select at least a country for admin assignment'
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
