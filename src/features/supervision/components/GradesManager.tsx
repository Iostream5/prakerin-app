"use client";

import { useState, useTransition } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { upsertGradeRecord } from "@/src/features/supervision/server-actions/grades";
import type { GradeRecord } from "@/src/features/supervision/types";

type Props = {
  records: GradeRecord[];
  initialError?: string | null;
};

export function GradesManager({ records, initialError }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [placementId, setPlacementId] = useState("");
  const [technical, setTechnical] = useState("0");
  const [discipline, setDiscipline] = useState("0");
  const [communication, setCommunication] = useState("0");
  const [notes, setNotes] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionError(null);
    startTransition(async () => {
      const result = await upsertGradeRecord({
        placement_id: placementId,
        technical_score: Number(technical),
        discipline_score: Number(discipline),
        communication_score: Number(communication),
        notes: notes || null,
      });
      if (!result.ok) {
        setActionError(result.error.message);
        return;
      }
      setPlacementId("");
      setTechnical("0");
      setDiscipline("0");
      setCommunication("0");
      setNotes("");
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

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-base font-semibold text-slate-900">Input Nilai</h2>
        <form onSubmit={onSubmit} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <input value={placementId} onChange={(e) => setPlacementId(e.target.value)} placeholder="Placement ID (UUID)" className="rounded-md border border-slate-300 px-3 py-2 text-sm md:col-span-2" required />
          <input type="number" min={0} max={100} value={technical} onChange={(e) => setTechnical(e.target.value)} placeholder="Technical score" className="rounded-md border border-slate-300 px-3 py-2 text-sm" required />
          <input type="number" min={0} max={100} value={discipline} onChange={(e) => setDiscipline(e.target.value)} placeholder="Discipline score" className="rounded-md border border-slate-300 px-3 py-2 text-sm" required />
          <input type="number" min={0} max={100} value={communication} onChange={(e) => setCommunication(e.target.value)} placeholder="Communication score" className="rounded-md border border-slate-300 px-3 py-2 text-sm md:col-span-2" required />
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Catatan (opsional)" className="h-24 rounded-md border border-slate-300 px-3 py-2 text-sm md:col-span-2" />
          <div className="md:col-span-2 flex justify-end">
            <button disabled={isPending} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
              {isPending ? "Menyimpan..." : "Simpan Nilai"}
            </button>
          </div>
        </form>
      </section>

      <section className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Placement ID</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Teknis</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Disiplin</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Komunikasi</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Final</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {records.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Belum ada data nilai.</td></tr>
            ) : (
              records.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 font-mono text-[11px] text-slate-700">{item.placement_id}</td>
                  <td className="px-4 py-3 text-slate-700">{item.technical_score ?? "-"}</td>
                  <td className="px-4 py-3 text-slate-700">{item.discipline_score ?? "-"}</td>
                  <td className="px-4 py-3 text-slate-700">{item.communication_score ?? "-"}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{item.final_score ?? "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
