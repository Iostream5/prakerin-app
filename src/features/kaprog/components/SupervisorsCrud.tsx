"use client";

import { useState, useTransition } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createSupervisor, deleteSupervisor } from "@/src/features/kaprog/server-actions/kaprog";
import type { Company, Supervisor } from "@/src/features/kaprog/types";

type Props = {
  items: Supervisor[];
  companies: Company[];
  initialError?: string | null;
};

export function SupervisorsCrud({ items, companies, initialError }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<"pembimbing_sekolah" | "pembimbing_perusahaan">(
    "pembimbing_sekolah"
  );
  const [companyId, setCompanyId] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const companyNameMap = new Map(companies.map((item) => [item.id, item.name]));

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionError(null);
    startTransition(async () => {
      const result = await createSupervisor({
        user_id: userId,
        role,
        company_id: companyId || null,
        full_name: fullName,
        phone: phone || null,
        email: email || null,
      });
      if (!result.ok) {
        setActionError(result.error.message);
        return;
      }
      setUserId("");
      setCompanyId("");
      setFullName("");
      setPhone("");
      setEmail("");
      router.refresh();
    });
  };

  const onDelete = (id: string, name: string) => {
    if (!window.confirm(`Delete supervisor "${name}"?`)) return;
    setActionError(null);
    startTransition(async () => {
      const result = await deleteSupervisor(id);
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
        <input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="User ID (UUID)" className="rounded-md border border-slate-300 px-3 py-2 text-sm" required />
        <select value={role} onChange={(e) => setRole(e.target.value as "pembimbing_sekolah" | "pembimbing_perusahaan")} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
          <option value="pembimbing_sekolah">pembimbing_sekolah</option>
          <option value="pembimbing_perusahaan">pembimbing_perusahaan</option>
        </select>
        <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
          <option value="">No company</option>
          {companies.map((company) => (
            <option key={company.id} value={company.id}>{company.name}</option>
          ))}
        </select>
        <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" className="rounded-md border border-slate-300 px-3 py-2 text-sm" required />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (optional)" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
        <div className="flex gap-2">
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (optional)" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <button disabled={isPending} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Add</button>
        </div>
      </form>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Name</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Role</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Company</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">User ID</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {items.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No supervisors found.</td></tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 text-slate-900">{item.full_name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">{item.role}</td>
                  <td className="px-4 py-3 text-slate-700">{item.company_id ? companyNameMap.get(item.company_id) ?? item.company_id : "-"}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-slate-600">{item.user_id}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => onDelete(item.id, item.full_name)} disabled={isPending} className="rounded-md border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-700 disabled:opacity-50">
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
