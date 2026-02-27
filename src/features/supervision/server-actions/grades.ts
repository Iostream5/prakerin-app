"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import { getAuthzContext } from "@/src/lib/rbac";
import { AccessDeniedError, assertRouteAccess } from "@/src/lib/authorization";
import type { GradeRecord, SupervisionActionResult } from "@/src/features/supervision/types";

function ok<T>(data: T): SupervisionActionResult<T> {
  return { ok: true, data };
}

function fail<T>(
  code: "FORBIDDEN" | "VALIDATION_ERROR" | "DB_ERROR",
  message: string
): SupervisionActionResult<T> {
  return { ok: false, error: { code, message } };
}

function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function normalizeScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

async function ensureCompanySupervisorAccess() {
  const authz = await getAuthzContext();
  assertRouteAccess({
    roles: authz.roles,
    permissions: authz.permissions,
    requiredRoles: ["pembimbing-perusahaan", "hubdin"],
    requiredPermissions: ["dashboard.pembimbing-perusahaan.access", "grades.manage", "grades.*"],
  });
}

export async function listGradeRecords(): Promise<SupervisionActionResult<GradeRecord[]>> {
  try {
    await ensureCompanySupervisorAccess();
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("grades")
      .select(
        "id,placement_id,technical_score,discipline_score,communication_score,final_score,notes,created_at,updated_at"
      )
      .order("updated_at", { ascending: false });
    if (error) return fail("DB_ERROR", error.message);
    return ok((data ?? []) as GradeRecord[]);
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return fail("FORBIDDEN", "You do not have access to grade records.");
    }
    return fail(
      "DB_ERROR",
      error instanceof Error ? error.message : "Failed to load grade records."
    );
  }
}

export async function upsertGradeRecord(input: {
  placement_id: string;
  technical_score: number;
  discipline_score: number;
  communication_score: number;
  notes?: string | null;
}): Promise<SupervisionActionResult<GradeRecord>> {
  try {
    await ensureCompanySupervisorAccess();
    if (!isValidUuid(input.placement_id)) {
      return fail("VALIDATION_ERROR", "placement_id must be valid UUID.");
    }

    const technical = normalizeScore(input.technical_score);
    const discipline = normalizeScore(input.discipline_score);
    const communication = normalizeScore(input.communication_score);
    const finalScore = Number(((technical + discipline + communication) / 3).toFixed(2));

    const authz = await getAuthzContext();
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("grades")
      .upsert(
        {
          placement_id: input.placement_id,
          graded_by: authz.userId,
          technical_score: technical,
          discipline_score: discipline,
          communication_score: communication,
          final_score: finalScore,
          notes: input.notes?.trim() ? input.notes.trim() : null,
        },
        { onConflict: "placement_id" }
      )
      .select(
        "id,placement_id,technical_score,discipline_score,communication_score,final_score,notes,created_at,updated_at"
      )
      .single();

    if (error) return fail("DB_ERROR", error.message);

    await supabase.from("activity_logs").insert({
      user_id: authz.userId,
      action: "grades.upsert",
      entity_type: "grade",
      entity_id: (data as { id: string }).id,
      metadata: {
        placement_id: input.placement_id,
        final_score: finalScore,
      },
    });

    revalidatePath("/dashboard/pembimbing-perusahaan/penilaian");
    revalidatePath("/dashboard/pembimbing-perusahaan");
    revalidatePath("/dashboard/siswa/nilai");
    return ok(data as GradeRecord);
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return fail("FORBIDDEN", "You do not have access to upsert grade records.");
    }
    return fail(
      "DB_ERROR",
      error instanceof Error ? error.message : "Failed to upsert grade."
    );
  }
}
