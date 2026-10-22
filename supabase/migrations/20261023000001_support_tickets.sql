-- Resident support ticket workflow. Apply in staging before merging.
create table if not exists public.support_tickets (
 id uuid primary key default gen_random_uuid(),
 resident_user_id uuid not null references auth.users(id) on delete restrict,
 category text not null check (category in ('Account','Documents','Technical','Privacy','Other')),
 subject text not null check (char_length(subject) between 5 and 160),
 description text not null check (char_length(description) between 10 and 4000),
 status text not null default 'Submitted' check (status in ('Submitted','In Review','Resolved','Closed')),
 staff_reply text check (staff_reply is null or char_length(staff_reply) <= 4000),
 assigned_staff_id uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists support_tickets_resident_created_idx on public.support_tickets(resident_user_id, created_at desc);
create index if not exists support_tickets_status_created_idx on public.support_tickets(status, created_at desc);
alter table public.support_tickets enable row level security;
grant select,insert,update on public.support_tickets to authenticated;
drop policy if exists support_tickets_resident_select on public.support_tickets;
create policy support_tickets_resident_select on public.support_tickets for select to authenticated
 using (resident_user_id=(select auth.uid()));
drop policy if exists support_tickets_resident_insert on public.support_tickets;
create policy support_tickets_resident_insert on public.support_tickets for insert to authenticated
 with check (resident_user_id=(select auth.uid()) and status='Submitted' and staff_reply is null and assigned_staff_id is null);
-- Residents are deliberately not given UPDATE. Staff policies are intentionally
-- scoped to staff roles; authorization is repeated in server actions.
drop policy if exists support_tickets_staff_select on public.support_tickets;
create policy support_tickets_staff_select on public.support_tickets for select to authenticated
 using (exists(select 1 from public.users u join public.roles r on r.id=u.role_id
               where u.id=(select auth.uid()) and r.name in ('Super Admin','Barangay Captain','Secretary','Staff')));
drop policy if exists support_tickets_staff_update on public.support_tickets;
create policy support_tickets_staff_update on public.support_tickets for update to authenticated
 using (exists(select 1 from public.users u join public.roles r on r.id=u.role_id
               where u.id=(select auth.uid()) and r.name in ('Super Admin','Barangay Captain','Secretary','Staff')))
 with check (exists(select 1 from public.users u join public.roles r on r.id=u.role_id
               where u.id=(select auth.uid()) and r.name in ('Super Admin','Barangay Captain','Secretary','Staff')));
