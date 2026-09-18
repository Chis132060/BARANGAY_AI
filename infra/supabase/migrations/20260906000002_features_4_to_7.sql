-- Migration for Features 4-7

-- 1. Add requirements_json JSONB to document_types
ALTER TABLE document_types ADD COLUMN IF NOT EXISTS requirements_json JSONB DEFAULT '[]'::JSONB;

-- Migrate existing text requirements to JSONB
UPDATE document_types SET requirements_json = '["1 Valid ID", "Proof of Residency"]'::JSONB WHERE name = 'Barangay Clearance';
UPDATE document_types SET requirements_json = '["Case study or proof of low income"]'::JSONB WHERE name = 'Certificate of Indigency';
UPDATE document_types SET requirements_json = '["Utility bill or proof of residence"]'::JSONB WHERE name = 'Certificate of Residency';
UPDATE document_types SET requirements_json = '["DTI/SEC Registration", "Lease Contract"]'::JSONB WHERE name = 'Business Clearance';

-- 2. Expand payment_status constraint
-- To do this cleanly in Postgres, we drop the constraint and re-add it.
ALTER TABLE document_requests DROP CONSTRAINT IF EXISTS document_requests_payment_status_check;
ALTER TABLE document_requests ADD CONSTRAINT document_requests_payment_status_check 
    CHECK (payment_status IN ('Unpaid', 'Pending', 'Paid', 'Waived', 'Free', 'Rejected'));

-- 3. Create payments table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES document_requests(id) ON DELETE CASCADE,
    resident_id UUID REFERENCES residents(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    reference_number VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Verified', 'Paid', 'Rejected', 'Failed')),
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Idempotency constraint: cannot submit same reference for same request twice
CREATE UNIQUE INDEX IF NOT EXISTS payments_req_ref_idx ON payments(request_id, reference_number);

-- Ensure only one active pending payment per request
-- Using partial unique index
CREATE UNIQUE INDEX IF NOT EXISTS payments_single_pending_idx ON payments(request_id) WHERE status = 'Pending';

-- 4. Create document-requirements bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'document-requirements',
    'document-requirements',
    false,
    5242880, -- 5MB
    ARRAY['image/jpeg', 'image/png', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET 
    public = false, 
    file_size_limit = 5242880, 
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'application/pdf'];

-- RLS for document-requirements bucket
-- Residents can upload to their own folder
DROP POLICY IF EXISTS "Residents can upload requirements" ON storage.objects;
CREATE POLICY "Residents can upload requirements" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'document-requirements' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Residents can select their own requirements
DROP POLICY IF EXISTS "Residents can view their own requirements" ON storage.objects;
CREATE POLICY "Residents can view their own requirements" ON storage.objects
FOR SELECT TO authenticated
USING (
    bucket_id = 'document-requirements' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Authorized staff can view requirements
DROP POLICY IF EXISTS "Authorized staff can view requirements" ON storage.objects;
CREATE POLICY "Authorized staff can view requirements" ON storage.objects
FOR SELECT TO authenticated
USING (
    bucket_id = 'document-requirements' AND
    EXISTS (
        SELECT 1 FROM users u
        JOIN roles r ON u.role_id = r.id
        LEFT JOIN permissions p ON p.role_id = r.id
        WHERE u.id = auth.uid()
        AND (
            r.name IN ('Super Admin', 'Barangay Captain') 
            OR (p.module = 'documents' AND p.can_view = true)
        )
    )
);

-- 5. Push Subscriptions Table
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own push subscriptions" ON push_subscriptions;
CREATE POLICY "Users can manage their own push subscriptions" ON push_subscriptions
    FOR ALL USING (auth.uid() = user_id);

-- 6. Notifications RLS and Realtime
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Add notifications to realtime publication safely
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
  END IF;
END
$$;
