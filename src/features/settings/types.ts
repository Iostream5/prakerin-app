import type { Json } from "@/src/types/database.types";

export type AppSetting = {
  key: string;
  value: Json;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type UpsertAppSettingInput = {
  key: string;
  valueRaw: string;
  description?: string | null;
};

export type SettingsActionErrorCode = "FORBIDDEN" | "VALIDATION_ERROR" | "DB_ERROR";

export type SettingsActionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: {
        code: SettingsActionErrorCode;
        message: string;
      };
    };
