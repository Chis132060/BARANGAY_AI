-- The resident announcement feed and home advisory are public routes.
-- Allow visitors to read only published announcements; staff write access
-- remains protected by the existing authenticated staff policy.

DROP POLICY IF EXISTS "Public can read published announcements" ON public.announcements;
CREATE POLICY "Public can read published announcements"
  ON public.announcements
  FOR SELECT
  TO anon, authenticated
  USING (status = 'Published');
