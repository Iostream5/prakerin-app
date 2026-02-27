"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setRolePermission } from "@/src/features/rbac/server-actions/rbac";
import type { Role, RolePermissionMapItem } from "@/src/features/rbac/types";

type Props = {
  roles: Role[];
  selectedRole: string;
  items: RolePermissionMapItem[];
  initialError?: string | null;
};

export function RolePermissionsManager({
  roles,
  selectedRole,
  items,
  initialError,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [role, setRole] = useState(selectedRole);
  const [query, setQuery] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return items;
    return items.filter((item) =>
      [item.code, item.name, item.description ?? ""].join(" ").toLowerCase().includes(keyword)
    );
  }, [items, query]);

  const onChangeRole = (nextRole: string) => {
    setRole(nextRole);
    router.push(`/dashboard/hubdin/rbac/role-permissions?role=${nextRole}`);
  };

  const onToggle = (permissionId: string, nextGranted: boolean) => {
    setActionError(null);
    startTransition(async () => {
      const result = await setRolePermission(role, permissionId, nextGranted);
      if (!result.ok) {
        setActionError(result.error.message);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      {(initialError || actionError) && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError ?? initialError}
        </div>
      )}

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-700">Role</label>
          <select
            value={role}
            onChange={(event) => onChangeRole(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
          >
            {roles.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.name}
              </option>
            ))}
          </select>
        </div>

        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search permission code"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 md:max-w-sm"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Code</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Name</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  No permissions found.
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr key={item.permission_id}>
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">{item.code}</td>
                  <td className="px-4 py-3 text-slate-900">
                    <p>{item.name}</p>
                    {item.description && (
                      <p className="mt-1 text-xs text-slate-500">{item.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                        item.granted
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {item.granted ? "Granted" : "Not Granted"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => onToggle(item.permission_id, !item.granted)}
                      disabled={isPending}
                      className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {item.granted ? "Revoke" : "Grant"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
