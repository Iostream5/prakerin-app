-- Bridge legacy schema (role_id/module-action based) to app contract
-- Target: txwyjorsgdiwbvlqbjpy

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum (
      'ks',
      'hubdin',
      'operator',
      'kaprog',
      'pembimbing_sekolah',
      'pembimbing_perusahaan',
      'siswa'
    );
  end if;
end
$$;

alter table if exists public.roles add column if not exists slug public.app_role;
alter table if exists public.roles add column if not exists is_system boolean not null default true;
alter table if exists public.roles add column if not exists updated_at timestamptz not null default now();

update public.roles
set slug = case
  when lower(replace(name, '-', '_')) in (
    'ks','hubdin','operator','kaprog','pembimbing_sekolah','pembimbing_perusahaan','siswa'
  ) then lower(replace(name, '-', '_'))::public.app_role
  else slug
end
where slug is null;

alter table if exists public.permissions add column if not exists code text;
alter table if exists public.permissions add column if not exists name text;
alter table if exists public.permissions add column if not exists updated_at timestamptz not null default now();

update public.permissions
set code = lower(module || '.' || action)
where code is null
  and module is not null
  and action is not null;

update public.permissions
set name = coalesce(name, code, module || '.' || action, 'permission')
where name is null;

alter table if exists public.user_roles add column if not exists role public.app_role;
alter table if exists public.user_roles add column if not exists assigned_by uuid references auth.users (id) on delete set null;
alter table if exists public.user_roles add column if not exists updated_at timestamptz not null default now();

alter table if exists public.role_permissions add column if not exists role public.app_role;
alter table if exists public.role_permissions add column if not exists granted boolean not null default true;
alter table if exists public.role_permissions add column if not exists updated_at timestamptz not null default now();

update public.user_roles ur
set role = r.slug
from public.roles r
where ur.role is null
  and ur.role_id = r.id
  and r.slug is not null;

update public.role_permissions rp
set role = r.slug
from public.roles r
where rp.role is null
  and rp.role_id = r.id
  and r.slug is not null;

create unique index if not exists user_roles_user_id_role_key
  on public.user_roles (user_id, role)
  where role is not null;

create unique index if not exists role_permissions_role_permission_id_key
  on public.role_permissions (role, permission_id)
  where role is not null;

alter table if exists public.supervisors add column if not exists role public.app_role;
update public.supervisors
set role = case
  when type = 'school' then 'pembimbing_sekolah'::public.app_role
  when type = 'company' then 'pembimbing_perusahaan'::public.app_role
  else role
end
where role is null;

alter table if exists public.companies add column if not exists code text;
alter table if exists public.companies add column if not exists province text;
alter table if exists public.companies add column if not exists latitude numeric(10, 7);
alter table if exists public.companies add column if not exists longitude numeric(10, 7);
alter table if exists public.companies add column if not exists active boolean not null default true;
update public.companies set active = coalesce(is_active, true) where active is null;

alter table if exists public.placements add column if not exists notes text;

alter table if exists public.journals add column if not exists journal_date date;
alter table if exists public.journals add column if not exists title text;
alter table if exists public.journals add column if not exists content text;
alter table if exists public.journals add column if not exists feedback text;
update public.journals
set journal_date = coalesce(journal_date, date),
    title = coalesce(title, case when activity is null then 'Jurnal Harian' else left(activity, 120) end),
    content = coalesce(content, activity, notes, ''),
    feedback = coalesce(feedback, notes)
where journal_date is null or title is null or content is null or feedback is null;

alter table if exists public.attendance add column if not exists attendance_date date;
alter table if exists public.attendance add column if not exists checkin_at timestamptz;
alter table if exists public.attendance add column if not exists checkout_at timestamptz;
alter table if exists public.attendance add column if not exists checkin_lat numeric(10, 7);
alter table if exists public.attendance add column if not exists checkin_lng numeric(10, 7);
alter table if exists public.attendance add column if not exists checkout_lat numeric(10, 7);
alter table if exists public.attendance add column if not exists checkout_lng numeric(10, 7);
alter table if exists public.attendance add column if not exists checkin_photo_url text;
alter table if exists public.attendance add column if not exists checkout_photo_url text;
alter table if exists public.attendance add column if not exists note text;
alter table if exists public.attendance add column if not exists updated_at timestamptz not null default now();

update public.attendance
set attendance_date = coalesce(attendance_date, date),
    checkin_at = coalesce(checkin_at, check_in_time),
    checkout_at = coalesce(checkout_at, check_out_time),
    checkin_lat = coalesce(checkin_lat, check_in_latitude),
    checkin_lng = coalesce(checkin_lng, check_in_longitude),
    checkout_lat = coalesce(checkout_lat, check_out_latitude),
    checkout_lng = coalesce(checkout_lng, check_out_longitude),
    note = coalesce(note, notes),
    checkin_photo_url = coalesce(checkin_photo_url, check_in_photo_url),
    checkout_photo_url = coalesce(checkout_photo_url, check_out_photo_url)
where attendance_date is null
   or checkin_at is null
   or checkout_at is null
   or checkin_lat is null
   or checkin_lng is null
   or checkout_lat is null
   or checkout_lng is null
   or note is null
   or checkin_photo_url is null
   or checkout_photo_url is null;

update public.attendance
set status = case
  when status = 'present' then 'hadir'
  when status = 'absent' then 'alpha'
  when status = 'late' then 'hadir'
  when status = 'excused' then 'izin'
  else status
end;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'attendance_status_check'
      and conrelid = 'public.attendance'::regclass
  ) then
    alter table public.attendance drop constraint attendance_status_check;
  end if;
exception
  when undefined_table then null;
end
$$;

alter table if exists public.attendance
  add constraint attendance_status_check
  check (status = any (array['hadir','izin','sakit','alpha']));

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'journals_status_check'
      and conrelid = 'public.journals'::regclass
  ) then
    alter table public.journals drop constraint journals_status_check;
  end if;
exception
  when undefined_table then null;
end
$$;

alter table if exists public.journals
  add constraint journals_status_check
  check (status = any (array['draft','submitted','validated','rejected']));

update public.journals set status = 'submitted' where status = 'pending';

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'placements_status_check'
      and conrelid = 'public.placements'::regclass
  ) then
    alter table public.placements drop constraint placements_status_check;
  end if;
exception
  when undefined_table then null;
end
$$;

alter table if exists public.placements
  add constraint placements_status_check
  check (status = any (array['pending','active','completed','cancelled']));

alter table if exists public.grades add column if not exists technical_score numeric(5, 2);
alter table if exists public.grades add column if not exists discipline_score numeric(5, 2);
alter table if exists public.grades add column if not exists communication_score numeric(5, 2);
alter table if exists public.grades add column if not exists updated_at timestamptz not null default now();

update public.grades
set technical_score = coalesce(technical_score, skill_score),
    discipline_score = coalesce(discipline_score, attitude_score),
    communication_score = coalesce(communication_score, knowledge_score)
where technical_score is null or discipline_score is null or communication_score is null;

create unique index if not exists grades_placement_id_key on public.grades (placement_id);

alter table if exists public.activity_logs add column if not exists entity_type text;
alter table if exists public.activity_logs add column if not exists entity_id uuid;
update public.activity_logs set entity_type = coalesce(entity_type, module, 'system') where entity_type is null;

create or replace function public.sync_role_name_slug()
returns trigger
language plpgsql
as $$
begin
  if new.slug is null and new.name is not null then
    if lower(replace(new.name, '-', '_')) in (
      'ks','hubdin','operator','kaprog','pembimbing_sekolah','pembimbing_perusahaan','siswa'
    ) then
      new.slug := lower(replace(new.name, '-', '_'))::public.app_role;
    end if;
  end if;

  if new.name is null and new.slug is not null then
    new.name := new.slug::text;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_sync_role_name_slug on public.roles;
create trigger trg_sync_role_name_slug
before insert or update on public.roles
for each row execute function public.sync_role_name_slug();

create or replace function public.sync_user_roles_role_columns()
returns trigger
language plpgsql
as $$
begin
  if new.role is null and new.role_id is not null then
    select r.slug into new.role from public.roles r where r.id = new.role_id;
  end if;

  if new.role_id is null and new.role is not null then
    select r.id into new.role_id from public.roles r where r.slug = new.role;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_sync_user_roles_role_columns on public.user_roles;
create trigger trg_sync_user_roles_role_columns
before insert or update on public.user_roles
for each row execute function public.sync_user_roles_role_columns();

create or replace function public.sync_role_permissions_role_columns()
returns trigger
language plpgsql
as $$
begin
  if new.role is null and new.role_id is not null then
    select r.slug into new.role from public.roles r where r.id = new.role_id;
  end if;

  if new.role_id is null and new.role is not null then
    select r.id into new.role_id from public.roles r where r.slug = new.role;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_sync_role_permissions_role_columns on public.role_permissions;
create trigger trg_sync_role_permissions_role_columns
before insert or update on public.role_permissions
for each row execute function public.sync_role_permissions_role_columns();

create or replace function public.sync_supervisor_role_type()
returns trigger
language plpgsql
as $$
begin
  if new.role is null and new.type is not null then
    new.role := case
      when new.type = 'school' then 'pembimbing_sekolah'::public.app_role
      when new.type = 'company' then 'pembimbing_perusahaan'::public.app_role
      else null
    end;
  end if;

  if new.type is null and new.role is not null then
    new.type := case
      when new.role = 'pembimbing_sekolah'::public.app_role then 'school'
      when new.role = 'pembimbing_perusahaan'::public.app_role then 'company'
      else null
    end;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_supervisor_role_type on public.supervisors;
create trigger trg_sync_supervisor_role_type
before insert or update on public.supervisors
for each row execute function public.sync_supervisor_role_type();

create or replace function public.get_user_roles(_user_id uuid)
returns public.app_role[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(ur.role order by ur.role), '{}'::public.app_role[])
  from public.user_roles ur
  where ur.user_id = _user_id
    and ur.role is not null;
$$;

create or replace function public.has_role(_user_id uuid, _role text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = _user_id
      and (
        coalesce(ur.role::text, '') = lower(replace(_role, '-', '_'))
        or coalesce(r.slug::text, '') = lower(replace(_role, '-', '_'))
        or lower(coalesce(r.name, '')) = lower(replace(_role, '-', '_'))
      )
  );
$$;

create or replace function public.has_permission(_user_id uuid, _code text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.role_permissions rp on rp.role_id = ur.role_id
    join public.permissions p on p.id = rp.permission_id
    where ur.user_id = _user_id
      and rp.granted = true
      and lower(coalesce(p.code, p.module || '.' || p.action)) = lower(_code)
  );
$$;

grant execute on function public.get_user_roles(uuid) to authenticated;
grant execute on function public.has_role(uuid, text) to authenticated;
grant execute on function public.has_permission(uuid, text) to authenticated;

create or replace function public.get_kaprog_student_options()
returns table (
  id uuid,
  nis text,
  full_name text,
  class text,
  program text
)
language sql
stable
security definer
set search_path = public
as $$
  select s.id, s.nis, s.full_name, s.class, s.program
  from public.students s
  where
    public.has_role(auth.uid(), 'hubdin')
    or public.has_role(auth.uid(), 'operator')
    or public.has_role(auth.uid(), 'kaprog')
  order by s.full_name asc;
$$;

create or replace function public.get_supervisor_placement_options()
returns table (
  id uuid,
  student_id uuid,
  student_name text,
  company_id uuid,
  company_name text,
  start_date date,
  end_date date,
  status text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.student_id,
    s.full_name as student_name,
    p.company_id,
    c.name as company_name,
    p.start_date,
    p.end_date,
    p.status
  from public.placements p
  join public.students s on s.id = p.student_id
  join public.companies c on c.id = p.company_id
  where
    public.has_role(auth.uid(), 'hubdin')
    or public.has_role(auth.uid(), 'kaprog')
    or exists (
      select 1
      from public.supervisors sp
      where sp.user_id = auth.uid()
        and (
          (sp.role = 'pembimbing_perusahaan'::public.app_role and sp.id = p.company_supervisor_id)
          or (sp.role = 'pembimbing_sekolah'::public.app_role and sp.id = p.school_supervisor_id)
        )
    )
  order by p.start_date desc;
$$;

grant execute on function public.get_kaprog_student_options() to authenticated;
grant execute on function public.get_supervisor_placement_options() to authenticated;
