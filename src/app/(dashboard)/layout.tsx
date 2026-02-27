import type { ReactNode } from "react";
import { getAuthzContext } from "@/src/lib/rbac";
import { syncAuthenticatedUser } from "@/src/features/auth/server-actions/sync-auth-user";

type Props = {
  children: ReactNode;
};

export default async function Layout({ children }: Props) {
  await syncAuthenticatedUser();
  await getAuthzContext();
  return <>{children}</>;
}
