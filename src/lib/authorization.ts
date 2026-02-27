import "server-only";

export class AccessDeniedError extends Error {
  constructor(message = "FORBIDDEN") {
    super(message);
    this.name = "AccessDeniedError";
  }
}

function normalizePermission(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeRole(value: string): string {
  return value.trim().toLowerCase().replace(/[_\s]+/g, "-");
}

export function hasAnyPermission(
  permissions: Iterable<string>,
  candidates: readonly string[]
): boolean {
  const normalizedPermissions = new Set(
    Array.from(permissions).map(normalizePermission)
  );

  if (
    normalizedPermissions.has("*") ||
    normalizedPermissions.has("dashboard.*") ||
    normalizedPermissions.has("dashboard:all")
  ) {
    return true;
  }

  return candidates.some((code) =>
    normalizedPermissions.has(normalizePermission(code))
  );
}

export function assertRouteAccess(options: {
  roles: Iterable<string>;
  permissions: Iterable<string>;
  requiredRoles?: readonly string[];
  requiredPermissions: readonly string[];
}) {
  const normalizedRoles = new Set(Array.from(options.roles).map(normalizeRole));
  const hasRole =
    (options.requiredRoles ?? []).length > 0
      ? (options.requiredRoles ?? []).some((role) =>
          normalizedRoles.has(normalizeRole(role))
        )
      : false;
  const hasPermission = hasAnyPermission(
    options.permissions,
    options.requiredPermissions
  );

  if (!hasRole && !hasPermission) {
    throw new AccessDeniedError();
  }
}
