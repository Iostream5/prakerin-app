import { getMyCompanyProfile } from "@/src/features/supervision/server-actions/company-profile";

export default async function Page() {
  const profileResult = await getMyCompanyProfile();
  const profile = profileResult.ok ? profileResult.data : null;
  const errorMessage = profileResult.ok ? null : profileResult.error.message;

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 p-6 md:p-8">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Profil Perusahaan</h1>
        <p className="mt-2 text-sm text-slate-600">
          Informasi perusahaan dan data pembimbing perusahaan yang sedang login.
        </p>
      </section>

      {errorMessage && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {!profile && !errorMessage && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Profil pembimbing perusahaan belum terhubung dengan data supervisor/company.
        </div>
      )}

      {profile && (
        <>
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Data Pembimbing</h2>
            <dl className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Nama</dt>
                <dd className="text-sm text-slate-900">{profile.supervisor_name}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Email</dt>
                <dd className="text-sm text-slate-900">{profile.supervisor_email ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Telepon</dt>
                <dd className="text-sm text-slate-900">{profile.supervisor_phone ?? "-"}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Data Perusahaan</h2>
            <dl className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Nama</dt>
                <dd className="text-sm text-slate-900">{profile.company_name ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Email</dt>
                <dd className="text-sm text-slate-900">{profile.company_email ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Telepon</dt>
                <dd className="text-sm text-slate-900">{profile.company_phone ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Kota</dt>
                <dd className="text-sm text-slate-900">{profile.company_city ?? "-"}</dd>
              </div>
              <div className="md:col-span-2">
                <dt className="text-xs uppercase tracking-wide text-slate-500">Alamat</dt>
                <dd className="text-sm text-slate-900">{profile.company_address ?? "-"}</dd>
              </div>
              <div className="md:col-span-2">
                <dt className="text-xs uppercase tracking-wide text-slate-500">Logo URL</dt>
                <dd className="font-mono text-xs text-slate-700">{profile.company_logo_url ?? "-"}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Perubahan profil perusahaan saat ini dikelola oleh Kaprog/Hubdin sesuai policy
            RLS. Jika butuh update data, kirim permintaan ke admin.
          </section>
        </>
      )}
    </main>
  );
}
