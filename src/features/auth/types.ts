import type { Session, User } from "@supabase/supabase-js";

export type AuthenticatedProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type HydratedAuthenticatedUser = {
  session: Session;
  user: User;
  profile: AuthenticatedProfile | null;
  role: string | null;
  permissions: string[];
};
