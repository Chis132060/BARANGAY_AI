"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";

const INSTALL_DISMISSED_KEY = "smart-barangay:pwa-install-dismissed-v1";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function PreAuthWelcome({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [showInstallStep, setShowInstallStep] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const isInstalled = window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in window.navigator && Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone));
    const wasDismissed = window.localStorage.getItem(INSTALL_DISMISSED_KEY) === "true";

    if (!isInstalled && !wasDismissed) setShowInstallStep(true);
    setReady(true);

    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const handleInstalled = () => {
      window.localStorage.setItem(INSTALL_DISMISSED_KEY, "true");
      setShowInstallStep(false);
    };
    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  function continueToApp() {
    window.localStorage.setItem(INSTALL_DISMISSED_KEY, "true");
    setShowInstallStep(false);
  }

  async function installApp() {
    if (!installPrompt) return;
    setInstalling(true);
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      setInstallPrompt(null);
      if (choice.outcome === "accepted") continueToApp();
    } catch {
      setInstallPrompt(null);
    } finally {
      setInstalling(false);
    }
  }

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white">
        <img
          src="/logo.png"
          alt="Smart Barangay"
          className="h-12 w-auto animate-pulse object-contain opacity-80"
        />
      </main>
    );
  }

  if (!showInstallStep) return <>{children}</>;

  const supportsNativeInstall = installPrompt !== null;
  const isAppleMobile = /iphone|ipad|ipod/i.test(window.navigator.userAgent);

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-6 text-slate-950 sm:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md flex-col">
        <header className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Smart Barangay" className="h-9 w-auto object-contain" />
          <span className="text-sm font-extrabold tracking-tight">Smart Barangay</span>
        </header>
        <section className="flex flex-1 flex-col items-center justify-center py-8 text-center">
          <div className="mb-7 flex h-24 w-24 items-center justify-center rounded-[1.75rem] bg-blue-600 shadow-lg shadow-blue-200">
            <img src="/icons/pwa-192x192.png" alt="" className="h-16 w-16 rounded-2xl" />
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Ready when you are</p>
          <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight">Install Smart Barangay</h1>
          <p className="mt-4 max-w-sm text-sm leading-7 text-slate-500">
            Add the app to your home screen for quick access. Previously opened pages and app resources can be available when your connection drops.
          </p>
          {!supportsNativeInstall && (
            <div className="mt-6 rounded-2xl bg-white p-4 text-left text-sm leading-6 text-slate-600 ring-1 ring-slate-200">
              <p className="font-bold text-slate-900">{isAppleMobile ? "On iPhone or iPad" : "Install from your browser"}</p>
              <p className="mt-1">
                {isAppleMobile
                  ? "Tap Share, then choose Add to Home Screen."
                  : "Open your browser menu and choose Install app or Add to Home Screen if available."}
              </p>
            </div>
          )}
        </section>
        <footer className="space-y-3 pb-2">
          {supportsNativeInstall && (
            <button
              type="button"
              onClick={installApp}
              disabled={installing}
              className="min-h-12 w-full rounded-2xl bg-blue-600 px-5 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:opacity-60"
            >
              {installing ? "Opening install prompt…" : "Install app"}
            </button>
          )}
          <button
            type="button"
            onClick={continueToApp}
            className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
          >
            {supportsNativeInstall ? "Not now — continue" : "Continue to Smart Barangay"}
          </button>
        </footer>
      </div>
    </main>
  );
}
