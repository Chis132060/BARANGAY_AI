-- Distinguish approved DSWD/social-welfare program references from
-- Philippine laws, Butuan City code indexes and actual barangay ordinances.
-- No new rights or grant entitlements are created by this migration.
-- Existing RLS (published sources only) and edit-then-archive trigger remain intact.
ALTER TABLE public.verified_legal_sources
  DROP CONSTRAINT IF EXISTS verified_legal_sources_authority_check;
ALTER TABLE public.verified_legal_sources
  ADD CONSTRAINT verified_legal_sources_authority_check CHECK (
    authority IN ('national_law', 'city_code_index', 'barangay_policy',
                  'government_program', 'city_service')
  );
ALTER TABLE public.verified_legal_sources
  ADD CONSTRAINT verified_sources_service_scope_check CHECK (
    (authority <> 'government_program' OR jurisdiction_scope = 'philippines')
    AND (authority <> 'city_service' OR jurisdiction_scope = 'butuan_city')
  );
