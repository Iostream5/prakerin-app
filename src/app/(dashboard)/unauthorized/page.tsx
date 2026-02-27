import Link from "next/link";

export default function Page() {
  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-3xl items-center justify-center p-6 md:p-8">
      <section className="w-full rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Akses Ditolak</h1>
        <p className="mt-3 text-sm text-slate-600">
          Akun kamu tidak memiliki izin untuk membuka halaman yang diminta.
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/dashboard"
            className="inline-flex rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
          >
            Kembali ke Dashboard
          </Link>
          <Link
            href="/login"
            className="inline-flex rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
          >
            Login Ulang
          </Link>
        </div>
      </section>
    </main>
  );
}
