export default function VerificationLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-6" role="status" aria-live="polite">
      <div className="border-b pb-5">
        <h1 className="text-2xl font-extrabold tracking-tight">Resident Verification Queue</h1>
        <p className="mt-1 text-sm text-muted-foreground">Loading pending resident applications…</p>
      </div>
      <div className="rounded-xl border bg-card p-6">
        <div className="h-4 w-56 animate-pulse rounded bg-muted" />
        <div className="mt-6 space-y-4">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="h-12 animate-pulse rounded-lg bg-muted/60" />
          ))}
        </div>
      </div>
      <span className="sr-only">Loading verification queue</span>
    </div>
  );
}
