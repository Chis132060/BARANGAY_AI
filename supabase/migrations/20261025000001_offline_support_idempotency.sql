-- Idempotency for offline support ticket retries. No existing rows are changed.
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS client_operation_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS support_tickets_owner_client_operation_unique
  ON public.support_tickets (resident_user_id, client_operation_id)
  WHERE client_operation_id IS NOT NULL;
