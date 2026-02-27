"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { assignUserRole, removeUserRole } from "@/src/features/users/server-actions/users";
import type { AppUser } from "@/src/features/users/types";
import type { Role } from "@/src/features/rbac/types";

type Props = {
  users: AppUser[];
  roles: Role[];
  initialError?: string | null;
};

export function UsersRoleManager({ users, roles, initialError }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [rolePickByUser, setRolePickByUser] = useState<Record<string, string>>({});
  const [actionError, setActionError] = useState<string | null>(null);

  const filteredUsers = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return users;
    return users.filter((user) =>
      [user.full_name ?? "", user.email ?? "", user.id].join(" ").toLowerCase().includes(keyword)
    );
  }, [users, query]);

  const defaultRole = roles[0]?.slug ?? "";

  const onAssign = (userId: string) => {
    setActionError(null);
    const role = rolePickByUser[userId] ?? defaultRole;
    if (!role) {
      setActionError("Role option is not available.");
      return;
    }

    startTransition(async () => {
      const result = await assignUserRole(userId, role);
      if (!result.ok) {
        setActionError(result.error.message);
        return;
      }
      router.refresh();
    });
  };

  const onRemove = (userId: string, role: string) => {
    setActionError(null);
    startTransition(async () => {
      const result = await removeUserRole(userId, role);
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

      <input
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search user by name or email"
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 md:max-w-sm"
      />

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">User</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Roles</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Assign Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                  No users found.
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">
                      {user.full_name ?? "Unnamed User"}
                    </p>
                    <p className="text-xs text-slate-600">{user.email ?? "-"}</p>
                    <p className="mt-1 font-mono text-[11px] text-slate-500">{user.id}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {user.roles.length === 0 && (
                        <span className="text-xs text-slate-500">No roles</span>
                      )}
                      {user.roles.map((role) => (
                        <span
                          key={`${user.id}-${role}`}
                          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700"
                        >
                          {role}
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => onRemove(user.id, role)}
                            className="font-semibold text-rose-600 disabled:opacity-50"
                          >
                            x
                          </button>
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <select
                        value={rolePickByUser[user.id] ?? defaultRole}
                        onChange={(event) =>
                          setRolePickByUser((prev) => ({
                            ...prev,
                            [user.id]: event.target.value,
                          }))
                        }
                        className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs text-slate-900"
                      >
                        {roles.map((role) => (
                          <option key={role.slug} value={role.slug}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => onAssign(user.id)}
                        disabled={isPending || roles.length === 0}
                        className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Assign
                      </button>
                    </div>
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
