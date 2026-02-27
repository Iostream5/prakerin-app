"use client";

import { useMemo, useState, useTransition } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  createStudent,
  deleteStudent,
  updateStudent,
} from "@/src/features/students/server-actions/students";
import type {
  CreateStudentInput,
  Student,
  UpdateStudentInput,
} from "@/src/features/students/types";

type StudentsCrudProps = {
  initialStudents: Student[];
  initialError?: string | null;
};

type ModalMode = "create" | "edit" | null;

type StudentFormValues = {
  user_id: string;
  nis: string;
  full_name: string;
  class: string;
  program: string;
  phone: string;
  parent_phone: string;
  photo_url: string;
};

const EMPTY_FORM: StudentFormValues = {
  user_id: "",
  nis: "",
  full_name: "",
  class: "",
  program: "",
  phone: "",
  parent_phone: "",
  photo_url: "",
};

function toOptionalValue(value: string): string | null {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function StudentsCrud({ initialStudents, initialError }: StudentsCrudProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [query, setQuery] = useState<string>("");
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<StudentFormValues>(EMPTY_FORM);
  const [actionError, setActionError] = useState<string | null>(null);

  const filteredStudents = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return initialStudents;

    return initialStudents.filter((student) =>
      [student.full_name, student.nis, student.class, student.program]
        .join(" ")
        .toLowerCase()
        .includes(keyword)
    );
  }, [initialStudents, query]);

  const closeModal = () => {
    setModalMode(null);
    setEditingStudentId(null);
    setFormValues(EMPTY_FORM);
  };

  const openCreateModal = () => {
    setActionError(null);
    setModalMode("create");
    setEditingStudentId(null);
    setFormValues(EMPTY_FORM);
  };

  const openEditModal = (student: Student) => {
    setActionError(null);
    setModalMode("edit");
    setEditingStudentId(student.id);
    setFormValues({
      user_id: student.user_id ?? "",
      nis: student.nis,
      full_name: student.full_name,
      class: student.class,
      program: student.program,
      phone: student.phone ?? "",
      parent_phone: student.parent_phone ?? "",
      photo_url: student.photo_url ?? "",
    });
  };

  const onChangeFormValue = (field: keyof StudentFormValues, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionError(null);

    startTransition(async () => {
      const basePayload = {
        user_id: toOptionalValue(formValues.user_id),
        nis: formValues.nis,
        full_name: formValues.full_name,
        class: formValues.class,
        program: formValues.program,
        phone: toOptionalValue(formValues.phone),
        parent_phone: toOptionalValue(formValues.parent_phone),
        photo_url: toOptionalValue(formValues.photo_url),
      };

      if (modalMode === "create") {
        const createPayload: CreateStudentInput = basePayload;
        const result = await createStudent(createPayload);

        if (!result.ok) {
          setActionError(result.error.message);
          return;
        }
      }

      if (modalMode === "edit") {
        if (!editingStudentId) {
          setActionError("Student id is missing.");
          return;
        }

        const updatePayload: UpdateStudentInput = basePayload;
        const result = await updateStudent(editingStudentId, updatePayload);

        if (!result.ok) {
          setActionError(result.error.message);
          return;
        }
      }

      closeModal();
      router.refresh();
    });
  };

  const handleDelete = (studentId: string, studentName: string) => {
    if (!window.confirm(`Delete student "${studentName}"?`)) {
      return;
    }

    setActionError(null);
    startTransition(async () => {
      const result = await deleteStudent(studentId);

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
          placeholder="Search by name, NIS, class, or program"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-200 placeholder:text-slate-400 focus:ring md:max-w-sm"
        />

        <button
          type="button"
          onClick={openCreateModal}
          disabled={isPending}
          className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add Student
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Name</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">NIS</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Class</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Program</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  No students found.
                </td>
              </tr>
            ) : (
              filteredStudents.map((student) => (
                <tr key={student.id}>
                  <td className="px-4 py-3 text-slate-900">{student.full_name}</td>
                  <td className="px-4 py-3 text-slate-700">{student.nis}</td>
                  <td className="px-4 py-3 text-slate-700">{student.class}</td>
                  <td className="px-4 py-3 text-slate-700">{student.program}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                      {student.user_id ? "Linked" : "Unlinked"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(student)}
                        disabled={isPending}
                        className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(student.id, student.full_name)}
                        disabled={isPending}
                        className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
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

      {isPending && <p className="text-sm text-slate-600">Processing...</p>}

      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-slate-900">
                {modalMode === "create" ? "Add Student" : "Edit Student"}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Fill the student information below.
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Full Name</span>
                  <input
                    type="text"
                    value={formValues.full_name}
                    onChange={(event) =>
                      onChangeFormValue("full_name", event.target.value)
                    }
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-200 focus:ring"
                    required
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">NIS</span>
                  <input
                    type="text"
                    value={formValues.nis}
                    onChange={(event) => onChangeFormValue("nis", event.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-200 focus:ring"
                    required
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Class</span>
                  <input
                    type="text"
                    value={formValues.class}
                    onChange={(event) => onChangeFormValue("class", event.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-200 focus:ring"
                    required
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Program</span>
                  <input
                    type="text"
                    value={formValues.program}
                    onChange={(event) =>
                      onChangeFormValue("program", event.target.value)
                    }
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-200 focus:ring"
                    required
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Phone</span>
                  <input
                    type="text"
                    value={formValues.phone}
                    onChange={(event) => onChangeFormValue("phone", event.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-200 focus:ring"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Parent Phone</span>
                  <input
                    type="text"
                    value={formValues.parent_phone}
                    onChange={(event) =>
                      onChangeFormValue("parent_phone", event.target.value)
                    }
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-200 focus:ring"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Photo URL</span>
                  <input
                    type="url"
                    value={formValues.photo_url}
                    onChange={(event) =>
                      onChangeFormValue("photo_url", event.target.value)
                    }
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-200 focus:ring"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">User ID</span>
                  <input
                    type="text"
                    value={formValues.user_id}
                    onChange={(event) => onChangeFormValue("user_id", event.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-200 focus:ring"
                    placeholder="UUID (optional)"
                  />
                </label>
              </div>

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
                  {isPending
                    ? "Saving..."
                    : modalMode === "create"
                      ? "Create"
                      : "Update"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
