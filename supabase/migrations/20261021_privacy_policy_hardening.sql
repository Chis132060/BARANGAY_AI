-- Existing permissive SELECT policies override restrictive staff policies.
-- Remove them after the organization/boarder reconciliation migration is applied.
drop policy if exists "Authenticated can view org members" on public.organization_members;
drop policy if exists "Authenticated can view enrollees" on public.program_enrollees;
-- Keep public-facing organization/program metadata accessible to authenticated residents.
-- Membership rosters and application contact details remain staff-only.
