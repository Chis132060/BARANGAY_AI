"use client";

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12 text-slate-900">
      <section className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
        <img src="/logo.png" alt="Smart Barangay" className="mx-auto mb-6 h-14 w-auto object-contain" />
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">You are offline</p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight">No connection right now</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Reconnect to the internet and try again. Pages you opened before may still be available from your app cache.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-7 min-h-12 w-full rounded-2xl bg-blue-600 px-5 text-sm font-bold text-white transition hover:bg-blue-700"
        >
          Try again
        </button>
      </section>
    </main>
  );
}
