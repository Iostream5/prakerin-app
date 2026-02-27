"use server";

import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";

const APP_ROLES = new Set([
  "ks",
  "hubdin",
  "operator",
  "kaprog",
  "pembimbing_sekolah",
  "pembimbing_perusahaan",
  "siswa",
]);

type SyncAuthUserResult = {
  userId: string;
  profileTable: "users" | "profiles";
  roleCountAdded: number;
};

type UserLikePayload = {
  id: string;
  email: string | null;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  updated_at: string;
};

function normalizeRole(value: string): string {
  return value.trim().toLowerCase().replace(/[-\s]+/g, "_");
}

function toStringArray(value: unknown): string[] {
  if (!value) return [];
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string");
  }
  return [];
}

function getBestFullName(user: User): string {
  const candidates = [
    user.user_metadata?.full_name,
    user.user_metadata?.name,
    user.email,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  return "User";
}

function getRoleCandidates(user: User): string[] {
  const appMetadata = user.app_metadata ?? {};

  const candidates = [
    ...toStringArray(appMetadata.roles),
    ...toStringArray(appMetadata.role),
  ].map(normalizeRole);

  return [...new Set(candidates)].filter((role) => APP_ROLES.has(role));
}

async function upsertProfileRow(user: User, payload: UserLikePayload) {
  const supabase = await createSupabaseServerClient();
  const typedSupabase = supabase as typeof supabase & {
    from: (table: string) => ReturnType<typeof supabase.from>;
  };

  const usersAttempt = await typedSupabase
    .from("users")
    .upsert(payload, { onConflict: "id" })
    .select("id")
    .maybeSingle();

  if (usersAttempt.error && usersAttempt.error.code !== "42P01") {
    throw new Error(`Failed to sync public.users: ${usersAttempt.error.message}`);
  }

  const profilesAttempt = await typedSupabase
    .from("profiles")
    .upsert(payload, { onConflict: "id" })
    .select("id")
    .maybeSingle();

  if (profilesAttempt.error) {
    throw new Error(
      `Failed to sync profile table (users/profiles) for ${user.id}: ${profilesAttempt.error.message}`
    );
  }

  return usersAttempt.error ? ("profiles" as const) : ("users" as const);
}

async function syncUserRoles(user: User, normalizedRoles: string[]) {
  if (normalizedRoles.length === 0) return 0;

  const supabase = await createSupabaseServerClient();

  const existingRolesQuery = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  if (existingRolesQuery.error) {
    throw new Error(`Failed to read user_roles: ${existingRolesQuery.error.message}`);
  }

  const existingRoles = new Set(
    (existingRolesQuery.data ?? [])
      .map((row) => row.role)
      .filter((role): role is string => typeof role === "string")
  );

  const missingRoles = normalizedRoles.filter((role) => !existingRoles.has(role));

  if (missingRoles.length === 0) return 0;

  const rowsToInsert = missingRoles.map((role) => ({
    user_id: user.id,
    role,
  }));

  const insertQuery = await supabase.from("user_roles").insert(rowsToInsert);
  if (insertQuery.error) {
    throw new Error(`Failed to insert user_roles: ${insertQuery.error.message}`);
  }

  return missingRoles.length;
}

export async function syncAuthenticatedUser(): Promise<SyncAuthUserResult | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new Error(`Failed to get auth user: ${error.message}`);
  }

  if (!user) return null;

  const payload: UserLikePayload = {
    id: user.id,
    email: user.email ?? null,
    full_name: getBestFullName(user),
    phone:
      typeof user.user_metadata?.phone === "string"
        ? user.user_metadata.phone
        : null,
    avatar_url:
      typeof user.user_metadata?.avatar_url === "string"
        ? user.user_metadata.avatar_url
        : null,
    updated_at: new Date().toISOString(),
  };

  const profileTable = await upsertProfileRow(user, payload);
  const roleCountAdded = await syncUserRoles(user, getRoleCandidates(user));

  return {
    userId: user.id,
    profileTable,
    roleCountAdded,
  };
}
