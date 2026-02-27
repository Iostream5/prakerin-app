"use client";

import { RouteError } from "@/src/components/RouteError";

type Props = {
  error: Error;
  reset: () => void;
};

export default function ErrorPage({ error, reset }: Props) {
  return <RouteError title="RBAC Console" error={error} reset={reset} />;
}
