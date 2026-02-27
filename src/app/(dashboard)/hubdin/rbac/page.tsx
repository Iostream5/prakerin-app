import Link from "next/link";
import { listPermissions, listRoles } from "@/src/features/rbac/server-actions/rbac";

export default async function Page() {
  const [rolesResult, permissionsResult] = await Promise.all([
    listRoles(),
    listPermissions(),
  ]);

  const roles = rolesResult.ok ? rolesResult.data : [];
  const permissions = permissionsResult.ok ? permissionsResult.data : [];
  const errorMessage = !rolesResult.ok
    ? rolesResult.error.message
    : !permissionsResult.ok
      ? permissionsResult.error.message
      : null;

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-6 md:p-8">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">RBAC Console</h1>
        <p className="mt-2 text-sm text-slate-600">
          Manajemen role, permission, dan mapping role-permission.
        </p>
      </section>

      {errorMessage && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Link
          href="/dashboard/hubdin/rbac/roles"
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300"
        >
          <h2 className="text-base font-semibold text-slate-900">Roles</h2>
          <p className="mt-1 text-sm text-slate-600">Total roles: {roles.length}</p>
        </Link>

        <Link
          href="/dashboard/hubdin/rbac/permissions"
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300"
        >
          <h2 className="text-base font-semibold text-slate-900">Permissions</h2>
          <p className="mt-1 text-sm text-slate-600">
            Total permissions: {permissions.length}
          </p>
        </Link>

        <Link
          href="/dashboard/hubdin/rbac/role-permissions"
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300"
        >
          <h2 className="text-base font-semibold text-slate-900">Role Permissions</h2>
          <p className="mt-1 text-sm text-slate-600">
            Kelola mapping role dengan permission.
          </p>
        </Link>
      </section>
    </main>
  );
}
