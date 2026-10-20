-- Prevent concurrent household assignment and duplicate household numbers.
-- Before applying, resolve existing duplicates (migration intentionally fails if present).
create unique index if not exists household_members_unique_resident
  on public.household_members (resident_id);
create unique index if not exists households_unique_number
  on public.households (lower(trim(household_number)));

-- A household head must be a member of the same household.
-- Validate existing data before enabling this trigger in production.
create or replace function public.validate_household_head()
returns trigger language plpgsql set search_path=public as $$
begin
  if new.household_head_id is not null and not exists (
    select 1 from public.household_members hm
    where hm.household_id = new.id and hm.resident_id = new.household_head_id
  ) then
    raise exception 'Household head must be an existing member';
  end if;
  return new;
end; $$;
drop trigger if exists household_head_member_check on public.households;
create constraint trigger household_head_member_check
after insert or update of household_head_id on public.households
deferrable initially deferred for each row
execute function public.validate_household_head();
