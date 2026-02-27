import { createSupabaseServerClient } from "@/src/lib/supabase/server";

type GradeRow = {
  id: string;
  technical_score: number | null;
  discipline_score: number | null;
  communication_score: number | null;
  final_score: number | null;
  notes: string | null;
  created_at: string;
  placement_id: string;
};

export default async function Page() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("grades")
    .select(
      "id,technical_score,discipline_score,communication_score,final_score,notes,created_at,placement_id"
    )
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as GradeRow[];

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-6 md:p-8">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Nilai Prakerin</h1>
        <p className="mt-2 text-sm text-slate-600">
          Rekap nilai dari pembimbing perusahaan/sekolah.
        </p>
      </section>

      {error && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Data nilai belum dapat diakses: {error.message}
        </div>
      )}

      <section className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Tanggal</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Teknis</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Disiplin</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Komunikasi</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Final</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Catatan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  Belum ada nilai yang dipublikasikan.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 text-slate-700">
                    {new Date(row.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{row.technical_score ?? "-"}</td>
                  <td className="px-4 py-3 text-slate-700">{row.discipline_score ?? "-"}</td>
                  <td className="px-4 py-3 text-slate-700">{row.communication_score ?? "-"}</td>
                  <td className="px-4 py-3 text-slate-900">{row.final_score ?? "-"}</td>
                  <td className="px-4 py-3 text-slate-600">{row.notes ?? "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
