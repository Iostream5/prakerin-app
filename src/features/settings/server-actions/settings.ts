"use server";

import { revalidatePath } from "next/cache";
import type { Json } from "@/src/types/database.types";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import { getAuthzContext } from "@/src/lib/rbac";
import { AccessDeniedError, assertRouteAccess } from "@/src/lib/authorization";
import type {
  AppSetting,
  SettingsActionResult,
  UpsertAppSettingInput,
} from "@/src/features/settings/types";

type AppSettingRow = AppSetting;

const HUBDIN_PERMISSION_CODES = [
  "settings.manage",
  "settings.*",
  "dashboard.hubdin.access",
];

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

function ok<T>(data: T): SettingsActionResult<T> {
  return { ok: true, data };
}

function fail<T>(
  code: "FORBIDDEN" | "VALIDATION_ERROR" | "DB_ERROR",
  message: string
): SettingsActionResult<T> {
  return { ok: false, error: { code, message } };
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeDescription(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function isValidKey(key: string): boolean {
  return /^[a-z][a-z0-9_.-]{1,63}$/.test(key);
}

function parseJsonValue(raw: string): Json {
  try {
    return JSON.parse(raw) as Json;
  } catch {
    throw new ValidationError("value must be valid JSON.");
  }
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

async function writeSettingsLog(payload: {
  action: string;
  metadata: Record<string, unknown>;
}) {
  const authz = await getAuthzContext();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("activity_logs").insert({
    user_id: authz.userId,
    action: payload.action,
    entity_type: "app_setting",
    entity_id: null,
    metadata: payload.metadata,
  });

  if (error) {
    throw new Error(`Failed to write activity log: ${error.message}`);
  }
}

export async function listAppSettings(): Promise<SettingsActionResult<AppSetting[]>> {
  try {
    await ensureHubdinAccess();
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("app_settings")
      .select("key,value,description,created_at,updated_at")
      .order("key", { ascending: true });

    if (error) return fail("DB_ERROR", error.message);
    return ok((data ?? []) as AppSettingRow[]);
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return fail("FORBIDDEN", "You do not have access to app settings.");
    }
    return fail(
      "DB_ERROR",
      error instanceof Error ? error.message : "Failed to load app settings."
    );
  }
}

export async function upsertAppSetting(
  input: UpsertAppSettingInput
): Promise<SettingsActionResult<AppSetting>> {
  try {
    await ensureHubdinAccess();

    const key = normalizeKey(input.key);
    if (!isValidKey(key)) {
      return fail(
        "VALIDATION_ERROR",
        "Invalid key format. Use lowercase letters, numbers, dot, underscore, or dash."
      );
    }

    const value = parseJsonValue(input.valueRaw);
    const description = normalizeDescription(input.description);

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("app_settings")
      .upsert({ key, value, description }, { onConflict: "key" })
      .select("key,value,description,created_at,updated_at")
      .single();

    if (error) return fail("DB_ERROR", error.message);

    await writeSettingsLog({
      action: "settings.upsert",
      metadata: {
        key,
      },
    });

    revalidatePath("/dashboard/hubdin");
    revalidatePath("/dashboard/hubdin/settings");
    return ok(data as AppSetting);
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return fail("FORBIDDEN", "You do not have access to update app settings.");
    }
    if (error instanceof ValidationError) {
      return fail("VALIDATION_ERROR", error.message);
    }
    return fail(
      "DB_ERROR",
      error instanceof Error ? error.message : "Failed to upsert app setting."
    );
  }
}

export async function deleteAppSetting(
  keyValue: string
): Promise<SettingsActionResult<{ key: string }>> {
  try {
    await ensureHubdinAccess();
    const key = normalizeKey(keyValue);
    if (!isValidKey(key)) {
      return fail("VALIDATION_ERROR", "Invalid setting key.");
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("app_settings").delete().eq("key", key);
    if (error) return fail("DB_ERROR", error.message);

    await writeSettingsLog({
      action: "settings.delete",
      metadata: {
        key,
      },
    });

    revalidatePath("/dashboard/hubdin");
    revalidatePath("/dashboard/hubdin/settings");
    return ok({ key });
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return fail("FORBIDDEN", "You do not have access to delete app settings.");
    }
    return fail(
      "DB_ERROR",
      error instanceof Error ? error.message : "Failed to delete app setting."
    );
  }
}
