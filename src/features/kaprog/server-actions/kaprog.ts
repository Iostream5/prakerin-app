"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import { getAuthzContext } from "@/src/lib/rbac";
import { AccessDeniedError, assertRouteAccess } from "@/src/lib/authorization";
import type {
  Company,
  KaprogActionResult,
  Placement,
  Supervisor,
} from "@/src/features/kaprog/types";

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

const KAPROG_PERMISSION_CODES = [
  "dashboard.kaprog.access",
  "placements.manage",
  "companies.manage",
  "supervisors.manage",
  "kaprog.*",
];

function ok<T>(data: T): KaprogActionResult<T> {
  return { ok: true, data };
}

function fail<T>(
  code: "FORBIDDEN" | "VALIDATION_ERROR" | "NOT_FOUND" | "DB_ERROR",
  message: string
): KaprogActionResult<T> {
  return { ok: false, error: { code, message } };
}

function normalizeString(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

async function ensureKaprogAccess() {
  const authz = await getAuthzContext();
  assertRouteAccess({
    roles: authz.roles,
    permissions: authz.permissions,
    requiredRoles: ["kaprog", "hubdin"],
    requiredPermissions: KAPROG_PERMISSION_CODES,
  });
}

async function writeKaprogLog(payload: {
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const authz = await getAuthzContext();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("activity_logs").insert({
    user_id: authz.userId,
    action: payload.action,
    entity_type: payload.entityType,
    entity_id: payload.entityId ?? null,
    metadata: payload.metadata ?? {},
  });

  if (error) throw new Error(`Failed to write activity log: ${error.message}`);
}

function revalidateKaprogPages() {
  revalidatePath("/dashboard/kaprog");
  revalidatePath("/dashboard/kaprog/perusahaan");
  revalidatePath("/dashboard/kaprog/pembimbing");
  revalidatePath("/dashboard/kaprog/penempatan");
}

export async function listCompanies(): Promise<KaprogActionResult<Company[]>> {
  try {
    await ensureKaprogAccess();
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("companies")
      .select("id,code,name,city,phone,email,active,created_at,updated_at")
      .order("name", { ascending: true });

    if (error) return fail("DB_ERROR", error.message);
    return ok((data ?? []) as Company[]);
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return fail("FORBIDDEN", "You do not have access to companies.");
    }
    return fail("DB_ERROR", error instanceof Error ? error.message : "Failed to load companies.");
  }
}

export async function createCompany(input: {
  code?: string | null;
  name: string;
  city?: string | null;
  phone?: string | null;
  email?: string | null;
}): Promise<KaprogActionResult<Company>> {
  try {
    await ensureKaprogAccess();
    const name = normalizeString(input.name);
    if (!name) throw new ValidationError("Company name is required.");

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("companies")
      .insert({
        code: normalizeString(input.code),
        name,
        city: normalizeString(input.city),
        phone: normalizeString(input.phone),
        email: normalizeString(input.email),
      })
      .select("id,code,name,city,phone,email,active,created_at,updated_at")
      .single();

    if (error) return fail("DB_ERROR", error.message);
    const created = data as Company;

    await writeKaprogLog({
      action: "kaprog.company.create",
      entityType: "company",
      entityId: created.id,
      metadata: { name: created.name },
    });

    revalidateKaprogPages();
    return ok(created);
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return fail("FORBIDDEN", "You do not have access to create companies.");
    }
    if (error instanceof ValidationError) {
      return fail("VALIDATION_ERROR", error.message);
    }
    return fail("DB_ERROR", error instanceof Error ? error.message : "Failed to create company.");
  }
}

export async function deleteCompany(id: string): Promise<KaprogActionResult<{ id: string }>> {
  try {
    await ensureKaprogAccess();
    if (!isValidUuid(id)) return fail("VALIDATION_ERROR", "Invalid company id.");

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("companies").delete().eq("id", id).select("id").maybeSingle();
    if (error) return fail("DB_ERROR", error.message);
    if (!data) return fail("NOT_FOUND", "Company not found.");

    await writeKaprogLog({
      action: "kaprog.company.delete",
      entityType: "company",
      entityId: id,
    });

    revalidateKaprogPages();
    return ok({ id });
  } catch (error) {
    if (error instanceof AccessDeniedError) return fail("FORBIDDEN", "You do not have access to delete companies.");
    return fail("DB_ERROR", error instanceof Error ? error.message : "Failed to delete company.");
  }
}

export async function listSupervisors(): Promise<KaprogActionResult<Supervisor[]>> {
  try {
    await ensureKaprogAccess();
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("supervisors")
      .select("id,user_id,role,company_id,full_name,phone,email,created_at,updated_at")
      .order("full_name", { ascending: true });
    if (error) return fail("DB_ERROR", error.message);
    return ok((data ?? []) as Supervisor[]);
  } catch (error) {
    if (error instanceof AccessDeniedError) return fail("FORBIDDEN", "You do not have access to supervisors.");
    return fail("DB_ERROR", error instanceof Error ? error.message : "Failed to load supervisors.");
  }
}

export async function createSupervisor(input: {
  user_id: string;
  role: "pembimbing_sekolah" | "pembimbing_perusahaan";
  company_id?: string | null;
  full_name: string;
  phone?: string | null;
  email?: string | null;
}): Promise<KaprogActionResult<Supervisor>> {
  try {
    await ensureKaprogAccess();
    if (!isValidUuid(input.user_id)) throw new ValidationError("user_id must be valid UUID.");
    if (input.company_id && !isValidUuid(input.company_id)) {
      throw new ValidationError("company_id must be valid UUID.");
    }
    const fullName = normalizeString(input.full_name);
    if (!fullName) throw new ValidationError("full_name is required.");

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("supervisors")
      .insert({
        user_id: input.user_id,
        role: input.role,
        company_id: normalizeString(input.company_id),
        full_name: fullName,
        phone: normalizeString(input.phone),
        email: normalizeString(input.email),
      })
      .select("id,user_id,role,company_id,full_name,phone,email,created_at,updated_at")
      .single();

    if (error) return fail("DB_ERROR", error.message);
    const created = data as Supervisor;

    await writeKaprogLog({
      action: "kaprog.supervisor.create",
      entityType: "supervisor",
      entityId: created.id,
      metadata: { role: created.role, full_name: created.full_name },
    });

    revalidateKaprogPages();
    return ok(created);
  } catch (error) {
    if (error instanceof AccessDeniedError) return fail("FORBIDDEN", "You do not have access to create supervisors.");
    if (error instanceof ValidationError) return fail("VALIDATION_ERROR", error.message);
    return fail("DB_ERROR", error instanceof Error ? error.message : "Failed to create supervisor.");
  }
}

export async function deleteSupervisor(id: string): Promise<KaprogActionResult<{ id: string }>> {
  try {
    await ensureKaprogAccess();
    if (!isValidUuid(id)) return fail("VALIDATION_ERROR", "Invalid supervisor id.");
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("supervisors").delete().eq("id", id).select("id").maybeSingle();
    if (error) return fail("DB_ERROR", error.message);
    if (!data) return fail("NOT_FOUND", "Supervisor not found.");

    await writeKaprogLog({
      action: "kaprog.supervisor.delete",
      entityType: "supervisor",
      entityId: id,
    });

    revalidateKaprogPages();
    return ok({ id });
  } catch (error) {
    if (error instanceof AccessDeniedError) return fail("FORBIDDEN", "You do not have access to delete supervisors.");
    return fail("DB_ERROR", error instanceof Error ? error.message : "Failed to delete supervisor.");
  }
}

export async function listPlacements(): Promise<KaprogActionResult<Placement[]>> {
  try {
    await ensureKaprogAccess();
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("placements")
      .select("id,student_id,company_id,school_supervisor_id,company_supervisor_id,start_date,end_date,status,notes,created_at,updated_at")
      .order("start_date", { ascending: false });
    if (error) return fail("DB_ERROR", error.message);
    return ok((data ?? []) as Placement[]);
  } catch (error) {
    if (error instanceof AccessDeniedError) return fail("FORBIDDEN", "You do not have access to placements.");
    return fail("DB_ERROR", error instanceof Error ? error.message : "Failed to load placements.");
  }
}

export async function createPlacement(input: {
  student_id: string;
  company_id: string;
  school_supervisor_id?: string | null;
  company_supervisor_id?: string | null;
  start_date: string;
  end_date?: string | null;
  status?: "pending" | "active" | "completed" | "cancelled";
  notes?: string | null;
}): Promise<KaprogActionResult<Placement>> {
  try {
    await ensureKaprogAccess();
    if (!isValidUuid(input.student_id)) throw new ValidationError("student_id must be valid UUID.");
    if (!isValidUuid(input.company_id)) throw new ValidationError("company_id must be valid UUID.");
    if (input.school_supervisor_id && !isValidUuid(input.school_supervisor_id)) {
      throw new ValidationError("school_supervisor_id must be valid UUID.");
    }
    if (input.company_supervisor_id && !isValidUuid(input.company_supervisor_id)) {
      throw new ValidationError("company_supervisor_id must be valid UUID.");
    }
    if (!input.start_date) throw new ValidationError("start_date is required.");

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("placements")
      .insert({
        student_id: input.student_id,
        company_id: input.company_id,
        school_supervisor_id: normalizeString(input.school_supervisor_id),
        company_supervisor_id: normalizeString(input.company_supervisor_id),
        start_date: input.start_date,
        end_date: normalizeString(input.end_date),
        status: input.status ?? "pending",
        notes: normalizeString(input.notes),
      })
      .select("id,student_id,company_id,school_supervisor_id,company_supervisor_id,start_date,end_date,status,notes,created_at,updated_at")
      .single();

    if (error) return fail("DB_ERROR", error.message);
    const created = data as Placement;

    await writeKaprogLog({
      action: "kaprog.placement.create",
      entityType: "placement",
      entityId: created.id,
      metadata: { student_id: created.student_id, company_id: created.company_id },
    });

    revalidateKaprogPages();
    return ok(created);
  } catch (error) {
    if (error instanceof AccessDeniedError) return fail("FORBIDDEN", "You do not have access to create placements.");
    if (error instanceof ValidationError) return fail("VALIDATION_ERROR", error.message);
    return fail("DB_ERROR", error instanceof Error ? error.message : "Failed to create placement.");
  }
}

export async function deletePlacement(id: string): Promise<KaprogActionResult<{ id: string }>> {
  try {
    await ensureKaprogAccess();
    if (!isValidUuid(id)) return fail("VALIDATION_ERROR", "Invalid placement id.");
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("placements").delete().eq("id", id).select("id").maybeSingle();
    if (error) return fail("DB_ERROR", error.message);
    if (!data) return fail("NOT_FOUND", "Placement not found.");

    await writeKaprogLog({
      action: "kaprog.placement.delete",
      entityType: "placement",
      entityId: id,
    });

    revalidateKaprogPages();
    return ok({ id });
  } catch (error) {
    if (error instanceof AccessDeniedError) return fail("FORBIDDEN", "You do not have access to delete placements.");
    return fail("DB_ERROR", error instanceof Error ? error.message : "Failed to delete placement.");
  }
}
