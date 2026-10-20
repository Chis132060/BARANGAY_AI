-- Curated public reference catalog remains non-enrollable and labeled historical/citywide.
ALTER TABLE public.barangay_programs ADD COLUMN IF NOT EXISTS image_url text;
DROP POLICY IF EXISTS "Public reference programs readable" ON public.barangay_programs;
CREATE POLICY "Public reference programs readable" ON public.barangay_programs FOR SELECT TO authenticated USING (is_public = true AND status = 'On Hold' AND code IN ('TS-BUNTIS-2023','TS-BASKET-2025','CITY-LIVELIHOOD-2026','CITY-SPES-2026','CITY-TUPAD-2026','CITY-SKILLS-2026'));
UPDATE public.barangay_programs SET is_public = true, registration_open = false WHERE code IN ('TS-BUNTIS-2023','TS-BASKET-2025','CITY-LIVELIHOOD-2026','CITY-SPES-2026','CITY-TUPAD-2026','CITY-SKILLS-2026') AND status='On Hold';
INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types) VALUES ('program-images','program-images',true,5242880,ARRAY['image/jpeg','image/png','image/webp']) ON CONFLICT (id) DO UPDATE SET public=true,file_size_limit=5242880,allowed_mime_types=ARRAY['image/jpeg','image/png','image/webp'];
DROP POLICY IF EXISTS "Program images public read" ON storage.objects;
CREATE POLICY "Program images public read" ON storage.objects FOR SELECT TO public USING (bucket_id='program-images');
DROP POLICY IF EXISTS "Program images staff upload" ON storage.objects;
CREATE POLICY "Program images staff upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='program-images' AND public.is_barangay_staff());
DROP POLICY IF EXISTS "Program images staff update" ON storage.objects;
CREATE POLICY "Program images staff update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id='program-images' AND public.is_barangay_staff()) WITH CHECK (bucket_id='program-images' AND public.is_barangay_staff());
