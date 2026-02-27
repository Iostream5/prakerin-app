export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type GenericTable = {
  Row: Record<string, unknown>;
  Insert: Record<string, unknown>;
  Update: Record<string, unknown>;
  Relationships: Array<{
    foreignKeyName: string;
    columns: string[];
    isOneToOne: boolean;
    referencedRelation: string;
    referencedColumns: string[];
  }>;
};

export type Database = {
  public: {
    Tables: {
      activity_logs: GenericTable;
      app_settings: GenericTable;
      attendance: GenericTable;
      companies: GenericTable;
      grades: GenericTable;
      journals: GenericTable;
      mailing_templates: GenericTable;
      permissions: GenericTable;
      placements: GenericTable;
      profiles: GenericTable;
      role_permissions: GenericTable;
      roles: GenericTable;
      students: GenericTable;
      supervisors: GenericTable;
      user_roles: GenericTable;
    };
    Views: Record<string, never>;
    Functions: {
      get_user_roles: {
        Args: { _user_id: string };
        Returns: Array<Database["public"]["Enums"]["app_role"]>;
      };
      has_permission: {
        Args: { _code: string; _user_id: string };
        Returns: boolean;
      };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role:
        | "ks"
        | "hubdin"
        | "operator"
        | "kaprog"
        | "pembimbing_sekolah"
        | "pembimbing_perusahaan"
        | "siswa";
      attendance_status: "hadir" | "izin" | "sakit" | "alpha";
      journal_status: "draft" | "submitted" | "validated" | "rejected";
      placement_status: "pending" | "active" | "completed" | "cancelled";
    };
    CompositeTypes: Record<string, never>;
  };
};
