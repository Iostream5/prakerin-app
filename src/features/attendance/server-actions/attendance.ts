"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import { getAuthzContext } from "@/src/lib/rbac";
import { AccessDeniedError, assertRouteAccess } from "@/src/lib/authorization";
import type {
  Attendance,
  AttendanceActionResult,
  AttendancePlacementOption,
  AttendanceStatus,
  CheckoutAttendanceInput,
  CreateAttendanceInput,
  ListAttendanceParams,
  UpdateAttendanceInput,
} from "@/src/features/attendance/types";

type AttendanceRow = {
  id: string;
  placement_id: string;
  attendance_date: string;
  status: AttendanceStatus;
  checkin_at: string | null;
  checkout_at: string | null;
  checkin_lat: number | null;
  checkin_lng: number | null;
  checkout_lat: number | null;
  checkout_lng: number | null;
  checkin_photo_url: string | null;
  checkout_photo_url: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
};

type PlacementOptionRow = {
  id: string;
  status: string;
  start_date: string;
  end_date: string | null;
  companies?: { name?: string | null } | { name?: string | null }[] | null;
};

const ATTENDANCE_COLUMNS =
  "id,placement_id,attendance_date,status,checkin_at,checkout_at,checkin_lat,checkin_lng,checkout_lat,checkout_lng,checkin_photo_url,checkout_photo_url,note,created_at,updated_at";

const READ_PERMISSION_CODES = [
  "attendance.read",
  "attendance.view",
  "attendance.*",
  "dashboard.siswa.access",
  "dashboard.pembimbing-sekolah.access",
  "dashboard.pembimbing-perusahaan.access",
  "dashboard.hubdin.access",
];

const WRITE_PERMISSION_CODES = [
  "attendance.write",
  "attendance.create",
  "attendance.update",
  "attendance.manage",
  "attendance.*",
];

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

function ok<T>(data: T): AttendanceActionResult<T> {
  return { ok: true, data };
}

function fail<T>(
  code: "UNAUTHORIZED" | "FORBIDDEN" | "VALIDATION_ERROR" | "NOT_FOUND" | "DB_ERROR",
  message: string
): AttendanceActionResult<T> {
  return {
    ok: false,
    error: { code, message },
  };
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

function isValidDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function parseAttendanceRow(row: unknown): Attendance {
  const data = row as AttendanceRow;
  return {
    id: data.id,
    placement_id: data.placement_id,
    attendance_date: data.attendance_date,
    status: data.status,
    checkin_at: data.checkin_at,
    checkout_at: data.checkout_at,
    checkin_lat: data.checkin_lat,
    checkin_lng: data.checkin_lng,
    checkout_lat: data.checkout_lat,
    checkout_lng: data.checkout_lng,
    checkin_photo_url: data.checkin_photo_url,
    checkout_photo_url: data.checkout_photo_url,
    note: data.note,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

function parsePlacementOptionRow(row: unknown): AttendancePlacementOption {
  const data = row as PlacementOptionRow;
  const company = Array.isArray(data.companies) ? data.companies[0] : data.companies;

  return {
    id: data.id,
    company_name: company?.name ?? null,
    start_date: data.start_date,
    end_date: data.end_date,
    status: data.status,
  };
}

function revalidateAttendancePages() {
  revalidatePath("/dashboard/siswa/absensi");
  revalidatePath("/dashboard/pembimbing-sekolah");
  revalidatePath("/dashboard/pembimbing-perusahaan");
  revalidatePath("/dashboard/hubdin");
}

async function writeAttendanceLog(payload: {
  action: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const authz = await getAuthzContext();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("activity_logs").insert({
    user_id: authz.userId,
    action: payload.action,
    entity_type: "attendance",
    entity_id: payload.entityId ?? null,
    metadata: payload.metadata ?? {},
  });

  if (error) {
    throw new Error(`Failed to write activity log: ${error.message}`);
  }
}

async function ensureAttendanceReadAccess() {
  const authz = await getAuthzContext();
  assertRouteAccess({
    roles: authz.roles,
    permissions: authz.permissions,
    requiredRoles: [
      "hubdin",
      "pembimbing-sekolah",
      "pembimbing-perusahaan",
      "siswa",
    ],
    requiredPermissions: READ_PERMISSION_CODES,
  });
}

async function ensureAttendanceWriteAccess() {
  const authz = await getAuthzContext();
  assertRouteAccess({
    roles: authz.roles,
    permissions: authz.permissions,
    requiredRoles: ["hubdin", "siswa"],
    requiredPermissions: WRITE_PERMISSION_CODES,
  });
}

async function getAttendanceById(id: string): Promise<AttendanceRow | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("attendance")
    .select(ATTENDANCE_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as AttendanceRow | null) ?? null;
}

function sanitizeCreatePayload(input: CreateAttendanceInput) {
  const placementId = normalizeString(input.placement_id);
  const attendanceDate = normalizeString(input.attendance_date);
  const note = normalizeString(input.note ?? null);
  const checkinPhoto = normalizeString(input.checkin_photo_url ?? null);

  if (!placementId || !isValidUuid(placementId)) {
    throw new ValidationError("placement_id must be a valid UUID.");
  }
  if (!attendanceDate || !isValidDate(attendanceDate)) {
    throw new ValidationError("attendance_date must use YYYY-MM-DD format.");
  }

  const status = input.status;
  if (!["hadir", "izin", "sakit", "alpha"].includes(status)) {
    throw new ValidationError("Invalid attendance status.");
  }

  if (status === "hadir") {
    if (!isFiniteNumber(input.checkin_lat) || !isFiniteNumber(input.checkin_lng)) {
      throw new ValidationError("checkin_lat and checkin_lng are required for hadir.");
    }
    if (!checkinPhoto) {
      throw new ValidationError("checkin_photo_url is required for hadir.");
    }
  }

  return {
    placement_id: placementId,
    attendance_date: attendanceDate,
    status,
    note,
    checkin_at: status === "hadir" ? new Date().toISOString() : null,
    checkin_lat: status === "hadir" ? (input.checkin_lat ?? null) : null,
    checkin_lng: status === "hadir" ? (input.checkin_lng ?? null) : null,
    checkin_photo_url: status === "hadir" ? checkinPhoto : null,
  };
}

function sanitizeUpdatePayload(input: UpdateAttendanceInput) {
  const payload: Record<string, unknown> = {};

  if ("status" in input && input.status) {
    if (!["hadir", "izin", "sakit", "alpha"].includes(input.status)) {
      throw new ValidationError("Invalid attendance status.");
    }
    payload.status = input.status;
  }

  if ("note" in input) {
    payload.note = normalizeString(input.note ?? null);
  }

  if (Object.keys(payload).length === 0) {
    throw new ValidationError("No fields provided for update.");
  }

  return payload;
}

function sanitizeCheckoutPayload(input: CheckoutAttendanceInput) {
  const photo = normalizeString(input.checkout_photo_url);
  if (!isFiniteNumber(input.checkout_lat) || !isFiniteNumber(input.checkout_lng)) {
    throw new ValidationError("checkout_lat and checkout_lng are required.");
  }
  if (!photo) {
    throw new ValidationError("checkout_photo_url is required.");
  }

  return {
    checkout_at: new Date().toISOString(),
    checkout_lat: input.checkout_lat,
    checkout_lng: input.checkout_lng,
    checkout_photo_url: photo,
    note: normalizeString(input.note ?? null),
  };
}

export async function listAttendance(
  params: ListAttendanceParams = {}
): Promise<AttendanceActionResult<{ items: Attendance[]; count: number }>> {
  try {
    await ensureAttendanceReadAccess();
    const supabase = await createSupabaseServerClient();

    const page = Number.isFinite(params.page) ? Math.max(1, Number(params.page)) : 1;
    const pageSize = Number.isFinite(params.pageSize)
      ? Math.min(100, Math.max(1, Number(params.pageSize)))
      : 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("attendance")
      .select(ATTENDANCE_COLUMNS, { count: "exact" })
      .order("attendance_date", { ascending: false })
      .range(from, to);

    const placementId = normalizeString(params.placementId);
    if (placementId) {
      if (!isValidUuid(placementId)) {
        return fail("VALIDATION_ERROR", "placementId must be a valid UUID.");
      }
      query = query.eq("placement_id", placementId);
    }

    if (params.status) {
      query = query.eq("status", params.status);
    }

    const dateFrom = normalizeString(params.dateFrom);
    if (dateFrom) {
      if (!isValidDate(dateFrom)) {
        return fail("VALIDATION_ERROR", "dateFrom must use YYYY-MM-DD format.");
      }
      query = query.gte("attendance_date", dateFrom);
    }

    const dateTo = normalizeString(params.dateTo);
    if (dateTo) {
      if (!isValidDate(dateTo)) {
        return fail("VALIDATION_ERROR", "dateTo must use YYYY-MM-DD format.");
      }
      query = query.lte("attendance_date", dateTo);
    }

    const { data, error, count } = await query;
    if (error) return fail("DB_ERROR", error.message);

    return ok({
      items: (data ?? []).map(parseAttendanceRow),
      count: count ?? 0,
    });
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return fail("FORBIDDEN", "You do not have access to read attendance.");
    }
    return fail(
      "DB_ERROR",
      error instanceof Error ? error.message : "Failed to list attendance."
    );
  }
}

export async function listAttendancePlacementOptions(): Promise<
  AttendanceActionResult<AttendancePlacementOption[]>
> {
  try {
    await ensureAttendanceReadAccess();
    const authz = await getAuthzContext();
    const supabase = await createSupabaseServerClient();

    let query = supabase
      .from("placements")
      .select("id,status,start_date,end_date,companies(name),students!inner(user_id)")
      .order("start_date", { ascending: false });

    if (authz.roles.has("siswa")) {
      query = query.eq("students.user_id", authz.userId);
    }

    const { data, error } = await query;
    if (error) return fail("DB_ERROR", error.message);

    return ok((data ?? []).map(parsePlacementOptionRow));
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return fail("FORBIDDEN", "You do not have access to placement options.");
    }
    return fail(
      "DB_ERROR",
      error instanceof Error
        ? error.message
        : "Failed to load attendance placement options."
    );
  }
}

export async function createAttendance(
  input: CreateAttendanceInput
): Promise<AttendanceActionResult<Attendance>> {
  try {
    await ensureAttendanceWriteAccess();
    const payload = sanitizeCreatePayload(input);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("attendance")
      .insert(payload)
      .select(ATTENDANCE_COLUMNS)
      .single();

    if (error) {
      return fail("DB_ERROR", error.message);
    }

    const created = parseAttendanceRow(data);
    await writeAttendanceLog({
      action: "attendance.checkin",
      entityId: created.id,
      metadata: {
        placement_id: created.placement_id,
        attendance_date: created.attendance_date,
        status: created.status,
      },
    });

    revalidateAttendancePages();
    return ok(created);
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return fail("FORBIDDEN", "You do not have access to create attendance.");
    }
    if (error instanceof ValidationError) {
      return fail("VALIDATION_ERROR", error.message);
    }
    return fail(
      "DB_ERROR",
      error instanceof Error ? error.message : "Failed to create attendance."
    );
  }
}

export async function updateAttendance(
  id: string,
  input: UpdateAttendanceInput
): Promise<AttendanceActionResult<Attendance>> {
  try {
    await ensureAttendanceWriteAccess();
    if (!isValidUuid(id)) {
      return fail("VALIDATION_ERROR", "Invalid attendance id.");
    }

    const existing = await getAttendanceById(id);
    if (!existing) {
      return fail("NOT_FOUND", "Attendance not found.");
    }

    if (existing.status === "hadir" && existing.checkout_at) {
      return fail("FORBIDDEN", "Checked out attendance cannot be updated.");
    }

    const payload = sanitizeUpdatePayload(input);
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("attendance")
      .update(payload)
      .eq("id", id)
      .select(ATTENDANCE_COLUMNS)
      .maybeSingle();

    if (error) return fail("DB_ERROR", error.message);
    if (!data) return fail("NOT_FOUND", "Attendance not found.");

    const updated = parseAttendanceRow(data);
    await writeAttendanceLog({
      action: "attendance.update",
      entityId: updated.id,
      metadata: {
        previous_status: existing.status,
        next_status: updated.status,
      },
    });

    revalidateAttendancePages();
    return ok(updated);
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return fail("FORBIDDEN", "You do not have access to update attendance.");
    }
    if (error instanceof ValidationError) {
      return fail("VALIDATION_ERROR", error.message);
    }
    return fail(
      "DB_ERROR",
      error instanceof Error ? error.message : "Failed to update attendance."
    );
  }
}

export async function checkoutAttendance(
  id: string,
  input: CheckoutAttendanceInput
): Promise<AttendanceActionResult<Attendance>> {
  try {
    await ensureAttendanceWriteAccess();
    if (!isValidUuid(id)) {
      return fail("VALIDATION_ERROR", "Invalid attendance id.");
    }

    const existing = await getAttendanceById(id);
    if (!existing) {
      return fail("NOT_FOUND", "Attendance not found.");
    }
    if (existing.status !== "hadir") {
      return fail("FORBIDDEN", "Checkout only allowed for hadir status.");
    }
    if (!existing.checkin_at) {
      return fail("FORBIDDEN", "Cannot checkout before checkin.");
    }
    if (existing.checkout_at) {
      return fail("FORBIDDEN", "Attendance already checked out.");
    }

    const payload = sanitizeCheckoutPayload(input);
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("attendance")
      .update(payload)
      .eq("id", id)
      .select(ATTENDANCE_COLUMNS)
      .maybeSingle();

    if (error) return fail("DB_ERROR", error.message);
    if (!data) return fail("NOT_FOUND", "Attendance not found.");

    const checkedOut = parseAttendanceRow(data);
    await writeAttendanceLog({
      action: "attendance.checkout",
      entityId: checkedOut.id,
      metadata: {
        attendance_date: checkedOut.attendance_date,
      },
    });

    revalidateAttendancePages();
    return ok(checkedOut);
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return fail("FORBIDDEN", "You do not have access to checkout attendance.");
    }
    if (error instanceof ValidationError) {
      return fail("VALIDATION_ERROR", error.message);
    }
    return fail(
      "DB_ERROR",
      error instanceof Error ? error.message : "Failed to checkout attendance."
    );
  }
}

export async function deleteAttendance(
  id: string
): Promise<AttendanceActionResult<{ id: string }>> {
  try {
    await ensureAttendanceWriteAccess();
    if (!isValidUuid(id)) {
      return fail("VALIDATION_ERROR", "Invalid attendance id.");
    }

    const existing = await getAttendanceById(id);
    if (!existing) {
      return fail("NOT_FOUND", "Attendance not found.");
    }
    if (existing.checkout_at) {
      return fail("FORBIDDEN", "Checked out attendance cannot be deleted.");
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("attendance")
      .delete()
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (error) return fail("DB_ERROR", error.message);
    if (!data) return fail("NOT_FOUND", "Attendance not found.");

    const deleted = data as { id: string };
    await writeAttendanceLog({
      action: "attendance.delete",
      entityId: deleted.id,
      metadata: {
        attendance_date: existing.attendance_date,
        status: existing.status,
      },
    });

    revalidateAttendancePages();
    return ok({ id: deleted.id });
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return fail("FORBIDDEN", "You do not have access to delete attendance.");
    }
    return fail(
      "DB_ERROR",
      error instanceof Error ? error.message : "Failed to delete attendance."
    );
  }
}
