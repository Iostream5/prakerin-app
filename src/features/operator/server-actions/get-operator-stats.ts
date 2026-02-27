import "server-only";

import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import { getAuthzContext } from "@/src/lib/rbac";
import { AccessDeniedError, assertRouteAccess } from "@/src/lib/authorization";

export type OperatorStats = {
  totalStudents: number;
  activePlacements: number;
  unassignedStudents: number;
  totalCompanies: number;
};

type OperatorStatsOperation =
  | "authorize_operator_stats"
  | "count_total_students"
  | "count_active_placements"
  | "count_unassigned_students"
  | "count_total_companies";

export class OperatorStatsError extends Error {
  public readonly operation: OperatorStatsOperation;
  public readonly causeMessage: string;

  constructor(operation: OperatorStatsOperation, causeMessage: string) {
    super(`Failed to ${operation}: ${causeMessage}`);
    this.name = "OperatorStatsError";
    this.operation = operation;
    this.causeMessage = causeMessage;
  }
}

const OPERATOR_STATS_READ_PERMISSION_CODES = [
  "dashboard.operator.access",
  "dashboard.hubdin.access",
  "dashboard.*",
  "students.read",
  "students.view",
  "students.*",
  "placements.read",
  "placements.view",
  "placements.*",
  "companies.read",
  "companies.view",
  "companies.*",
];

async function ensureOperatorStatsAccess() {
  const authz = await getAuthzContext();
  assertRouteAccess({
    roles: authz.roles,
    permissions: authz.permissions,
    requiredRoles: ["hubdin", "operator"],
    requiredPermissions: OPERATOR_STATS_READ_PERMISSION_CODES,
  });
}

function ensureCount(
  operation: OperatorStatsOperation,
  count: number | null,
  error: { message: string } | null
): number {
  if (error) {
    throw new OperatorStatsError(operation, error.message);
  }

  if (typeof count !== "number") {
    throw new OperatorStatsError(operation, "Count result is null.");
  }

  return count;
}

export async function getOperatorStats(): Promise<OperatorStats> {
  try {
    await ensureOperatorStatsAccess();
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      throw new OperatorStatsError(
        "authorize_operator_stats",
        "Forbidden to read operator statistics."
      );
    }
    throw error;
  }

  const supabase = await createSupabaseServerClient();

  const [
    totalStudentsResult,
    activePlacementsResult,
    unassignedStudentsResult,
    totalCompaniesResult,
  ] = await Promise.all([
    supabase.from("students").select("id", { count: "exact", head: true }),
    supabase
      .from("placements")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("students")
      .select("id, placements!left(id)", { count: "exact", head: true })
      .is("placements.id", null),
    supabase.from("companies").select("id", { count: "exact", head: true }),
  ]);

  return {
    totalStudents: ensureCount(
      "count_total_students",
      totalStudentsResult.count,
      totalStudentsResult.error
    ),
    activePlacements: ensureCount(
      "count_active_placements",
      activePlacementsResult.count,
      activePlacementsResult.error
    ),
    unassignedStudents: ensureCount(
      "count_unassigned_students",
      unassignedStudentsResult.count,
      unassignedStudentsResult.error
    ),
    totalCompanies: ensureCount(
      "count_total_companies",
      totalCompaniesResult.count,
      totalCompaniesResult.error
    ),
  };
}
