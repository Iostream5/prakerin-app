"use client";

import { useState, useTransition } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createPlacement, deletePlacement } from "@/src/features/kaprog/server-actions/kaprog";
import type { Company, Placement, Supervisor } from "@/src/features/kaprog/types";

type Props = {
  items: Placement[];
  companies: Company[];
  supervisors: Supervisor[];
  initialError?: string | null;
};

export function PlacementsCrud({ items, companies, supervisors, initialError }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [studentId, setStudentId] = useState("");
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  const [schoolSupervisorId, setSchoolSupervisorId] = useState("");
  const [companySupervisorId, setCompanySupervisorId] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState<"pending" | "active" | "completed" | "cancelled">("pending");
  const [notes, setNotes] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const companyNameMap = new Map(companies.map((item) => [item.id, item.name]));
  const supervisorNameMap = new Map(supervisors.map((item) => [item.id, item.full_name]));
  const schoolSupervisors = supervisors.filter((item) => item.role === "pembimbing_sekolah");
  const companySupervisors = supervisors.filter((item) => item.role === "pembimbing_perusahaan");

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionError(null);
    startTransition(async () => {
      const result = await createPlacement({
        student_id: studentId,
        company_id: companyId,
        school_supervisor_id: schoolSupervisorId || null,
        company_supervisor_id: companySupervisorId || null,
        start_date: startDate,
        end_date: endDate || null,
        status,
        notes: notes || null,
      });
      if (!result.ok) {
        setActionError(result.error.message);
        return;
      }
      setStudentId("");
      setSchoolSupervisorId("");
      setCompanySupervisorId("");
      setEndDate("");
      setNotes("");
      setStatus("pending");
      router.refresh();
    });
  };

  const onDelete = (id: string) => {
    if (!window.confirm("Delete this placement?")) return;
    setActionError(null);
    startTransition(async () => {
      const result = await deletePlacement(id);
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

      <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-3">
        <input value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="Student ID (UUID)" className="rounded-md border border-slate-300 px-3 py-2 text-sm" required />
        <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm" required>
          <option value="" disabled>Select company</option>
          {companies.map((company) => (
            <option key={company.id} value={company.id}>{company.name}</option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value as "pending" | "active" | "completed" | "cancelled")} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
          <option value="pending">pending</option>
          <option value="active">active</option>
          <option value="completed">completed</option>
          <option value="cancelled">cancelled</option>
        </select>
        <select value={schoolSupervisorId} onChange={(e) => setSchoolSupervisorId(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
          <option value="">School supervisor (optional)</option>
          {schoolSupervisors.map((spv) => (
            <option key={spv.id} value={spv.id}>{spv.full_name}</option>
          ))}
        </select>
        <select value={companySupervisorId} onChange={(e) => setCompanySupervisorId(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
          <option value="">Company supervisor (optional)</option>
          {companySupervisors.map((spv) => (
            <option key={spv.id} value={spv.id}>{spv.full_name}</option>
          ))}
        </select>
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm" required />
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
        <div className="md:col-span-2">
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <button disabled={isPending} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Add Placement</button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Student ID</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Company</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Period</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Supervisors</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {items.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No placements found.</td></tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 font-mono text-[11px] text-slate-700">{item.student_id}</td>
                  <td className="px-4 py-3 text-slate-900">{companyNameMap.get(item.company_id) ?? item.company_id}</td>
                  <td className="px-4 py-3 text-slate-700">{item.start_date} - {item.end_date ?? "-"}</td>
                  <td className="px-4 py-3 text-slate-700">
                    <div className="space-y-1">
                      <p>S: {item.school_supervisor_id ? supervisorNameMap.get(item.school_supervisor_id) ?? item.school_supervisor_id : "-"}</p>
                      <p>C: {item.company_supervisor_id ? supervisorNameMap.get(item.company_supervisor_id) ?? item.company_supervisor_id : "-"}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{item.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => onDelete(item.id)} disabled={isPending} className="rounded-md border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-700 disabled:opacity-50">
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
