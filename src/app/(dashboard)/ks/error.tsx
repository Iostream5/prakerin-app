"use client";

import { RouteError } from "@/src/components/RouteError";

type Props = {
  error: Error;
  reset: () => void;
};

export default function ErrorPage({ error, reset }: Props) {
  return <RouteError title="KS Dashboard" error={error} reset={reset} />;
}
