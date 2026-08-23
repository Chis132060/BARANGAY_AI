ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS image_url TEXT;

INSERT INTO storage.buckets (id, name, public)
VALUES ('announcement-images', 'announcement-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public can view announcement images" ON storage.objects;
CREATE POLICY "Public can view announcement images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'announcement-images');

DROP POLICY IF EXISTS "Authenticated admins can upload announcement images" ON storage.objects;
CREATE POLICY "Authenticated admins can upload announcement images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'announcement-images');
