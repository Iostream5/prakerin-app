import Link from "next/link";
import { listAttendance } from "@/src/features/attendance/server-actions/attendance";
import { listJournals } from "@/src/features/journals/server-actions/journals";

type StatCard = {
  title: string;
  value: number;
};

export default async function Page() {
  const [submittedJournalsResult, allJournalsResult, attendanceResult] =
    await Promise.all([
      listJournals({ page: 1, pageSize: 200, status: "submitted" }),
      listJournals({ page: 1, pageSize: 200 }),
      listAttendance({ page: 1, pageSize: 200 }),
    ]);

  const errorMessage = !submittedJournalsResult.ok
    ? submittedJournalsResult.error.message
    : !allJournalsResult.ok
      ? allJournalsResult.error.message
      : !attendanceResult.ok
        ? attendanceResult.error.message
        : null;

  const submittedJournals = submittedJournalsResult.ok
    ? submittedJournalsResult.data.items
    : [];
  const allJournals = allJournalsResult.ok ? allJournalsResult.data.items : [];
  const attendance = attendanceResult.ok ? attendanceResult.data.items : [];

  const statCards: StatCard[] = [
    { title: "Jurnal Menunggu Validasi", value: submittedJournals.length },
    {
      title: "Jurnal Tervalidasi",
      value: allJournals.filter((item) => item.status === "validated").length,
    },
    {
      title: "Jurnal Ditolak",
      value: allJournals.filter((item) => item.status === "rejected").length,
    },
    {
      title: "Absensi Hari Ini",
      value: attendance.filter(
        (item) => item.attendance_date === new Date().toISOString().slice(0, 10)
      ).length,
    },
  ];

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-6 md:p-8">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">
          Dashboard Pembimbing Perusahaan
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Validasi jurnal siswa dan pantau kedisiplinan absensi selama masa prakerin.
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
          href="/dashboard/pembimbing-perusahaan/validasi-jurnal"
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300"
        >
          <h2 className="text-base font-semibold text-slate-900">Validasi Jurnal</h2>
          <p className="mt-1 text-sm text-slate-600">
            Review jurnal siswa yang sudah di-submit.
          </p>
        </Link>

        <Link
          href="/dashboard/pembimbing-perusahaan/penilaian"
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300"
        >
          <h2 className="text-base font-semibold text-slate-900">Penilaian Siswa</h2>
          <p className="mt-1 text-sm text-slate-600">
            Input nilai teknis, disiplin, dan komunikasi siswa.
          </p>
        </Link>

        <Link
          href="/dashboard/pembimbing-perusahaan/profil-perusahaan"
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300"
        >
          <h2 className="text-base font-semibold text-slate-900">Profil Perusahaan</h2>
          <p className="mt-1 text-sm text-slate-600">
            Kelola informasi dasar perusahaan untuk kebutuhan dokumen.
          </p>
        </Link>
      </section>
    </main>
  );
}
