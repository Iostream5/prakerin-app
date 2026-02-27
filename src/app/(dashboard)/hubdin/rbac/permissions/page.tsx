import { listPermissions } from "@/src/features/rbac/server-actions/rbac";

export default async function Page() {
  const permissionsResult = await listPermissions();
  const permissions = permissionsResult.ok ? permissionsResult.data : [];
  const errorMessage = permissionsResult.ok ? null : permissionsResult.error.message;

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-6 md:p-8">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Permissions</h1>
        <p className="mt-2 text-sm text-slate-600">
          Daftar permission granular untuk kontrol akses fitur.
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
              <th className="px-4 py-3 text-left font-medium text-slate-600">Code</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Name</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">
                Description
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {permissions.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                  No permissions found.
                </td>
              </tr>
            ) : (
              permissions.map((permission) => (
                <tr key={permission.id}>
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">
                    {permission.code}
                  </td>
                  <td className="px-4 py-3 text-slate-900">{permission.name}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {permission.description ?? "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
