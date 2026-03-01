-- Ensure ON CONFLICT(role,permission_id) and ON CONFLICT(user_id,role) work.
-- Target: txwyjorsgdiwbvlqbjpy

drop index if exists public.user_roles_user_id_role_key;
drop index if exists public.role_permissions_role_permission_id_key;

create unique index if not exists user_roles_user_id_role_unique
  on public.user_roles (user_id, role);

create unique index if not exists role_permissions_role_permission_unique
  on public.role_permissions (role, permission_id);
