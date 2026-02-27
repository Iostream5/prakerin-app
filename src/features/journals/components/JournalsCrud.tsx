"use client";

import { useMemo, useState, useTransition } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  createJournal,
  deleteJournal,
  submitJournal,
  updateJournal,
} from "@/src/features/journals/server-actions/journals";
import type {
  CreateJournalInput,
  Journal,
  JournalPlacementOption,
  UpdateJournalInput,
} from "@/src/features/journals/types";

type JournalsCrudProps = {
  initialJournals: Journal[];
  placements: JournalPlacementOption[];
  initialError?: string | null;
};

type ModalMode = "create" | "edit" | null;

type JournalFormValues = {
  placement_id: string;
  journal_date: string;
  title: string;
  content: string;
};

const EMPTY_FORM: JournalFormValues = {
  placement_id: "",
  journal_date: "",
  title: "",
  content: "",
};

function isEditableStatus(status: Journal["status"]): boolean {
  return status === "draft" || status === "rejected";
}

function getStatusClassName(status: Journal["status"]): string {
  if (status === "validated") {
    return "bg-emerald-100 text-emerald-700";
  }
  if (status === "submitted") {
    return "bg-amber-100 text-amber-700";
  }
  if (status === "rejected") {
    return "bg-rose-100 text-rose-700";
  }
  return "bg-slate-100 text-slate-700";
}

export function JournalsCrud({
  initialJournals,
  placements,
  initialError,
}: JournalsCrudProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [query, setQuery] = useState("");
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingJournalId, setEditingJournalId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<JournalFormValues>(EMPTY_FORM);
  const [actionError, setActionError] = useState<string | null>(null);

  const filteredJournals = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return initialJournals;

    return initialJournals.filter((journal) =>
      [journal.title, journal.content, journal.status]
        .join(" ")
        .toLowerCase()
        .includes(keyword)
    );
  }, [initialJournals, query]);

  const placementMap = useMemo(() => {
    return new Map(placements.map((placement) => [placement.id, placement]));
  }, [placements]);

  const closeModal = () => {
    setModalMode(null);
    setEditingJournalId(null);
    setFormValues(EMPTY_FORM);
  };

  const openCreateModal = () => {
    setActionError(null);
    setModalMode("create");
    setEditingJournalId(null);
    setFormValues({
      ...EMPTY_FORM,
      placement_id: placements[0]?.id ?? "",
      journal_date: new Date().toISOString().slice(0, 10),
    });
  };

  const openEditModal = (journal: Journal) => {
    setActionError(null);
    setModalMode("edit");
    setEditingJournalId(journal.id);
    setFormValues({
      placement_id: journal.placement_id,
      journal_date: journal.journal_date,
      title: journal.title,
      content: journal.content,
    });
  };

  const onChangeFormValue = (field: keyof JournalFormValues, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionError(null);

    startTransition(async () => {
      if (modalMode === "create") {
        const payload: CreateJournalInput = {
          placement_id: formValues.placement_id,
          journal_date: formValues.journal_date,
          title: formValues.title,
          content: formValues.content,
        };

        const result = await createJournal(payload);
        if (!result.ok) {
          setActionError(result.error.message);
          return;
        }
      }

      if (modalMode === "edit") {
        if (!editingJournalId) {
          setActionError("Journal id is missing.");
          return;
        }

        const payload: UpdateJournalInput = {
          journal_date: formValues.journal_date,
          title: formValues.title,
          content: formValues.content,
        };

        const result = await updateJournal(editingJournalId, payload);
        if (!result.ok) {
          setActionError(result.error.message);
          return;
        }
      }

      closeModal();
      router.refresh();
    });
  };

  const handleSubmitJournal = (journalId: string) => {
    setActionError(null);
    startTransition(async () => {
      const result = await submitJournal(journalId);
      if (!result.ok) {
        setActionError(result.error.message);
        return;
      }
      router.refresh();
    });
  };

  const handleDelete = (journalId: string, title: string) => {
    if (!window.confirm(`Delete journal "${title}"?`)) {
      return;
    }

    setActionError(null);
    startTransition(async () => {
      const result = await deleteJournal(journalId);
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

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by title, content, or status"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-200 placeholder:text-slate-400 focus:ring md:max-w-sm"
        />
        <button
          type="button"
          onClick={openCreateModal}
          disabled={isPending || placements.length === 0}
          className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add Journal
        </button>
      </div>

      {placements.length === 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          You do not have any placement yet. Journal entry can be created after placement
          is assigned.
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Date</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Title</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Placement</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Feedback</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredJournals.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  No journals found.
                </td>
              </tr>
            ) : (
              filteredJournals.map((journal) => {
                const placement = placementMap.get(journal.placement_id);
                const canEdit = isEditableStatus(journal.status);
                const canSubmit = journal.status === "draft" || journal.status === "rejected";
                const canDelete = journal.status !== "validated";

                return (
                  <tr key={journal.id}>
                    <td className="px-4 py-3 text-slate-700">{journal.journal_date}</td>
                    <td className="px-4 py-3 text-slate-900">{journal.title}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {placement?.company_name ?? "Unknown company"}
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
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(journal)}
                          disabled={isPending || !canEdit}
                          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSubmitJournal(journal.id)}
                          disabled={isPending || !canSubmit}
                          className="rounded-md border border-emerald-300 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Submit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(journal.id, journal.title)}
                          disabled={isPending || !canDelete}
                          className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {isPending && <p className="text-sm text-slate-600">Processing...</p>}

      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-slate-900">
                {modalMode === "create" ? "Add Journal" : "Edit Journal"}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Complete your daily internship journal.
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Placement</span>
                  <select
                    value={formValues.placement_id}
                    onChange={(event) =>
                      onChangeFormValue("placement_id", event.target.value)
                    }
                    disabled={modalMode === "edit"}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-200 focus:ring disabled:cursor-not-allowed disabled:bg-slate-100"
                    required
                  >
                    <option value="" disabled>
                      Select placement
                    </option>
                    {placements.map((placement) => (
                      <option key={placement.id} value={placement.id}>
                        {(placement.company_name ?? "Unknown company") +
                          ` (${placement.status})`}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Date</span>
                  <input
                    type="date"
                    value={formValues.journal_date}
                    onChange={(event) =>
                      onChangeFormValue("journal_date", event.target.value)
                    }
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-200 focus:ring"
                    required
                  />
                </label>
              </div>

              <label className="space-y-1">
                <span className="text-sm font-medium text-slate-700">Title</span>
                <input
                  type="text"
                  value={formValues.title}
                  onChange={(event) => onChangeFormValue("title", event.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-200 focus:ring"
                  required
                />
              </label>

              <label className="space-y-1">
                <span className="text-sm font-medium text-slate-700">Activity Details</span>
                <textarea
                  value={formValues.content}
                  onChange={(event) => onChangeFormValue("content", event.target.value)}
                  className="h-36 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-200 focus:ring"
                  required
                />
              </label>

              {actionError && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {actionError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isPending}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isPending ? "Saving..." : modalMode === "create" ? "Create" : "Update"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
