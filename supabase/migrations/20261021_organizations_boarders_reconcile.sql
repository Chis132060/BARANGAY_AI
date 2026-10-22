-- Reconcile missing boarders/organization tables without altering existing program tables.
-- Review against production schema before applying. No synthetic production records.
create table if not exists public.boarders (
  id uuid primary key default gen_random_uuid(),
  first_name varchar(50) not null,
  middle_name varchar(50),
  last_name varchar(50) not null,
  birth_date date not null,
  gender varchar(10),
  civil_status varchar(20),
  contact_number varchar(20),
  id_type varchar(50),
  landlord_name varchar(100),
  landlord_contact varchar(20),
  property_address text,
  purok varchar(50),
  monthly_rent numeric(10,2),
  move_in_date date,
  status varchar(20) not null default 'Active' check (status in ('Active','Inactive','Left')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.barangay_organizations (
  id uuid primary key default gen_random_uuid(),
  name varchar(150) not null,
  code varchar(30),
  description text,
  org_type varchar(50) not null default 'Community',
  is_custom boolean not null default true,
  president varchar(100),
  contact varchar(20),
  established_date date,
  status varchar(20) not null default 'Inactive' check (status in ('Active','Inactive','On Hold')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.barangay_organizations(id) on delete cascade,
  resident_id uuid references public.residents(id) on delete set null,
  full_name varchar(150) not null,
  contact_number varchar(20),
  purok varchar(50),
  role varchar(50) default 'Member',
  date_joined date not null default current_date,
  status varchar(20) not null default 'Active',
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists organization_members_org_idx on public.organization_members(organization_id);
create index if not exists boarders_purok_idx on public.boarders(purok);
alter table public.boarders enable row level security;
alter table public.barangay_organizations enable row level security;
alter table public.organization_members enable row level security;
-- Reconcile old and new policy names before adding the canonical policies.
-- Avoid permissive duplicate policies that can bypass staff-only access.
drop policy if exists "staff_boarders" on public.boarders;
drop policy if exists "boarders_staff_only" on public.boarders;
create policy "boarders_staff_only" on public.boarders for all to authenticated
using (public.is_barangay_staff()) with check (public.is_barangay_staff());

drop policy if exists "staff_organizations_write" on public.barangay_organizations;
drop policy if exists "org_staff_write" on public.barangay_organizations;
create policy "org_staff_write" on public.barangay_organizations for all to authenticated
using (public.is_barangay_staff()) with check (public.is_barangay_staff());
drop policy if exists "active_organizations_read" on public.barangay_organizations;
drop policy if exists "org_active_read" on public.barangay_organizations;
create policy "org_active_read" on public.barangay_organizations for select to authenticated
using (status = 'Active');

drop policy if exists "staff_organization_members" on public.organization_members;
drop policy if exists "org_members_staff_only" on public.organization_members;
drop policy if exists "Authenticated can view org members" on public.organization_members;
create policy "org_members_staff_only" on public.organization_members for all to authenticated
using (public.is_barangay_staff()) with check (public.is_barangay_staff());
