ALTER TABLE public.residents
  ADD COLUMN IF NOT EXISTS user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS email TEXT;

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS details JSONB;

CREATE INDEX IF NOT EXISTS idx_residents_user_id ON public.residents(user_id);
CREATE INDEX IF NOT EXISTS idx_residents_verification_status ON public.residents(verification_status);

INSERT INTO public.roles (name)
VALUES ('Resident')
ON CONFLICT (name) DO NOTHING;

WITH resident_role AS (
  SELECT id FROM public.roles WHERE name = 'Resident' LIMIT 1
)
INSERT INTO public.permissions (
  role_id,
  module,
  can_view,
  can_create,
  can_edit,
  can_delete,
  can_approve
)
SELECT resident_role.id, seed.module, seed.can_view, false, false, false, false
FROM resident_role
CROSS JOIN (
  VALUES
    ('announcements', true),
    ('documents', true),
    ('residents', true)
) AS seed(module, can_view)
ON CONFLICT (role_id, module) DO UPDATE SET
  can_view = EXCLUDED.can_view,
  can_create = false,
  can_edit = false,
  can_delete = false,
  can_approve = false;

CREATE OR REPLACE FUNCTION public.has_permission(p_module text, p_action text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_allowed boolean;
BEGIN
  SELECT
    CASE p_action
      WHEN 'can_view' THEN permissions.can_view
      WHEN 'can_create' THEN permissions.can_create
      WHEN 'can_edit' THEN permissions.can_edit
      WHEN 'can_delete' THEN permissions.can_delete
      WHEN 'can_approve' THEN permissions.can_approve
      ELSE false
    END
  INTO v_allowed
  FROM public.users
  JOIN public.permissions ON permissions.role_id = users.role_id
  WHERE users.id = auth.uid()
    AND (permissions.module = p_module OR permissions.module = '*')
  ORDER BY CASE WHEN permissions.module = '*' THEN 1 ELSE 0 END
  LIMIT 1;

  RETURN COALESCE(v_allowed, false);
END;
$$;

REVOKE ALL ON FUNCTION public.has_permission(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_permission(text, text) TO authenticated;

ALTER TABLE public.residents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'residents' AND policyname = 'Residents can select own row'
  ) THEN
    CREATE POLICY "Residents can select own row" ON public.residents
      FOR SELECT TO authenticated
      USING (user_id = auth.uid() OR public.has_permission('residents', 'can_view'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'residents' AND policyname = 'Residents can insert own pending row'
  ) THEN
    CREATE POLICY "Residents can insert own pending row" ON public.residents
      FOR INSERT TO authenticated
      WITH CHECK (verification_status = 'Pending');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'residents' AND policyname = 'Staff can approve resident rows'
  ) THEN
    CREATE POLICY "Staff can approve resident rows" ON public.residents
      FOR UPDATE TO authenticated
      USING (public.has_permission('residents', 'can_approve'))
      WITH CHECK (public.has_permission('residents', 'can_approve'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'addresses' AND policyname = 'Residents and staff can select addresses'
  ) THEN
    CREATE POLICY "Residents and staff can select addresses" ON public.addresses
      FOR SELECT TO authenticated
      USING (
        public.has_permission('residents', 'can_view')
        OR EXISTS (
          SELECT 1 FROM public.residents
          WHERE residents.id = addresses.resident_id
            AND residents.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'addresses' AND policyname = 'Residents and staff can insert addresses'
  ) THEN
    CREATE POLICY "Residents and staff can insert addresses" ON public.addresses
      FOR INSERT TO authenticated
      WITH CHECK (
        public.has_permission('residents', 'can_view')
        OR EXISTS (
          SELECT 1 FROM public.residents
          WHERE residents.id = addresses.resident_id
            AND residents.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'addresses' AND policyname = 'Residents and staff can update addresses'
  ) THEN
    CREATE POLICY "Residents and staff can update addresses" ON public.addresses
      FOR UPDATE TO authenticated
      USING (
        public.has_permission('residents', 'can_view')
        OR EXISTS (
          SELECT 1 FROM public.residents
          WHERE residents.id = addresses.resident_id
            AND residents.user_id = auth.uid()
        )
      )
      WITH CHECK (
        public.has_permission('residents', 'can_view')
        OR EXISTS (
          SELECT 1 FROM public.residents
          WHERE residents.id = addresses.resident_id
            AND residents.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'addresses' AND policyname = 'Residents and staff can delete addresses'
  ) THEN
    CREATE POLICY "Residents and staff can delete addresses" ON public.addresses
      FOR DELETE TO authenticated
      USING (
        public.has_permission('residents', 'can_view')
        OR EXISTS (
          SELECT 1 FROM public.residents
          WHERE residents.id = addresses.resident_id
            AND residents.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'audit_logs' AND policyname = 'Administration can select audit logs'
  ) THEN
    CREATE POLICY "Administration can select audit logs" ON public.audit_logs
      FOR SELECT TO authenticated
      USING (public.has_permission('administration', 'can_view'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'audit_logs' AND policyname = 'Authenticated users can insert audit logs'
  ) THEN
    CREATE POLICY "Authenticated users can insert audit logs" ON public.audit_logs
      FOR INSERT TO authenticated
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END;
$$;

-- Realtime: broadcast residents changes so the admin verification queue updates live
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'residents'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.residents;
    END IF;
  END IF;
END;
$$;
