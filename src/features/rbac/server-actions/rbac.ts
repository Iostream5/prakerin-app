"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import { getAuthzContext } from "@/src/lib/rbac";
import { AccessDeniedError, assertRouteAccess } from "@/src/lib/authorization";
import type {
  Permission,
  RbacActionResult,
  Role,
  RolePermissionMapItem,
} from "@/src/features/rbac/types";

type RoleRow = Role;
type PermissionRow = Permission;
type RolePermissionRow = {
  permission_id: string;
  granted: boolean;
  permissions?: {
    id: string;
    code: string;
    name: string;
    description: string | null;
  } | null;
};

const HUBDIN_PERMISSION_CODES = [
  "rbac.manage",
  "rbac.*",
  "dashboard.hubdin.access",
];

function ok<T>(data: T): RbacActionResult<T> {
  return { ok: true, data };
}

function fail<T>(
  code: "FORBIDDEN" | "VALIDATION_ERROR" | "DB_ERROR",
  message: string
): RbacActionResult<T> {
  return { ok: false, error: { code, message } };
}

async function ensureHubdinAccess() {
  const authz = await getAuthzContext();
  assertRouteAccess({
    roles: authz.roles,
    permissions: authz.permissions,
    requiredRoles: ["hubdin"],
    requiredPermissions: HUBDIN_PERMISSION_CODES,
  });
}

async function writeRbacLog(payload: {
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const authz = await getAuthzContext();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("activity_logs").insert({
    user_id: authz.userId,
    action: payload.action,
    entity_type: payload.entityType,
    entity_id: payload.entityId ?? null,
    metadata: payload.metadata ?? {},
  });

  if (error) {
    throw new Error(`Failed to write activity log: ${error.message}`);
  }
}

function normalizeRoleSlug(value: string): string {
  return value.trim().toLowerCase().replace(/[-\s]+/g, "_");
}

export async function listRoles(): Promise<RbacActionResult<Role[]>> {
  try {
    await ensureHubdinAccess();
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("roles")
      .select("id,slug,name,description,is_system,created_at,updated_at")
      .order("slug", { ascending: true });

    if (error) return fail("DB_ERROR", error.message);
    return ok((data ?? []) as RoleRow[]);
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return fail("FORBIDDEN", "You do not have access to RBAC roles.");
    }
    return fail(
      "DB_ERROR",
      error instanceof Error ? error.message : "Failed to load roles."
    );
  }
}

export async function listPermissions(): Promise<RbacActionResult<Permission[]>> {
  try {
    await ensureHubdinAccess();
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("permissions")
      .select("id,code,name,description,created_at,updated_at")
      .order("code", { ascending: true });

    if (error) return fail("DB_ERROR", error.message);
    return ok((data ?? []) as PermissionRow[]);
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return fail("FORBIDDEN", "You do not have access to permissions.");
    }
    return fail(
      "DB_ERROR",
      error instanceof Error ? error.message : "Failed to load permissions."
    );
  }
}

export async function listRolePermissionMap(
  role: string
): Promise<RbacActionResult<RolePermissionMapItem[]>> {
  try {
    await ensureHubdinAccess();
    const normalizedRole = normalizeRoleSlug(role);
    if (!normalizedRole) {
      return fail("VALIDATION_ERROR", "Role is required.");
    }

    const supabase = await createSupabaseServerClient();
    const [permissionsResult, mappingsResult] = await Promise.all([
      supabase
        .from("permissions")
        .select("id,code,name,description,created_at,updated_at")
        .order("code", { ascending: true }),
      supabase
        .from("role_permissions")
        .select("permission_id,granted,permissions:permission_id(id,code,name,description)")
        .eq("role", normalizedRole),
    ]);

    if (permissionsResult.error) return fail("DB_ERROR", permissionsResult.error.message);
    if (mappingsResult.error) return fail("DB_ERROR", mappingsResult.error.message);

    const allPermissions = (permissionsResult.data ?? []) as PermissionRow[];
    const mappings = (mappingsResult.data ?? []) as RolePermissionRow[];
    const mapped = new Map<string, RolePermissionRow>();
    for (const item of mappings) {
      mapped.set(item.permission_id, item);
    }

    return ok(
      allPermissions.map((permission) => ({
        permission_id: permission.id,
        code: permission.code,
        name: permission.name,
        description: permission.description,
        granted: mapped.get(permission.id)?.granted ?? false,
      }))
    );
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return fail("FORBIDDEN", "You do not have access to role-permissions.");
    }
    return fail(
      "DB_ERROR",
      error instanceof Error ? error.message : "Failed to load role-permission map."
    );
  }
}

export async function setRolePermission(
  role: string,
  permissionId: string,
  granted: boolean
): Promise<RbacActionResult<{ role: string; permissionId: string; granted: boolean }>> {
  try {
    await ensureHubdinAccess();
    const normalizedRole = normalizeRoleSlug(role);
    if (!normalizedRole) {
      return fail("VALIDATION_ERROR", "Role is required.");
    }

    if (!permissionId) {
      return fail("VALIDATION_ERROR", "Permission id is required.");
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("role_permissions").upsert(
      {
        role: normalizedRole,
        permission_id: permissionId,
        granted,
      },
      { onConflict: "role,permission_id" }
    );

    if (error) {
      return fail("DB_ERROR", error.message);
    }

    await writeRbacLog({
      action: "rbac.role_permission.set",
      entityType: "role_permission",
      metadata: {
        role: normalizedRole,
        permission_id: permissionId,
        granted,
      },
    });

    revalidatePath("/dashboard/hubdin");
    revalidatePath("/dashboard/hubdin/rbac");
    revalidatePath("/dashboard/hubdin/rbac/role-permissions");

    return ok({
      role: normalizedRole,
      permissionId,
      granted,
    });
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return fail("FORBIDDEN", "You do not have access to set role permission.");
    }
    return fail(
      "DB_ERROR",
      error instanceof Error ? error.message : "Failed to set role permission."
    );
  }
}
