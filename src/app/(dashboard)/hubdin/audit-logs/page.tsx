import { createSupabaseServerClient } from "@/src/lib/supabase/server";

type AuditLogRow = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  user_id: string | null;
};

export default async function Page() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("activity_logs")
    .select("id,action,entity_type,entity_id,metadata,created_at,user_id")
    .order("created_at", { ascending: false })
    .limit(200);

  const logs = (data ?? []) as AuditLogRow[];
  const errorMessage = error?.message ?? null;

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-6 md:p-8">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Audit Logs</h1>
        <p className="mt-2 text-sm text-slate-600">
          Riwayat aktivitas kritis sistem untuk kebutuhan audit dan investigasi.
        </p>
      </section>

      {errorMessage && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <section className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Time</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Action</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Entity</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">User ID</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Metadata</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  No audit logs found.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">{log.action}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {log.entity_type}
                    {log.entity_id ? ` (${log.entity_id})` : ""}
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-slate-600">
                    {log.user_id ?? "-"}
                  </td>
                  <td className="max-w-md px-4 py-3">
                    <pre className="overflow-auto whitespace-pre-wrap text-[11px] text-slate-600">
                      {JSON.stringify(log.metadata ?? {}, null, 2)}
                    </pre>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
