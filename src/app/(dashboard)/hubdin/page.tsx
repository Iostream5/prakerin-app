import Link from "next/link";
import { listRoles, listPermissions } from "@/src/features/rbac/server-actions/rbac";
import { listUsersWithRoles } from "@/src/features/users/server-actions/users";

export default async function Page() {
  const [rolesResult, permissionsResult, usersResult] = await Promise.all([
    listRoles(),
    listPermissions(),
    listUsersWithRoles(),
  ]);

  const roles = rolesResult.ok ? rolesResult.data : [];
  const permissions = permissionsResult.ok ? permissionsResult.data : [];
  const users = usersResult.ok ? usersResult.data : [];

  const usersWithRoles = users.filter((user) => user.roles.length > 0).length;
  const errorMessage = !rolesResult.ok
    ? rolesResult.error.message
    : !permissionsResult.ok
      ? permissionsResult.error.message
      : !usersResult.ok
        ? usersResult.error.message
        : null;

  const stats = [
    { title: "Total Roles", value: roles.length },
    { title: "Total Permissions", value: permissions.length },
    { title: "Total Users", value: users.length },
    { title: "Users with Roles", value: usersWithRoles },
  ];

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-6 md:p-8">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Hubdin Control Center</h1>
        <p className="mt-2 text-sm text-slate-600">
          Kelola RBAC, assignment role user, dan konfigurasi dasar sistem.
        </p>
      </section>

      {errorMessage && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((card) => (
          <div
            key={card.title}
            className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
          >
            <p className="text-sm text-slate-500">{card.title}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{card.value}</p>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/dashboard/hubdin/rbac"
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300"
        >
          <h2 className="text-base font-semibold text-slate-900">RBAC Console</h2>
          <p className="mt-1 text-sm text-slate-600">
            Atur role, permission, dan mapping akses tiap role.
          </p>
        </Link>

        <Link
          href="/dashboard/hubdin/users"
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300"
        >
          <h2 className="text-base font-semibold text-slate-900">Users & Roles</h2>
          <p className="mt-1 text-sm text-slate-600">
            Assign atau cabut role pengguna secara dinamis.
          </p>
        </Link>

        <Link
          href="/dashboard/hubdin/audit-logs"
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300"
        >
          <h2 className="text-base font-semibold text-slate-900">Audit Logs</h2>
          <p className="mt-1 text-sm text-slate-600">
            Lacak perubahan kritis sistem termasuk perubahan RBAC.
          </p>
        </Link>
      </section>
    </main>
  );
}
