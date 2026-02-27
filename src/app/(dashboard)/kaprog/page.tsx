import Link from "next/link";
import {
  listCompanies,
  listPlacements,
  listSupervisors,
} from "@/src/features/kaprog/server-actions/kaprog";

export default async function Page() {
  const [companiesResult, supervisorsResult, placementsResult] = await Promise.all([
    listCompanies(),
    listSupervisors(),
    listPlacements(),
  ]);

  const companies = companiesResult.ok ? companiesResult.data : [];
  const supervisors = supervisorsResult.ok ? supervisorsResult.data : [];
  const placements = placementsResult.ok ? placementsResult.data : [];

  const errorMessage = !companiesResult.ok
    ? companiesResult.error.message
    : !supervisorsResult.ok
      ? supervisorsResult.error.message
      : !placementsResult.ok
        ? placementsResult.error.message
        : null;

  const stats = [
    { title: "Total Perusahaan", value: companies.length },
    { title: "Total Pembimbing", value: supervisors.length },
    {
      title: "Penempatan Aktif",
      value: placements.filter((item) => item.status === "active").length,
    },
    { title: "Total Penempatan", value: placements.length },
  ];

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-6 md:p-8">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard Kaprog</h1>
        <p className="mt-2 text-sm text-slate-600">
          Kelola relasi perusahaan, pembimbing, dan penempatan siswa prakerin.
        </p>
      </section>

      {errorMessage && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((card) => (
          <div key={card.title} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">{card.title}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{card.value}</p>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Link href="/dashboard/kaprog/perusahaan" className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300">
          <h2 className="text-base font-semibold text-slate-900">Perusahaan</h2>
          <p className="mt-1 text-sm text-slate-600">Kelola daftar perusahaan mitra prakerin.</p>
        </Link>
        <Link href="/dashboard/kaprog/pembimbing" className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300">
          <h2 className="text-base font-semibold text-slate-900">Pembimbing</h2>
          <p className="mt-1 text-sm text-slate-600">Atur pembimbing sekolah dan perusahaan.</p>
        </Link>
        <Link href="/dashboard/kaprog/penempatan" className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300">
          <h2 className="text-base font-semibold text-slate-900">Penempatan</h2>
          <p className="mt-1 text-sm text-slate-600">Kelola proses penempatan siswa prakerin.</p>
        </Link>
      </section>
    </main>
  );
}
