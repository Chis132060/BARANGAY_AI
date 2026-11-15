"use client";

import { useState } from "react";

type RecordKind = "program" | "organization" | "council";

const ILLUSTRATIONS: Record<RecordKind, string> = {
  program: "/illustrations/programs.svg",
  organization: "/illustrations/organizations.svg",
  council: "/illustrations/councils.svg",
};

/** A decorative illustration, never an assertion that a registry entry has an official seal. */
export function RecordIllustration({
  kind,
  name,
  src,
  className = "",
}: {
  kind: RecordKind;
  name: string;
  src?: string | null;
  className?: string;
}) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const coverSource = src?.trim() || null;
  const hasCover = Boolean(coverSource && coverSource !== failedSource);
  return (
    <div className={`relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-50 via-white to-amber-50 ${className}`}>
      <img
        src={hasCover ? coverSource! : ILLUSTRATIONS[kind]}
        alt={hasCover ? `${name} cover image` : `Generic ${kind} illustration, not an official logo`}
        loading="lazy"
        onError={() => { if (hasCover) setFailedSource(coverSource); }}
        className={hasCover ? "h-full w-full object-cover" : "h-full w-full object-contain p-3"}
      />
    </div>
  );
}
