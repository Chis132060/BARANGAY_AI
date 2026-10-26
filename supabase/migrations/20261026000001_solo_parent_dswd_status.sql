-- Add Solo Parent and DSWD beneficiary status columns to residents
-- These mirror the existing voter_status, pwd_status, four_ps_status pattern.

ALTER TABLE public.residents
  ADD COLUMN IF NOT EXISTS solo_parent_status BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS dswd_status BOOLEAN NOT NULL DEFAULT FALSE;

-- Indexes for fast dashboard COUNT queries
CREATE INDEX IF NOT EXISTS idx_residents_solo_parent_status ON public.residents(solo_parent_status) WHERE solo_parent_status = TRUE;
CREATE INDEX IF NOT EXISTS idx_residents_dswd_status ON public.residents(dswd_status) WHERE dswd_status = TRUE;
