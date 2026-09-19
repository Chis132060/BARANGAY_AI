"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "smart-barangay:pwa-welcome-seen-v2";

const slides = [
  {
    eyebrow: "Your barangay, closer",
    title: "Smart services for everyday life.",
    description:
      "Smart Barangay brings trusted information and helpful services together in one simple place.",
    image: "/onboarding/community.jpg",
    imageAlt: "Residents spending time together in a community setting",
  },
  {
    eyebrow: "Request and stay updated",
    title: "Less waiting. More visibility.",
    description:
      "Request documents, follow your applications, and receive important barangay announcements wherever you are.",
    image: "/onboarding/documents.jpg",
    imageAlt: "A person reviewing paperwork at a desk",
  },
  {
    eyebrow: "Help is always within reach",
    title: "Meet your digital barangay companion.",
    description:
      "Ask Ate Sora questions, discover services, and connect with your barangay when you need support.",
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
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <img src="/logo.png" alt="Smart Barangay" className="h-14 w-auto animate-pulse object-contain" />
      </main>
    );
  }

  if (seen) return <>{children}</>;

  const slide = slides[active];

  return (
    <main className="min-h-screen overflow-hidden bg-slate-50 px-5 py-6 text-slate-950 sm:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md flex-col">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Smart Barangay" className="h-9 w-auto object-contain" />
            <span className="text-sm font-extrabold tracking-tight">Smart Barangay</span>
          </div>
          <button
            type="button"
            onClick={finish}
            className="rounded-full px-3 py-2 text-xs font-bold text-slate-500 transition hover:bg-white hover:text-blue-700"
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
          <div className="mx-auto mb-9 w-full overflow-hidden rounded-[1.75rem] bg-white shadow-sm ring-1 ring-slate-200">
            <div className="relative aspect-[4/3]">
              <img src={slide.image} alt={slide.imageAlt} className="h-full w-full object-cover" draggable={false} />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/65 via-black/10 to-transparent px-5 pb-4 pt-16">
                <span className="text-xs font-semibold text-white/90">{String(active + 1).padStart(2, "0")} / 03</span>
                <span className="text-xs text-white/80">Smart Barangay</span>
              </div>
            </div>
          </div>

          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">{slide.eyebrow}</p>
          <h1 className="mx-auto mt-4 max-w-sm text-3xl font-bold leading-tight tracking-tight text-slate-950 sm:text-4xl">
            {slide.title}
          </h1>
          <p className="mx-auto mt-4 max-w-sm text-sm leading-7 text-slate-500">{slide.description}</p>
        </section>

        <footer className="pb-2">
          <div className="mb-7 flex items-center justify-center gap-2" aria-label={`Welcome screen ${active + 1} of ${slides.length}`}>
            {slides.map((item, index) => (
              <button
                key={item.eyebrow}
                type="button"
                onClick={() => goToSlide(index)}
                aria-label={`Go to welcome screen ${index + 1}`}
                className={`h-2 rounded-full transition-all ${index === active ? "w-8 bg-blue-600" : "w-2 bg-slate-300"}`}
              />
            ))}
          </div>

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => goToSlide(active - 1)}
              disabled={active === 0}
              className="min-h-12 rounded-2xl px-3 text-sm font-bold text-slate-500 transition hover:bg-white hover:text-slate-900 disabled:pointer-events-none disabled:opacity-0"
            >
              Back
            </button>
            <button
              type="button"
              onClick={next}
              className="min-h-12 flex-1 rounded-2xl bg-blue-600 px-5 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 active:scale-[0.98]"
            >
              {active === slides.length - 1 ? "Get started" : "Next"}
            </button>
          </div>
          <p className="mt-4 text-center text-[11px] font-medium text-slate-400">Swipe to explore Smart Barangay</p>
        </footer>
      </div>
    </main>
  );
}
