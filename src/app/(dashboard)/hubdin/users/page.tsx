import { UsersRoleManager } from "@/src/features/users/components/UsersRoleManager";
import { listRoles } from "@/src/features/rbac/server-actions/rbac";
import { listUsersWithRoles } from "@/src/features/users/server-actions/users";

export default async function Page() {
  const [usersResult, rolesResult] = await Promise.all([
    listUsersWithRoles(),
    listRoles(),
  ]);

  const users = usersResult.ok ? usersResult.data : [];
  const roles = rolesResult.ok ? rolesResult.data : [];
  const initialError = !usersResult.ok
    ? usersResult.error.message
    : !rolesResult.ok
      ? rolesResult.error.message
      : null;

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-6 md:p-8">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Users & Roles</h1>
        <p className="mt-2 text-sm text-slate-600">
          Kelola assignment role pengguna untuk akses dashboard dan fitur sistem.
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <UsersRoleManager users={users} roles={roles} initialError={initialError} />
      </section>
    </main>
  );
}
