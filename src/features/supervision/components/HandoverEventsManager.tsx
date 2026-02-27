"use client";

import { useState, useTransition } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createHandoverEvent } from "@/src/features/supervision/server-actions/handover";
import type { HandoverEvent } from "@/src/features/supervision/types";

type Props = {
  action: "handover.submit" | "handover.pickup";
  title: string;
  initialEvents: HandoverEvent[];
  initialError?: string | null;
};

export function HandoverEventsManager({ action, title, initialEvents, initialError }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [studentName, setStudentName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [placementId, setPlacementId] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionError(null);
    startTransition(async () => {
      const result = await createHandoverEvent({
        action,
        student_name: studentName || null,
        company_name: companyName || null,
        placement_id: placementId || null,
        latitude: latitude ? Number(latitude) : null,
        longitude: longitude ? Number(longitude) : null,
        photo_url: photoUrl || null,
        notes: notes || null,
      });

      if (!result.ok) {
        setActionError(result.error.message);
        return;
      }

      setStudentName("");
      setCompanyName("");
      setPlacementId("");
      setLatitude("");
      setLongitude("");
      setPhotoUrl("");
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
        <h2 className="text-base font-semibold text-slate-900">Input {title}</h2>
        <form onSubmit={onSubmit} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <input value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="Nama siswa" className="rounded-md border border-slate-300 px-3 py-2 text-sm" required />
          <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Nama perusahaan" className="rounded-md border border-slate-300 px-3 py-2 text-sm" required />
          <input value={placementId} onChange={(e) => setPlacementId(e.target.value)} placeholder="Placement ID (opsional)" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="Photo URL (opsional)" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input type="number" step="any" value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="Latitude (opsional)" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input type="number" step="any" value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="Longitude (opsional)" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Catatan kegiatan" className="md:col-span-2 h-28 rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <div className="md:col-span-2 flex justify-end">
            <button disabled={isPending} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
              {isPending ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </section>

      <section className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Waktu</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Siswa</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Perusahaan</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Catatan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {initialEvents.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">Belum ada data.</td></tr>
            ) : (
              initialEvents.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 text-slate-700">{new Date(item.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3 text-slate-900">{String(item.metadata.student_name ?? "-")}</td>
                  <td className="px-4 py-3 text-slate-700">{String(item.metadata.company_name ?? "-")}</td>
                  <td className="px-4 py-3 text-slate-600">{String(item.metadata.notes ?? "-")}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
