export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-6xl p-6 md:p-8">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="h-7 w-48 animate-pulse rounded bg-slate-200" />
        <div className="mt-3 h-4 w-64 animate-pulse rounded bg-slate-100" />
        <div className="mt-2 h-3 w-56 animate-pulse rounded bg-slate-100" />
      </section>

      <section className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="h-6 w-24 animate-pulse rounded bg-slate-200" />
          <div className="mt-4 space-y-2">
            <div className="h-10 animate-pulse rounded bg-slate-100" />
            <div className="h-10 animate-pulse rounded bg-slate-100" />
            <div className="h-10 animate-pulse rounded bg-slate-100" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="h-6 w-32 animate-pulse rounded bg-slate-200" />
          <div className="mt-4 space-y-2">
            <div className="h-10 animate-pulse rounded bg-slate-100" />
            <div className="h-10 animate-pulse rounded bg-slate-100" />
            <div className="h-10 animate-pulse rounded bg-slate-100" />
            <div className="h-10 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
      </section>
    </main>
  );
}
