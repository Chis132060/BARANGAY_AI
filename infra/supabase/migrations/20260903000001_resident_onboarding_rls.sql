-- Resident onboarding, sensitive demographic capture, operational auditability,
-- and row-level security for resident-facing records.

ALTER TABLE public.residents
  ADD COLUMN IF NOT EXISTS household_onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS household_onboarding_completed_at TIMESTAMPTZ;

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS registration_type VARCHAR(20) NOT NULL DEFAULT 'New',
  ADD COLUMN IF NOT EXISTS business_nature TEXT,
  ADD COLUMN IF NOT EXISTS owner_contact_number VARCHAR(20),
  ADD COLUMN IF NOT EXISTS dti_sec_registration_no VARCHAR(100),
  ADD COLUMN IF NOT EXISTS tin VARCHAR(30),
  ADD COLUMN IF NOT EXISTS establishment_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS capitalization NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS gross_sales_previous_year NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS location_map_url TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.households
  ADD COLUMN IF NOT EXISTS member_count INTEGER NOT NULL DEFAULT 1;

ALTER TABLE public.business_permits
  ADD COLUMN IF NOT EXISTS permit_type VARCHAR(100),
  ADD COLUMN IF NOT EXISTS application_year INTEGER,
  ADD COLUMN IF NOT EXISTS fee_amount NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS or_number VARCHAR(100),
  ADD COLUMN IF NOT EXISTS issued_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_number VARCHAR(50) NOT NULL UNIQUE,
  title VARCHAR(200) NOT NULL,
  category VARCHAR(80) NOT NULL DEFAULT 'Other',
  description TEXT NOT NULL DEFAULT '',
  effective_date DATE,
  expiry_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'Draft'
    CHECK (status IN ('Active', 'Repealed', 'Under Review', 'Draft')),
  enacted_by VARCHAR(150) NOT NULL DEFAULT '',
  full_text TEXT NOT NULL,
  source_file TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_policies_status ON public.policies(status);
CREATE INDEX IF NOT EXISTS idx_businesses_status ON public.businesses(status);
CREATE INDEX IF NOT EXISTS idx_business_permits_business_id ON public.business_permits(business_id);

CREATE OR REPLACE FUNCTION public.is_barangay_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.roles r ON r.id = u.role_id
    WHERE u.id = auth.uid()
      AND r.name IN ('Super Admin', 'Barangay Captain', 'Secretary', 'Treasurer', 'Staff')
  );
$$;

CREATE OR REPLACE FUNCTION public.has_module_permission(p_module TEXT, p_action TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.roles r ON r.id = u.role_id
    JOIN public.permissions p ON p.role_id = r.id
    WHERE u.id = auth.uid()
      AND (p.module = p_module OR p.module = '*')
      AND CASE p_action
        WHEN 'view' THEN p.can_view
        WHEN 'create' THEN p.can_create
        WHEN 'edit' THEN p.can_edit
        WHEN 'delete' THEN p.can_delete
        WHEN 'approve' THEN p.can_approve
        ELSE FALSE
      END
  );
$$;

REVOKE ALL ON FUNCTION public.is_barangay_staff() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_barangay_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_barangay_staff() TO anon;
REVOKE ALL ON FUNCTION public.has_module_permission(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_module_permission(TEXT, TEXT) TO authenticated;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.residents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.officials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.puroks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.precincts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_permits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_audit_logs ENABLE ROW LEVEL SECURITY;

-- Profile and permissions boundaries.
DROP POLICY IF EXISTS "Users can view own profile or staff profiles" ON public.users;
CREATE POLICY "Users can view own profile or staff profiles" ON public.users
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_barangay_staff());

DROP POLICY IF EXISTS "Staff can manage system profiles" ON public.users;
CREATE POLICY "Staff can manage system profiles" ON public.users
  FOR ALL TO authenticated
  USING (public.has_module_permission('administration', 'edit'))
  WITH CHECK (public.has_module_permission('administration', 'edit'));

DROP POLICY IF EXISTS "Authenticated users can read roles" ON public.roles;
CREATE POLICY "Authenticated users can read roles" ON public.roles
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Staff can manage roles" ON public.roles;
CREATE POLICY "Staff can manage roles" ON public.roles
  FOR ALL TO authenticated
  USING (public.has_module_permission('administration', 'edit'))
  WITH CHECK (public.has_module_permission('administration', 'edit'));

DROP POLICY IF EXISTS "Staff can read permissions" ON public.permissions;
CREATE POLICY "Staff can read permissions" ON public.permissions
  FOR SELECT TO authenticated USING (public.is_barangay_staff());

DROP POLICY IF EXISTS "Staff can manage permissions" ON public.permissions;
CREATE POLICY "Staff can manage permissions" ON public.permissions
  FOR ALL TO authenticated
  USING (public.has_module_permission('administration', 'edit'))
  WITH CHECK (public.has_module_permission('administration', 'edit'));

-- Resident and household ownership.
DROP POLICY IF EXISTS "Residents can update own verified profile" ON public.residents;
CREATE POLICY "Residents can update own verified profile" ON public.residents
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND verification_status = 'Verified')
  WITH CHECK (user_id = auth.uid() AND verification_status = 'Verified');

DROP POLICY IF EXISTS "Household records are owner or staff visible" ON public.households;
CREATE POLICY "Household records are owner or staff visible" ON public.households
  FOR SELECT TO authenticated
  USING (
    public.is_barangay_staff()
    OR household_head_id IN (SELECT id FROM public.residents WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.household_members hm
      JOIN public.residents r ON r.id = hm.resident_id
      WHERE hm.household_id = households.id AND r.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Verified residents can create household records" ON public.households;
CREATE POLICY "Verified residents can create household records" ON public.households
  FOR INSERT TO authenticated
  WITH CHECK (
    household_head_id IN (
      SELECT id FROM public.residents
      WHERE user_id = auth.uid() AND verification_status = 'Verified'
    )
  );

DROP POLICY IF EXISTS "Household owners or staff can update household records" ON public.households;
CREATE POLICY "Household owners or staff can update household records" ON public.households
  FOR UPDATE TO authenticated
  USING (public.is_barangay_staff() OR household_head_id IN (SELECT id FROM public.residents WHERE user_id = auth.uid()))
  WITH CHECK (public.is_barangay_staff() OR household_head_id IN (SELECT id FROM public.residents WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Household members are owner or staff visible" ON public.household_members;
CREATE POLICY "Household members are owner or staff visible" ON public.household_members
  FOR SELECT TO authenticated
  USING (
    public.is_barangay_staff()
    OR resident_id IN (SELECT id FROM public.residents WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Verified residents can add own household membership" ON public.household_members;
CREATE POLICY "Verified residents can add own household membership" ON public.household_members
  FOR INSERT TO authenticated
  WITH CHECK (
    resident_id IN (SELECT id FROM public.residents WHERE user_id = auth.uid() AND verification_status = 'Verified')
    OR public.is_barangay_staff()
  );

DROP POLICY IF EXISTS "Owners or staff can update household membership" ON public.household_members;
CREATE POLICY "Owners or staff can update household membership" ON public.household_members
  FOR UPDATE TO authenticated
  USING (public.is_barangay_staff() OR resident_id IN (SELECT id FROM public.residents WHERE user_id = auth.uid()))
  WITH CHECK (public.is_barangay_staff() OR resident_id IN (SELECT id FROM public.residents WHERE user_id = auth.uid()));

-- Resident-facing operational records.
DROP POLICY IF EXISTS "Residents can view own document requests" ON public.document_requests;
CREATE POLICY "Residents can view own document requests" ON public.document_requests
  FOR SELECT TO authenticated
  USING (public.is_barangay_staff() OR resident_id IN (SELECT id FROM public.residents WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Verified residents can create own document requests" ON public.document_requests;
CREATE POLICY "Verified residents can create own document requests" ON public.document_requests
  FOR INSERT TO authenticated
  WITH CHECK (resident_id IN (SELECT id FROM public.residents WHERE user_id = auth.uid() AND verification_status = 'Verified'));

DROP POLICY IF EXISTS "Staff can process document requests" ON public.document_requests;
CREATE POLICY "Staff can process document requests" ON public.document_requests
  FOR UPDATE TO authenticated
  USING (public.has_module_permission('documents', 'edit') OR public.has_module_permission('documents', 'approve'))
  WITH CHECK (public.has_module_permission('documents', 'edit') OR public.has_module_permission('documents', 'approve'));

DROP POLICY IF EXISTS "Document files are owner or staff visible" ON public.documents;
CREATE POLICY "Document files are owner or staff visible" ON public.documents
  FOR SELECT TO authenticated
  USING (
    public.is_barangay_staff()
    OR request_id IN (
      SELECT dr.id FROM public.document_requests dr
      JOIN public.residents r ON r.id = dr.resident_id
      WHERE r.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Authenticated users can read document types" ON public.document_types;
CREATE POLICY "Authenticated users can read document types" ON public.document_types
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Staff can manage document types" ON public.document_types;
CREATE POLICY "Staff can manage document types" ON public.document_types
  FOR ALL TO authenticated
  USING (public.has_module_permission('documents', 'edit'))
  WITH CHECK (public.has_module_permission('documents', 'edit'));

-- Community directory records are readable to signed-in residents; writes are staff-only.
DROP POLICY IF EXISTS "Authenticated users can read community records" ON public.officials;
CREATE POLICY "Authenticated users can read community records" ON public.officials FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Staff can manage community officials" ON public.officials;
CREATE POLICY "Staff can manage community officials" ON public.officials FOR ALL TO authenticated USING (public.has_module_permission('community', 'edit')) WITH CHECK (public.has_module_permission('community', 'edit'));

DROP POLICY IF EXISTS "Authenticated users can read puroks" ON public.puroks;
CREATE POLICY "Authenticated users can read puroks" ON public.puroks FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Staff can manage puroks" ON public.puroks;
CREATE POLICY "Staff can manage puroks" ON public.puroks FOR ALL TO authenticated USING (public.has_module_permission('community', 'edit')) WITH CHECK (public.has_module_permission('community', 'edit'));

DROP POLICY IF EXISTS "Authenticated users can read precincts" ON public.precincts;
CREATE POLICY "Authenticated users can read precincts" ON public.precincts FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Staff can manage precincts" ON public.precincts;
CREATE POLICY "Staff can manage precincts" ON public.precincts FOR ALL TO authenticated USING (public.has_module_permission('community', 'edit')) WITH CHECK (public.has_module_permission('community', 'edit'));

-- Business records use barangay/LGU business-permitting terminology while retaining owner privacy.
DROP POLICY IF EXISTS "Business records are owner or staff visible" ON public.businesses;
CREATE POLICY "Business records are owner or staff visible" ON public.businesses FOR SELECT TO authenticated
  USING (public.is_barangay_staff() OR owner_id IN (SELECT id FROM public.residents WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "Verified residents can register businesses" ON public.businesses;
CREATE POLICY "Verified residents can register businesses" ON public.businesses FOR INSERT TO authenticated
  WITH CHECK (owner_id IN (SELECT id FROM public.residents WHERE user_id = auth.uid() AND verification_status = 'Verified'));
DROP POLICY IF EXISTS "Business owners or staff can update businesses" ON public.businesses;
CREATE POLICY "Business owners or staff can update businesses" ON public.businesses FOR UPDATE TO authenticated
  USING (public.is_barangay_staff() OR owner_id IN (SELECT id FROM public.residents WHERE user_id = auth.uid()))
  WITH CHECK (public.is_barangay_staff() OR owner_id IN (SELECT id FROM public.residents WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Business permits are owner or staff visible" ON public.business_permits;
CREATE POLICY "Business permits are owner or staff visible" ON public.business_permits FOR SELECT TO authenticated
  USING (public.is_barangay_staff() OR business_id IN (SELECT b.id FROM public.businesses b JOIN public.residents r ON r.id = b.owner_id WHERE r.user_id = auth.uid()));
DROP POLICY IF EXISTS "Staff can manage business permits" ON public.business_permits;
CREATE POLICY "Staff can manage business permits" ON public.business_permits FOR ALL TO authenticated
  USING (public.has_module_permission('business', 'edit') OR public.has_module_permission('business', 'approve'))
  WITH CHECK (public.has_module_permission('business', 'edit') OR public.has_module_permission('business', 'approve'));

-- Communications, transaction history, and audit records.
DROP POLICY IF EXISTS "Staff can read resident notifications" ON public.notifications;
CREATE POLICY "Staff can read resident notifications" ON public.notifications FOR SELECT TO authenticated
  USING (public.has_module_permission('communication', 'view'));

DROP POLICY IF EXISTS "Published announcements are readable" ON public.announcements;
CREATE POLICY "Published announcements are readable" ON public.announcements FOR SELECT TO authenticated
  USING (status = 'Published' OR public.has_module_permission('communication', 'view'));
DROP POLICY IF EXISTS "Staff can manage announcements" ON public.announcements;
CREATE POLICY "Staff can manage announcements" ON public.announcements FOR ALL TO authenticated
  USING (public.has_module_permission('communication', 'edit') OR public.has_module_permission('communication', 'create'))
  WITH CHECK (public.has_module_permission('communication', 'edit') OR public.has_module_permission('communication', 'create'));

DROP POLICY IF EXISTS "Appointments are owner or staff visible" ON public.appointments;
CREATE POLICY "Appointments are owner or staff visible" ON public.appointments FOR SELECT TO authenticated
  USING (public.is_barangay_staff() OR resident_id IN (SELECT id FROM public.residents WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "Verified residents can create appointments" ON public.appointments;
CREATE POLICY "Verified residents can create appointments" ON public.appointments FOR INSERT TO authenticated
  WITH CHECK (resident_id IN (SELECT id FROM public.residents WHERE user_id = auth.uid() AND verification_status = 'Verified'));
DROP POLICY IF EXISTS "Staff can process appointments" ON public.appointments;
CREATE POLICY "Staff can process appointments" ON public.appointments FOR UPDATE TO authenticated
  USING (public.has_module_permission('communication', 'edit'))
  WITH CHECK (public.has_module_permission('communication', 'edit'));

DROP POLICY IF EXISTS "Residents can view own transactions" ON public.transactions;
CREATE POLICY "Residents can view own transactions" ON public.transactions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_module_permission('communication', 'view'));
DROP POLICY IF EXISTS "Authenticated users can write own transactions" ON public.transactions;
CREATE POLICY "Authenticated users can write own transactions" ON public.transactions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_barangay_staff());

DROP POLICY IF EXISTS "Administration can select audit logs" ON public.audit_logs;
CREATE POLICY "Administration can select audit logs" ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_module_permission('administration', 'view') OR user_id = auth.uid());
DROP POLICY IF EXISTS "Authenticated users can insert own audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated users can insert own audit logs" ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Active policy text is public to signed-in residents; only staff can author it.
DROP POLICY IF EXISTS "Authenticated users can read active policies" ON public.policies;
CREATE POLICY "Authenticated users can read active policies" ON public.policies FOR SELECT TO authenticated
  USING (status = 'Active' OR public.has_module_permission('documents', 'view'));
DROP POLICY IF EXISTS "Staff can manage policies" ON public.policies;
CREATE POLICY "Staff can manage policies" ON public.policies FOR ALL TO authenticated
  USING (public.has_module_permission('documents', 'edit') OR public.has_module_permission('documents', 'create'))
  WITH CHECK (public.has_module_permission('documents', 'edit') OR public.has_module_permission('documents', 'create'));

DROP POLICY IF EXISTS "Authenticated users can insert own AI audits" ON public.ai_audit_logs;
CREATE POLICY "Authenticated users can insert own AI audits" ON public.ai_audit_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Anonymous users can insert anonymous AI audits" ON public.ai_audit_logs;
CREATE POLICY "Anonymous users can insert anonymous AI audits" ON public.ai_audit_logs FOR INSERT TO anon
  WITH CHECK (user_id IS NULL);

-- Keep the admin dashboard's counts and the AI's live data current after onboarding.
CREATE INDEX IF NOT EXISTS idx_residents_onboarding ON public.residents(household_onboarding_completed);
