-- Featured Sellers Management System
-- SQL Schema for Supabase Database

-- 1. Create featured_sellers table
CREATE TABLE featured_sellers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    featured_by UUID NOT NULL REFERENCES users(id),
    featured_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 2. Create indexes for better performance
CREATE INDEX idx_featured_sellers_user_id ON featured_sellers(user_id);
CREATE INDEX idx_featured_sellers_is_active ON featured_sellers(is_active);
CREATE INDEX idx_featured_sellers_priority ON featured_sellers(priority DESC);
CREATE INDEX idx_featured_sellers_featured_at ON featured_sellers(featured_at DESC);

-- 3. Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_featured_sellers_updated_at 
    BEFORE UPDATE ON featured_sellers 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 4. Row Level Security (RLS) Policies
ALTER TABLE featured_sellers ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read featured sellers
CREATE POLICY "Allow authenticated users to read featured sellers" ON featured_sellers
    FOR SELECT USING (auth.role() = 'authenticated');

-- Policy: Allow admins to manage featured sellers
CREATE POLICY "Allow admins to manage featured sellers" ON featured_sellers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'super_admin')
        )
    );

-- 5. Create view for easy querying with user details
CREATE OR REPLACE VIEW featured_sellers_with_details AS
SELECT 
    fs.id,
    fs.user_id,
    fs.featured_by,
    fs.featured_at,
    fs.is_active,
    fs.priority,
    fs.notes,
    fs.created_at,
    fs.updated_at,
    -- User details
    u.full_name,
    u.email,
    u.mobile_phone,
    u.default_mode,
    u.city,
    u.state,
    u.country,
    u.profile_image,
    u.average_rating,
    u.total_reviews,
    -- Seller profile details (if exists)
    sp.store_name,
    sp.description as store_description,
    sp.is_approved as seller_approved,
    sp.profile_image as store_profile_image,
    sp.cover_image as store_cover_image,
    -- Featured by admin details
    admin.full_name as featured_by_name,
    admin.email as featured_by_email
FROM featured_sellers fs
JOIN users u ON fs.user_id = u.id
LEFT JOIN seller_profiles sp ON u.id = sp.user_id
LEFT JOIN users admin ON fs.featured_by = admin.id
WHERE fs.is_active = true
ORDER BY fs.priority DESC, fs.featured_at DESC;

-- 6. Create function to toggle featured status
CREATE OR REPLACE FUNCTION toggle_featured_seller(
    p_user_id UUID,
    p_admin_id UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    existing_record featured_sellers%ROWTYPE;
    result JSON;
BEGIN
    -- Check if user exists and can be featured
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id) THEN
        RETURN json_build_object('success', false, 'message', 'User not found');
    END IF;
    
    -- Check if admin exists and has permission
    IF NOT EXISTS (
        SELECT 1 FROM users 
        WHERE id = p_admin_id 
        AND role IN ('admin', 'super_admin')
    ) THEN
        RETURN json_build_object('success', false, 'message', 'Admin permission required');
    END IF;
    
    -- Check if already featured
    SELECT * INTO existing_record 
    FROM featured_sellers 
    WHERE user_id = p_user_id;
    
    IF existing_record.id IS NOT NULL THEN
        -- Toggle existing record
        UPDATE featured_sellers 
        SET 
            is_active = NOT is_active,
            featured_by = p_admin_id,
            notes = COALESCE(p_notes, notes),
            updated_at = NOW()
        WHERE user_id = p_user_id;
        
        SELECT json_build_object(
            'success', true,
            'action', CASE WHEN existing_record.is_active THEN 'unfeatured' ELSE 'featured' END,
            'message', CASE WHEN existing_record.is_active THEN 'User removed from featured sellers' ELSE 'User added to featured sellers' END
        ) INTO result;
    ELSE
        -- Create new featured seller record
        INSERT INTO featured_sellers (user_id, featured_by, notes)
        VALUES (p_user_id, p_admin_id, p_notes);
        
        SELECT json_build_object(
            'success', true,
            'action', 'featured',
            'message', 'User added to featured sellers'
        ) INTO result;
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create function to get featured sellers for home page
CREATE OR REPLACE FUNCTION get_featured_sellers_for_home(
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    user_id UUID,
    full_name TEXT,
    email TEXT,
    mobile_phone TEXT,
    city TEXT,
    state TEXT,
    country TEXT,
    profile_image TEXT,
    average_rating NUMERIC,
    total_reviews INTEGER,
    store_name TEXT,
    store_description TEXT,
    store_profile_image TEXT,
    store_cover_image TEXT,
    featured_at TIMESTAMP,
    priority INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        fsd.user_id,
        fsd.full_name,
        fsd.email,
        fsd.mobile_phone,
        fsd.city,
        fsd.state,
        fsd.country,
        fsd.profile_image,
        fsd.average_rating,
        fsd.total_reviews,
        fsd.store_name,
        fsd.store_description,
        fsd.store_profile_image,
        fsd.store_cover_image,
        fsd.featured_at,
        fsd.priority
    FROM featured_sellers_with_details fsd
    WHERE fsd.is_active = true
    ORDER BY fsd.priority DESC, fsd.featured_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Insert some sample data (optional - remove in production)
-- INSERT INTO featured_sellers (user_id, featured_by, notes, priority) 
-- SELECT 
--     u.id, 
--     (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1),
--     'Sample featured seller',
--     1
-- FROM users u 
-- WHERE u.default_mode IN ('seller', 'both') 
-- LIMIT 3;

-- 9. Grant necessary permissions
GRANT SELECT ON featured_sellers TO authenticated;
GRANT ALL ON featured_sellers TO service_role;
GRANT SELECT ON featured_sellers_with_details TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_featured_seller TO authenticated;
GRANT EXECUTE ON FUNCTION get_featured_sellers_for_home TO authenticated;
