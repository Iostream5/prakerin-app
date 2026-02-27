export type Role = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  is_system: boolean;
  created_at: string;
  updated_at: string;
};

export type Permission = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type RolePermissionMapItem = {
  permission_id: string;
  code: string;
  name: string;
  description: string | null;
  granted: boolean;
};

export type RbacActionErrorCode = "FORBIDDEN" | "VALIDATION_ERROR" | "DB_ERROR";

export type RbacActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: RbacActionErrorCode; message: string } };
