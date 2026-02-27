"use client";

import { useState, useTransition } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createCompany, deleteCompany } from "@/src/features/kaprog/server-actions/kaprog";
import type { Company } from "@/src/features/kaprog/types";

type Props = {
  items: Company[];
  initialError?: string | null;
};

export function CompaniesCrud({ items, initialError }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionError(null);

    startTransition(async () => {
      const result = await createCompany({
        name,
        code: code || null,
        city: city || null,
        phone: phone || null,
        email: email || null,
      });
      if (!result.ok) {
        setActionError(result.error.message);
        return;
      }
      setName("");
      setCode("");
      setCity("");
      setPhone("");
      setEmail("");
      router.refresh();
    });
  };

  const onDelete = (id: string, nameText: string) => {
    if (!window.confirm(`Delete company "${nameText}"?`)) return;
    setActionError(null);
    startTransition(async () => {
      const result = await deleteCompany(id);
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

      <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-5">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Company name" className="rounded-md border border-slate-300 px-3 py-2 text-sm" required />
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code (optional)" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
        <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City (optional)" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (optional)" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
        <div className="flex gap-2">
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (optional)" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <button disabled={isPending} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
            Add
          </button>
        </div>
      </form>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Name</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Code</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">City</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Contact</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {items.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No companies found.</td></tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 text-slate-900">{item.name}</td>
                  <td className="px-4 py-3 text-slate-700">{item.code ?? "-"}</td>
                  <td className="px-4 py-3 text-slate-700">{item.city ?? "-"}</td>
                  <td className="px-4 py-3 text-slate-700">{item.phone ?? item.email ?? "-"}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => onDelete(item.id, item.name)} disabled={isPending} className="rounded-md border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-700 disabled:opacity-50">
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
