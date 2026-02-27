import { redirect } from "next/navigation";
import type { AuthProfile } from "@/src/lib/auth";
import { getAuthUserContext } from "@/src/lib/auth";

export const ROLE_SLUGS = [
  "ks",
  "hubdin",
  "operator",
  "kaprog",
  "pembimbing-sekolah",
  "pembimbing-perusahaan",
  "siswa",
] as const;

export type RoleSlug = (typeof ROLE_SLUGS)[number];

type AuthzContext = {
  user: {
    id: string;
    email?: string;
  };
  profile: AuthProfile | null;
  userId: string;
  roles: Set<string>;
  permissions: Set<string>;
};

const ROLE_TO_ROUTE: Record<RoleSlug, string> = {
  ks: "/dashboard/ks",
  hubdin: "/dashboard/hubdin",
  operator: "/dashboard/operator",
  kaprog: "/dashboard/kaprog",
  "pembimbing-sekolah": "/dashboard/pembimbing-sekolah",
  "pembimbing-perusahaan": "/dashboard/pembimbing-perusahaan",
  siswa: "/dashboard/siswa",
};

function normalizeValue(value: string): string {
  return value.trim().toLowerCase().replace(/[_\s]+/g, "-");
}

export async function getAuthzContext(): Promise<AuthzContext> {
  const auth = await getAuthUserContext();
  if (!auth) {
    redirect("/login");
  }

  const roles = new Set<string>(auth.roles.map(normalizeValue));
  const permissions = new Set<string>(auth.permissions.map(normalizeValue));

  return {
    user: {
      id: auth.user.id,
      email: auth.user.email,
    },
    profile: auth.profile,
    userId: auth.user.id,
    roles,
    permissions,
  };
}

function hasWildcardPermission(permissions: Set<string>): boolean {
  return (
    permissions.has("*") ||
    permissions.has("dashboard.*") ||
    permissions.has("dashboard:all")
  );
}

function hasRolePermission(
  permissions: Set<string>,
  requiredRole: RoleSlug
): boolean {
  const slug = normalizeValue(requiredRole);
  const candidates = [
    `dashboard.${slug}.access`,
    `dashboard:${slug}:access`,
    `${slug}.access`,
    `${slug}:access`,
    `${slug}.*`,
  ];

  return candidates.some((candidate) => permissions.has(candidate));
}

export function canAccessRoleRoute(
  authz: AuthzContext,
  requiredRole: RoleSlug
): boolean {
  if (hasWildcardPermission(authz.permissions)) return true;
  if (authz.roles.has("hubdin")) return true;
  if (authz.roles.has(normalizeValue(requiredRole))) return true;
  return hasRolePermission(authz.permissions, requiredRole);
}

export async function requireRoleRouteAccess(requiredRole: RoleSlug) {
  const authz = await getAuthzContext();

  if (!canAccessRoleRoute(authz, requiredRole)) {
    redirect("/dashboard/unauthorized");
  }

  return authz;
}

export function resolveDefaultDashboardRoute(authz: AuthzContext): string {
  for (const role of ROLE_SLUGS) {
    if (canAccessRoleRoute(authz, role)) {
      return ROLE_TO_ROUTE[role];
    }
  }

  return "/dashboard/unauthorized";
}
