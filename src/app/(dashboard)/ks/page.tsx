import Link from "next/link";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";

export default async function Page() {
  const supabase = await createSupabaseServerClient();
  const [companiesRes, placementsRes, journalsRes, attendanceRes] = await Promise.all([
    supabase.from("companies").select("id", { count: "exact", head: true }),
    supabase.from("placements").select("id", { count: "exact", head: true }),
    supabase.from("journals").select("id", { count: "exact", head: true }),
    supabase.from("attendance").select("id", { count: "exact", head: true }),
  ]);

  const errorMessage =
    companiesRes.error?.message ??
    placementsRes.error?.message ??
    journalsRes.error?.message ??
    attendanceRes.error?.message ??
    null;

  const stats = [
    { title: "Perusahaan", value: companiesRes.count ?? 0 },
    { title: "Penempatan", value: placementsRes.count ?? 0 },
    { title: "Jurnal", value: journalsRes.count ?? 0 },
    { title: "Absensi", value: attendanceRes.count ?? 0 },
  ];

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-6 md:p-8">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard KS</h1>
        <p className="mt-2 text-sm text-slate-600">
          Ringkasan level manajemen untuk memantau progres prakerin secara umum.
        </p>
      </section>

      {errorMessage && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Sebagian data tidak dapat diakses: {errorMessage}
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

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Link
          href="/dashboard/ks/analytics"
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300"
        >
          <h2 className="text-base font-semibold text-slate-900">Analytics</h2>
          <p className="mt-1 text-sm text-slate-600">
            Lihat tren data ringkas berdasarkan aktivitas terbaru.
          </p>
        </Link>

        <Link
          href="/dashboard/ks/laporan"
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300"
        >
          <h2 className="text-base font-semibold text-slate-900">Laporan</h2>
          <p className="mt-1 text-sm text-slate-600">
            Tinjau snapshot data untuk kebutuhan pelaporan manajerial.
          </p>
        </Link>
      </section>
    </main>
  );
}
