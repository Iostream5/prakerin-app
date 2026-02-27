import { getOperatorStats } from "@/src/features/operator/server-actions/get-operator-stats";

export default async function Page() {
  let stats: Awaited<ReturnType<typeof getOperatorStats>> | null = null;
  let errorMessage: string | null = null;

  try {
    stats = await getOperatorStats();
  } catch (error: unknown) {
    errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to load operator statistics.";
  }

  if (errorMessage) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {errorMessage}
      </div>
    );
  }

  const statCards = [
    { title: "Total Students", value: stats?.totalStudents ?? 0 },
    { title: "Active Placements", value: stats?.activePlacements ?? 0 },
    { title: "Unassigned Students", value: stats?.unassignedStudents ?? 0 },
    { title: "Total Companies", value: stats?.totalCompanies ?? 0 },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((card) => (
        <div
          key={card.title}
          className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
        >
          <p className="text-sm text-slate-500">{card.title}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{card.value}</p>
        </div>
      ))}
    </div>
  );
}
