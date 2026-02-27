"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { validateJournal } from "@/src/features/journals/server-actions/journals";
import type { Journal } from "@/src/features/journals/types";

type JournalsReviewProps = {
  initialJournals: Journal[];
  canValidate: boolean;
  initialError?: string | null;
};

function getStatusClassName(status: Journal["status"]): string {
  if (status === "validated") return "bg-emerald-100 text-emerald-700";
  if (status === "submitted") return "bg-amber-100 text-amber-700";
  if (status === "rejected") return "bg-rose-100 text-rose-700";
  return "bg-slate-100 text-slate-700";
}

export function JournalsReview({
  initialJournals,
  canValidate,
  initialError,
}: JournalsReviewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return initialJournals;

    return initialJournals.filter((journal) =>
      [journal.journal_date, journal.title, journal.status, journal.content]
        .join(" ")
        .toLowerCase()
        .includes(keyword)
    );
  }, [initialJournals, query]);

  const onValidate = (journalId: string, mode: "validated" | "rejected") => {
    setActionError(null);
    const feedback =
      mode === "rejected"
        ? window.prompt("Feedback untuk siswa (wajib isi saat reject):", "") ?? ""
        : window.prompt("Feedback (opsional):", "") ?? "";

    if (mode === "rejected" && feedback.trim().length === 0) {
      setActionError("Feedback wajib diisi saat reject jurnal.");
      return;
    }

    startTransition(async () => {
      const result = await validateJournal(journalId, {
        status: mode,
        feedback: feedback.trim() || null,
      });

      if (!result.ok) {
        setActionError(result.error.message);
        return;
      }

      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      {(initialError || actionError) && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError ?? initialError}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search date, title, status, content"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-200 placeholder:text-slate-400 focus:ring md:max-w-sm"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Date</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Title</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Feedback</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  No journals found.
                </td>
              </tr>
            ) : (
              filtered.map((journal) => {
                const canAct = canValidate && journal.status === "submitted";

                return (
                  <tr key={journal.id}>
                    <td className="px-4 py-3 text-slate-700">{journal.journal_date}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{journal.title}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-600">{journal.content}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClassName(journal.status)}`}
                      >
                        {journal.status}
                      </span>
                    </td>
                    <td className="max-w-sm px-4 py-3 text-slate-600">
                      {journal.feedback ?? "-"}
                    </td>
                    <td className="px-4 py-3">
                      {canValidate ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onValidate(journal.id, "validated")}
                            disabled={isPending || !canAct}
                            className="rounded-md border border-emerald-300 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Validate
                          </button>
                          <button
                            type="button"
                            onClick={() => onValidate(journal.id, "rejected")}
                            disabled={isPending || !canAct}
                            className="rounded-md border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500">Monitoring only</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
