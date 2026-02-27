import { JournalsReview } from "@/src/features/journals/components/JournalsReview";
import { listJournals } from "@/src/features/journals/server-actions/journals";

export default async function Page() {
  const journalsResult = await listJournals({
    page: 1,
    pageSize: 100,
    status: "submitted",
  });

  const journals = journalsResult.ok ? journalsResult.data.items : [];
  const initialError = journalsResult.ok ? null : journalsResult.error.message;

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-6 md:p-8">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Validasi Jurnal</h1>
        <p className="mt-2 text-sm text-slate-600">
          Review jurnal siswa yang sudah diajukan, lalu validasi atau reject dengan
          feedback.
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <JournalsReview
          initialJournals={journals}
          canValidate
          initialError={initialError}
        />
      </section>
    </main>
  );
}
