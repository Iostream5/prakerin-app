export type {
  AuthenticatedProfile,
  HydratedAuthenticatedUser,
} from "@/src/features/auth/types";

export { getHydratedAuthenticatedUser } from "@/src/features/auth/server/get-authenticated-user";
export { syncAuthenticatedUser } from "@/src/features/auth/server-actions/sync-auth-user";
