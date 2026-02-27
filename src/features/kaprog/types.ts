export type Company = {
  id: string;
  code: string | null;
  name: string;
  city: string | null;
  phone: string | null;
  email: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type Supervisor = {
  id: string;
  user_id: string;
  role: "pembimbing_sekolah" | "pembimbing_perusahaan";
  company_id: string | null;
  full_name: string;
  phone: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
};

export type Placement = {
  id: string;
  student_id: string;
  company_id: string;
  school_supervisor_id: string | null;
  company_supervisor_id: string | null;
  start_date: string;
  end_date: string | null;
  status: "pending" | "active" | "completed" | "cancelled";
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type KaprogActionErrorCode = "FORBIDDEN" | "VALIDATION_ERROR" | "NOT_FOUND" | "DB_ERROR";

export type KaprogActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: KaprogActionErrorCode; message: string } };
