export type AppUser = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  created_at: string | null;
  roles: string[];
};

export type UsersActionErrorCode = "FORBIDDEN" | "VALIDATION_ERROR" | "DB_ERROR";

export type UsersActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: UsersActionErrorCode; message: string } };
