export type AttendanceStatus = "hadir" | "izin" | "sakit" | "alpha";

export type Attendance = {
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

export type AttendancePlacementOption = {
  id: string;
  company_name: string | null;
  start_date: string;
  end_date: string | null;
  status: string;
};

export type ListAttendanceParams = {
  page?: number;
  pageSize?: number;
  placementId?: string;
  status?: AttendanceStatus;
  dateFrom?: string;
  dateTo?: string;
};

export type CreateAttendanceInput = {
  placement_id: string;
  attendance_date: string;
  status: AttendanceStatus;
  checkin_lat?: number | null;
  checkin_lng?: number | null;
  checkin_photo_url?: string | null;
  note?: string | null;
};

export type UpdateAttendanceInput = {
  status?: AttendanceStatus;
  note?: string | null;
};

export type CheckoutAttendanceInput = {
  checkout_lat: number;
  checkout_lng: number;
  checkout_photo_url: string;
  note?: string | null;
};

export type AttendanceActionErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "DB_ERROR";

export type AttendanceActionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: {
        code: AttendanceActionErrorCode;
        message: string;
      };
    };
