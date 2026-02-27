export type Student = {
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

export type ListStudentsParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  classFilter?: string;
  programFilter?: string;
};

export type CreateStudentInput = {
  user_id?: string | null;
  nis: string;
  full_name: string;
  class: string;
  program: string;
  phone?: string | null;
  parent_phone?: string | null;
  photo_url?: string | null;
};

export type UpdateStudentInput = {
  user_id?: string | null;
  nis?: string;
  full_name?: string;
  class?: string;
  program?: string;
  phone?: string | null;
  parent_phone?: string | null;
  photo_url?: string | null;
};

export type StudentsActionErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "DB_ERROR";

export type StudentsActionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: {
        code: StudentsActionErrorCode;
        message: string;
      };
    };
