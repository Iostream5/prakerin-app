import "server-only";

import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import { getPermissionsForRoles } from "@/src/lib/permissions";

export type AuthProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type AuthUserContext = {
  user: User;
  profile: AuthProfile | null;
  roles: string[];
  permissions: string[];
};

type ProfileRow = AuthProfile;
type UserRoleRow = { role?: string | null };

const PROFILE_COLUMNS =
  "id,email,full_name,phone,avatar_url,created_at,updated_at";

function normalizeRole(value: string): string {
  return value.trim().toLowerCase().replace(/[_\s]+/g, "-");
}

class AuthServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthServiceError";
  }
}

export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw new AuthServiceError(
      `Failed to load authenticated user session: ${error.message}`
    );
  }

  return data.user ?? null;
});

const getProfileByUserId = cache(async (userId: string): Promise<AuthProfile | null> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new AuthServiceError(`Failed to load profile: ${error.message}`);
  }

  return (data as ProfileRow | null) ?? null;
});

const getRolesByUserId = cache(async (userId: string): Promise<string[]> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (error) {
    throw new AuthServiceError(`Failed to load user roles: ${error.message}`);
  }

  const roles = (data ?? [])
    .map((row) => (row as UserRoleRow).role)
    .filter((role): role is string => typeof role === "string" && role.length > 0)
    .map(normalizeRole);

  return [...new Set(roles)];
});

export const getCurrentProfile = cache(async (): Promise<AuthProfile | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const profile = await getProfileByUserId(user.id);
  if (!profile) {
    throw new AuthServiceError(
      `Authenticated user ${user.id} is missing a profile row in public.profiles.`
    );
  }

  return profile;
});

export const getUserRoles = cache(async (): Promise<string[]> => {
  const user = await getCurrentUser();
  if (!user) return [];

  const roles = await getRolesByUserId(user.id);
  if (roles.length === 0) {
    throw new AuthServiceError(
      `Authenticated user ${user.id} has no roles in public.user_roles.`
    );
  }

  return roles;
});

export const getUserPermissions = cache(async (): Promise<string[]> => {
  const user = await getCurrentUser();
  if (!user) return [];

  const roles = await getUserRoles();
  return getPermissionsForRoles(roles);
});

export const getAuthUserContext = cache(async (): Promise<AuthUserContext | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const [profile, roles, permissions] = await Promise.all([
    getCurrentProfile(),
    getUserRoles(),
    getUserPermissions(),
  ]);

  return {
    user,
    profile,
    roles,
    permissions,
  };
});
