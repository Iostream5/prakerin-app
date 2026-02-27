"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import { getAuthzContext } from "@/src/lib/rbac";
import { AccessDeniedError, assertRouteAccess } from "@/src/lib/authorization";
import type { AppUser, UsersActionResult } from "@/src/features/users/types";

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  created_at: string | null;
};

type UserRoleRow = {
  id: string;
  user_id: string;
  role: string;
};

const HUBDIN_PERMISSION_CODES = [
  "users.manage",
  "users.*",
  "rbac.manage",
  "dashboard.hubdin.access",
];

function ok<T>(data: T): UsersActionResult<T> {
  return { ok: true, data };
}

function fail<T>(
  code: "FORBIDDEN" | "VALIDATION_ERROR" | "DB_ERROR",
  message: string
): UsersActionResult<T> {
  return { ok: false, error: { code, message } };
}

function normalizeRoleSlug(value: string): string {
  return value.trim().toLowerCase().replace(/[-\s]+/g, "_");
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

async function writeUsersLog(payload: {
  action: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const authz = await getAuthzContext();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("activity_logs").insert({
    user_id: authz.userId,
    action: payload.action,
    entity_type: "user_role",
    entity_id: payload.entityId ?? null,
    metadata: payload.metadata ?? {},
  });

  if (error) {
    throw new Error(`Failed to write activity log: ${error.message}`);
  }
}

export async function listUsersWithRoles(): Promise<UsersActionResult<AppUser[]>> {
  try {
    await ensureHubdinAccess();
    const supabase = await createSupabaseServerClient();
    const [profilesResult, rolesResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("id,email,full_name,phone,created_at")
        .order("created_at", { ascending: false }),
      supabase.from("user_roles").select("id,user_id,role"),
    ]);

    if (profilesResult.error) return fail("DB_ERROR", profilesResult.error.message);
    if (rolesResult.error) return fail("DB_ERROR", rolesResult.error.message);

    const profiles = (profilesResult.data ?? []) as ProfileRow[];
    const roles = (rolesResult.data ?? []) as UserRoleRow[];

    const rolesByUser = new Map<string, string[]>();
    for (const row of roles) {
      const current = rolesByUser.get(row.user_id) ?? [];
      current.push(row.role);
      rolesByUser.set(row.user_id, current);
    }

    return ok(
      profiles.map((profile) => ({
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        phone: profile.phone,
        created_at: profile.created_at,
        roles: [...new Set(rolesByUser.get(profile.id) ?? [])].sort(),
      }))
    );
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return fail("FORBIDDEN", "You do not have access to users.");
    }
    return fail(
      "DB_ERROR",
      error instanceof Error ? error.message : "Failed to load users."
    );
  }
}

export async function assignUserRole(
  userId: string,
  role: string
): Promise<UsersActionResult<{ userId: string; role: string }>> {
  try {
    await ensureHubdinAccess();
    if (!userId) return fail("VALIDATION_ERROR", "userId is required.");

    const normalizedRole = normalizeRoleSlug(role);
    if (!normalizedRole) return fail("VALIDATION_ERROR", "role is required.");

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("user_roles").upsert(
      {
        user_id: userId,
        role: normalizedRole,
      },
      { onConflict: "user_id,role" }
    );

    if (error) return fail("DB_ERROR", error.message);

    await writeUsersLog({
      action: "users.role.assign",
      entityId: userId,
      metadata: {
        user_id: userId,
        role: normalizedRole,
      },
    });

    revalidatePath("/dashboard/hubdin");
    revalidatePath("/dashboard/hubdin/users");
    return ok({ userId, role: normalizedRole });
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return fail("FORBIDDEN", "You do not have access to assign roles.");
    }
    return fail(
      "DB_ERROR",
      error instanceof Error ? error.message : "Failed to assign role."
    );
  }
}

export async function removeUserRole(
  userId: string,
  role: string
): Promise<UsersActionResult<{ userId: string; role: string }>> {
  try {
    await ensureHubdinAccess();
    if (!userId) return fail("VALIDATION_ERROR", "userId is required.");

    const normalizedRole = normalizeRoleSlug(role);
    if (!normalizedRole) return fail("VALIDATION_ERROR", "role is required.");

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role", normalizedRole);

    if (error) return fail("DB_ERROR", error.message);

    await writeUsersLog({
      action: "users.role.remove",
      entityId: userId,
      metadata: {
        user_id: userId,
        role: normalizedRole,
      },
    });

    revalidatePath("/dashboard/hubdin");
    revalidatePath("/dashboard/hubdin/users");
    return ok({ userId, role: normalizedRole });
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return fail("FORBIDDEN", "You do not have access to remove roles.");
    }
    return fail(
      "DB_ERROR",
      error instanceof Error ? error.message : "Failed to remove role."
    );
  }
}
