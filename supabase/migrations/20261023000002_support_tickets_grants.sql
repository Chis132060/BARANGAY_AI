-- Defense in depth for support ticket permissions.
-- RLS still enforces per-resident ownership and staff-only status updates.
revoke all privileges on table public.support_tickets from anon;
revoke delete, truncate, references, trigger on table public.support_tickets from authenticated;
grant select, insert, update on table public.support_tickets to authenticated;
