import { StudentsCrud } from "@/src/features/operator/components/StudentsCrud";
import { listStudents } from "@/src/features/students/server-actions/students";

export default async function Page() {
  const result = await listStudents({ page: 1, pageSize: 200 });

  const initialStudents = result.ok ? result.data.items : [];
  const initialError = result.ok ? null : result.error.message;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Students</h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage students data for operator.
        </p>
      </div>

      <StudentsCrud initialStudents={initialStudents} initialError={initialError} />
    </div>
  );
}
