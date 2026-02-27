import { createSupabaseServerClient } from "@/src/lib/supabase/server";

function monthKey(value: string): string {
  return value.slice(0, 7);
}

export default async function Page() {
  const supabase = await createSupabaseServerClient();
  const [journalsRes, attendanceRes, placementsRes] = await Promise.all([
    supabase.from("journals").select("created_at,status").order("created_at", { ascending: false }).limit(500),
    supabase.from("attendance").select("created_at,status").order("created_at", { ascending: false }).limit(500),
    supabase.from("placements").select("created_at,status").order("created_at", { ascending: false }).limit(500),
  ]);

  const errorMessage =
    journalsRes.error?.message ??
    attendanceRes.error?.message ??
    placementsRes.error?.message ??
    null;

  const journalRows = journalsRes.data ?? [];
  const attendanceRows = attendanceRes.data ?? [];
  const placementRows = placementsRes.data ?? [];

  const byMonth = new Map<string, { journals: number; attendance: number; placements: number }>();
  for (const row of journalRows) {
    const key = monthKey(String(row.created_at ?? ""));
    if (!key) continue;
    const prev = byMonth.get(key) ?? { journals: 0, attendance: 0, placements: 0 };
    prev.journals += 1;
    byMonth.set(key, prev);
  }
  for (const row of attendanceRows) {
    const key = monthKey(String(row.created_at ?? ""));
    if (!key) continue;
    const prev = byMonth.get(key) ?? { journals: 0, attendance: 0, placements: 0 };
    prev.attendance += 1;
    byMonth.set(key, prev);
  }
  for (const row of placementRows) {
    const key = monthKey(String(row.created_at ?? ""));
    if (!key) continue;
    const prev = byMonth.get(key) ?? { journals: 0, attendance: 0, placements: 0 };
    prev.placements += 1;
    byMonth.set(key, prev);
  }

  const rows = Array.from(byMonth.entries())
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .slice(0, 12);

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-6 md:p-8">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Analytics KS</h1>
        <p className="mt-2 text-sm text-slate-600">
          Tren bulanan aktivitas jurnal, absensi, dan penempatan.
        </p>
      </section>

      {errorMessage && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Sebagian data tidak dapat diakses: {errorMessage}
        </div>
      )}

      <section className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Bulan</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Jurnal</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Absensi</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Penempatan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  Data analytics belum tersedia.
                </td>
              </tr>
            ) : (
              rows.map(([month, value]) => (
                <tr key={month}>
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">{month}</td>
                  <td className="px-4 py-3 text-slate-700">{value.journals}</td>
                  <td className="px-4 py-3 text-slate-700">{value.attendance}</td>
                  <td className="px-4 py-3 text-slate-700">{value.placements}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
