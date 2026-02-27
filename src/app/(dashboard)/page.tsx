import {
  getCurrentProfile,
  getCurrentUser,
  getUserPermissions,
  getUserRoles,
} from "@/src/lib/auth";
import { getAuthzContext } from "@/src/lib/rbac";

export default async function Page() {
  const [user, profile, roles, permissions, authz] = await Promise.all([
    getCurrentUser(),
    getCurrentProfile(),
    getUserRoles(),
    getUserPermissions(),
    getAuthzContext(),
  ]);

  if (!user) {
    return null;
  }

  const displayName =
    profile?.full_name?.trim() ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email ||
    user.id;

  return (
    <main className="mx-auto w-full max-w-6xl p-6 md:p-8">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="mt-2 text-sm text-slate-600">
          Signed in as <span className="font-medium text-slate-900">{displayName}</span>
        </p>
        <p className="mt-1 text-xs text-slate-500">User ID: {authz.user.id}</p>
      </section>

      <section className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Roles</h2>
          {roles.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">No roles assigned.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {roles.map((role) => (
                <li
                  key={role}
                  className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                >
                  {role}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Permissions</h2>
          {permissions.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">No permissions found.</p>
          ) : (
            <ul className="mt-3 max-h-96 space-y-2 overflow-auto pr-1">
              {permissions.map((permission) => (
                <li
                  key={permission}
                  className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                >
                  {permission}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
