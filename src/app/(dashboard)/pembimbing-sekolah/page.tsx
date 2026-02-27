import Link from "next/link";
import { listAttendance } from "@/src/features/attendance/server-actions/attendance";
import { listJournals } from "@/src/features/journals/server-actions/journals";

type StatCard = {
  title: string;
  value: number;
};

export default async function Page() {
  const [journalsResult, attendanceResult] = await Promise.all([
    listJournals({ page: 1, pageSize: 200 }),
    listAttendance({ page: 1, pageSize: 200 }),
  ]);

  const errorMessage = !journalsResult.ok
    ? journalsResult.error.message
    : !attendanceResult.ok
      ? attendanceResult.error.message
      : null;

  const journals = journalsResult.ok ? journalsResult.data.items : [];
  const attendance = attendanceResult.ok ? attendanceResult.data.items : [];

  const statCards: StatCard[] = [
    { title: "Total Jurnal", value: journals.length },
    {
      title: "Jurnal Menunggu Review",
      value: journals.filter((item) => item.status === "submitted").length,
    },
    { title: "Total Absensi", value: attendance.length },
    {
      title: "Absensi Hadir",
      value: attendance.filter((item) => item.status === "hadir").length,
    },
  ];

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-6 md:p-8">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">
          Dashboard Pembimbing Sekolah
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Pantau jurnal dan absensi siswa untuk memastikan progres prakerin tetap
          terkontrol.
        </p>
      </section>

      {errorMessage && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <div
            key={card.title}
            className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
          >
            <p className="text-sm text-slate-500">{card.title}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{card.value}</p>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Link
          href="/dashboard/pembimbing-sekolah/monitoring-jurnal"
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300"
        >
          <h2 className="text-base font-semibold text-slate-900">Monitoring Jurnal</h2>
          <p className="mt-1 text-sm text-slate-600">
            Tinjau seluruh jurnal siswa dan status validasinya.
          </p>
        </Link>

        <Link
          href="/dashboard/pembimbing-sekolah/penyerahan"
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300"
        >
          <h2 className="text-base font-semibold text-slate-900">Penyerahan Siswa</h2>
          <p className="mt-1 text-sm text-slate-600">
            Catat proses penyerahan siswa ke perusahaan.
          </p>
        </Link>

        <Link
          href="/dashboard/pembimbing-sekolah/penarikan"
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300"
        >
          <h2 className="text-base font-semibold text-slate-900">Penarikan Siswa</h2>
          <p className="mt-1 text-sm text-slate-600">
            Dokumentasikan proses penarikan siswa setelah prakerin selesai.
          </p>
        </Link>
      </section>
    </main>
  );
}
