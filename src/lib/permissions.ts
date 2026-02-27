import "server-only";

import { cache } from "react";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";

type RolePermissionRow = {
  permissions?: {
    code?: string | null;
  } | null;
};

function normalizeRole(value: string): string {
  return value.trim().toLowerCase().replace(/[_\s]+/g, "-");
}

function normalizeRoleEnum(value: string): string {
  return value.replace(/-/g, "_");
}

function normalizePermissionCode(value: string): string {
  return value.trim().toLowerCase();
}

const getPermissionsByRoleKey = cache(async (rolesKey: string): Promise<string[]> => {
  if (!rolesKey) return [];

  const supabase = await createSupabaseServerClient();
  const roleEnums = rolesKey.split(",").map(normalizeRoleEnum);

  const { data, error } = await supabase
    .from("role_permissions")
    .select("permissions:permission_id(code)")
    .in("role", roleEnums)
    .eq("granted", true);

  if (error) {
    throw new Error(`Failed to load role permissions: ${error.message}`);
  }

  const permissions = (data ?? [])
    .map((row) => (row as RolePermissionRow).permissions?.code)
    .filter((code): code is string => typeof code === "string" && code.length > 0)
    .map(normalizePermissionCode);

  return [...new Set(permissions)];
});

export async function getPermissionsForRoles(roles: readonly string[]): Promise<string[]> {
  const normalizedRoles = [...new Set(roles.map(normalizeRole).filter(Boolean))].sort();
  if (normalizedRoles.length === 0) return [];
  return getPermissionsByRoleKey(normalizedRoles.join(","));
}
