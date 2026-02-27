import { createSupabaseServerClient } from "@/src/lib/supabase/server";

export default async function Page() {
  const supabase = await createSupabaseServerClient();
  const [journalsRes, attendanceRes, gradesRes] = await Promise.all([
    supabase.from("journals").select("id,status"),
    supabase.from("attendance").select("id,status"),
    supabase.from("grades").select("id,final_score"),
  ]);

  const errorMessage =
    journalsRes.error?.message ??
    attendanceRes.error?.message ??
    gradesRes.error?.message ??
    null;

  const journals = journalsRes.data ?? [];
  const attendance = attendanceRes.data ?? [];
  const grades = gradesRes.data ?? [];

  const reportRows = [
    { label: "Jurnal Diajukan", value: journals.filter((x) => x.status === "submitted").length },
    { label: "Jurnal Tervalidasi", value: journals.filter((x) => x.status === "validated").length },
    { label: "Absensi Hadir", value: attendance.filter((x) => x.status === "hadir").length },
    { label: "Absensi Izin/Sakit", value: attendance.filter((x) => x.status === "izin" || x.status === "sakit").length },
    {
      label: "Rata-rata Nilai Akhir",
      value:
        grades.length > 0
          ? (
              grades.reduce((acc, row) => acc + Number(row.final_score ?? 0), 0) / grades.length
            ).toFixed(2)
          : "0.00",
    },
  ];

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-6 md:p-8">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Laporan KS</h1>
        <p className="mt-2 text-sm text-slate-600">
          Snapshot indikator utama untuk kebutuhan laporan manajemen.
        </p>
      </section>

      {errorMessage && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Sebagian data tidak dapat diakses: {errorMessage}
        </div>
      )}

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {reportRows.map((row) => (
            <div key={row.label} className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-sm text-slate-500">{row.label}</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{row.value}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
