import { RolePermissionsManager } from "@/src/features/rbac/components/RolePermissionsManager";
import { listRolePermissionMap, listRoles } from "@/src/features/rbac/server-actions/rbac";

type Props = {
  searchParams?: Promise<{ role?: string }>;
};

function normalizeRole(value: string): string {
  return value.trim().toLowerCase().replace(/[-\s]+/g, "_");
}

export default async function Page({ searchParams }: Props) {
  const params = (await searchParams) ?? {};
  const rolesResult = await listRoles();

  const roles = rolesResult.ok ? rolesResult.data : [];
  const fallbackRole = roles[0]?.slug ?? "";
  const selectedRole = normalizeRole(params.role ?? fallbackRole);

  const mapResult = selectedRole
    ? await listRolePermissionMap(selectedRole)
    : { ok: true as const, data: [] };

  const initialError = !rolesResult.ok
    ? rolesResult.error.message
    : !mapResult.ok
      ? mapResult.error.message
      : null;

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-6 md:p-8">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Role Permissions</h1>
        <p className="mt-2 text-sm text-slate-600">
          Kelola grant/revoke permission untuk setiap role.
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <RolePermissionsManager
          roles={roles}
          selectedRole={selectedRole}
          items={mapResult.ok ? mapResult.data : []}
          initialError={initialError}
        />
      </section>
    </main>
  );
}
