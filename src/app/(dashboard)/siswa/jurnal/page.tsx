import { JournalsCrud } from "@/src/features/journals/components/JournalsCrud";
import {
  listJournalPlacementOptions,
  listJournals,
} from "@/src/features/journals/server-actions/journals";

export default async function Page() {
  const [journalsResult, placementsResult] = await Promise.all([
    listJournals({ page: 1, pageSize: 50 }),
    listJournalPlacementOptions(),
  ]);

  const initialError = !journalsResult.ok
    ? journalsResult.error.message
    : !placementsResult.ok
      ? placementsResult.error.message
      : null;

  const journals = journalsResult.ok ? journalsResult.data.items : [];
  const placements = placementsResult.ok ? placementsResult.data : [];

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-6 md:p-8">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Jurnal Prakerin</h1>
        <p className="mt-2 text-sm text-slate-600">
          Catat aktivitas harian, lalu kirim untuk validasi pembimbing perusahaan.
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <JournalsCrud
          initialJournals={journals}
          placements={placements}
          initialError={initialError}
        />
      </section>
    </main>
  );
}
