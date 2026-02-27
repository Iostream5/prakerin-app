"use client";

type Props = {
  error: Error;
  reset: () => void;
};

export default function ErrorPage({ error, reset }: Props) {
  return (
    <main className="mx-auto w-full max-w-3xl p-6 md:p-8">
      <section className="rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-red-900">Dashboard failed to load</h1>
        <p className="mt-2 text-sm text-red-800">
          {error.message || "An unexpected error occurred while loading dashboard data."}
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-4 rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800"
        >
          Retry
        </button>
      </section>
    </main>
  );
}
