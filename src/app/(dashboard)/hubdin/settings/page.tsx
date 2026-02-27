import { AppSettingsManager } from "@/src/features/settings/components/AppSettingsManager";
import { listAppSettings } from "@/src/features/settings/server-actions/settings";

export default async function Page() {
  const settingsResult = await listAppSettings();
  const settings = settingsResult.ok ? settingsResult.data : [];
  const initialError = settingsResult.ok ? null : settingsResult.error.message;

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-6 md:p-8">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">System Settings</h1>
        <p className="mt-2 text-sm text-slate-600">
          Kelola konfigurasi aplikasi berbasis key-value JSON.
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <AppSettingsManager initialSettings={settings} initialError={initialError} />
      </section>
    </main>
  );
}
