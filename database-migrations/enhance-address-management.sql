-- Enhanced Address Management Schema
-- This migration enhances the database schema to support comprehensive address fields
-- and ensures proper indexing for geographic queries

-- Add comprehensive address fields to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS street_address TEXT,
ADD COLUMN IF NOT EXISTS apartment_unit TEXT,
ADD COLUMN IF NOT EXISTS district TEXT,
ADD COLUMN IF NOT EXISTS postal_code TEXT,
ADD COLUMN IF NOT EXISTS coordinates JSONB,
ADD COLUMN IF NOT EXISTS address_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS address_verification_date TIMESTAMP WITH TIME ZONE;

-- Update existing zipcode column to be more flexible (support international formats)
ALTER TABLE public.users 
ALTER COLUMN zipcode TYPE TEXT;

-- Add comments to new columns
COMMENT ON COLUMN public.users.street_address IS 'Street address including house number and street name';
COMMENT ON COLUMN public.users.apartment_unit IS 'Apartment, suite, or unit number';
COMMENT ON COLUMN public.users.district IS 'District, county, or administrative division';
COMMENT ON COLUMN public.users.postal_code IS 'Postal/ZIP code (supports international formats)';
COMMENT ON COLUMN public.users.coordinates IS 'Geographic coordinates as JSON {latitude: number, longitude: number}';
COMMENT ON COLUMN public.users.address_verified IS 'Whether the address has been verified through geocoding';
COMMENT ON COLUMN public.users.address_verification_date IS 'When the address was last verified';

-- Create indexes for geographic queries
CREATE INDEX IF NOT EXISTS idx_users_country ON public.users(country) WHERE country IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_state ON public.users(state) WHERE state IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_city ON public.users(city) WHERE city IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_district ON public.users(district) WHERE district IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_postal_code ON public.users(postal_code) WHERE postal_code IS NOT NULL;

-- Create composite indexes for location-based queries
CREATE INDEX IF NOT EXISTS idx_users_location_composite ON public.users(country, state, city) 
WHERE country IS NOT NULL AND state IS NOT NULL AND city IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_full_location ON public.users(country, state, city, district) 
WHERE country IS NOT NULL AND state IS NOT NULL AND city IS NOT NULL AND district IS NOT NULL;

-- Create GIN index for coordinates JSONB field for spatial queries
CREATE INDEX IF NOT EXISTS idx_users_coordinates ON public.users USING GIN(coordinates) 
WHERE coordinates IS NOT NULL;

-- Create index for address verification status
CREATE INDEX IF NOT EXISTS idx_users_address_verified ON public.users(address_verified, address_verification_date);

-- Enhance seller_profiles table with better address support
ALTER TABLE public.seller_profiles 
ADD COLUMN IF NOT EXISTS street_address TEXT,
ADD COLUMN IF NOT EXISTS apartment_unit TEXT,
ADD COLUMN IF NOT EXISTS district TEXT,
ADD COLUMN IF NOT EXISTS postal_code TEXT,
ADD COLUMN IF NOT EXISTS address_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS address_verification_date TIMESTAMP WITH TIME ZONE;

-- Add comments to seller_profiles address columns
COMMENT ON COLUMN public.seller_profiles.street_address IS 'Business street address';
COMMENT ON COLUMN public.seller_profiles.apartment_unit IS 'Business suite or unit number';
COMMENT ON COLUMN public.seller_profiles.district IS 'Business district or administrative division';
COMMENT ON COLUMN public.seller_profiles.postal_code IS 'Business postal/ZIP code';
COMMENT ON COLUMN public.seller_profiles.address_verified IS 'Whether business address has been verified';
COMMENT ON COLUMN public.seller_profiles.address_verification_date IS 'When business address was last verified';

-- Create indexes for seller location queries
CREATE INDEX IF NOT EXISTS idx_seller_profiles_coordinates ON public.seller_profiles USING GIN(coordinates) 
WHERE coordinates IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_seller_profiles_address_verified ON public.seller_profiles(address_verified);

-- Create a view for complete user address information
CREATE OR REPLACE VIEW public.user_addresses AS
SELECT 
    u.id,
    u.full_name,
    u.email,
    u.mobile_phone,
    u.default_mode,
    u.role,
    
    -- Primary address (user's personal address)
    u.street_address,
    u.apartment_unit,
    u.city,
    u.state,
    u.district,
    u.country,
    u.postal_code,
    u.coordinates,
    u.address_verified,
    u.address_verification_date,
    
    -- Seller business address (if applicable)
    sp.store_name,
    sp.street_address AS business_street_address,
    sp.apartment_unit AS business_apartment_unit,
    sp.district AS business_district,
    sp.postal_code AS business_postal_code,
    sp.coordinates AS business_coordinates,
    sp.address_verified AS business_address_verified,
    sp.address_verification_date AS business_address_verification_date,
    sp.is_approved AS seller_approved,
    
    -- Computed fields
    CASE 
        WHEN u.street_address IS NOT NULL THEN 
            CONCAT_WS(', ', 
                CONCAT_WS(' ', u.street_address, u.apartment_unit),
                u.city, 
                u.state, 
                u.district,
                u.country, 
                u.postal_code
            )
        ELSE 
            CONCAT_WS(', ', u.city, u.state, u.country)
    END AS formatted_address,
    
    CASE 
        WHEN sp.street_address IS NOT NULL THEN 
            CONCAT_WS(', ', 
                CONCAT_WS(' ', sp.street_address, sp.apartment_unit),
                u.city, 
                u.state, 
                sp.district,
                u.country, 
                sp.postal_code
            )
        ELSE NULL
    END AS formatted_business_address,
    
    -- Location completeness indicators
    (u.city IS NOT NULL AND u.state IS NOT NULL AND u.country IS NOT NULL) AS has_basic_location,
    (u.street_address IS NOT NULL AND u.city IS NOT NULL AND u.state IS NOT NULL AND u.country IS NOT NULL) AS has_complete_address,
    (u.coordinates IS NOT NULL) AS has_coordinates,
    
    u.created_at,
    u.updated_at

FROM public.users u
LEFT JOIN public.seller_profiles sp ON u.id = sp.user_id
WHERE u.full_name IS NOT NULL AND u.email IS NOT NULL;

-- Create indexes on the view for better performance
CREATE INDEX IF NOT EXISTS idx_user_addresses_location ON public.users(country, state, city) 
WHERE country IS NOT NULL AND state IS NOT NULL AND city IS NOT NULL;

-- Function to update address verification status
CREATE OR REPLACE FUNCTION public.update_address_verification(
    user_id UUID,
    is_verified BOOLEAN,
    coordinates_data JSONB DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.users 
    SET 
        address_verified = is_verified,
        address_verification_date = NOW(),
        coordinates = COALESCE(coordinates_data, coordinates)
    WHERE id = user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update seller business address verification
CREATE OR REPLACE FUNCTION public.update_business_address_verification(
    user_id UUID,
    is_verified BOOLEAN,
    coordinates_data JSONB DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.seller_profiles 
    SET 
        address_verified = is_verified,
        address_verification_date = NOW(),
        coordinates = COALESCE(coordinates_data, coordinates)
    WHERE user_id = user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get users within a geographic radius (using coordinates)
CREATE OR REPLACE FUNCTION public.get_users_within_radius(
    center_lat DECIMAL,
    center_lng DECIMAL,
    radius_km DECIMAL
) RETURNS TABLE(
    user_id UUID,
    full_name TEXT,
    email TEXT,
    distance_km DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.full_name,
        u.email,
        ROUND(
            (6371 * acos(
                cos(radians(center_lat)) * 
                cos(radians((u.coordinates->>'latitude')::DECIMAL)) * 
                cos(radians((u.coordinates->>'longitude')::DECIMAL) - radians(center_lng)) + 
                sin(radians(center_lat)) * 
                sin(radians((u.coordinates->>'latitude')::DECIMAL))
            ))::DECIMAL, 2
        ) AS distance_km
    FROM public.users u
    WHERE 
        u.coordinates IS NOT NULL 
        AND u.coordinates ? 'latitude' 
        AND u.coordinates ? 'longitude'
        AND (6371 * acos(
            cos(radians(center_lat)) * 
            cos(radians((u.coordinates->>'latitude')::DECIMAL)) * 
            cos(radians((u.coordinates->>'longitude')::DECIMAL) - radians(center_lng)) + 
            sin(radians(center_lat)) * 
            sin(radians((u.coordinates->>'latitude')::DECIMAL))
        )) <= radius_km
    ORDER BY distance_km;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT SELECT ON public.user_addresses TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_address_verification(UUID, BOOLEAN, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_business_address_verification(UUID, BOOLEAN, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_users_within_radius(DECIMAL, DECIMAL, DECIMAL) TO authenticated;

-- Create RLS policies for address data
CREATE POLICY IF NOT EXISTS "Users can view own address data" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "Admins can view all address data" ON public.users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

-- Update existing data to populate new fields where possible
-- This is a one-time migration to move existing zipcode data to postal_code
UPDATE public.users 
SET postal_code = zipcode 
WHERE postal_code IS NULL AND zipcode IS NOT NULL AND zipcode != '';

-- Create a trigger to automatically update address_verification_date when coordinates change
CREATE OR REPLACE FUNCTION public.update_address_verification_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.coordinates IS DISTINCT FROM NEW.coordinates AND NEW.coordinates IS NOT NULL THEN
        NEW.address_verification_date = NOW();
        NEW.address_verified = TRUE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_address_verification
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_address_verification_trigger();

-- Add helpful comments
COMMENT ON VIEW public.user_addresses IS 'Comprehensive view of user address information including business addresses for sellers';
COMMENT ON FUNCTION public.get_users_within_radius(DECIMAL, DECIMAL, DECIMAL) IS 'Find users within a specified radius of given coordinates';
COMMENT ON FUNCTION public.update_address_verification(UUID, BOOLEAN, JSONB) IS 'Update address verification status and coordinates for a user';
COMMENT ON FUNCTION public.update_business_address_verification(UUID, BOOLEAN, JSONB) IS 'Update business address verification status for a seller';
