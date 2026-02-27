import { PlacementsCrud } from "@/src/features/kaprog/components/PlacementsCrud";
import {
  listCompanies,
  listPlacements,
  listSupervisors,
} from "@/src/features/kaprog/server-actions/kaprog";

export default async function Page() {
  const [placementsResult, companiesResult, supervisorsResult] = await Promise.all([
    listPlacements(),
    listCompanies(),
    listSupervisors(),
  ]);

  const placements = placementsResult.ok ? placementsResult.data : [];
  const companies = companiesResult.ok ? companiesResult.data : [];
  const supervisors = supervisorsResult.ok ? supervisorsResult.data : [];
  const initialError = !placementsResult.ok
    ? placementsResult.error.message
    : !companiesResult.ok
      ? companiesResult.error.message
      : !supervisorsResult.ok
        ? supervisorsResult.error.message
        : null;

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-6 md:p-8">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Manajemen Penempatan</h1>
        <p className="mt-2 text-sm text-slate-600">
          Tetapkan siswa ke perusahaan dan assign pembimbing sekolah/perusahaan.
        </p>
      </section>

      <section className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Karena policy saat ini, Kaprog belum bisa membaca tabel siswa langsung. Isi
        <span className="font-mono"> student_id </span>
        menggunakan UUID siswa yang tersedia dari operator/hubdin.
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <PlacementsCrud
          items={placements}
          companies={companies}
          supervisors={supervisors}
          initialError={initialError}
        />
      </section>
    </main>
  );
}
