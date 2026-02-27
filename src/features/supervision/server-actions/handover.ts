"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import { getAuthzContext } from "@/src/lib/rbac";
import { AccessDeniedError, assertRouteAccess } from "@/src/lib/authorization";
import type { HandoverEvent, SupervisionActionResult } from "@/src/features/supervision/types";

type HandoverAction = "handover.submit" | "handover.pickup";

function ok<T>(data: T): SupervisionActionResult<T> {
  return { ok: true, data };
}

function fail<T>(
  code: "FORBIDDEN" | "VALIDATION_ERROR" | "DB_ERROR",
  message: string
): SupervisionActionResult<T> {
  return { ok: false, error: { code, message } };
}

function normalizeString(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

async function ensureSchoolSupervisorAccess() {
  const authz = await getAuthzContext();
  assertRouteAccess({
    roles: authz.roles,
    permissions: authz.permissions,
    requiredRoles: ["pembimbing-sekolah", "hubdin"],
    requiredPermissions: ["dashboard.pembimbing-sekolah.access", "supervision.handover.*"],
  });
}

export async function listHandoverEvents(
  action: HandoverAction
): Promise<SupervisionActionResult<HandoverEvent[]>> {
  try {
    await ensureSchoolSupervisorAccess();
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("activity_logs")
      .select("id,action,created_at,metadata")
      .eq("action", action)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) return fail("DB_ERROR", error.message);
    return ok((data ?? []) as HandoverEvent[]);
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return fail("FORBIDDEN", "You do not have access to handover events.");
    }
    return fail(
      "DB_ERROR",
      error instanceof Error ? error.message : "Failed to load handover events."
    );
  }
}

export async function createHandoverEvent(input: {
  action: HandoverAction;
  student_name?: string | null;
  company_name?: string | null;
  placement_id?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  photo_url?: string | null;
  notes?: string | null;
}): Promise<SupervisionActionResult<{ id: string }>> {
  try {
    await ensureSchoolSupervisorAccess();
    const authz = await getAuthzContext();
    const supabase = await createSupabaseServerClient();

    const metadata: Record<string, unknown> = {
      student_name: normalizeString(input.student_name),
      company_name: normalizeString(input.company_name),
      placement_id: normalizeString(input.placement_id),
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      photo_url: normalizeString(input.photo_url),
      notes: normalizeString(input.notes),
    };

    const { data, error } = await supabase
      .from("activity_logs")
      .insert({
        user_id: authz.userId,
        action: input.action,
        entity_type: "handover",
        entity_id: null,
        metadata,
      })
      .select("id")
      .single();

    if (error) return fail("DB_ERROR", error.message);

    revalidatePath("/dashboard/pembimbing-sekolah/penyerahan");
    revalidatePath("/dashboard/pembimbing-sekolah/penarikan");
    return ok({ id: (data as { id: string }).id });
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return fail("FORBIDDEN", "You do not have access to create handover events.");
    }
    return fail(
      "DB_ERROR",
      error instanceof Error ? error.message : "Failed to create handover event."
    );
  }
}
