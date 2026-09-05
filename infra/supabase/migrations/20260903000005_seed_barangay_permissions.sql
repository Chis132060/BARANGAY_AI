-- Ensure database RLS permissions match the Admin Portal's barangay roles.
-- This prevents a role from appearing authorized in the UI while Supabase
-- silently blocks its database operation.

WITH defaults(role_name, module, can_view, can_create, can_edit, can_delete, can_approve) AS (
  VALUES
    ('Super Admin', '*', true, true, true, true, true),
    ('Barangay Captain', 'dashboard', true, false, false, false, true),
    ('Barangay Captain', 'residents', true, true, true, false, true),
    ('Barangay Captain', 'documents', true, true, true, false, true),
    ('Barangay Captain', 'community', true, true, true, false, true),
    ('Barangay Captain', 'business', true, true, true, false, true),
    ('Barangay Captain', 'communication', true, true, true, true, true),
    ('Barangay Captain', 'administration', true, false, true, false, false),
    ('Secretary', 'dashboard', true, false, false, false, false),
    ('Secretary', 'residents', true, true, true, false, true),
    ('Secretary', 'documents', true, true, true, false, true),
    ('Secretary', 'community', true, true, true, false, false),
    ('Secretary', 'business', true, true, true, false, false),
    ('Secretary', 'communication', true, true, true, true, false),
    ('Secretary', 'administration', true, false, false, false, false),
    ('Treasurer', 'dashboard', true, false, false, false, false),
    ('Treasurer', 'residents', true, false, false, false, false),
    ('Treasurer', 'documents', true, false, false, false, false),
    ('Treasurer', 'business', true, true, true, false, true),
    ('Treasurer', 'communication', true, false, false, false, false),
    ('Staff', 'dashboard', true, false, false, false, false),
    ('Staff', 'residents', true, true, false, false, false),
    ('Staff', 'documents', true, true, false, false, false),
    ('Staff', 'community', true, false, false, false, false),
    ('Staff', 'business', true, false, false, false, false),
    ('Staff', 'communication', true, true, false, false, false)
)
INSERT INTO public.permissions (role_id, module, can_view, can_create, can_edit, can_delete, can_approve)
SELECT r.id, d.module, d.can_view, d.can_create, d.can_edit, d.can_delete, d.can_approve
FROM defaults d
JOIN public.roles r ON r.name = d.role_name
ON CONFLICT (role_id, module) DO UPDATE SET
  can_view = EXCLUDED.can_view,
  can_create = EXCLUDED.can_create,
  can_edit = EXCLUDED.can_edit,
  can_delete = EXCLUDED.can_delete,
  can_approve = EXCLUDED.can_approve;
