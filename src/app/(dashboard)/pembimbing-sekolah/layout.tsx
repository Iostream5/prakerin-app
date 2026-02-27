import type { ReactNode } from "react";
import { requireRoleRouteAccess } from "@/src/lib/rbac";

type Props = {
  children: ReactNode;
};

export default async function Layout({ children }: Props) {
  await requireRoleRouteAccess("pembimbing-sekolah");
  return <>{children}</>;
}

