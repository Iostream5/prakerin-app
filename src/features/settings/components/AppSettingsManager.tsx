"use client";

import { useMemo, useState, useTransition } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  deleteAppSetting,
  upsertAppSetting,
} from "@/src/features/settings/server-actions/settings";
import type { AppSetting } from "@/src/features/settings/types";

type Props = {
  initialSettings: AppSetting[];
  initialError?: string | null;
};

type FormValues = {
  key: string;
  valueRaw: string;
  description: string;
};

const EMPTY_FORM: FormValues = {
  key: "",
  valueRaw: "{}",
  description: "",
};

export function AppSettingsManager({ initialSettings, initialError }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [query, setQuery] = useState("");
  const [form, setForm] = useState<FormValues>(EMPTY_FORM);
  const [actionError, setActionError] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);

  const filteredSettings = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return initialSettings;
    return initialSettings.filter((item) =>
      [item.key, item.description ?? "", JSON.stringify(item.value)]
        .join(" ")
        .toLowerCase()
        .includes(keyword)
    );
  }, [initialSettings, query]);

  const onEdit = (setting: AppSetting) => {
    setEditingKey(setting.key);
    setActionError(null);
    setForm({
      key: setting.key,
      valueRaw: JSON.stringify(setting.value, null, 2),
      description: setting.description ?? "",
    });
  };

  const onReset = () => {
    setEditingKey(null);
    setActionError(null);
    setForm(EMPTY_FORM);
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionError(null);

    startTransition(async () => {
      const result = await upsertAppSetting({
        key: form.key,
        valueRaw: form.valueRaw,
        description: form.description || null,
      });

      if (!result.ok) {
        setActionError(result.error.message);
        return;
      }

      onReset();
      router.refresh();
    });
  };

  const onDelete = (key: string) => {
    if (!window.confirm(`Delete setting "${key}"?`)) return;
    setActionError(null);

    startTransition(async () => {
      const result = await deleteAppSetting(key);
      if (!result.ok) {
        setActionError(result.error.message);
        return;
      }

      if (editingKey === key) {
        onReset();
      }

      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      {(initialError || actionError) && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError ?? initialError}
        </div>
      )}

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-base font-semibold text-slate-900">
          {editingKey ? `Edit Setting: ${editingKey}` : "Create New Setting"}
        </h2>

        <form className="mt-4 space-y-4" onSubmit={onSubmit}>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">Key</span>
            <input
              type="text"
              value={form.key}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, key: event.target.value }))
              }
              disabled={isPending || !!editingKey}
              placeholder="example: attendance.radius_meters"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 disabled:bg-slate-100"
              required
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">Description</span>
            <input
              type="text"
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, description: event.target.value }))
              }
              disabled={isPending}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">JSON Value</span>
            <textarea
              value={form.valueRaw}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, valueRaw: event.target.value }))
              }
              disabled={isPending}
              className="h-40 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs text-slate-900"
              required
            />
          </label>

          <div className="flex items-center justify-end gap-2">
            {editingKey && (
              <button
                type="button"
                onClick={onReset}
                disabled={isPending}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel Edit
              </button>
            )}
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? "Saving..." : editingKey ? "Update Setting" : "Create Setting"}
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-3">
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search key or value"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 md:max-w-sm"
        />

        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Key</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">
                  Description
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Value</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredSettings.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                    No settings found.
                  </td>
                </tr>
              ) : (
                filteredSettings.map((setting) => (
                  <tr key={setting.key}>
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">
                      {setting.key}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{setting.description ?? "-"}</td>
                    <td className="max-w-md px-4 py-3">
                      <pre className="overflow-auto whitespace-pre-wrap text-[11px] text-slate-600">
                        {JSON.stringify(setting.value, null, 2)}
                      </pre>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onEdit(setting)}
                          disabled={isPending}
                          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(setting.key)}
                          disabled={isPending}
                          className="rounded-md border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
