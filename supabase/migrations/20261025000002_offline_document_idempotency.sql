-- Stable operation receipt for replay-safe resident document submissions.
ALTER TABLE public.document_requests ADD COLUMN IF NOT EXISTS client_operation_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS document_requests_offline_operation_unique
  ON public.document_requests (resident_id, client_operation_id)
  WHERE client_operation_id IS NOT NULL;
