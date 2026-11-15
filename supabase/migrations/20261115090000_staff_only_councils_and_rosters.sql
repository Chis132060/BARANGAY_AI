-- Additive, staff-only governance registry. No synthetic councils, officers or appointments.
-- Official rosters must be entered by authorized barangay staff with source references.
-- Council members are NOT program beneficiaries or general organization members.

create table if not exists public.barangay_councils (
  id uuid primary key default gen_random_uuid(),
  name varchar(160) not null check (char_length(btrim(name)) between 3 and 160),
  code varchar(32) unique,
  kind varchar(20) not null check (kind in ('Council','Committee')),
  mandate text,
  mandate_reference text,
  established_date date,
  status varchar(20) not null default 'Draft' check (status in ('Draft','Active','Inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint council_activation_requires_authority
    check (status <> 'Active' or nullif(btrim(coalesce(mandate_reference,'')), '') is not null)
);

create table if not exists public.barangay_council_members (
  id uuid primary key default gen_random_uuid(),
  council_id uuid not null references public.barangay_councils(id) on delete cascade,
  resident_id uuid references public.residents(id) on delete set null,
  organization_id uuid references public.barangay_organizations(id) on delete set null,
  full_name varchar(160) not null check (char_length(btrim(full_name)) between 2 and 160),
  position varchar(40) not null check (position in (
    'Chairperson', 'Vice Chairperson', 'Secretary', 'Treasurer',
    'Member', 'Sector Representative', 'Organization Representative', 'Coordinator'
  )),
  appointment_reference text,
  verification_status varchar(20) not null default 'Pending'
    check (verification_status in ('Pending','Verified')),
  term_start date,
  term_end date,
  created_at timestamptz not null default now(),
  constraint council_member_verified_source_required
    check (verification_status <> 'Verified' or nullif(btrim(coalesce(appointment_reference,'')), '') is not null),
  constraint council_member_term_order check (term_end is null or term_start is null or term_end >= term_start)
);

create table if not exists public.barangay_council_programs (
  council_id uuid not null references public.barangay_councils(id) on delete cascade,
  program_id uuid not null references public.barangay_programs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (council_id, program_id)
);

create index if not exists council_members_council_idx on public.barangay_council_members(council_id);
create index if not exists council_members_organization_idx on public.barangay_council_members(organization_id);
create index if not exists council_programs_program_idx on public.barangay_council_programs(program_id);
create index if not exists councils_status_idx on public.barangay_councils(status);

alter table public.barangay_councils enable row level security;
alter table public.barangay_council_members enable row level security;
alter table public.barangay_council_programs enable row level security;

-- Explicitly deny anonymous/public API access to governance rosters.
revoke all on table public.barangay_councils from public, anon;
revoke all on table public.barangay_council_members from public, anon;
revoke all on table public.barangay_council_programs from public, anon;
grant select, insert, update, delete on table public.barangay_councils to authenticated;
grant select, insert, update, delete on table public.barangay_council_members to authenticated;
grant select, insert, update, delete on table public.barangay_council_programs to authenticated;
grant all on table public.barangay_councils to service_role;
grant all on table public.barangay_council_members to service_role;
grant all on table public.barangay_council_programs to service_role;

create policy council_staff_only on public.barangay_councils
  for all to authenticated using (public.is_barangay_staff())
  with check (public.is_barangay_staff());
create policy council_members_staff_only on public.barangay_council_members
  for all to authenticated using (public.is_barangay_staff())
  with check (public.is_barangay_staff());
create policy council_programs_staff_only on public.barangay_council_programs
  for all to authenticated using (public.is_barangay_staff())
  with check (public.is_barangay_staff());

comment on table public.barangay_councils is
  'Official governance bodies; starts empty, activation requires a source/authority reference.';
comment on table public.barangay_council_members is
  'Council appointments distinct from program beneficiaries. Verified assignments require an appointment reference.';
