import { GradesManager } from "@/src/features/supervision/components/GradesManager";
import { listGradeRecords } from "@/src/features/supervision/server-actions/grades";

export default async function Page() {
  const recordsResult = await listGradeRecords();
  const records = recordsResult.ok ? recordsResult.data : [];
  const initialError = recordsResult.ok ? null : recordsResult.error.message;

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-6 md:p-8">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Penilaian Siswa</h1>
        <p className="mt-2 text-sm text-slate-600">
          Input dan perbarui nilai siswa berdasarkan placement prakerin.
        </p>
      </section>

      <GradesManager records={records} initialError={initialError} />
    </main>
  );
}
