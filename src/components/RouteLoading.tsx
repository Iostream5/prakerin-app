type Props = {
  title: string;
  description?: string;
};

export function RouteLoading({ title, description }: Props) {
  return (
    <main className="mx-auto w-full max-w-4xl p-6 md:p-8">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-slate-500">Loading</p>
        <h1 className="mt-1 text-xl font-semibold text-slate-900">{title}</h1>
        {description && <p className="mt-2 text-sm text-slate-600">{description}</p>}
        <div className="mt-5 h-2 w-full overflow-hidden rounded bg-slate-100">
          <div className="h-full w-1/3 animate-pulse rounded bg-slate-300" />
        </div>
      </section>
    </main>
  );
}
