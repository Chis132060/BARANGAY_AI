-- Atomically replace a role's permissions under the current administrator's authority.
-- Deploy this migration before deploying the matching admin portal code.
CREATE OR REPLACE FUNCTION public.replace_role_permissions(
  p_role_id uuid,
  p_permissions jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  entry jsonb;
  actor_role text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT r.name INTO actor_role FROM public.users u
  JOIN public.roles r ON r.id = u.role_id WHERE u.id = auth.uid();
  IF actor_role NOT IN ('Super Admin', 'Barangay Captain') THEN
    RAISE EXCEPTION 'Administrator privileges required';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.roles WHERE id = p_role_id) THEN
    RAISE EXCEPTION 'Role not found';
  END IF;
  IF jsonb_typeof(p_permissions) IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_permissions) > 100 THEN
    RAISE EXCEPTION 'Invalid permissions';
  END IF;
  FOR entry IN SELECT value FROM jsonb_array_elements(p_permissions) LOOP
    IF jsonb_typeof(entry) <> 'object'
       OR jsonb_typeof(entry->'module') <> 'string'
       OR length(trim(entry->>'module')) = 0
       OR EXISTS (SELECT 1 FROM unnest(ARRAY['can_view','can_create','can_edit','can_delete','can_approve']) AS k
          WHERE jsonb_typeof(entry->k) IS DISTINCT FROM 'boolean') THEN
      RAISE EXCEPTION 'Invalid permission entry';
    END IF;
  END LOOP;
  DELETE FROM public.permissions WHERE role_id = p_role_id;
  INSERT INTO public.permissions(role_id,module,can_view,can_create,can_edit,can_delete,can_approve)
  SELECT p_role_id, x.module, x.can_view, x.can_create, x.can_edit, x.can_delete, x.can_approve
  FROM jsonb_to_recordset(p_permissions) AS x(module text, can_view boolean,
    can_create boolean, can_edit boolean, can_delete boolean, can_approve boolean);
END;
$$;
REVOKE ALL ON FUNCTION public.replace_role_permissions(uuid,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.replace_role_permissions(uuid,jsonb) TO authenticated;
