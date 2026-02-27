-- Prakerin core schema + RBAC + RLS baseline
-- Apply with Supabase migration flow.

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

do $$
begin
  if not exists (select 1 from pg_type where typname = 'attendance_status') then
    create type public.attendance_status as enum ('hadir', 'izin', 'sakit', 'alpha');
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'journal_status') then
    create type public.journal_status as enum ('draft', 'submitted', 'validated', 'rejected');
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'placement_status') then
    create type public.placement_status as enum ('pending', 'active', 'completed', 'cancelled');
  end if;
end
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text not null,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  slug public.app_role not null unique,
  name text not null,
  description text,
  is_system boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Backward compatibility for existing roles schema variants.
alter table if exists public.roles
  add column if not exists slug public.app_role;
alter table if exists public.roles
  add column if not exists name text;
alter table if exists public.roles
  add column if not exists description text;
alter table if exists public.roles
  add column if not exists is_system boolean not null default true;
alter table if exists public.roles
  add column if not exists created_at timestamptz not null default now();
alter table if exists public.roles
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'roles'
      and column_name = 'role'
  ) then
    execute $sql$
      update public.roles
      set slug = case
        when lower(replace(role::text, '-', '_')) in (
          'ks','hubdin','operator','kaprog','pembimbing_sekolah','pembimbing_perusahaan','siswa'
        )
        then lower(replace(role::text, '-', '_'))::public.app_role
        else slug
      end
      where slug is null
    $sql$;
  end if;
end
$$;

create unique index if not exists roles_slug_key on public.roles (slug);

create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Backward compatibility for existing permissions schema variants.
alter table if exists public.permissions
  add column if not exists code text;
alter table if exists public.permissions
  add column if not exists name text;
alter table if exists public.permissions
  add column if not exists description text;
alter table if exists public.permissions
  add column if not exists created_at timestamptz not null default now();
alter table if exists public.permissions
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.role_permissions (
  role public.app_role not null,
  permission_id uuid not null references public.permissions (id) on delete cascade,
  granted boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (role, permission_id),
  foreign key (role) references public.roles (slug) on delete cascade
);

-- Backward compatibility for existing role_permissions schema variants.
alter table if exists public.role_permissions
  add column if not exists role public.app_role;
alter table if exists public.role_permissions
  add column if not exists permission_id uuid references public.permissions (id) on delete cascade;
alter table if exists public.role_permissions
  add column if not exists granted boolean not null default true;
alter table if exists public.role_permissions
  add column if not exists created_at timestamptz not null default now();
alter table if exists public.role_permissions
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists role_permissions_role_permission_key
  on public.role_permissions (role, permission_id);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null,
  assigned_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, role)
);

-- Backward compatibility for existing user_roles schema variants.
alter table if exists public.user_roles
  add column if not exists user_id uuid references auth.users (id) on delete cascade;
alter table if exists public.user_roles
  add column if not exists role public.app_role;
alter table if exists public.user_roles
  add column if not exists assigned_by uuid references auth.users (id) on delete set null;
alter table if exists public.user_roles
  add column if not exists created_at timestamptz not null default now();
alter table if exists public.user_roles
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  name text not null,
  address text,
  city text,
  province text,
  phone text,
  email text,
  logo_url text,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users (id) on delete set null,
  nis text not null unique,
  full_name text not null,
  class text not null,
  program text not null,
  phone text,
  parent_phone text,
  photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.supervisors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references auth.users (id) on delete cascade,
  role public.app_role not null check (role in ('pembimbing_sekolah', 'pembimbing_perusahaan')),
  company_id uuid references public.companies (id) on delete set null,
  full_name text not null,
  phone text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.placements (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete restrict,
  school_supervisor_id uuid references public.supervisors (id) on delete set null,
  company_supervisor_id uuid references public.supervisors (id) on delete set null,
  start_date date not null,
  end_date date,
  status public.placement_status not null default 'pending',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.journals (
  id uuid primary key default gen_random_uuid(),
  placement_id uuid not null references public.placements (id) on delete cascade,
  journal_date date not null,
  title text not null,
  content text not null,
  status public.journal_status not null default 'draft',
  validated_by uuid references auth.users (id) on delete set null,
  validated_at timestamptz,
  feedback text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (placement_id, journal_date)
);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  placement_id uuid not null references public.placements (id) on delete cascade,
  attendance_date date not null,
  status public.attendance_status not null default 'hadir',
  checkin_at timestamptz,
  checkout_at timestamptz,
  checkin_lat numeric(10, 7),
  checkin_lng numeric(10, 7),
  checkout_lat numeric(10, 7),
  checkout_lng numeric(10, 7),
  checkin_photo_url text,
  checkout_photo_url text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (placement_id, attendance_date)
);

create table if not exists public.grades (
  id uuid primary key default gen_random_uuid(),
  placement_id uuid not null unique references public.placements (id) on delete cascade,
  graded_by uuid references auth.users (id) on delete set null,
  technical_score numeric(5, 2),
  discipline_score numeric(5, 2),
  communication_score numeric(5, 2),
  final_score numeric(5, 2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mailing_templates (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  subject text,
  body text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Backward compatibility for existing activity_logs schema variants.
alter table if exists public.activity_logs
  add column if not exists user_id uuid references auth.users (id) on delete set null;
alter table if exists public.activity_logs
  add column if not exists action text;
alter table if exists public.activity_logs
  add column if not exists entity_type text;
alter table if exists public.activity_logs
  add column if not exists entity_id uuid;
alter table if exists public.activity_logs
  add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table if exists public.activity_logs
  add column if not exists created_at timestamptz not null default now();

update public.activity_logs
set entity_type = coalesce(entity_type, 'system')
where entity_type is null;

create index if not exists idx_user_roles_user_id on public.user_roles (user_id);
create index if not exists idx_role_permissions_role on public.role_permissions (role);
create index if not exists idx_students_user_id on public.students (user_id);
create index if not exists idx_students_nis on public.students (nis);
create index if not exists idx_placements_student_id on public.placements (student_id);
create index if not exists idx_placements_company_id on public.placements (company_id);
create index if not exists idx_journals_placement_id on public.journals (placement_id);
create index if not exists idx_attendance_placement_id on public.attendance (placement_id);
create index if not exists idx_activity_logs_user_id on public.activity_logs (user_id);
create index if not exists idx_activity_logs_entity on public.activity_logs (entity_type, entity_id);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_users_updated_at on public.users;
create trigger set_users_updated_at
before update on public.users
for each row execute function public.set_updated_at();

drop trigger if exists set_roles_updated_at on public.roles;
create trigger set_roles_updated_at
before update on public.roles
for each row execute function public.set_updated_at();

drop trigger if exists set_permissions_updated_at on public.permissions;
create trigger set_permissions_updated_at
before update on public.permissions
for each row execute function public.set_updated_at();

drop trigger if exists set_role_permissions_updated_at on public.role_permissions;
create trigger set_role_permissions_updated_at
before update on public.role_permissions
for each row execute function public.set_updated_at();

drop trigger if exists set_user_roles_updated_at on public.user_roles;
create trigger set_user_roles_updated_at
before update on public.user_roles
for each row execute function public.set_updated_at();

drop trigger if exists set_companies_updated_at on public.companies;
create trigger set_companies_updated_at
before update on public.companies
for each row execute function public.set_updated_at();

drop trigger if exists set_students_updated_at on public.students;
create trigger set_students_updated_at
before update on public.students
for each row execute function public.set_updated_at();

drop trigger if exists set_supervisors_updated_at on public.supervisors;
create trigger set_supervisors_updated_at
before update on public.supervisors
for each row execute function public.set_updated_at();

drop trigger if exists set_placements_updated_at on public.placements;
create trigger set_placements_updated_at
before update on public.placements
for each row execute function public.set_updated_at();

drop trigger if exists set_journals_updated_at on public.journals;
create trigger set_journals_updated_at
before update on public.journals
for each row execute function public.set_updated_at();

drop trigger if exists set_attendance_updated_at on public.attendance;
create trigger set_attendance_updated_at
before update on public.attendance
for each row execute function public.set_updated_at();

drop trigger if exists set_grades_updated_at on public.grades;
create trigger set_grades_updated_at
before update on public.grades
for each row execute function public.set_updated_at();

drop trigger if exists set_mailing_templates_updated_at on public.mailing_templates;
create trigger set_mailing_templates_updated_at
before update on public.mailing_templates
for each row execute function public.set_updated_at();

drop trigger if exists set_app_settings_updated_at on public.app_settings;
create trigger set_app_settings_updated_at
before update on public.app_settings
for each row execute function public.set_updated_at();

create or replace function public.sync_users_to_profiles()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;

  insert into public.profiles (id, email, full_name, phone, avatar_url, created_at, updated_at)
  values (new.id, new.email, new.full_name, new.phone, new.avatar_url, coalesce(new.created_at, now()), now())
  on conflict (id) do update set
    email = excluded.email,
    full_name = excluded.full_name,
    phone = excluded.phone,
    avatar_url = excluded.avatar_url,
    updated_at = now();

  return new;
end;
$$;

create or replace function public.sync_profiles_to_users()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;

  insert into public.users (id, email, full_name, phone, avatar_url, created_at, updated_at)
  values (new.id, new.email, coalesce(new.full_name, 'User'), new.phone, new.avatar_url, coalesce(new.created_at, now()), now())
  on conflict (id) do update set
    email = excluded.email,
    full_name = excluded.full_name,
    phone = excluded.phone,
    avatar_url = excluded.avatar_url,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists sync_users_to_profiles_trg on public.users;
create trigger sync_users_to_profiles_trg
after insert or update on public.users
for each row execute function public.sync_users_to_profiles();

drop trigger if exists sync_profiles_to_users_trg on public.profiles;
create trigger sync_profiles_to_users_trg
after insert or update on public.profiles
for each row execute function public.sync_profiles_to_users();

drop function if exists public.get_user_roles(uuid);

create or replace function public.get_user_roles(_user_id uuid)
returns public.app_role[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(ur.role order by ur.role), '{}'::public.app_role[])
  from public.user_roles ur
  where ur.user_id = _user_id;
$$;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = _user_id
      and ur.role = _role
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
    join public.role_permissions rp
      on rp.role = ur.role
     and rp.granted = true
    join public.permissions p
      on p.id = rp.permission_id
    where ur.user_id = _user_id
      and lower(p.code) = lower(_code)
  );
$$;

grant execute on function public.get_user_roles(uuid) to authenticated;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on function public.has_permission(uuid, text) to authenticated;

alter table public.profiles enable row level security;
alter table public.users enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_roles enable row level security;
alter table public.companies enable row level security;
alter table public.students enable row level security;
alter table public.supervisors enable row level security;
alter table public.placements enable row level security;
alter table public.journals enable row level security;
alter table public.attendance enable row level security;
alter table public.grades enable row level security;
alter table public.mailing_templates enable row level security;
alter table public.app_settings enable row level security;
alter table public.activity_logs enable row level security;

drop policy if exists profiles_select_self_or_hubdin on public.profiles;
create policy profiles_select_self_or_hubdin
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or public.has_role(auth.uid(), 'hubdin'::public.app_role)
);

drop policy if exists profiles_insert_self_or_hubdin on public.profiles;
create policy profiles_insert_self_or_hubdin
on public.profiles
for insert
to authenticated
with check (
  id = auth.uid()
  or public.has_role(auth.uid(), 'hubdin'::public.app_role)
);

drop policy if exists profiles_update_self_or_hubdin on public.profiles;
create policy profiles_update_self_or_hubdin
on public.profiles
for update
to authenticated
using (
  id = auth.uid()
  or public.has_role(auth.uid(), 'hubdin'::public.app_role)
)
with check (
  id = auth.uid()
  or public.has_role(auth.uid(), 'hubdin'::public.app_role)
);

drop policy if exists users_select_self_or_hubdin on public.users;
create policy users_select_self_or_hubdin
on public.users
for select
to authenticated
using (
  id = auth.uid()
  or public.has_role(auth.uid(), 'hubdin'::public.app_role)
);

drop policy if exists users_insert_self_or_hubdin on public.users;
create policy users_insert_self_or_hubdin
on public.users
for insert
to authenticated
with check (
  id = auth.uid()
  or public.has_role(auth.uid(), 'hubdin'::public.app_role)
);

drop policy if exists users_update_self_or_hubdin on public.users;
create policy users_update_self_or_hubdin
on public.users
for update
to authenticated
using (
  id = auth.uid()
  or public.has_role(auth.uid(), 'hubdin'::public.app_role)
)
with check (
  id = auth.uid()
  or public.has_role(auth.uid(), 'hubdin'::public.app_role)
);

drop policy if exists roles_select_authenticated on public.roles;
create policy roles_select_authenticated
on public.roles
for select
to authenticated
using (true);

drop policy if exists roles_manage_hubdin on public.roles;
create policy roles_manage_hubdin
on public.roles
for all
to authenticated
using (public.has_role(auth.uid(), 'hubdin'::public.app_role))
with check (public.has_role(auth.uid(), 'hubdin'::public.app_role));

drop policy if exists permissions_select_authenticated on public.permissions;
create policy permissions_select_authenticated
on public.permissions
for select
to authenticated
using (true);

drop policy if exists permissions_manage_hubdin on public.permissions;
create policy permissions_manage_hubdin
on public.permissions
for all
to authenticated
using (public.has_role(auth.uid(), 'hubdin'::public.app_role))
with check (public.has_role(auth.uid(), 'hubdin'::public.app_role));

drop policy if exists role_permissions_select_authenticated on public.role_permissions;
create policy role_permissions_select_authenticated
on public.role_permissions
for select
to authenticated
using (true);

drop policy if exists role_permissions_manage_hubdin on public.role_permissions;
create policy role_permissions_manage_hubdin
on public.role_permissions
for all
to authenticated
using (public.has_role(auth.uid(), 'hubdin'::public.app_role))
with check (public.has_role(auth.uid(), 'hubdin'::public.app_role));

drop policy if exists user_roles_select_self_or_hubdin on public.user_roles;
create policy user_roles_select_self_or_hubdin
on public.user_roles
for select
to authenticated
using (
  user_id = auth.uid()
  or public.has_role(auth.uid(), 'hubdin'::public.app_role)
);

drop policy if exists user_roles_manage_hubdin on public.user_roles;
create policy user_roles_manage_hubdin
on public.user_roles
for all
to authenticated
using (public.has_role(auth.uid(), 'hubdin'::public.app_role))
with check (public.has_role(auth.uid(), 'hubdin'::public.app_role));

drop policy if exists user_roles_insert_self_from_claims on public.user_roles;
create policy user_roles_insert_self_from_claims
on public.user_roles
for insert
to authenticated
with check (
  user_id = auth.uid()
  and (
    (auth.jwt() -> 'app_metadata' ->> 'role') = role::text
    or coalesce((auth.jwt() -> 'app_metadata' -> 'roles') ? role::text, false)
  )
);

drop policy if exists students_select_scoped on public.students;
create policy students_select_scoped
on public.students
for select
to authenticated
using (
  user_id = auth.uid()
  or public.has_role(auth.uid(), 'hubdin'::public.app_role)
  or public.has_role(auth.uid(), 'operator'::public.app_role)
);

drop policy if exists students_insert_hubdin_operator on public.students;
create policy students_insert_hubdin_operator
on public.students
for insert
to authenticated
with check (
  public.has_role(auth.uid(), 'hubdin'::public.app_role)
  or public.has_role(auth.uid(), 'operator'::public.app_role)
);

drop policy if exists students_update_hubdin_operator on public.students;
create policy students_update_hubdin_operator
on public.students
for update
to authenticated
using (
  public.has_role(auth.uid(), 'hubdin'::public.app_role)
  or public.has_role(auth.uid(), 'operator'::public.app_role)
)
with check (
  public.has_role(auth.uid(), 'hubdin'::public.app_role)
  or public.has_role(auth.uid(), 'operator'::public.app_role)
);

drop policy if exists students_delete_hubdin_operator on public.students;
create policy students_delete_hubdin_operator
on public.students
for delete
to authenticated
using (
  public.has_role(auth.uid(), 'hubdin'::public.app_role)
  or public.has_role(auth.uid(), 'operator'::public.app_role)
);

drop policy if exists companies_select_authenticated on public.companies;
create policy companies_select_authenticated
on public.companies
for select
to authenticated
using (true);

drop policy if exists companies_manage_hubdin_kaprog on public.companies;
create policy companies_manage_hubdin_kaprog
on public.companies
for all
to authenticated
using (
  public.has_role(auth.uid(), 'hubdin'::public.app_role)
  or public.has_role(auth.uid(), 'kaprog'::public.app_role)
)
with check (
  public.has_role(auth.uid(), 'hubdin'::public.app_role)
  or public.has_role(auth.uid(), 'kaprog'::public.app_role)
);

drop policy if exists app_settings_select_hubdin on public.app_settings;
create policy app_settings_select_hubdin
on public.app_settings
for select
to authenticated
using (public.has_role(auth.uid(), 'hubdin'::public.app_role));

drop policy if exists app_settings_manage_hubdin on public.app_settings;
create policy app_settings_manage_hubdin
on public.app_settings
for all
to authenticated
using (public.has_role(auth.uid(), 'hubdin'::public.app_role))
with check (public.has_role(auth.uid(), 'hubdin'::public.app_role));

drop policy if exists activity_logs_insert_authenticated on public.activity_logs;
create policy activity_logs_insert_authenticated
on public.activity_logs
for insert
to authenticated
with check (user_id = auth.uid() or user_id is null);

drop policy if exists activity_logs_select_hubdin on public.activity_logs;
create policy activity_logs_select_hubdin
on public.activity_logs
for select
to authenticated
using (public.has_role(auth.uid(), 'hubdin'::public.app_role));

drop policy if exists placements_select_scoped on public.placements;
create policy placements_select_scoped
on public.placements
for select
to authenticated
using (
  public.has_role(auth.uid(), 'hubdin'::public.app_role)
  or public.has_role(auth.uid(), 'kaprog'::public.app_role)
  or exists (
    select 1
    from public.students s
    where s.id = placements.student_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists placements_manage_hubdin_kaprog on public.placements;
create policy placements_manage_hubdin_kaprog
on public.placements
for all
to authenticated
using (
  public.has_role(auth.uid(), 'hubdin'::public.app_role)
  or public.has_role(auth.uid(), 'kaprog'::public.app_role)
)
with check (
  public.has_role(auth.uid(), 'hubdin'::public.app_role)
  or public.has_role(auth.uid(), 'kaprog'::public.app_role)
);

drop policy if exists journals_select_scoped on public.journals;
create policy journals_select_scoped
on public.journals
for select
to authenticated
using (
  public.has_role(auth.uid(), 'hubdin'::public.app_role)
  or public.has_role(auth.uid(), 'kaprog'::public.app_role)
  or public.has_role(auth.uid(), 'pembimbing_sekolah'::public.app_role)
  or public.has_role(auth.uid(), 'pembimbing_perusahaan'::public.app_role)
  or exists (
    select 1
    from public.placements pl
    join public.students s on s.id = pl.student_id
    where pl.id = journals.placement_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists journals_insert_student on public.journals;
create policy journals_insert_student
on public.journals
for insert
to authenticated
with check (
  exists (
    select 1
    from public.placements pl
    join public.students s on s.id = pl.student_id
    where pl.id = journals.placement_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists journals_update_scoped on public.journals;
create policy journals_update_scoped
on public.journals
for update
to authenticated
using (
  public.has_role(auth.uid(), 'hubdin'::public.app_role)
  or public.has_role(auth.uid(), 'pembimbing_sekolah'::public.app_role)
  or public.has_role(auth.uid(), 'pembimbing_perusahaan'::public.app_role)
  or exists (
    select 1
    from public.placements pl
    join public.students s on s.id = pl.student_id
    where pl.id = journals.placement_id
      and s.user_id = auth.uid()
  )
)
with check (
  public.has_role(auth.uid(), 'hubdin'::public.app_role)
  or public.has_role(auth.uid(), 'pembimbing_sekolah'::public.app_role)
  or public.has_role(auth.uid(), 'pembimbing_perusahaan'::public.app_role)
  or exists (
    select 1
    from public.placements pl
    join public.students s on s.id = pl.student_id
    where pl.id = journals.placement_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists attendance_select_scoped on public.attendance;
create policy attendance_select_scoped
on public.attendance
for select
to authenticated
using (
  public.has_role(auth.uid(), 'hubdin'::public.app_role)
  or public.has_role(auth.uid(), 'pembimbing_sekolah'::public.app_role)
  or public.has_role(auth.uid(), 'pembimbing_perusahaan'::public.app_role)
  or exists (
    select 1
    from public.placements pl
    join public.students s on s.id = pl.student_id
    where pl.id = attendance.placement_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists attendance_insert_student on public.attendance;
create policy attendance_insert_student
on public.attendance
for insert
to authenticated
with check (
  exists (
    select 1
    from public.placements pl
    join public.students s on s.id = pl.student_id
    where pl.id = attendance.placement_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists attendance_update_scoped on public.attendance;
create policy attendance_update_scoped
on public.attendance
for update
to authenticated
using (
  public.has_role(auth.uid(), 'hubdin'::public.app_role)
  or public.has_role(auth.uid(), 'pembimbing_sekolah'::public.app_role)
  or public.has_role(auth.uid(), 'pembimbing_perusahaan'::public.app_role)
  or exists (
    select 1
    from public.placements pl
    join public.students s on s.id = pl.student_id
    where pl.id = attendance.placement_id
      and s.user_id = auth.uid()
  )
)
with check (
  public.has_role(auth.uid(), 'hubdin'::public.app_role)
  or public.has_role(auth.uid(), 'pembimbing_sekolah'::public.app_role)
  or public.has_role(auth.uid(), 'pembimbing_perusahaan'::public.app_role)
  or exists (
    select 1
    from public.placements pl
    join public.students s on s.id = pl.student_id
    where pl.id = attendance.placement_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists grades_select_scoped on public.grades;
create policy grades_select_scoped
on public.grades
for select
to authenticated
using (
  public.has_role(auth.uid(), 'hubdin'::public.app_role)
  or public.has_role(auth.uid(), 'pembimbing_sekolah'::public.app_role)
  or public.has_role(auth.uid(), 'pembimbing_perusahaan'::public.app_role)
  or exists (
    select 1
    from public.placements pl
    join public.students s on s.id = pl.student_id
    where pl.id = grades.placement_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists grades_manage_supervisors on public.grades;
create policy grades_manage_supervisors
on public.grades
for all
to authenticated
using (
  public.has_role(auth.uid(), 'hubdin'::public.app_role)
  or public.has_role(auth.uid(), 'pembimbing_sekolah'::public.app_role)
  or public.has_role(auth.uid(), 'pembimbing_perusahaan'::public.app_role)
)
with check (
  public.has_role(auth.uid(), 'hubdin'::public.app_role)
  or public.has_role(auth.uid(), 'pembimbing_sekolah'::public.app_role)
  or public.has_role(auth.uid(), 'pembimbing_perusahaan'::public.app_role)
);

drop policy if exists supervisors_select_authenticated on public.supervisors;
create policy supervisors_select_authenticated
on public.supervisors
for select
to authenticated
using (
  user_id = auth.uid()
  or public.has_role(auth.uid(), 'hubdin'::public.app_role)
  or public.has_role(auth.uid(), 'kaprog'::public.app_role)
);

drop policy if exists supervisors_manage_hubdin_kaprog on public.supervisors;
create policy supervisors_manage_hubdin_kaprog
on public.supervisors
for all
to authenticated
using (
  public.has_role(auth.uid(), 'hubdin'::public.app_role)
  or public.has_role(auth.uid(), 'kaprog'::public.app_role)
)
with check (
  public.has_role(auth.uid(), 'hubdin'::public.app_role)
  or public.has_role(auth.uid(), 'kaprog'::public.app_role)
);

drop policy if exists mailing_templates_select_hubdin_operator on public.mailing_templates;
create policy mailing_templates_select_hubdin_operator
on public.mailing_templates
for select
to authenticated
using (
  public.has_role(auth.uid(), 'hubdin'::public.app_role)
  or public.has_role(auth.uid(), 'operator'::public.app_role)
);

drop policy if exists mailing_templates_manage_hubdin_operator on public.mailing_templates;
create policy mailing_templates_manage_hubdin_operator
on public.mailing_templates
for all
to authenticated
using (
  public.has_role(auth.uid(), 'hubdin'::public.app_role)
  or public.has_role(auth.uid(), 'operator'::public.app_role)
)
with check (
  public.has_role(auth.uid(), 'hubdin'::public.app_role)
  or public.has_role(auth.uid(), 'operator'::public.app_role)
);

do $$
declare
  has_display_name boolean;
  name_is_enum boolean;
begin
  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'roles'
      and column_name = 'display_name'
  ) into has_display_name;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'roles'
      and column_name = 'name'
      and udt_name = 'app_role'
  ) into name_is_enum;

  if has_display_name and name_is_enum then
    with seed(slug, display_name, description) as (
      values
        ('ks'::public.app_role, 'KS', 'Manager read-only dashboard'),
        ('hubdin'::public.app_role, 'Hubdin', 'Admin with full control'),
        ('operator'::public.app_role, 'Operator', 'Secretary/operator role'),
        ('kaprog'::public.app_role, 'Kaprog', 'Head of program'),
        ('pembimbing_sekolah'::public.app_role, 'Pembimbing Sekolah', 'School supervisor'),
        ('pembimbing_perusahaan'::public.app_role, 'Pembimbing Perusahaan', 'Company supervisor'),
        ('siswa'::public.app_role, 'Siswa', 'Student role')
    )
    update public.roles r
    set
      slug = s.slug,
      name = s.slug,
      description = s.description,
      display_name = coalesce(r.display_name, s.display_name),
      updated_at = now()
    from seed s
    where r.slug = s.slug
       or r.name::text = s.slug::text;

    insert into public.roles (slug, name, display_name, description)
    select s.slug, s.slug, s.display_name, s.description
    from (
      values
        ('ks'::public.app_role, 'KS', 'Manager read-only dashboard'),
        ('hubdin'::public.app_role, 'Hubdin', 'Admin with full control'),
        ('operator'::public.app_role, 'Operator', 'Secretary/operator role'),
        ('kaprog'::public.app_role, 'Kaprog', 'Head of program'),
        ('pembimbing_sekolah'::public.app_role, 'Pembimbing Sekolah', 'School supervisor'),
        ('pembimbing_perusahaan'::public.app_role, 'Pembimbing Perusahaan', 'Company supervisor'),
        ('siswa'::public.app_role, 'Siswa', 'Student role')
    ) as s(slug, display_name, description)
    where not exists (
      select 1
      from public.roles r
      where r.slug = s.slug
         or r.name::text = s.slug::text
    );
  elsif has_display_name and not name_is_enum then
    with seed(slug, role_name, display_name, description) as (
      values
        ('ks'::public.app_role, 'ks', 'KS', 'Manager read-only dashboard'),
        ('hubdin'::public.app_role, 'hubdin', 'Hubdin', 'Admin with full control'),
        ('operator'::public.app_role, 'operator', 'Operator', 'Secretary/operator role'),
        ('kaprog'::public.app_role, 'kaprog', 'Kaprog', 'Head of program'),
        ('pembimbing_sekolah'::public.app_role, 'pembimbing_sekolah', 'Pembimbing Sekolah', 'School supervisor'),
        ('pembimbing_perusahaan'::public.app_role, 'pembimbing_perusahaan', 'Pembimbing Perusahaan', 'Company supervisor'),
        ('siswa'::public.app_role, 'siswa', 'Siswa', 'Student role')
    )
    update public.roles r
    set
      slug = s.slug,
      name = s.role_name,
      description = s.description,
      display_name = coalesce(r.display_name, s.display_name),
      updated_at = now()
    from seed s
    where r.slug = s.slug
       or r.name = s.role_name;

    insert into public.roles (slug, name, display_name, description)
    select s.slug, s.role_name, s.display_name, s.description
    from (
      values
        ('ks'::public.app_role, 'ks', 'KS', 'Manager read-only dashboard'),
        ('hubdin'::public.app_role, 'hubdin', 'Hubdin', 'Admin with full control'),
        ('operator'::public.app_role, 'operator', 'Operator', 'Secretary/operator role'),
        ('kaprog'::public.app_role, 'kaprog', 'Kaprog', 'Head of program'),
        ('pembimbing_sekolah'::public.app_role, 'pembimbing_sekolah', 'Pembimbing Sekolah', 'School supervisor'),
        ('pembimbing_perusahaan'::public.app_role, 'pembimbing_perusahaan', 'Pembimbing Perusahaan', 'Company supervisor'),
        ('siswa'::public.app_role, 'siswa', 'Siswa', 'Student role')
    ) as s(slug, role_name, display_name, description)
    where not exists (
      select 1
      from public.roles r
      where r.slug = s.slug
         or r.name = s.role_name
    );
  elsif not has_display_name and name_is_enum then
    with seed(slug, description) as (
      values
        ('ks'::public.app_role, 'Manager read-only dashboard'),
        ('hubdin'::public.app_role, 'Admin with full control'),
        ('operator'::public.app_role, 'Secretary/operator role'),
        ('kaprog'::public.app_role, 'Head of program'),
        ('pembimbing_sekolah'::public.app_role, 'School supervisor'),
        ('pembimbing_perusahaan'::public.app_role, 'Company supervisor'),
        ('siswa'::public.app_role, 'Student role')
    )
    update public.roles r
    set
      slug = s.slug,
      name = s.slug,
      description = s.description,
      updated_at = now()
    from seed s
    where r.slug = s.slug
       or r.name::text = s.slug::text;

    insert into public.roles (slug, name, description)
    select s.slug, s.slug, s.description
    from (
      values
        ('ks'::public.app_role, 'Manager read-only dashboard'),
        ('hubdin'::public.app_role, 'Admin with full control'),
        ('operator'::public.app_role, 'Secretary/operator role'),
        ('kaprog'::public.app_role, 'Head of program'),
        ('pembimbing_sekolah'::public.app_role, 'School supervisor'),
        ('pembimbing_perusahaan'::public.app_role, 'Company supervisor'),
        ('siswa'::public.app_role, 'Student role')
    ) as s(slug, description)
    where not exists (
      select 1
      from public.roles r
      where r.slug = s.slug
         or r.name::text = s.slug::text
    );
  else
    with seed(slug, role_name, description) as (
      values
        ('ks'::public.app_role, 'ks', 'Manager read-only dashboard'),
        ('hubdin'::public.app_role, 'hubdin', 'Admin with full control'),
        ('operator'::public.app_role, 'operator', 'Secretary/operator role'),
        ('kaprog'::public.app_role, 'kaprog', 'Head of program'),
        ('pembimbing_sekolah'::public.app_role, 'pembimbing_sekolah', 'School supervisor'),
        ('pembimbing_perusahaan'::public.app_role, 'pembimbing_perusahaan', 'Company supervisor'),
        ('siswa'::public.app_role, 'siswa', 'Student role')
    )
    update public.roles r
    set
      slug = s.slug,
      name = s.role_name,
      description = s.description,
      updated_at = now()
    from seed s
    where r.slug = s.slug
       or r.name = s.role_name;

    insert into public.roles (slug, name, description)
    select s.slug, s.role_name, s.description
    from (
      values
        ('ks'::public.app_role, 'ks', 'Manager read-only dashboard'),
        ('hubdin'::public.app_role, 'hubdin', 'Admin with full control'),
        ('operator'::public.app_role, 'operator', 'Secretary/operator role'),
        ('kaprog'::public.app_role, 'kaprog', 'Head of program'),
        ('pembimbing_sekolah'::public.app_role, 'pembimbing_sekolah', 'School supervisor'),
        ('pembimbing_perusahaan'::public.app_role, 'pembimbing_perusahaan', 'Company supervisor'),
        ('siswa'::public.app_role, 'siswa', 'Student role')
    ) as s(slug, role_name, description)
    where not exists (
      select 1
      from public.roles r
      where r.slug = s.slug
         or r.name = s.role_name
    );
  end if;
end
$$;

do $$
declare
  has_module boolean;
  has_action boolean;
begin
  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'permissions'
      and column_name = 'module'
  ) into has_module;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'permissions'
      and column_name = 'action'
  ) into has_action;

  if has_module and has_action then
    insert into public.permissions (code, name, module, action, description)
    values
      ('dashboard.*', 'All Dashboard Access', 'dashboard', '*', 'Wildcard dashboard access'),
      ('dashboard.ks.access', 'KS Dashboard Access', 'dashboard', 'ks.access', 'Access KS dashboard'),
      ('dashboard.hubdin.access', 'Hubdin Dashboard Access', 'dashboard', 'hubdin.access', 'Access Hubdin dashboard'),
      ('dashboard.operator.access', 'Operator Dashboard Access', 'dashboard', 'operator.access', 'Access Operator dashboard'),
      ('dashboard.kaprog.access', 'Kaprog Dashboard Access', 'dashboard', 'kaprog.access', 'Access Kaprog dashboard'),
      ('dashboard.pembimbing-sekolah.access', 'Pembimbing Sekolah Dashboard Access', 'dashboard', 'pembimbing-sekolah.access', 'Access school supervisor dashboard'),
      ('dashboard.pembimbing-perusahaan.access', 'Pembimbing Perusahaan Dashboard Access', 'dashboard', 'pembimbing-perusahaan.access', 'Access company supervisor dashboard'),
      ('dashboard.siswa.access', 'Siswa Dashboard Access', 'dashboard', 'siswa.access', 'Access student dashboard'),
      ('students.read', 'Read Students', 'students', 'read', 'Read students data'),
      ('students.write', 'Write Students', 'students', 'write', 'Create or update students data')
    on conflict (code) do update
    set
      name = coalesce(public.permissions.name, excluded.name),
      module = coalesce(public.permissions.module, excluded.module),
      action = coalesce(public.permissions.action, excluded.action),
      description = coalesce(public.permissions.description, excluded.description),
      updated_at = now();
  else
    insert into public.permissions (code, name, description)
    values
      ('dashboard.*', 'All Dashboard Access', 'Wildcard dashboard access'),
      ('dashboard.ks.access', 'KS Dashboard Access', 'Access KS dashboard'),
      ('dashboard.hubdin.access', 'Hubdin Dashboard Access', 'Access Hubdin dashboard'),
      ('dashboard.operator.access', 'Operator Dashboard Access', 'Access Operator dashboard'),
      ('dashboard.kaprog.access', 'Kaprog Dashboard Access', 'Access Kaprog dashboard'),
      ('dashboard.pembimbing-sekolah.access', 'Pembimbing Sekolah Dashboard Access', 'Access school supervisor dashboard'),
      ('dashboard.pembimbing-perusahaan.access', 'Pembimbing Perusahaan Dashboard Access', 'Access company supervisor dashboard'),
      ('dashboard.siswa.access', 'Siswa Dashboard Access', 'Access student dashboard'),
      ('students.read', 'Read Students', 'Read students data'),
      ('students.write', 'Write Students', 'Create or update students data')
    on conflict (code) do update
    set
      name = coalesce(public.permissions.name, excluded.name),
      description = coalesce(public.permissions.description, excluded.description),
      updated_at = now();
  end if;
end
$$;

insert into public.role_permissions (role, permission_id, granted)
select r.slug, p.id, true
from public.roles r
join public.permissions p on p.code in ('dashboard.*', 'students.read', 'students.write')
where r.slug = 'hubdin'
on conflict (role, permission_id) do update set granted = excluded.granted;

insert into public.role_permissions (role, permission_id, granted)
select r.slug, p.id, true
from public.roles r
join public.permissions p on p.code in ('dashboard.operator.access', 'students.read', 'students.write')
where r.slug = 'operator'
on conflict (role, permission_id) do update set granted = excluded.granted;

insert into public.role_permissions (role, permission_id, granted)
select r.slug, p.id, true
from public.roles r
join public.permissions p on p.code = ('dashboard.' || replace(r.slug::text, '_', '-') || '.access')
where r.slug <> 'hubdin'
on conflict (role, permission_id) do update set granted = excluded.granted;
