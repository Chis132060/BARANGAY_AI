-- Atomic, bounded resident CSV import. Review against current RBAC policies before deployment.
create or replace function public.import_barangay_residents(p_rows jsonb)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  item jsonb;
  rid uuid;
  imported integer := 0;
  key_text text;
  seen_keys text[] := array[]::text[];
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not exists (
    select 1 from public.users u join public.roles r on r.id=u.role_id
    where u.id=auth.uid() and r.name in ('Super Admin','Barangay Captain','Secretary','Staff')
  ) then raise exception 'Staff permission required'; end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) not between 1 and 200 then
    raise exception 'Expected 1 to 200 residents';
  end if;
  for item in select value from jsonb_array_elements(p_rows) loop
    if nullif(trim(item->>'first_name'),'') is null
       or nullif(trim(item->>'last_name'),'') is null
       or nullif(trim(item->>'street'),'') is null
       or nullif(trim(item->>'purok'),'') is null
       or (item->>'gender') not in ('Male','Female','Other')
       or (item->>'civil_status') not in ('Single','Married','Widowed','Divorced')
       or (item->>'birth_date') is null then
      raise exception 'Invalid resident row';
    end if;
    key_text := lower(trim(item->>'first_name') || '|' || trim(item->>'last_name') || '|' || (item->>'birth_date'));
    if key_text = any(seen_keys) then raise exception 'Duplicate resident within import'; end if;
    seen_keys := array_append(seen_keys,key_text);
    if exists (
      select 1 from public.residents r
      where lower(trim(r.first_name))=lower(trim(item->>'first_name'))
        and lower(trim(r.last_name))=lower(trim(item->>'last_name'))
        and r.birth_date=(item->>'birth_date')::date
    ) then raise exception 'Resident already exists: % %',item->>'first_name',item->>'last_name'; end if;
    insert into public.residents (
      first_name,middle_name,last_name,birth_date,gender,civil_status,contact_number,
      voter_status,senior_status,pwd_status,four_ps_status
    ) values (
      trim(item->>'first_name'),nullif(trim(coalesce(item->>'middle_name','')),''),
      trim(item->>'last_name'),(item->>'birth_date')::date,item->>'gender',item->>'civil_status',
      nullif(trim(coalesce(item->>'contact_number','')),''),false,false,false,false
    ) returning id into rid;
    insert into public.addresses(resident_id,house_number,street,purok)
    values(rid,nullif(trim(coalesce(item->>'house_number','')),''),trim(item->>'street'),trim(item->>'purok'));
    imported := imported + 1;
  end loop;
  return imported;
end;
$$;
revoke all on function public.import_barangay_residents(jsonb) from public, anon;
grant execute on function public.import_barangay_residents(jsonb) to authenticated;
