-- Migration: Add resident_code to residents table
-- This column stores a human-readable login username (e.g. BRY-2026-00142)
-- used by residents who do not have an email address.

ALTER TABLE public.residents
  ADD COLUMN IF NOT EXISTS resident_code VARCHAR(30) UNIQUE;

-- Index for fast login lookups
CREATE INDEX IF NOT EXISTS idx_residents_resident_code ON public.residents (resident_code);
