-- Complete chatbot request workflow: sessions, attachments, payment state,
-- generated documents, and database-level resident notifications.

ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS session_id TEXT;

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id
  ON public.chat_messages(session_id);

CREATE TABLE IF NOT EXISTS public.request_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL UNIQUE,
  status VARCHAR(30) NOT NULL DEFAULT 'Pending'
    CHECK (status IN ('Pending', 'Processing', 'Ready for Pickup', 'Completed', 'Rejected', 'Cancelled')),
  total_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_status VARCHAR(20) NOT NULL DEFAULT 'Unpaid'
    CHECK (payment_status IN ('Unpaid', 'Paid', 'Waived', 'Free', 'Partially Paid')),
  payment_due_date TIMESTAMPTZ,
  payment_reference VARCHAR(100),
  payment_received_at TIMESTAMPTZ,
  payment_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.document_requests
  ADD COLUMN IF NOT EXISTS transaction_id UUID REFERENCES public.request_transactions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_due_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(100),
  ADD COLUMN IF NOT EXISTS payment_received_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_notes TEXT,
  ADD COLUMN IF NOT EXISTS requirements_status VARCHAR(20) NOT NULL DEFAULT 'Pending'
    CHECK (requirements_status IN ('Pending', 'Complete', 'Incomplete', 'Verified')),
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_document_requests_transaction_id
  ON public.document_requests(transaction_id);

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS document_kind VARCHAR(30) NOT NULL DEFAULT 'generated'
    CHECK (document_kind IN ('generated', 'attachment')),
  ADD COLUMN IF NOT EXISTS file_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS mime_type VARCHAR(120),
  ADD COLUMN IF NOT EXISTS template_key VARCHAR(100),
  ADD COLUMN IF NOT EXISTS document_number VARCHAR(100),
  ADD COLUMN IF NOT EXISTS content_html TEXT,
  ADD COLUMN IF NOT EXISTS field_snapshot JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_documents_request_id
  ON public.documents(request_id);

-- Private bucket for resident-submitted requirements. The folder prefix is the
-- authenticated user's ID, which makes ownership checks straightforward.
INSERT INTO storage.buckets (id, name, public)
VALUES ('request-attachments', 'request-attachments', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Residents upload own request attachments" ON storage.objects;
CREATE POLICY "Residents upload own request attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'request-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

DROP POLICY IF EXISTS "Residents read own request attachments" ON storage.objects;
CREATE POLICY "Residents read own request attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'request-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

DROP POLICY IF EXISTS "Staff manage request attachments" ON storage.objects;
CREATE POLICY "Staff manage request attachments"
  ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id = 'request-attachments'
    AND public.has_module_permission('documents', 'view')
  )
  WITH CHECK (
    bucket_id = 'request-attachments'
    AND public.has_module_permission('documents', 'edit')
  );

ALTER TABLE public.request_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Residents manage own request transactions" ON public.request_transactions;
DROP POLICY IF EXISTS "Residents read own request transactions" ON public.request_transactions;
DROP POLICY IF EXISTS "Residents create own request transactions" ON public.request_transactions;
CREATE POLICY "Residents read own request transactions"
  ON public.request_transactions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Residents create own request transactions"
  ON public.request_transactions FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND resident_id IN (
      SELECT id FROM public.residents
      WHERE user_id = auth.uid() AND verification_status = 'Verified'
    )
  );

DROP POLICY IF EXISTS "Staff manage request transactions" ON public.request_transactions;
CREATE POLICY "Staff manage request transactions"
  ON public.request_transactions FOR ALL TO authenticated
  USING (public.has_module_permission('documents', 'view'))
  WITH CHECK (public.has_module_permission('documents', 'edit'));

DROP POLICY IF EXISTS "Residents read own generated documents" ON public.documents;
CREATE POLICY "Residents read own generated documents"
  ON public.documents FOR SELECT TO authenticated
  USING (
    request_id IN (
      SELECT dr.id
      FROM public.document_requests dr
      JOIN public.residents r ON r.id = dr.resident_id
      WHERE r.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Residents attach own request documents" ON public.documents;
CREATE POLICY "Residents attach own request documents"
  ON public.documents FOR INSERT TO authenticated
  WITH CHECK (
    document_kind = 'attachment'
    AND request_id IN (
      SELECT dr.id
      FROM public.document_requests dr
      JOIN public.residents r ON r.id = dr.resident_id
      WHERE r.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Staff manage generated documents" ON public.documents;
CREATE POLICY "Staff manage generated documents"
  ON public.documents FOR ALL TO authenticated
  USING (public.has_module_permission('documents', 'view'))
  WITH CHECK (public.has_module_permission('documents', 'edit'));

-- Keep the aggregate transaction status and amount synchronized with its
-- requests. This is deliberately a trigger so direct admin/API updates cannot
-- leave the dashboard totals stale.
CREATE OR REPLACE FUNCTION public.sync_request_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.transaction_id IS NOT NULL THEN
    UPDATE public.request_transactions
    SET total_fee = (
          SELECT COALESCE(SUM(fee_amount), 0)
          FROM public.document_requests
          WHERE transaction_id = NEW.transaction_id
        ),
        status = CASE
          WHEN EXISTS (SELECT 1 FROM public.document_requests WHERE transaction_id = NEW.transaction_id AND status = 'Rejected') THEN 'Rejected'
          WHEN EXISTS (SELECT 1 FROM public.document_requests WHERE transaction_id = NEW.transaction_id AND status = 'Ready for Pickup') THEN 'Ready for Pickup'
          WHEN EXISTS (SELECT 1 FROM public.document_requests WHERE transaction_id = NEW.transaction_id AND status IN ('Pending', 'Under Review', 'Approved')) THEN 'Processing'
          WHEN NOT EXISTS (SELECT 1 FROM public.document_requests WHERE transaction_id = NEW.transaction_id AND status NOT IN ('Released', 'Completed')) THEN 'Completed'
          ELSE status
        END,
        payment_status = CASE
          WHEN NOT EXISTS (SELECT 1 FROM public.document_requests WHERE transaction_id = NEW.transaction_id AND payment_status NOT IN ('Paid', 'Free', 'Waived'))
            AND EXISTS (SELECT 1 FROM public.document_requests WHERE transaction_id = NEW.transaction_id AND payment_status = 'Paid') THEN 'Paid'
          WHEN NOT EXISTS (SELECT 1 FROM public.document_requests WHERE transaction_id = NEW.transaction_id AND payment_status NOT IN ('Free', 'Waived')) THEN 'Free'
          WHEN EXISTS (SELECT 1 FROM public.document_requests WHERE transaction_id = NEW.transaction_id AND payment_status = 'Paid') THEN 'Partially Paid'
          ELSE 'Unpaid'
        END,
        updated_at = now()
    WHERE id = NEW.transaction_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_request_transaction ON public.document_requests;
CREATE TRIGGER trg_sync_request_transaction
AFTER INSERT OR UPDATE OF status, fee_amount, payment_status, transaction_id
ON public.document_requests
FOR EACH ROW EXECUTE FUNCTION public.sync_request_transaction();

-- Automatic resident notifications for all status/payment changes, including
-- updates made outside the Next.js action.
CREATE OR REPLACE FUNCTION public.notify_document_request_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resident_user_id UUID;
  doc_name TEXT;
  notification_title TEXT;
  notification_message TEXT;
BEGIN
  IF TG_OP = 'INSERT'
     OR (OLD.status IS NOT DISTINCT FROM NEW.status
         AND OLD.payment_status IS NOT DISTINCT FROM NEW.payment_status) THEN
    RETURN NEW;
  END IF;

  SELECT r.user_id, COALESCE(dt.name, 'Document')
  INTO resident_user_id, doc_name
  FROM public.residents r
  LEFT JOIN public.document_types dt ON dt.id = NEW.document_type_id
  WHERE r.id = NEW.resident_id;

  IF resident_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  notification_title := 'Document Request Updated';
  notification_message := format('Your request for %s is now %s.', doc_name, NEW.status);

  IF NEW.status = 'Ready for Pickup' THEN
    notification_title := format('%s is Ready for Pickup', doc_name);
    notification_message := format(
      'Your %s is ready for pickup at the Barangay Hall. %s Payment status: %s.',
      doc_name,
      COALESCE(NEW.pickup_instructions, 'Bring one valid ID.'),
      COALESCE(NEW.payment_status, 'Unpaid')
    );
  ELSIF NEW.status = 'Approved' THEN
    notification_title := format('%s Request Approved', doc_name);
    notification_message := format('Your request for %s was approved. Payment status: %s.', doc_name, COALESCE(NEW.payment_status, 'Unpaid'));
  ELSIF NEW.status = 'Rejected' THEN
    notification_title := format('%s Request Needs Attention', doc_name);
    notification_message := format('Your request for %s was rejected. Reason: %s', doc_name, COALESCE(NEW.remarks, 'Please contact the Barangay Office.'));
  ELSIF OLD.payment_status IS DISTINCT FROM NEW.payment_status THEN
    notification_title := format('Payment Status: %s', doc_name);
    notification_message := format('The payment status for your %s is now %s.', doc_name, NEW.payment_status);
  END IF;

  INSERT INTO public.notifications (user_id, title, message, read_status)
  VALUES (resident_user_id, notification_title, notification_message, false);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_document_request_change ON public.document_requests;
CREATE TRIGGER trg_notify_document_request_change
AFTER UPDATE OF status, payment_status
ON public.document_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_document_request_change();

INSERT INTO public.document_types (name, description, requirements)
VALUES
  ('Barangay Clearance', 'Clearance for employment, ID application, and government transactions.', 'One valid government ID; proof of residency if required'),
  ('Certificate of Indigency', 'Certification for financial, medical, scholarship, burial, or legal assistance.', 'Purpose and household income information; supporting proof if required'),
  ('Certificate of Residency', 'Official certification of residency in the Barangay.', 'Proof of address such as utility bill, lease, or landlord certification'),
  ('Business Clearance', 'Barangay clearance or business-related barangay permit for local permitting.', 'DTI/SEC/CDA registration; owner ID/TIN; proof of business address; applicable clearances')
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  requirements = EXCLUDED.requirements;
