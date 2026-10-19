-- Targeted partial indexes for the Admin verification queue and Resident PWA Updates.
-- Apply through the reviewed Supabase migration workflow; do not run directly on production without approval.
CREATE INDEX IF NOT EXISTS idx_residents_pending_verification_created
  ON public.residents (created_at ASC)
  WHERE verification_status = 'Pending' AND user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_announcements_published_created
  ON public.announcements (created_at DESC)
  WHERE status = 'Published';

CREATE INDEX IF NOT EXISTS idx_barangay_programs_public_active_created
  ON public.barangay_programs (created_at DESC)
  WHERE is_public = true AND status = 'Active';
