"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import { getAuthzContext } from "@/src/lib/rbac";
import type {
  CreateStudentInput,
  ListStudentsParams,
  Student,
  StudentsActionResult,
  UpdateStudentInput,
} from "@/src/features/students/types";

type StudentRow = {
  id: string;
  user_id: string | null;
  nis: string;
  full_name: string;
  class: string;
  program: string;
  phone: string | null;
  parent_phone: string | null;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
};

const STUDENT_COLUMNS =
  "id,user_id,nis,full_name,class,program,phone,parent_phone,photo_url,created_at,updated_at";

const READ_PERMISSION_CODES = [
  "students.read",
  "students.view",
  "students.*",
  "master.students.read",
  "master-data.students.read",
  "dashboard.operator.access",
  "dashboard.hubdin.access",
];

const WRITE_PERMISSION_CODES = [
  "students.create",
  "students.update",
  "students.delete",
  "students.write",
  "students.manage",
  "students.*",
  "master.students.write",
  "master-data.students.write",
];

function ok<T>(data: T): StudentsActionResult<T> {
  return { ok: true, data };
}

function fail<T>(
  code: "UNAUTHORIZED" | "FORBIDDEN" | "VALIDATION_ERROR" | "NOT_FOUND" | "DB_ERROR",
  message: string
): StudentsActionResult<T> {
  return {
    ok: false,
    error: { code, message },
  };
}

function hasAnyPermission(
  permissions: Set<string>,
  candidates: readonly string[]
): boolean {
  if (permissions.has("*") || permissions.has("dashboard.*") || permissions.has("dashboard:all")) {
    return true;
  }

  return candidates.some((code) => permissions.has(code));
}

async function ensureStudentsReadAccess() {
  const authz = await getAuthzContext();
  const canReadByRole = authz.roles.has("hubdin") || authz.roles.has("operator");
  const canReadByPermission = hasAnyPermission(authz.permissions, READ_PERMISSION_CODES);

  if (!canReadByRole && !canReadByPermission) {
    throw new Error("FORBIDDEN");
  }
}

async function ensureStudentsWriteAccess() {
  const authz = await getAuthzContext();
  const canWriteByRole = authz.roles.has("hubdin") || authz.roles.has("operator");
  const canWriteByPermission = hasAnyPermission(authz.permissions, WRITE_PERMISSION_CODES);

  if (!canWriteByRole && !canWriteByPermission) {
    throw new Error("FORBIDDEN");
  }
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

function parseStudentRow(row: unknown): Student {
  const data = row as StudentRow;

  return {
    id: data.id,
    user_id: data.user_id,
    nis: data.nis,
    full_name: data.full_name,
    class: data.class,
    program: data.program,
    phone: data.phone,
    parent_phone: data.parent_phone,
    photo_url: data.photo_url,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

function sanitizeCreatePayload(input: CreateStudentInput) {
  const nis = normalizeString(input.nis);
  const fullName = normalizeString(input.full_name);
  const studentClass = normalizeString(input.class);
  const program = normalizeString(input.program);
  const userId = normalizeString(input.user_id ?? null);

  if (!nis) throw new Error("NIS is required.");
  if (!fullName) throw new Error("Full name is required.");
  if (!studentClass) throw new Error("Class is required.");
  if (!program) throw new Error("Program is required.");
  if (userId && !isValidUuid(userId)) throw new Error("user_id must be a valid UUID.");

  return {
    user_id: userId,
    nis,
    full_name: fullName,
    class: studentClass,
    program,
    phone: normalizeString(input.phone ?? null),
    parent_phone: normalizeString(input.parent_phone ?? null),
    photo_url: normalizeString(input.photo_url ?? null),
  };
}

function sanitizeUpdatePayload(input: UpdateStudentInput) {
  const payload: Record<string, string | null> = {};

  if ("user_id" in input) {
    const userId = normalizeString(input.user_id ?? null);
    if (userId && !isValidUuid(userId)) {
      throw new Error("user_id must be a valid UUID.");
    }
    payload.user_id = userId;
  }

  if ("nis" in input) {
    const nis = normalizeString(input.nis);
    if (!nis) throw new Error("NIS cannot be empty.");
    payload.nis = nis;
  }

  if ("full_name" in input) {
    const fullName = normalizeString(input.full_name);
    if (!fullName) throw new Error("Full name cannot be empty.");
    payload.full_name = fullName;
  }

  if ("class" in input) {
    const studentClass = normalizeString(input.class);
    if (!studentClass) throw new Error("Class cannot be empty.");
    payload.class = studentClass;
  }

  if ("program" in input) {
    const program = normalizeString(input.program);
    if (!program) throw new Error("Program cannot be empty.");
    payload.program = program;
  }

  if ("phone" in input) {
    payload.phone = normalizeString(input.phone ?? null);
  }

  if ("parent_phone" in input) {
    payload.parent_phone = normalizeString(input.parent_phone ?? null);
  }

  if ("photo_url" in input) {
    payload.photo_url = normalizeString(input.photo_url ?? null);
  }

  if (Object.keys(payload).length === 0) {
    throw new Error("No fields provided for update.");
  }

  return payload;
}

function revalidateStudentPages() {
  revalidatePath("/dashboard/operator");
  revalidatePath("/dashboard/operator/siswa");
  revalidatePath("/dashboard/hubdin");
  revalidatePath("/dashboard/hubdin/users");
}

export async function listStudents(
  params: ListStudentsParams = {}
): Promise<StudentsActionResult<{ items: Student[]; count: number }>> {
  try {
    await ensureStudentsReadAccess();
    const supabase = await createSupabaseServerClient();

    const page = Number.isFinite(params.page) ? Math.max(1, Number(params.page)) : 1;
    const pageSize = Number.isFinite(params.pageSize)
      ? Math.min(100, Math.max(1, Number(params.pageSize)))
      : 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("students")
      .select(STUDENT_COLUMNS, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    const search = normalizeString(params.search);
    if (search) {
      query = query.or(
        `nis.ilike.%${search}%,full_name.ilike.%${search}%,class.ilike.%${search}%,program.ilike.%${search}%`
      );
    }

    const classFilter = normalizeString(params.classFilter);
    if (classFilter) {
      query = query.eq("class", classFilter);
    }

    const programFilter = normalizeString(params.programFilter);
    if (programFilter) {
      query = query.eq("program", programFilter);
    }

    const { data, error, count } = await query;

    if (error) {
      return fail("DB_ERROR", error.message);
    }

    return ok({
      items: (data ?? []).map(parseStudentRow),
      count: count ?? 0,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return fail("FORBIDDEN", "You do not have access to read students data.");
    }

    return fail(
      "DB_ERROR",
      error instanceof Error ? error.message : "Failed to list students."
    );
  }
}

export async function getStudentById(
  id: string
): Promise<StudentsActionResult<Student>> {
  try {
    await ensureStudentsReadAccess();
    if (!isValidUuid(id)) {
      return fail("VALIDATION_ERROR", "Invalid student id.");
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("students")
      .select(STUDENT_COLUMNS)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return fail("DB_ERROR", error.message);
    }

    if (!data) {
      return fail("NOT_FOUND", "Student not found.");
    }

    return ok(parseStudentRow(data));
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return fail("FORBIDDEN", "You do not have access to read student data.");
    }

    return fail(
      "DB_ERROR",
      error instanceof Error ? error.message : "Failed to get student."
    );
  }
}

export async function createStudent(
  input: CreateStudentInput
): Promise<StudentsActionResult<Student>> {
  try {
    await ensureStudentsWriteAccess();
    const payload = sanitizeCreatePayload(input);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("students")
      .insert(payload)
      .select(STUDENT_COLUMNS)
      .single();

    if (error) {
      return fail("DB_ERROR", error.message);
    }

    revalidateStudentPages();
    return ok(parseStudentRow(data));
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return fail("FORBIDDEN", "You do not have access to create student data.");
    }

    if (error instanceof Error && error.message !== "FORBIDDEN") {
      return fail("VALIDATION_ERROR", error.message);
    }

    return fail("DB_ERROR", "Failed to create student.");
  }
}

export async function updateStudent(
  id: string,
  input: UpdateStudentInput
): Promise<StudentsActionResult<Student>> {
  try {
    await ensureStudentsWriteAccess();
    if (!isValidUuid(id)) {
      return fail("VALIDATION_ERROR", "Invalid student id.");
    }

    const payload = sanitizeUpdatePayload(input);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("students")
      .update(payload)
      .eq("id", id)
      .select(STUDENT_COLUMNS)
      .maybeSingle();

    if (error) {
      return fail("DB_ERROR", error.message);
    }

    if (!data) {
      return fail("NOT_FOUND", "Student not found.");
    }

    revalidateStudentPages();
    return ok(parseStudentRow(data));
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return fail("FORBIDDEN", "You do not have access to update student data.");
    }

    if (error instanceof Error && error.message !== "FORBIDDEN") {
      return fail("VALIDATION_ERROR", error.message);
    }

    return fail("DB_ERROR", "Failed to update student.");
  }
}

export async function deleteStudent(
  id: string
): Promise<StudentsActionResult<{ id: string }>> {
  try {
    await ensureStudentsWriteAccess();
    if (!isValidUuid(id)) {
      return fail("VALIDATION_ERROR", "Invalid student id.");
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("students")
      .delete()
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (error) {
      return fail("DB_ERROR", error.message);
    }

    if (!data) {
      return fail("NOT_FOUND", "Student not found.");
    }

    revalidateStudentPages();
    return ok({ id: (data as { id: string }).id });
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return fail("FORBIDDEN", "You do not have access to delete student data.");
    }

    return fail(
      "DB_ERROR",
      error instanceof Error ? error.message : "Failed to delete student."
    );
  }
}
