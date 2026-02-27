"use server";

import { getAuthzContext } from "@/src/lib/rbac";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import { AccessDeniedError, assertRouteAccess } from "@/src/lib/authorization";
import type { CompanyProfileView, SupervisionActionResult } from "@/src/features/supervision/types";

type SupervisorRow = {
  full_name: string;
  email: string | null;
  phone: string | null;
  company_id: string | null;
  companies:
    | {
        id: string;
        name: string | null;
        email: string | null;
        phone: string | null;
        city: string | null;
        address: string | null;
        logo_url: string | null;
      }
    | {
        id: string;
        name: string | null;
        email: string | null;
        phone: string | null;
        city: string | null;
        address: string | null;
        logo_url: string | null;
      }[]
    | null;
};

function ok<T>(data: T): SupervisionActionResult<T> {
  return { ok: true, data };
}

function fail<T>(
  code: "FORBIDDEN" | "VALIDATION_ERROR" | "DB_ERROR",
  message: string
): SupervisionActionResult<T> {
  return { ok: false, error: { code, message } };
}

async function ensureCompanySupervisorAccess() {
  const authz = await getAuthzContext();
  assertRouteAccess({
    roles: authz.roles,
    permissions: authz.permissions,
    requiredRoles: ["pembimbing-perusahaan", "hubdin"],
    requiredPermissions: ["dashboard.pembimbing-perusahaan.access"],
  });
}

export async function getMyCompanyProfile(): Promise<SupervisionActionResult<CompanyProfileView | null>> {
  try {
    await ensureCompanySupervisorAccess();
    const authz = await getAuthzContext();
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("supervisors")
      .select(
        "full_name,email,phone,company_id,companies(id,name,email,phone,city,address,logo_url)"
      )
      .eq("user_id", authz.userId)
      .eq("role", "pembimbing_perusahaan")
      .maybeSingle();

    if (error) return fail("DB_ERROR", error.message);
    if (!data) return ok(null);

    const row = data as SupervisorRow;
    const company = Array.isArray(row.companies) ? row.companies[0] : row.companies;

    return ok({
      supervisor_name: row.full_name,
      supervisor_email: row.email,
      supervisor_phone: row.phone,
      company_id: row.company_id,
      company_name: company?.name ?? null,
      company_email: company?.email ?? null,
      company_phone: company?.phone ?? null,
      company_city: company?.city ?? null,
      company_address: company?.address ?? null,
      company_logo_url: company?.logo_url ?? null,
    });
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return fail("FORBIDDEN", "You do not have access to company profile.");
    }
    return fail(
      "DB_ERROR",
      error instanceof Error ? error.message : "Failed to load company profile."
    );
  }
}
