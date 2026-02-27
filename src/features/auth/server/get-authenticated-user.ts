import "server-only";

import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import type {
  AuthenticatedProfile,
  HydratedAuthenticatedUser,
} from "@/src/features/auth/types";

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type UserRoleRow = {
  role: string | null;
};

type RolePermissionRow = {
  permissions?: {
    code?: string | null;
  } | null;
};

const PROFILE_COLUMNS =
  "id,email,full_name,phone,avatar_url,created_at,updated_at";

function mapProfileRow(row: ProfileRow): AuthenticatedProfile {
  return {
    id: row.id,
    email: row.email,
    full_name: row.full_name,
    phone: row.phone,
    avatar_url: row.avatar_url,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function toPermissionCodes(rows: RolePermissionRow[] | null): string[] {
  const codes = (rows ?? [])
    .map((row) => row.permissions?.code)
    .filter((code): code is string => typeof code === "string" && code.length > 0);

  return [...new Set(codes)];
}

export async function getHydratedAuthenticatedUser(): Promise<HydratedAuthenticatedUser | null> {
  const supabase = await createSupabaseServerClient();

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    throw new Error(`Failed to read session: ${sessionError.message}`);
  }

  const session = sessionData.session;
  if (!session?.user) {
    return null;
  }

  const userId = session.user.id;

  const [profileResult, userRoleResult] = await Promise.all([
    supabase
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle(),
  ]);

  if (profileResult.error) {
    throw new Error(`Failed to read profile: ${profileResult.error.message}`);
  }

  if (userRoleResult.error) {
    throw new Error(`Failed to read user role: ${userRoleResult.error.message}`);
  }

  const role =
    typeof (userRoleResult.data as UserRoleRow | null)?.role === "string"
      ? (userRoleResult.data as UserRoleRow).role
      : null;

  let permissions: string[] = [];
  if (role) {
    const permissionsResult = await supabase
      .from("role_permissions")
      .select("permissions:permission_id(code)")
      .eq("role", role)
      .eq("granted", true);

    if (permissionsResult.error) {
      throw new Error(`Failed to read permissions: ${permissionsResult.error.message}`);
    }

    permissions = toPermissionCodes(
      (permissionsResult.data ?? []) as RolePermissionRow[]
    );
  }

  return {
    session,
    user: session.user,
    profile: profileResult.data
      ? mapProfileRow(profileResult.data as ProfileRow)
      : null,
    role,
    permissions,
  };
}
