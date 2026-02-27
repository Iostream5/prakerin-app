"use client";

type Props = {
  error: Error;
  reset: () => void;
};

export default function ErrorPage({ error, reset }: Props) {
  void error;
  void reset;
  return null;
}
