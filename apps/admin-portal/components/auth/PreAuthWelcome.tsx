"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "smart-barangay:admin-welcome-seen-v2";

const slides = [
  {
    eyebrow: "A clearer view of barangay work",
    title: "Everything important, in one place.",
    description:
      "Smart Barangay helps your team see residents, requests, services, and community updates at a glance.",
    image: "/onboarding/community.jpg",
    imageAlt: "Residents spending time together in a community setting",
  },
  {
    eyebrow: "Serve with confidence",
    title: "Keep every resident interaction moving.",
    description:
      "Manage records, documents, announcements, and service workflows with clear ownership and visibility.",
    image: "/onboarding/documents.jpg",
    imageAlt: "A person reviewing paperwork at a desk",
  },
  {
    eyebrow: "Ready when you are",
    title: "Make barangay service simpler.",
    description:
      "Use one secure workspace to coordinate your team and deliver a more responsive experience to residents.",
    image: "/onboarding/support.jpg",
    imageAlt: "People having a friendly conversation together",
  },
] as const;

export function PreAuthWelcome({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [seen, setSeen] = useState(false);
  const [active, setActive] = useState(0);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    setSeen(window.localStorage.getItem(STORAGE_KEY) === "true");
    setReady(true);
  }, []);

  function finish() {
    window.localStorage.setItem(STORAGE_KEY, "true");
    setSeen(true);
  }

  function goToSlide(index: number) {
    setActive(Math.max(0, Math.min(slides.length - 1, index)));
  }

  function next() {
    if (active === slides.length - 1) {
      finish();
      return;
    }
    goToSlide(active + 1);
  }

  function handleTouchEnd(clientX: number) {
    if (touchStartX.current === null) return;
    const distance = clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(distance) < 48) return;
    goToSlide(active + (distance < 0 ? 1 : -1));
  }

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950">
        <img src="/logo.png" alt="Smart Barangay" className="h-14 w-auto animate-pulse object-contain" />
      </main>
    );
  }

  if (seen) return <>{children}</>;

  const slide = slides[active];

  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 px-5 py-6 text-white sm:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md flex-col">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Smart Barangay" className="h-9 w-auto object-contain" />
            <span className="text-sm font-extrabold tracking-tight">Smart Barangay</span>
          </div>
          <button
            type="button"
            onClick={finish}
            className="rounded-full px-3 py-2 text-xs font-bold text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            Skip
          </button>
        </header>

        <section
          className="flex flex-1 touch-pan-y flex-col justify-center py-8 text-center"
          onTouchStart={(event) => {
            touchStartX.current = event.changedTouches[0]?.clientX ?? null;
          }}
          onTouchEnd={(event) => handleTouchEnd(event.changedTouches[0]?.clientX ?? 0)}
          aria-live="polite"
        >
          <div className="mx-auto mb-9 w-full overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.06] shadow-sm">
            <div className="relative aspect-[4/3]">
              <img src={slide.image} alt={slide.imageAlt} className="h-full w-full object-cover" draggable={false} />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/70 via-black/15 to-transparent px-5 pb-4 pt-16">
                <span className="text-xs font-semibold text-white/90">{String(active + 1).padStart(2, "0")} / 03</span>
                <span className="text-xs text-white/80">Admin workspace</span>
              </div>
            </div>
          </div>

          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-300">{slide.eyebrow}</p>
          <h1 className="mx-auto mt-4 max-w-sm text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{slide.title}</h1>
          <p className="mx-auto mt-4 max-w-sm text-sm leading-7 text-slate-400">{slide.description}</p>
        </section>

        <footer className="pb-2">
          <div className="mb-7 flex items-center justify-center gap-2" aria-label={`Welcome screen ${active + 1} of ${slides.length}`}>
            {slides.map((item, index) => (
              <button
                key={item.eyebrow}
                type="button"
                onClick={() => goToSlide(index)}
                aria-label={`Go to welcome screen ${index + 1}`}
                className={`h-2 rounded-full transition-all ${index === active ? "w-8 bg-blue-400" : "w-2 bg-white/25"}`}
              />
            ))}
          </div>

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => goToSlide(active - 1)}
              disabled={active === 0}
              className="min-h-12 rounded-2xl px-3 text-sm font-bold text-slate-400 transition hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-0"
            >
              Back
            </button>
            <button
              type="button"
              onClick={next}
              className="min-h-12 flex-1 rounded-2xl bg-blue-500 px-5 text-sm font-bold text-white shadow-lg shadow-blue-950/50 transition hover:bg-blue-400 active:scale-[0.98]"
            >
              {active === slides.length - 1 ? "Get started" : "Next"}
            </button>
          </div>
          <p className="mt-4 text-center text-[11px] font-medium text-slate-500">Swipe to explore the admin workspace</p>
        </footer>
      </div>
    </main>
  );
}
