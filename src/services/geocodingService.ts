/**
 * Geocoding service for converting addresses to coordinates
 * This service provides address-to-coordinate conversion for map display
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface GeocodeResult {
  coordinates: Coordinates;
  formatted_address: string;
  address_components: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postal_code?: string;
  };
}

/**
 * Geocode an address using a free geocoding service
 * Using Nominatim (OpenStreetMap) as it's free and doesn't require API keys
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  try {
    if (!address || address.trim() === '') {
      return null;
    }

    // Clean and encode the address
    const cleanAddress = address.trim();
    const encodedAddress = encodeURIComponent(cleanAddress);
    
    // Use Nominatim (OpenStreetMap) geocoding service
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'AdminPanel/1.0' // Required by Nominatim
        }
      }
    );

    if (!response.ok) {
      console.warn('Geocoding request failed:', response.status);
      return null;
    }

    const data = await response.json();
    
    if (!data || data.length === 0) {
      console.warn('No geocoding results found for address:', address);
      return null;
    }

    const result = data[0];
    
    return {
      coordinates: {
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon)
      },
      formatted_address: result.display_name,
      address_components: {
        street: result.address?.road || result.address?.house_number,
        city: result.address?.city || result.address?.town || result.address?.village,
        state: result.address?.state || result.address?.province,
        country: result.address?.country,
        postal_code: result.address?.postcode
      }
    };
  } catch (error) {
    console.error('Error geocoding address:', error);
    return null;
  }
}

/**
 * Batch geocode multiple addresses with rate limiting
 * Nominatim has a 1 request per second limit
 */
export async function batchGeocodeAddresses(addresses: string[]): Promise<Map<string, GeocodeResult | null>> {
  const results = new Map<string, GeocodeResult | null>();
  
  for (let i = 0; i < addresses.length; i++) {
    const address = addresses[i];
    
    try {
      const result = await geocodeAddress(address);
      results.set(address, result);
      
      // Rate limiting: wait 1.1 seconds between requests
      if (i < addresses.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1100));
      }
    } catch (error) {
      console.error(`Error geocoding address "${address}":`, error);
      results.set(address, null);
    }
  }
  
  return results;
}

/**
 * Get approximate coordinates for a city/state/country combination
 * This is useful when we don't have a full address
 */
export async function geocodeLocation(city?: string, state?: string, country?: string): Promise<Coordinates | null> {
  try {
    const locationParts = [city, state, country].filter(Boolean);
    
    if (locationParts.length === 0) {
      return null;
    }
    
    const locationString = locationParts.join(', ');
    const result = await geocodeAddress(locationString);
    
    return result?.coordinates || null;
  } catch (error) {
    console.error('Error geocoding location:', error);
    return null;
  }
}

/**
 * Calculate distance between two coordinates (in kilometers)
 * Using the Haversine formula
 */
export function calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(coord2.latitude - coord1.latitude);
  const dLon = toRadians(coord2.longitude - coord1.longitude);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(coord1.latitude)) * Math.cos(toRadians(coord2.latitude)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Get users within a certain radius of a location
 */
export function getUsersWithinRadius(
  users: Array<{ coordinates?: Coordinates; [key: string]: any }>,
  centerCoordinates: Coordinates,
  radiusKm: number
): Array<{ distance: number; [key: string]: any }> {
  return users
    .filter(user => user.coordinates)
    .map(user => ({
      ...user,
      distance: calculateDistance(centerCoordinates, user.coordinates!)
    }))
    .filter(user => user.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance);
}

/**
 * Default coordinates for major cities (fallback when geocoding fails)
 */
export const DEFAULT_CITY_COORDINATES: Record<string, Coordinates> = {
  // India
  'mumbai': { latitude: 19.0760, longitude: 72.8777 },
  'delhi': { latitude: 28.7041, longitude: 77.1025 },
  'bangalore': { latitude: 12.9716, longitude: 77.5946 },
  'hyderabad': { latitude: 17.3850, longitude: 78.4867 },
  'chennai': { latitude: 13.0827, longitude: 80.2707 },
  'kolkata': { latitude: 22.5726, longitude: 88.3639 },
  'pune': { latitude: 18.5204, longitude: 73.8567 },
  'ahmedabad': { latitude: 23.0225, longitude: 72.5714 },
  
  // USA
  'new york': { latitude: 40.7128, longitude: -74.0060 },
  'los angeles': { latitude: 34.0522, longitude: -118.2437 },
  'chicago': { latitude: 41.8781, longitude: -87.6298 },
  'houston': { latitude: 29.7604, longitude: -95.3698 },
  'phoenix': { latitude: 33.4484, longitude: -112.0740 },
  
  // UK
  'london': { latitude: 51.5074, longitude: -0.1278 },
  'manchester': { latitude: 53.4808, longitude: -2.2426 },
  'birmingham': { latitude: 52.4862, longitude: -1.8904 },
  
  // Canada
  'toronto': { latitude: 43.6532, longitude: -79.3832 },
  'vancouver': { latitude: 49.2827, longitude: -123.1207 },
  'montreal': { latitude: 45.5017, longitude: -73.5673 }
};

/**
 * Get default coordinates for a city if available
 */
export function getDefaultCityCoordinates(city: string): Coordinates | null {
  const normalizedCity = city.toLowerCase().trim();
  return DEFAULT_CITY_COORDINATES[normalizedCity] || null;
}
