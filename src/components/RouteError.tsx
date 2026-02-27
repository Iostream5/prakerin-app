"use client";

type Props = {
  title: string;
  error: Error;
  reset: () => void;
};

export function RouteError({ title, error, reset }: Props) {
  return (
    <main className="mx-auto w-full max-w-4xl p-6 md:p-8">
      <section className="rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm">
        <p className="text-sm font-medium text-red-700">Something went wrong</p>
        <h1 className="mt-1 text-xl font-semibold text-red-900">{title}</h1>
        <p className="mt-2 text-sm text-red-800">{error.message || "Unknown error"}</p>
        <div className="mt-5">
          <button
            type="button"
            onClick={reset}
            className="rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800"
          >
            Retry
          </button>
        </div>
      </section>
    </main>
  );
}
