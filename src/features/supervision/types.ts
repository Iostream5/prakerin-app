export type HandoverEvent = {
  id: string;
  action: "handover.submit" | "handover.pickup";
  created_at: string;
  metadata: Record<string, unknown>;
};

export type GradeRecord = {
  id: string;
  placement_id: string;
  technical_score: number | null;
  discipline_score: number | null;
  communication_score: number | null;
  final_score: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type CompanyProfileView = {
  supervisor_name: string;
  supervisor_email: string | null;
  supervisor_phone: string | null;
  company_id: string | null;
  company_name: string | null;
  company_email: string | null;
  company_phone: string | null;
  company_city: string | null;
  company_address: string | null;
  company_logo_url: string | null;
};

export type SupervisionActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: "FORBIDDEN" | "VALIDATION_ERROR" | "DB_ERROR"; message: string } };
