export type JournalStatus = "draft" | "submitted" | "validated" | "rejected";

export type Journal = {
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

export type JournalPlacementOption = {
  id: string;
  company_name: string | null;
  start_date: string;
  end_date: string | null;
  status: string;
};

export type ListJournalsParams = {
  page?: number;
  pageSize?: number;
  placementId?: string;
  status?: JournalStatus;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
};

export type CreateJournalInput = {
  placement_id: string;
  journal_date: string;
  title: string;
  content: string;
};

export type UpdateJournalInput = {
  journal_date?: string;
  title?: string;
  content?: string;
  status?: "draft" | "submitted";
};

export type ValidateJournalInput = {
  status: "validated" | "rejected";
  feedback?: string | null;
};

export type JournalsActionErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "DB_ERROR";

export type JournalsActionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: {
        code: JournalsActionErrorCode;
        message: string;
      };
    };
