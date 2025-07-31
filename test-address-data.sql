-- Test data for address display functionality
-- This script adds sample users with complete address information

-- Insert test users with comprehensive address data
INSERT INTO public.users (
    id,
    email,
    full_name,
    mobile_phone,
    street_address,
    apartment_unit,
    city,
    state,
    district,
    country,
    zipcode,
    postal_code,
    coordinates,
    default_mode,
    role,
    created_at
) VALUES 
(
    gen_random_uuid(),
    'john.houston@example.com',
    'John Houston',
    '+1-713-555-0123',
    '1234 Main Street',
    'Apt 5B',
    'Houston',
    'Texas',
    'Harris County',
    'United States',
    '77001',
    '77001',
    '{"latitude": 29.7604, "longitude": -95.3698}',
    'buyer',
    'user',
    NOW()
),
(
    gen_random_uuid(),
    'sarah.mumbai@example.com',
    'Sarah Patel',
    '+91-98765-43210',
    '456 Marine Drive',
    'Floor 12',
    'Mumbai',
    'Maharashtra',
    'Mumbai Suburban',
    'India',
    '400001',
    '400001',
    '{"latitude": 19.0760, "longitude": 72.8777}',
    'seller',
    'user',
    NOW()
),
(
    gen_random_uuid(),
    'mike.london@example.com',
    'Mike Johnson',
    '+44-20-7946-0958',
    '789 Baker Street',
    NULL,
    'London',
    'England',
    'Greater London',
    'United Kingdom',
    'NW1 6XE',
    'NW1 6XE',
    '{"latitude": 51.5074, "longitude": -0.1278}',
    'both',
    'user',
    NOW()
),
(
    gen_random_uuid(),
    'anna.toronto@example.com',
    'Anna Chen',
    '+1-416-555-7890',
    '321 Queen Street West',
    'Suite 1001',
    'Toronto',
    'Ontario',
    'Toronto Division',
    'Canada',
    'M5V 2A2',
    'M5V 2A2',
    '{"latitude": 43.6532, "longitude": -79.3832}',
    'buyer',
    'admin',
    NOW()
)
ON CONFLICT (email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    mobile_phone = EXCLUDED.mobile_phone,
    street_address = EXCLUDED.street_address,
    apartment_unit = EXCLUDED.apartment_unit,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    district = EXCLUDED.district,
    country = EXCLUDED.country,
    zipcode = EXCLUDED.zipcode,
    postal_code = EXCLUDED.postal_code,
    coordinates = EXCLUDED.coordinates,
    default_mode = EXCLUDED.default_mode,
    role = EXCLUDED.role;

-- Add seller profiles for users with seller mode
INSERT INTO public.seller_profiles (
    user_id,
    store_name,
    description,
    is_approved,
    created_at
)
SELECT 
    u.id,
    CASE 
        WHEN u.full_name = 'Sarah Patel' THEN 'Mumbai Spice Market'
        WHEN u.full_name = 'Mike Johnson' THEN 'London Fresh Foods'
        ELSE u.full_name || '''s Store'
    END,
    CASE 
        WHEN u.full_name = 'Sarah Patel' THEN 'Premium spices and organic ingredients from Mumbai'
        WHEN u.full_name = 'Mike Johnson' THEN 'Fresh organic produce from local London farms'
        ELSE 'Quality products and excellent service'
    END,
    true,
    NOW()
FROM public.users u
WHERE u.email IN ('sarah.mumbai@example.com', 'mike.london@example.com')
ON CONFLICT (user_id) DO UPDATE SET
    store_name = EXCLUDED.store_name,
    description = EXCLUDED.description,
    is_approved = EXCLUDED.is_approved;
