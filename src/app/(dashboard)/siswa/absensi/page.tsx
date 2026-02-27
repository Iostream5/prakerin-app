import { AttendanceCrud } from "@/src/features/attendance/components/AttendanceCrud";
import {
  listAttendance,
  listAttendancePlacementOptions,
} from "@/src/features/attendance/server-actions/attendance";

export default async function Page() {
  const [attendanceResult, placementsResult] = await Promise.all([
    listAttendance({ page: 1, pageSize: 50 }),
    listAttendancePlacementOptions(),
  ]);

  const initialError = !attendanceResult.ok
    ? attendanceResult.error.message
    : !placementsResult.ok
      ? placementsResult.error.message
      : null;

  const attendanceItems = attendanceResult.ok ? attendanceResult.data.items : [];
  const placements = placementsResult.ok ? placementsResult.data : [];

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-6 md:p-8">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Absensi Prakerin</h1>
        <p className="mt-2 text-sm text-slate-600">
          Lakukan checkin/checkout harian dengan bukti lokasi dan foto.
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <AttendanceCrud
          initialItems={attendanceItems}
          placements={placements}
          initialError={initialError}
        />
      </section>
    </main>
  );
}
