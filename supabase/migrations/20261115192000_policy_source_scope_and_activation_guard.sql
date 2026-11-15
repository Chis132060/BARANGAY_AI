-- Require a human-verified jurisdiction and primary source before an uploaded
-- policy can be advertised as currently active in the Resident PWA / Ate Sora.
-- Existing records default to unverified and remain in their original status.
ALTER TABLE public.policies
  ADD COLUMN IF NOT EXISTS jurisdiction_scope text NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS source_reference text NOT NULL DEFAULT '';

ALTER TABLE public.policies
  ADD CONSTRAINT policy_jurisdiction_scope_check
  CHECK (jurisdiction_scope IN ('unverified', 'tandang_sora_butuan', 'butuan_city'));

ALTER TABLE public.policies
  ADD CONSTRAINT policy_active_source_guard
  CHECK (
    status <> 'Active' OR (
      jurisdiction_scope IN ('tandang_sora_butuan', 'butuan_city')
      AND length(btrim(source_reference)) >= 12
      AND length(btrim(full_text)) >= 40
      AND length(btrim(policy_number)) >= 4
      AND upper(btrim(policy_number)) NOT LIKE 'DRAFT-%'
      AND length(btrim(enacted_by)) >= 4
    )
  );

COMMENT ON COLUMN public.policies.jurisdiction_scope IS
  'Explicit human-reviewed legal scope: Tandang Sora (Poblacion), Butuan City vs Butuan citywide; unverified records are never cited as active local rules.';
COMMENT ON COLUMN public.policies.source_reference IS
  'Official primary-source URL or traceable signed resolution/ordinance reference, reviewed by authorized staff before activation.';
