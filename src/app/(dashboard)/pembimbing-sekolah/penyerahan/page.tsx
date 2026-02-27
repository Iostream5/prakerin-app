import { HandoverEventsManager } from "@/src/features/supervision/components/HandoverEventsManager";
import { listHandoverEvents } from "@/src/features/supervision/server-actions/handover";

export default async function Page() {
  const eventsResult = await listHandoverEvents("handover.submit");
  const events = eventsResult.ok ? eventsResult.data : [];
  const initialError = eventsResult.ok ? null : eventsResult.error.message;

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-6 md:p-8">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Penyerahan Siswa</h1>
        <p className="mt-2 text-sm text-slate-600">
          Catat aktivitas penyerahan siswa ke pihak perusahaan (waktu, lokasi, bukti).
        </p>
      </section>

      <HandoverEventsManager
        action="handover.submit"
        title="Penyerahan"
        initialEvents={events}
        initialError={initialError}
      />
    </main>
  );
}
