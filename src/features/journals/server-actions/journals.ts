"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import { getAuthzContext } from "@/src/lib/rbac";
import { AccessDeniedError, assertRouteAccess } from "@/src/lib/authorization";
import type {
  CreateJournalInput,
  Journal,
  JournalPlacementOption,
  JournalStatus,
  JournalsActionResult,
  ListJournalsParams,
  UpdateJournalInput,
  ValidateJournalInput,
} from "@/src/features/journals/types";

type JournalRow = {
  id: string;
  placement_id: string;
  journal_date: string;
  title: string;
  content: string;
  status: JournalStatus;
  validated_by: string | null;
  validated_at: string | null;
  feedback: string | null;
  created_at: string;
  updated_at: string;
};

type ActivityLogPayload = {
  action: string;
  entity_id?: string | null;
  metadata?: Record<string, unknown>;
};

type PlacementOptionRow = {
  id: string;
  status: string;
  start_date: string;
  end_date: string | null;
  companies?: { name?: string | null } | { name?: string | null }[] | null;
  students?: { user_id?: string | null } | { user_id?: string | null }[] | null;
};

const JOURNAL_COLUMNS =
  "id,placement_id,journal_date,title,content,status,validated_by,validated_at,feedback,created_at,updated_at";

const READ_PERMISSION_CODES = [
  "journals.read",
  "journals.view",
  "journals.*",
  "dashboard.siswa.access",
  "dashboard.pembimbing-sekolah.access",
  "dashboard.pembimbing-perusahaan.access",
  "dashboard.kaprog.access",
  "dashboard.hubdin.access",
];

const WRITE_PERMISSION_CODES = [
  "journals.create",
  "journals.update",
  "journals.write",
  "journals.manage",
  "journals.*",
];

const VALIDATE_PERMISSION_CODES = [
  "journals.validate",
  "journals.approve",
  "journals.review",
  "journals.manage",
  "journals.*",
];

const DELETE_PERMISSION_CODES = [
  "journals.delete",
  "journals.manage",
  "journals.*",
];

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

function ok<T>(data: T): JournalsActionResult<T> {
  return { ok: true, data };
}

function fail<T>(
  code: "UNAUTHORIZED" | "FORBIDDEN" | "VALIDATION_ERROR" | "NOT_FOUND" | "DB_ERROR",
  message: string
): JournalsActionResult<T> {
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

function parseJournalRow(row: unknown): Journal {
  const data = row as JournalRow;

  return {
    id: data.id,
    placement_id: data.placement_id,
    journal_date: data.journal_date,
    title: data.title,
    content: data.content,
    status: data.status,
    validated_by: data.validated_by,
    validated_at: data.validated_at,
    feedback: data.feedback,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

function parsePlacementOptionRow(row: unknown): JournalPlacementOption {
  const data = row as PlacementOptionRow;

  const companies = Array.isArray(data.companies)
    ? data.companies[0]
    : data.companies ?? null;

  return {
    id: data.id,
    company_name: companies?.name ?? null,
    start_date: data.start_date,
    end_date: data.end_date,
    status: data.status,
  };
}

function revalidateJournalPages() {
  revalidatePath("/dashboard/siswa/jurnal");
  revalidatePath("/dashboard/pembimbing-perusahaan/validasi-jurnal");
  revalidatePath("/dashboard/pembimbing-sekolah/monitoring-jurnal");
  revalidatePath("/dashboard/hubdin");
}

async function writeActivityLog(payload: ActivityLogPayload): Promise<void> {
  const authz = await getAuthzContext();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("activity_logs").insert({
    user_id: authz.userId,
    action: payload.action,
    entity_type: "journal",
    entity_id: payload.entity_id ?? null,
    metadata: payload.metadata ?? {},
  });

  if (error) {
    throw new Error(`Failed to write activity log: ${error.message}`);
  }
}

async function ensureJournalReadAccess() {
  const authz = await getAuthzContext();
  assertRouteAccess({
    roles: authz.roles,
    permissions: authz.permissions,
    requiredRoles: [
      "hubdin",
      "kaprog",
      "pembimbing-sekolah",
      "pembimbing-perusahaan",
      "siswa",
    ],
    requiredPermissions: READ_PERMISSION_CODES,
  });
}

async function ensureJournalWriteAccess() {
  const authz = await getAuthzContext();
  assertRouteAccess({
    roles: authz.roles,
    permissions: authz.permissions,
    requiredRoles: ["hubdin", "siswa"],
    requiredPermissions: WRITE_PERMISSION_CODES,
  });
}

async function ensureJournalValidateAccess() {
  const authz = await getAuthzContext();
  assertRouteAccess({
    roles: authz.roles,
    permissions: authz.permissions,
    requiredRoles: ["hubdin", "pembimbing-sekolah", "pembimbing-perusahaan"],
    requiredPermissions: VALIDATE_PERMISSION_CODES,
  });
}

async function ensureJournalDeleteAccess() {
  const authz = await getAuthzContext();
  assertRouteAccess({
    roles: authz.roles,
    permissions: authz.permissions,
    requiredRoles: ["hubdin", "siswa"],
    requiredPermissions: DELETE_PERMISSION_CODES,
  });
}

async function getJournalRowById(id: string): Promise<JournalRow | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("journals")
    .select(JOURNAL_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as JournalRow | null) ?? null;
}

function sanitizeCreatePayload(input: CreateJournalInput) {
  const placementId = normalizeString(input.placement_id);
  const journalDate = normalizeString(input.journal_date);
  const title = normalizeString(input.title);
  const content = normalizeString(input.content);

  if (!placementId || !isValidUuid(placementId)) {
    throw new ValidationError("placement_id must be a valid UUID.");
  }

  if (!journalDate || !isValidDate(journalDate)) {
    throw new ValidationError("journal_date must use YYYY-MM-DD format.");
  }

  if (!title) throw new ValidationError("Title is required.");
  if (!content) throw new ValidationError("Content is required.");

  return {
    placement_id: placementId,
    journal_date: journalDate,
    title,
    content,
    status: "draft" as const,
  };
}

function sanitizeUpdatePayload(input: UpdateJournalInput) {
  const payload: Record<string, string> = {};

  if ("journal_date" in input) {
    const journalDate = normalizeString(input.journal_date);
    if (!journalDate || !isValidDate(journalDate)) {
      throw new ValidationError("journal_date must use YYYY-MM-DD format.");
    }
    payload.journal_date = journalDate;
  }

  if ("title" in input) {
    const title = normalizeString(input.title);
    if (!title) throw new ValidationError("Title cannot be empty.");
    payload.title = title;
  }

  if ("content" in input) {
    const content = normalizeString(input.content);
    if (!content) throw new ValidationError("Content cannot be empty.");
    payload.content = content;
  }

  if ("status" in input) {
    const status = input.status;
    if (status !== "draft" && status !== "submitted") {
      throw new ValidationError("status must be draft or submitted.");
    }
    payload.status = status;
  }

  if (Object.keys(payload).length === 0) {
    throw new ValidationError("No fields provided for update.");
  }

  return payload;
}

export async function listJournals(
  params: ListJournalsParams = {}
): Promise<JournalsActionResult<{ items: Journal[]; count: number }>> {
  try {
    await ensureJournalReadAccess();

    const supabase = await createSupabaseServerClient();
    const page = Number.isFinite(params.page) ? Math.max(1, Number(params.page)) : 1;
    const pageSize = Number.isFinite(params.pageSize)
      ? Math.min(100, Math.max(1, Number(params.pageSize)))
      : 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("journals")
      .select(JOURNAL_COLUMNS, { count: "exact" })
      .order("journal_date", { ascending: false })
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
      query = query.gte("journal_date", dateFrom);
    }

    const dateTo = normalizeString(params.dateTo);
    if (dateTo) {
      if (!isValidDate(dateTo)) {
        return fail("VALIDATION_ERROR", "dateTo must use YYYY-MM-DD format.");
      }
      query = query.lte("journal_date", dateTo);
    }

    const search = normalizeString(params.search);
    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    }

    const { data, error, count } = await query;
    if (error) {
      return fail("DB_ERROR", error.message);
    }

    return ok({
      items: (data ?? []).map(parseJournalRow),
      count: count ?? 0,
    });
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return fail("FORBIDDEN", "You do not have access to read journals.");
    }

    return fail(
      "DB_ERROR",
      error instanceof Error ? error.message : "Failed to list journals."
    );
  }
}

export async function listJournalPlacementOptions(): Promise<
  JournalsActionResult<JournalPlacementOption[]>
> {
  try {
    await ensureJournalReadAccess();
    const authz = await getAuthzContext();
    const supabase = await createSupabaseServerClient();

    let query = supabase
      .from("placements")
      .select(
        "id,status,start_date,end_date,companies(name),students!inner(user_id)"
      )
      .order("start_date", { ascending: false });

    // Students should only be able to select their own placements for journal creation.
    if (authz.roles.has("siswa")) {
      query = query.eq("students.user_id", authz.userId);
    }

    const { data, error } = await query;
    if (error) {
      return fail("DB_ERROR", error.message);
    }

    return ok((data ?? []).map(parsePlacementOptionRow));
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return fail("FORBIDDEN", "You do not have access to read placement options.");
    }

    return fail(
      "DB_ERROR",
      error instanceof Error
        ? error.message
        : "Failed to load journal placement options."
    );
  }
}

export async function getJournalById(
  id: string
): Promise<JournalsActionResult<Journal>> {
  try {
    await ensureJournalReadAccess();
    if (!isValidUuid(id)) {
      return fail("VALIDATION_ERROR", "Invalid journal id.");
    }

    const row = await getJournalRowById(id);
    if (!row) {
      return fail("NOT_FOUND", "Journal not found.");
    }

    return ok(parseJournalRow(row));
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return fail("FORBIDDEN", "You do not have access to read journal details.");
    }

    return fail(
      "DB_ERROR",
      error instanceof Error ? error.message : "Failed to get journal."
    );
  }
}

export async function createJournal(
  input: CreateJournalInput
): Promise<JournalsActionResult<Journal>> {
  try {
    await ensureJournalWriteAccess();
    const payload = sanitizeCreatePayload(input);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("journals")
      .insert(payload)
      .select(JOURNAL_COLUMNS)
      .single();

    if (error) {
      return fail("DB_ERROR", error.message);
    }

    const created = parseJournalRow(data);

    await writeActivityLog({
      action: "journal.create",
      entity_id: created.id,
      metadata: {
        placement_id: created.placement_id,
        journal_date: created.journal_date,
        status: created.status,
      },
    });

    revalidateJournalPages();
    return ok(created);
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return fail("FORBIDDEN", "You do not have access to create journals.");
    }

    if (error instanceof ValidationError) {
      return fail("VALIDATION_ERROR", error.message);
    }

    return fail("DB_ERROR", "Failed to create journal.");
  }
}

export async function updateJournal(
  id: string,
  input: UpdateJournalInput
): Promise<JournalsActionResult<Journal>> {
  try {
    await ensureJournalWriteAccess();
    if (!isValidUuid(id)) {
      return fail("VALIDATION_ERROR", "Invalid journal id.");
    }

    const authz = await getAuthzContext();
    const existing = await getJournalRowById(id);
    if (!existing) {
      return fail("NOT_FOUND", "Journal not found.");
    }

    const payload = sanitizeUpdatePayload(input);
    if (
      authz.roles.has("siswa") &&
      (existing.status === "validated" || existing.status === "submitted")
    ) {
      return fail(
        "FORBIDDEN",
        "Students can only edit draft or rejected journal entries."
      );
    }

    if (payload.status && payload.status !== "draft" && payload.status !== "submitted") {
      return fail("VALIDATION_ERROR", "Invalid status update.");
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("journals")
      .update(payload)
      .eq("id", id)
      .select(JOURNAL_COLUMNS)
      .maybeSingle();

    if (error) {
      return fail("DB_ERROR", error.message);
    }

    if (!data) {
      return fail("NOT_FOUND", "Journal not found.");
    }

    const updated = parseJournalRow(data);

    await writeActivityLog({
      action: "journal.update",
      entity_id: updated.id,
      metadata: {
        previous_status: existing.status,
        next_status: updated.status,
      },
    });

    revalidateJournalPages();
    return ok(updated);
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return fail("FORBIDDEN", "You do not have access to update journals.");
    }

    if (error instanceof ValidationError) {
      return fail("VALIDATION_ERROR", error.message);
    }

    return fail("DB_ERROR", "Failed to update journal.");
  }
}

export async function submitJournal(
  id: string
): Promise<JournalsActionResult<Journal>> {
  try {
    await ensureJournalWriteAccess();
    if (!isValidUuid(id)) {
      return fail("VALIDATION_ERROR", "Invalid journal id.");
    }

    const existing = await getJournalRowById(id);
    if (!existing) {
      return fail("NOT_FOUND", "Journal not found.");
    }

    if (existing.status === "validated") {
      return fail("FORBIDDEN", "Validated journal cannot be re-submitted.");
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("journals")
      .update({ status: "submitted" })
      .eq("id", id)
      .select(JOURNAL_COLUMNS)
      .maybeSingle();

    if (error) {
      return fail("DB_ERROR", error.message);
    }

    if (!data) {
      return fail("NOT_FOUND", "Journal not found.");
    }

    const submitted = parseJournalRow(data);

    await writeActivityLog({
      action: "journal.submit",
      entity_id: submitted.id,
      metadata: {
        previous_status: existing.status,
        next_status: submitted.status,
      },
    });

    revalidateJournalPages();
    return ok(submitted);
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return fail("FORBIDDEN", "You do not have access to submit journals.");
    }

    return fail(
      "DB_ERROR",
      error instanceof Error ? error.message : "Failed to submit journal."
    );
  }
}

export async function validateJournal(
  id: string,
  input: ValidateJournalInput
): Promise<JournalsActionResult<Journal>> {
  try {
    await ensureJournalValidateAccess();
    if (!isValidUuid(id)) {
      return fail("VALIDATION_ERROR", "Invalid journal id.");
    }

    if (input.status !== "validated" && input.status !== "rejected") {
      return fail("VALIDATION_ERROR", "status must be validated or rejected.");
    }

    const feedback = normalizeString(input.feedback ?? null);
    const authz = await getAuthzContext();
    const existing = await getJournalRowById(id);
    if (!existing) {
      return fail("NOT_FOUND", "Journal not found.");
    }

    const supabase = await createSupabaseServerClient();
    const payload = {
      status: input.status,
      feedback,
      validated_by: authz.userId,
      validated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("journals")
      .update(payload)
      .eq("id", id)
      .select(JOURNAL_COLUMNS)
      .maybeSingle();

    if (error) {
      return fail("DB_ERROR", error.message);
    }

    if (!data) {
      return fail("NOT_FOUND", "Journal not found.");
    }

    const validated = parseJournalRow(data);

    await writeActivityLog({
      action: "journal.validate",
      entity_id: validated.id,
      metadata: {
        previous_status: existing.status,
        next_status: validated.status,
        feedback: validated.feedback,
      },
    });

    revalidateJournalPages();
    return ok(validated);
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return fail("FORBIDDEN", "You do not have access to validate journals.");
    }

    return fail(
      "DB_ERROR",
      error instanceof Error ? error.message : "Failed to validate journal."
    );
  }
}

export async function deleteJournal(
  id: string
): Promise<JournalsActionResult<{ id: string }>> {
  try {
    await ensureJournalDeleteAccess();
    if (!isValidUuid(id)) {
      return fail("VALIDATION_ERROR", "Invalid journal id.");
    }

    const existing = await getJournalRowById(id);
    if (!existing) {
      return fail("NOT_FOUND", "Journal not found.");
    }

    if (existing.status === "validated") {
      return fail("FORBIDDEN", "Validated journal cannot be deleted.");
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("journals")
      .delete()
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (error) {
      return fail("DB_ERROR", error.message);
    }

    if (!data) {
      return fail("NOT_FOUND", "Journal not found.");
    }

    const deleted = data as { id: string };

    await writeActivityLog({
      action: "journal.delete",
      entity_id: deleted.id,
      metadata: {
        previous_status: existing.status,
      },
    });

    revalidateJournalPages();
    return ok({ id: deleted.id });
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return fail("FORBIDDEN", "You do not have access to delete journals.");
    }

    return fail(
      "DB_ERROR",
      error instanceof Error ? error.message : "Failed to delete journal."
    );
  }
}
