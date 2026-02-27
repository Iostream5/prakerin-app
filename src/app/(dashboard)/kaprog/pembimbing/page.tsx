import { SupervisorsCrud } from "@/src/features/kaprog/components/SupervisorsCrud";
import { listCompanies, listSupervisors } from "@/src/features/kaprog/server-actions/kaprog";

export default async function Page() {
  const [supervisorsResult, companiesResult] = await Promise.all([
    listSupervisors(),
    listCompanies(),
  ]);

  const supervisors = supervisorsResult.ok ? supervisorsResult.data : [];
  const companies = companiesResult.ok ? companiesResult.data : [];
  const initialError = !supervisorsResult.ok
    ? supervisorsResult.error.message
    : !companiesResult.ok
      ? companiesResult.error.message
      : null;

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-6 md:p-8">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Manajemen Pembimbing</h1>
        <p className="mt-2 text-sm text-slate-600">
          Kelola pembimbing sekolah dan pembimbing perusahaan.
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <SupervisorsCrud items={supervisors} companies={companies} initialError={initialError} />
      </section>
    </main>
  );
}
