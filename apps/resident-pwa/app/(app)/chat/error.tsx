"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RotateCcw, FileText } from "lucide-react";

/** Keep document requests accessible even if an optional AI/chat widget crashes. */
export default function ChatError({ error, reset }: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Do not log IDs, answers, attachments or other private resident input.
    console.error("[Ate Sora] Chat view failed", { digest: error.digest ?? "unavailable" });
  }, [error.digest]);

  return (
    <main className="flex h-full min-h-0 flex-col items-center justify-center gap-4 bg-white p-6 text-center">
      <AlertCircle className="h-9 w-9 text-amber-600" aria-hidden="true" />
      <h1 className="text-lg font-bold text-slate-900">Ate Sora could not display the conversation</h1>
      <p role="alert" className="max-w-sm text-sm text-slate-600">
        Your document request has not been submitted by this screen. You can retry chat,
        or use the standard barangay document form directly.
      </p>
      <button type="button" onClick={reset}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white">
        <RotateCcw className="h-4 w-4" aria-hidden="true" /> Retry Ate Sora
      </button>
      <Link href="/requests/new"
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-blue-300 px-5 py-3 text-sm font-semibold text-blue-800">
        <FileText className="h-4 w-4" aria-hidden="true" /> Open document request form
      </Link>
    </main>
  );
}
