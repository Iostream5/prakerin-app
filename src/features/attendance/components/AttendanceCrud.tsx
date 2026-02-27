"use client";

import { useMemo, useState, useTransition } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  checkoutAttendance,
  createAttendance,
  deleteAttendance,
  updateAttendance,
} from "@/src/features/attendance/server-actions/attendance";
import type {
  Attendance,
  AttendancePlacementOption,
  AttendanceStatus,
  CheckoutAttendanceInput,
  CreateAttendanceInput,
  UpdateAttendanceInput,
} from "@/src/features/attendance/types";

type AttendanceCrudProps = {
  initialItems: Attendance[];
  placements: AttendancePlacementOption[];
  initialError?: string | null;
};

type ModalMode = "create" | "edit" | "checkout" | null;

type AttendanceFormValues = {
  placement_id: string;
  attendance_date: string;
  status: AttendanceStatus;
  checkin_lat: string;
  checkin_lng: string;
  checkin_photo_url: string;
  checkout_lat: string;
  checkout_lng: string;
  checkout_photo_url: string;
  note: string;
};

const EMPTY_FORM: AttendanceFormValues = {
  placement_id: "",
  attendance_date: "",
  status: "hadir",
  checkin_lat: "",
  checkin_lng: "",
  checkin_photo_url: "",
  checkout_lat: "",
  checkout_lng: "",
  checkout_photo_url: "",
  note: "",
};

function getStatusClassName(status: AttendanceStatus): string {
  if (status === "hadir") return "bg-emerald-100 text-emerald-700";
  if (status === "izin") return "bg-amber-100 text-amber-700";
  if (status === "sakit") return "bg-blue-100 text-blue-700";
  return "bg-rose-100 text-rose-700";
}

function toNullableNumber(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function AttendanceCrud({
  initialItems,
  placements,
  initialError,
}: AttendanceCrudProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [query, setQuery] = useState("");
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<AttendanceFormValues>(EMPTY_FORM);
  const [actionError, setActionError] = useState<string | null>(null);

  const placementMap = useMemo(
    () => new Map(placements.map((item) => [item.id, item])),
    [placements]
  );

  const filteredItems = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return initialItems;
    return initialItems.filter((item) =>
      [item.attendance_date, item.status, item.note ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(keyword)
    );
  }, [initialItems, query]);

  const closeModal = () => {
    setModalMode(null);
    setEditingId(null);
    setFormValues(EMPTY_FORM);
  };

  const openCreateModal = () => {
    setActionError(null);
    setModalMode("create");
    setEditingId(null);
    setFormValues({
      ...EMPTY_FORM,
      placement_id: placements[0]?.id ?? "",
      attendance_date: new Date().toISOString().slice(0, 10),
    });
  };

  const openEditModal = (item: Attendance) => {
    setActionError(null);
    setModalMode("edit");
    setEditingId(item.id);
    setFormValues({
      ...EMPTY_FORM,
      placement_id: item.placement_id,
      attendance_date: item.attendance_date,
      status: item.status,
      note: item.note ?? "",
    });
  };

  const openCheckoutModal = (item: Attendance) => {
    setActionError(null);
    setModalMode("checkout");
    setEditingId(item.id);
    setFormValues((prev) => ({
      ...prev,
      checkout_lat: "",
      checkout_lng: "",
      checkout_photo_url: "",
      note: item.note ?? "",
    }));
  };

  const onChange = (field: keyof AttendanceFormValues, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionError(null);

    startTransition(async () => {
      if (modalMode === "create") {
        const payload: CreateAttendanceInput = {
          placement_id: formValues.placement_id,
          attendance_date: formValues.attendance_date,
          status: formValues.status,
          checkin_lat: toNullableNumber(formValues.checkin_lat),
          checkin_lng: toNullableNumber(formValues.checkin_lng),
          checkin_photo_url: formValues.checkin_photo_url || null,
          note: formValues.note || null,
        };
        const result = await createAttendance(payload);
        if (!result.ok) {
          setActionError(result.error.message);
          return;
        }
      }

      if (modalMode === "edit") {
        if (!editingId) {
          setActionError("Attendance id is missing.");
          return;
        }
        const payload: UpdateAttendanceInput = {
          status: formValues.status,
          note: formValues.note || null,
        };
        const result = await updateAttendance(editingId, payload);
        if (!result.ok) {
          setActionError(result.error.message);
          return;
        }
      }

      if (modalMode === "checkout") {
        if (!editingId) {
          setActionError("Attendance id is missing.");
          return;
        }
        const payload: CheckoutAttendanceInput = {
          checkout_lat: Number(formValues.checkout_lat),
          checkout_lng: Number(formValues.checkout_lng),
          checkout_photo_url: formValues.checkout_photo_url,
          note: formValues.note || null,
        };
        const result = await checkoutAttendance(editingId, payload);
        if (!result.ok) {
          setActionError(result.error.message);
          return;
        }
      }

      closeModal();
      router.refresh();
    });
  };

  const handleDelete = (id: string, date: string) => {
    if (!window.confirm(`Delete attendance for ${date}?`)) return;
    setActionError(null);
    startTransition(async () => {
      const result = await deleteAttendance(id);
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
          placeholder="Search by date, status, note"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-200 placeholder:text-slate-400 focus:ring md:max-w-sm"
        />
        <button
          type="button"
          onClick={openCreateModal}
          disabled={isPending || placements.length === 0}
          className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add Attendance
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Date</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Placement</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Checkin</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Checkout</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  No attendance records found.
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => {
                const placement = placementMap.get(item.placement_id);
                const canCheckout = item.status === "hadir" && !item.checkout_at;
                const canDelete = !item.checkout_at;

                return (
                  <tr key={item.id}>
                    <td className="px-4 py-3 text-slate-700">{item.attendance_date}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {placement?.company_name ?? "Unknown company"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClassName(item.status)}`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{item.checkin_at ?? "-"}</td>
                    <td className="px-4 py-3 text-slate-700">{item.checkout_at ?? "-"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          disabled={isPending}
                          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => openCheckoutModal(item)}
                          disabled={isPending || !canCheckout}
                          className="rounded-md border border-emerald-300 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Checkout
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id, item.attendance_date)}
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

      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-xl rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900">
              {modalMode === "create"
                ? "Add Attendance"
                : modalMode === "edit"
                  ? "Edit Attendance"
                  : "Checkout Attendance"}
            </h2>

            <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
              {modalMode === "create" && (
                <>
                  <label className="space-y-1">
                    <span className="text-sm font-medium text-slate-700">Placement</span>
                    <select
                      value={formValues.placement_id}
                      onChange={(event) => onChange("placement_id", event.target.value)}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
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
                      value={formValues.attendance_date}
                      onChange={(event) => onChange("attendance_date", event.target.value)}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      required
                    />
                  </label>
                </>
              )}

              {(modalMode === "create" || modalMode === "edit") && (
                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Status</span>
                  <select
                    value={formValues.status}
                    onChange={(event) =>
                      onChange("status", event.target.value as AttendanceStatus)
                    }
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="hadir">hadir</option>
                    <option value="izin">izin</option>
                    <option value="sakit">sakit</option>
                    <option value="alpha">alpha</option>
                  </select>
                </label>
              )}

              {modalMode === "create" && formValues.status === "hadir" && (
                <>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <label className="space-y-1">
                      <span className="text-sm font-medium text-slate-700">Checkin Lat</span>
                      <input
                        type="number"
                        step="any"
                        value={formValues.checkin_lat}
                        onChange={(event) => onChange("checkin_lat", event.target.value)}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        required
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-sm font-medium text-slate-700">Checkin Lng</span>
                      <input
                        type="number"
                        step="any"
                        value={formValues.checkin_lng}
                        onChange={(event) => onChange("checkin_lng", event.target.value)}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        required
                      />
                    </label>
                  </div>
                  <label className="space-y-1">
                    <span className="text-sm font-medium text-slate-700">
                      Checkin Photo URL
                    </span>
                    <input
                      type="url"
                      value={formValues.checkin_photo_url}
                      onChange={(event) =>
                        onChange("checkin_photo_url", event.target.value)
                      }
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      required
                    />
                  </label>
                </>
              )}

              {modalMode === "checkout" && (
                <>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <label className="space-y-1">
                      <span className="text-sm font-medium text-slate-700">Checkout Lat</span>
                      <input
                        type="number"
                        step="any"
                        value={formValues.checkout_lat}
                        onChange={(event) => onChange("checkout_lat", event.target.value)}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        required
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-sm font-medium text-slate-700">Checkout Lng</span>
                      <input
                        type="number"
                        step="any"
                        value={formValues.checkout_lng}
                        onChange={(event) => onChange("checkout_lng", event.target.value)}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        required
                      />
                    </label>
                  </div>
                  <label className="space-y-1">
                    <span className="text-sm font-medium text-slate-700">
                      Checkout Photo URL
                    </span>
                    <input
                      type="url"
                      value={formValues.checkout_photo_url}
                      onChange={(event) =>
                        onChange("checkout_photo_url", event.target.value)
                      }
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      required
                    />
                  </label>
                </>
              )}

              <label className="space-y-1">
                <span className="text-sm font-medium text-slate-700">Note</span>
                <textarea
                  value={formValues.note}
                  onChange={(event) => onChange("note", event.target.value)}
                  className="h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
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
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isPending ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
