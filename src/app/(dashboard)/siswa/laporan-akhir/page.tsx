import { createSupabaseServerClient } from "@/src/lib/supabase/server";

export default async function Page() {
  const supabase = await createSupabaseServerClient();
  const [journalsRes, attendanceRes, gradesRes] = await Promise.all([
    supabase.from("journals").select("id,status"),
    supabase.from("attendance").select("id,status"),
    supabase.from("grades").select("id,final_score"),
  ]);

  const journals = journalsRes.data ?? [];
  const attendance = attendanceRes.data ?? [];
  const grades = gradesRes.data ?? [];
  const errorMessage =
    journalsRes.error?.message ??
    attendanceRes.error?.message ??
    gradesRes.error?.message ??
    null;

  const validatedJournals = journals.filter((j) => j.status === "validated").length;
  const totalAttendance = attendance.length;
  const hasFinalGrade = grades.some((g) => g.final_score !== null);

  const checklist = [
    { label: "Minimal 1 jurnal tervalidasi", done: validatedJournals > 0 },
    { label: "Data absensi sudah tersedia", done: totalAttendance > 0 },
    { label: "Nilai akhir sudah terinput", done: hasFinalGrade },
  ];

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 p-6 md:p-8">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Laporan Akhir</h1>
        <p className="mt-2 text-sm text-slate-600">
          Halaman ini menampilkan kesiapan administrasi laporan akhir prakerin.
        </p>
      </section>

      {errorMessage && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Sebagian data tidak dapat diakses: {errorMessage}
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Checklist Kesiapan</h2>
        <ul className="mt-4 space-y-3">
          {checklist.map((item) => (
            <li key={item.label} className="flex items-center justify-between rounded-md border border-slate-200 px-4 py-3">
              <span className="text-sm text-slate-700">{item.label}</span>
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                  item.done ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                }`}
              >
                {item.done ? "Selesai" : "Belum"}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Catatan</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Upload dokumen laporan akhir belum diimplementasikan pada versi ini. Gunakan
          checklist di atas sebagai indikator kesiapan sebelum modul upload diaktifkan.
        </p>
      </section>
    </main>
  );
}
