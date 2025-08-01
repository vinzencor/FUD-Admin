# Buyer Default Address Implementation

## Overview

This document describes the implementation of the buyer default address functionality that fetches and displays the user's chosen default address from the `user_addresses` table instead of relying on the basic address fields in the `users` table.

## Database Structure

### Tables Involved

1. **`users` table** - Contains basic user information and legacy address fields
2. **`user_addresses` table** - Contains multiple addresses per user with default address functionality

### `user_addresses` Table Schema

```sql
CREATE TABLE user_addresses (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  label VARCHAR NOT NULL,           -- e.g., "Home", "Work", "Office"
  street TEXT,                      -- Street address
  city VARCHAR NOT NULL,            -- City
  state VARCHAR NOT NULL,           -- State/Province
  zip_code VARCHAR NOT NULL,        -- ZIP/Postal code
  country VARCHAR NOT NULL,         -- Country
  coordinates JSONB,                -- Geographic coordinates
  is_default BOOLEAN NOT NULL,      -- Whether this is the default address
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
);
```

## Implementation Details

### 1. Updated Data Service (`src/services/dataService.ts`)

#### Enhanced `fetchUsersWithAddresses()` Function

- **Before**: Only fetched address data from the `users` table
- **After**: Fetches default addresses from the `user_addresses` table and prioritizes them for buyers

**Key Changes:**
```typescript
// Fetch default addresses from user_addresses table
const { data: defaultAddresses, error: addressError } = await supabase
  .from('user_addresses')
  .select(`
    user_id,
    label,
    street,
    city,
    state,
    zip_code,
    country,
    coordinates
  `)
  .eq('is_default', true);

// For buyers, prefer their chosen default address
if (isBuyer && defaultAddress) {
  displayAddress = [
    defaultAddress.street,
    defaultAddress.city,
    defaultAddress.state,
    defaultAddress.country,
    defaultAddress.zip_code
  ].filter(Boolean).join(', ');
  
  addressData = {
    street_address: defaultAddress.street,
    city: defaultAddress.city,
    state: defaultAddress.state,
    country: defaultAddress.country,
    zipcode: defaultAddress.zip_code,
    coordinates: defaultAddress.coordinates
  };
}
```

#### New `fetchUserAddresses()` Function

```typescript
export async function fetchUserAddresses(userId: string) {
  const { data: addresses, error } = await supabase
    .from('user_addresses')
    .select(`
      id, label, street, city, state, zip_code, country,
      coordinates, is_default, created_at, updated_at
    `)
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });
  
  return addresses || [];
}
```

#### Updated `UserAddressData` Interface

Added `default_address` field:
```typescript
export interface UserAddressData {
  // ... existing fields
  default_address?: {
    id: string;
    label: string;
    street?: string;
    city: string;
    state: string;
    zip_code: string;
    country: string;
    coordinates?: any;
  };
}
```

### 2. Updated Buyers Page (`src/pages/Buyers.tsx`)

#### Enhanced Address Display

**Mobile View:**
- Shows default address with "Default" badge
- Displays address label (e.g., "📍 Home")

**Desktop View:**
- Shows full address with "Default" badge when applicable
- Displays address label below the main address

**Interface Updates:**
```typescript
interface Buyer {
  // ... existing fields
  default_address?: {
    id: string;
    label: string;
    street?: string;
    city: string;
    state: string;
    zip_code: string;
    country: string;
    coordinates?: any;
  };
}
```

### 3. Updated User Profile Modal (`src/components/shared/UserProfileModal.tsx`)

#### New Default Address Section

Added a dedicated section for displaying the buyer's default address:
- Shows when user is a buyer and has a default address
- Displays address label and full address details
- Includes explanatory text about the default address

```typescript
{user.default_address && (user.defaultMode === 'buyer' || user.defaultMode === 'both') && (
  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
    <div className="flex items-center gap-2 mb-3">
      <MapPin className="h-4 w-4 text-blue-600" />
      <h4 className="text-base font-medium text-gray-900">Default Address</h4>
      <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
        {user.default_address.label}
      </span>
    </div>
    {/* Address details */}
  </div>
)}
```

## Test Pages Created

### 1. Buyer Address Test (`/buyer-address-test`)

**Purpose**: Comprehensive testing of the default address functionality

**Features:**
- Lists all buyers with their default address information
- Shows detailed address data when a buyer is selected
- Displays both the default address from `fetchUsersWithAddresses` and all addresses from `fetchUserAddresses`
- Includes raw data display for debugging

### 2. Database Viewer (`/database-viewer`)

**Purpose**: View raw database data for verification

**Features:**
- Shows all users from the `users` table
- Shows all addresses from the `user_addresses` table
- Displays relationships between users and their addresses
- Shows summary statistics

## Current Database Data

Based on the database query, the system currently has:
- **Multiple users** with various default modes (buyer, seller, both)
- **Multiple addresses per user** in the `user_addresses` table
- **Default addresses** properly marked with `is_default = true`
- **Address labels** like "Home" for easy identification

## Key Benefits

1. **User Choice**: Buyers can choose which of their multiple addresses is the default
2. **Comprehensive Address Data**: Full address details including street, apartment, district
3. **International Support**: Supports various postal code formats
4. **Clear Labeling**: Addresses have user-friendly labels
5. **Backward Compatibility**: Falls back to users table data when no default address exists

## Usage Instructions

1. **View Buyers**: Navigate to `/admin/buyers` or `/super-admin/buyers` to see buyers with their default addresses
2. **Test Functionality**: Visit `/buyer-address-test` to see detailed testing interface
3. **View Database**: Visit `/database-viewer` to see raw database data
4. **Profile Modal**: Click on any buyer to see their profile with default address information

## Technical Notes

- The system prioritizes default addresses from `user_addresses` table for buyers
- For sellers, it still uses business address from seller profiles when available
- The implementation is backward compatible with existing address data
- All address fields support international formats (especially postal codes)
- The system gracefully handles cases where no default address is set
