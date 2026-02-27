import { createSupabaseServerClient } from "@/src/lib/supabase/server";

export default async function Page() {
  const supabase = await createSupabaseServerClient();
  const [templatesRes, companiesRes, placementsRes] = await Promise.all([
    supabase.from("mailing_templates").select("id,is_active", { count: "exact" }),
    supabase.from("companies").select("id", { count: "exact", head: true }),
    supabase.from("placements").select("id,status"),
  ]);

  const errorMessage =
    templatesRes.error?.message ??
    companiesRes.error?.message ??
    placementsRes.error?.message ??
    null;

  const templates = templatesRes.data ?? [];
  const placements = placementsRes.data ?? [];

  const cards = [
    { title: "Template Surat", value: templatesRes.count ?? 0 },
    { title: "Template Aktif", value: templates.filter((t) => t.is_active).length },
    { title: "Perusahaan Tujuan", value: companiesRes.count ?? 0 },
    { title: "Penempatan Aktif", value: placements.filter((p) => p.status === "active").length },
  ];

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-6 md:p-8">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Administrasi Surat</h1>
        <p className="mt-2 text-sm text-slate-600">
          Ringkasan data surat berbasis template dan kebutuhan distribusi ke perusahaan.
        </p>
      </section>

      {errorMessage && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Sebagian data tidak dapat dimuat: {errorMessage}
        </div>
      )}

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.title} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">{card.title}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{card.value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        Untuk generasi dokumen surat (PDF/DOCX) otomatis, modul exporter belum diaktifkan.
        Gunakan data template pada menu Template Laporan sebagai sumber konten surat.
      </section>
    </main>
  );
}
