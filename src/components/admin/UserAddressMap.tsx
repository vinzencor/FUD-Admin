import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { UserAddressData } from '../../services/dataService';
import { geocodeLocation, getDefaultCityCoordinates, Coordinates } from '../../services/geocodingService';
import { MapPin, User, Store, Phone, Mail, MapPinIcon } from 'lucide-react';
import { Badge } from '../ui/badge';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons for different user types
const createCustomIcon = (color: string, isSeller: boolean) => {
  const iconHtml = `
    <div style="
      background-color: ${color};
      width: 30px;
      height: 30px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 14px;
    ">
      ${isSeller ? '🏪' : '👤'}
    </div>
  `;
  
  return L.divIcon({
    html: iconHtml,
    className: 'custom-marker',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15]
  });
};

interface UserAddressMapProps {
  users: UserAddressData[];
  selectedUsers?: string[];
  onUserSelect?: (userId: string) => void;
  onUsersSelect?: (userIds: string[]) => void;
  height?: string;
  showFilters?: boolean;
  allowMultiSelect?: boolean;
  centerLocation?: {
    city?: string;
    state?: string;
    country?: string;
  };
}

interface MapControllerProps {
  center: [number, number];
  zoom: number;
}

function MapController({ center, zoom }: MapControllerProps) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
  
  return null;
}

export function UserAddressMap({
  users,
  selectedUsers = [],
  onUserSelect,
  onUsersSelect,
  height = '400px',
  showFilters = true,
  allowMultiSelect = false,
  centerLocation
}: UserAddressMapProps) {
  const [mapCenter, setMapCenter] = useState<[number, number]>([20.5937, 78.9629]); // Default to India center
  const [mapZoom, setMapZoom] = useState(5);
  const [userFilter, setUserFilter] = useState<'all' | 'sellers' | 'buyers'>('all');
  const [locationFilter, setLocationFilter] = useState('');
  const [usersWithCoordinates, setUsersWithCoordinates] = useState<(UserAddressData & { coordinates: Coordinates })[]>([]);
  const [loading, setLoading] = useState(true);

  // Process users and get coordinates
  useEffect(() => {
    const processUsers = async () => {
      setLoading(true);
      const processedUsers: (UserAddressData & { coordinates: Coordinates })[] = [];

      for (const user of users) {
        let coordinates: Coordinates | null = null;

        // Try to use existing coordinates
        if (user.coordinates) {
          coordinates = user.coordinates;
        } else if (user.seller_profile?.coordinates) {
          coordinates = user.seller_profile.coordinates;
        } else {
          // Try to geocode from city/state/country
          if (user.city || user.state || user.country) {
            coordinates = await geocodeLocation(user.city, user.state, user.country);
          }
          
          // Fallback to default city coordinates
          if (!coordinates && user.city) {
            coordinates = getDefaultCityCoordinates(user.city);
          }
        }

        if (coordinates) {
          processedUsers.push({
            ...user,
            coordinates
          });
        }
      }

      setUsersWithCoordinates(processedUsers);
      
      // Set map center based on center location or first user
      if (centerLocation) {
        const centerCoords = await geocodeLocation(
          centerLocation.city,
          centerLocation.state,
          centerLocation.country
        );
        if (centerCoords) {
          setMapCenter([centerCoords.latitude, centerCoords.longitude]);
          setMapZoom(10);
        }
      } else if (processedUsers.length > 0) {
        // Center on the first user's location
        const firstUser = processedUsers[0];
        setMapCenter([firstUser.coordinates.latitude, firstUser.coordinates.longitude]);
        setMapZoom(8);
      }
      
      setLoading(false);
    };

    processUsers();
  }, [users, centerLocation]);

  // Filter users based on current filters
  const filteredUsers = usersWithCoordinates.filter(user => {
    // User type filter
    if (userFilter === 'sellers' && !user.is_seller) return false;
    if (userFilter === 'buyers' && !user.is_buyer) return false;

    // Location filter
    if (locationFilter) {
      const searchTerm = locationFilter.toLowerCase();
      return (
        user.display_address.toLowerCase().includes(searchTerm) ||
        user.city?.toLowerCase().includes(searchTerm) ||
        user.state?.toLowerCase().includes(searchTerm) ||
        user.country?.toLowerCase().includes(searchTerm)
      );
    }

    return true;
  });

  const handleMarkerClick = (userId: string) => {
    if (allowMultiSelect) {
      const newSelection = selectedUsers.includes(userId)
        ? selectedUsers.filter(id => id !== userId)
        : [...selectedUsers, userId];
      onUsersSelect?.(newSelection);
    } else {
      onUserSelect?.(userId);
    }
  };

  const getUserTypeColor = (user: UserAddressData) => {
    if (user.is_seller && user.is_buyer) return '#8B5CF6'; // Purple for both
    if (user.is_seller) return '#10B981'; // Green for sellers
    return '#3B82F6'; // Blue for buyers
  };

  const getUserTypeBadge = (user: UserAddressData) => {
    if (user.is_seller && user.is_buyer) return 'Both';
    if (user.is_seller) return 'Seller';
    return 'Buyer';
  };

  const getUserTypeBadgeColor = (user: UserAddressData) => {
    if (user.is_seller && user.is_buyer) return 'bg-purple-100 text-purple-800';
    if (user.is_seller) return 'bg-green-100 text-green-800';
    return 'bg-blue-100 text-blue-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-sm text-gray-600 mt-2">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      {showFilters && (
        <div className="flex flex-col sm:flex-row gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              User Type
            </label>
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value as typeof userFilter)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Users</option>
              <option value="sellers">Sellers Only</option>
              <option value="buyers">Buyers Only</option>
            </select>
          </div>
          
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location Filter
            </label>
            <input
              type="text"
              placeholder="Search by city, state, or country..."
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      {/* Map Stats */}
      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
        <span>Total Users: {filteredUsers.length}</span>
        <span>Sellers: {filteredUsers.filter(u => u.is_seller).length}</span>
        <span>Buyers: {filteredUsers.filter(u => u.is_buyer).length}</span>
        {selectedUsers.length > 0 && (
          <span className="text-blue-600 font-medium">Selected: {selectedUsers.length}</span>
        )}
      </div>

      {/* Map Container */}
      <div className="border border-gray-300 rounded-lg overflow-hidden" style={{ height }}>
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <MapController center={mapCenter} zoom={mapZoom} />
          
          {filteredUsers.map((user) => (
            <Marker
              key={user.id}
              position={[user.coordinates.latitude, user.coordinates.longitude]}
              icon={createCustomIcon(
                getUserTypeColor(user),
                user.is_seller
              )}
              eventHandlers={{
                click: () => handleMarkerClick(user.id)
              }}
            >
              <Popup>
                <div className="p-2 min-w-[250px]">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">{user.full_name}</h3>
                    <Badge className={`text-xs ${getUserTypeBadgeColor(user)}`}>
                      {getUserTypeBadge(user)}
                    </Badge>
                  </div>
                  
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Mail className="h-3 w-3" />
                      <span>{user.email}</span>
                    </div>
                    
                    {user.mobile_phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3 w-3" />
                        <span>{user.mobile_phone}</span>
                      </div>
                    )}
                    
                    <div className="flex items-start gap-2">
                      <MapPinIcon className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      <span className="text-xs">{user.display_address}</span>
                    </div>
                    
                    {user.seller_profile && (
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200">
                        <Store className="h-3 w-3" />
                        <span className="font-medium">{user.seller_profile.store_name}</span>
                      </div>
                    )}
                  </div>
                  
                  {selectedUsers.includes(user.id) && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <span className="text-xs text-blue-600 font-medium">✓ Selected</span>
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
