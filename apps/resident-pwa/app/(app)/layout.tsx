import { TopBar } from "@/components/layout/TopBar";
import { BottomNav } from "@/components/layout/BottomNav";

/**
 * (app) route group layout — wraps all authenticated resident views.
 * Renders a mobile-first shell: fixed TopBar + scrollable content + fixed BottomNav.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex flex-col h-full max-w-md mx-auto bg-white shadow-xl min-h-screen">
      <TopBar />
      {/* Scrollable content area — padded to clear the fixed BottomNav */}
      <main className="flex-1 overflow-y-auto" style={{ paddingBottom: "var(--bottom-nav-height)" }}>
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
