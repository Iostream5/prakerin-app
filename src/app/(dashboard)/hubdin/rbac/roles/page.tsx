import { listRoles } from "@/src/features/rbac/server-actions/rbac";

function formatRoleLabel(value: string) {
  return value.replace(/_/g, "-");
}

export default async function Page() {
  const rolesResult = await listRoles();
  const roles = rolesResult.ok ? rolesResult.data : [];
  const errorMessage = rolesResult.ok ? null : rolesResult.error.message;

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-6 md:p-8">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Roles</h1>
        <p className="mt-2 text-sm text-slate-600">
          Daftar role sistem yang digunakan untuk kontrol akses.
        </p>
      </section>

      {errorMessage && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <section className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Slug</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Name</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">System</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">
                Description
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {roles.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  No roles found.
                </td>
              </tr>
            ) : (
              roles.map((role) => (
                <tr key={role.id}>
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">
                    {formatRoleLabel(role.slug)}
                  </td>
                  <td className="px-4 py-3 text-slate-900">{role.name}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {role.is_system ? "Yes" : "No"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{role.description ?? "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
