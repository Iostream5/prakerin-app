-- Align profile policy and role helper overloads for app compatibility.
-- Target: txwyjorsgdiwbvlqbjpy

update public.profiles
set user_id = id
where user_id is null
  and id is not null;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id or auth.uid() = user_id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id or auth.uid() = user_id)
with check (auth.uid() = id or auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role(_user_id, _role::text);
$$;

grant execute on function public.has_role(uuid, public.app_role) to authenticated;
