-- Migration: Create private bucket for Resident IDs

-- 1. Create a private bucket named 'resident-ids' if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'resident-ids',
    'resident-ids',
    false,
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET 
    public = false, 
    file_size_limit = 5242880, 
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- 2. Secure storage.objects RLS policies

-- Ensure RLS is enabled for storage.objects (Actually, already enabled by Supabase by default, removing to avoid ERROR 42501)

-- Residents can insert into their own folder (auth.uid() as root folder)
DROP POLICY IF EXISTS "Residents can upload their own IDs" ON storage.objects;
CREATE POLICY "Residents can upload their own IDs" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'resident-ids' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Residents can select their own IDs
DROP POLICY IF EXISTS "Residents can view their own IDs" ON storage.objects;
CREATE POLICY "Residents can view their own IDs" ON storage.objects
FOR SELECT TO authenticated
USING (
    bucket_id = 'resident-ids' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Staff with 'residents' view permissions can select any resident ID
DROP POLICY IF EXISTS "Authorized staff can view resident IDs" ON storage.objects;
CREATE POLICY "Authorized staff can view resident IDs" ON storage.objects
FOR SELECT TO authenticated
USING (
    bucket_id = 'resident-ids' AND
    EXISTS (
        SELECT 1 FROM users u
        JOIN roles r ON u.role_id = r.id
        LEFT JOIN permissions p ON p.role_id = r.id
        WHERE u.id = auth.uid()
        AND (
            r.name IN ('Super Admin', 'Barangay Captain') 
            OR (p.module = 'residents' AND p.can_view = true)
        )
    )
);

-- Note: The `id_photo_url` column in the `residents` table will store the 
-- private storage path (e.g. "resident-ids/${auth.uid()}/id_capture_${uuid}.jpg")
-- and NOT a public URL. This is to avoid breaking existing downstream queries
-- while enforcing secure storage rules.
COMMENT ON COLUMN residents.id_photo_url IS 'Stores the private storage path in the resident-ids bucket, NOT a public URL. Format: auth.uid()/id_capture_uuid.jpg';
