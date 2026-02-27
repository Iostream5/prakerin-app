import { CompaniesCrud } from "@/src/features/kaprog/components/CompaniesCrud";
import { listCompanies } from "@/src/features/kaprog/server-actions/kaprog";

export default async function Page() {
  const companiesResult = await listCompanies();
  const companies = companiesResult.ok ? companiesResult.data : [];
  const initialError = companiesResult.ok ? null : companiesResult.error.message;

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-6 md:p-8">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Manajemen Perusahaan</h1>
        <p className="mt-2 text-sm text-slate-600">
          Kelola daftar perusahaan mitra untuk kebutuhan penempatan prakerin.
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <CompaniesCrud items={companies} initialError={initialError} />
      </section>
    </main>
  );
}
