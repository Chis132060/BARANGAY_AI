-- Safe household integrity constraints.
-- Household creation currently inserts the head membership in a separate request.
-- A deferred constraint trigger on households would still fire at the end of
-- the first request and reject legitimate new households. Do not install it
-- until household + membership creation is made atomic in a single RPC.
-- Check existing duplicate assignments before applying in production.
create unique index if not exists household_members_unique_resident
  on public.household_members (resident_id);
create unique index if not exists households_unique_number
  on public.households (lower(trim(household_number)));

-- Read-only audit for household heads not linked to their own household:
-- select h.id from public.households h where h.household_head_id is not null
-- and not exists (select 1 from public.household_members hm
--                 where hm.household_id=h.id and hm.resident_id=h.household_head_id);
