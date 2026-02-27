import Link from "next/link";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";

export default async function Page() {
  const supabase = await createSupabaseServerClient();
  const [journalsRes, attendanceRes, gradesRes] = await Promise.all([
    supabase.from("journals").select("id,status", { count: "exact" }),
    supabase.from("attendance").select("id,status", { count: "exact" }),
    supabase.from("grades").select("id,final_score", { count: "exact" }),
  ]);

  const errorMessage =
    journalsRes.error?.message ??
    attendanceRes.error?.message ??
    gradesRes.error?.message ??
    null;

  const journals = journalsRes.data ?? [];
  const grades = gradesRes.data ?? [];
  const latestScore = grades.length > 0 ? Number(grades[0]?.final_score ?? 0).toFixed(2) : "-";

  const stats = [
    { title: "Total Jurnal", value: journalsRes.count ?? 0 },
    { title: "Jurnal Tervalidasi", value: journals.filter((x) => x.status === "validated").length },
    { title: "Total Absensi", value: attendanceRes.count ?? 0 },
    { title: "Nilai Terakhir", value: latestScore },
  ];

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-6 md:p-8">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard Siswa</h1>
        <p className="mt-2 text-sm text-slate-600">
          Pantau progres jurnal, absensi, nilai, dan laporan akhir prakerin.
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

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Link href="/dashboard/siswa/absensi" className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300">
          <h2 className="text-base font-semibold text-slate-900">Absensi</h2>
          <p className="mt-1 text-sm text-slate-600">Isi checkin/checkout harian dengan lokasi.</p>
        </Link>
        <Link href="/dashboard/siswa/jurnal" className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300">
          <h2 className="text-base font-semibold text-slate-900">Jurnal</h2>
          <p className="mt-1 text-sm text-slate-600">Catat aktivitas harian selama prakerin.</p>
        </Link>
        <Link href="/dashboard/siswa/nilai" className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300">
          <h2 className="text-base font-semibold text-slate-900">Nilai</h2>
          <p className="mt-1 text-sm text-slate-600">Lihat hasil penilaian dari pembimbing.</p>
        </Link>
      </section>
    </main>
  );
}
