"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "../auth-provider";
import { navigationConfig } from "../../lib/navigation";
import { createClient } from "@/lib/supabase/client";

export function Sidebar() {
  const pathname = usePathname();
  const { role, permissions, hasPermission } = useAuth();
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
  const [queueCounts, setQueueCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;
    const refreshCounts = async () => {
      const [verifications, requests] = await Promise.all([
        supabase.from("residents").select("*", { count: "exact", head: true }).eq("verification_status", "Pending"),
        supabase.from("document_requests").select("*", { count: "exact", head: true }).eq("status", "Pending"),
      ]);
      if (!mounted) return;
      setQueueCounts((previous) => ({
        ...previous,
        ...(verifications.error ? {} : { "/residents/verification": verifications.count ?? 0 }),
        ...(requests.error ? {} : { "/documents/requests": requests.count ?? 0 }),
      }));
    };
    void refreshCounts();
    const channel = supabase.channel("admin-sidebar-queue-counts")
      .on("postgres_changes", { event: "*", schema: "public", table: "residents" }, () => { void refreshCounts(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "document_requests" }, () => { void refreshCounts(); })
      .subscribe();
    const onFocus = () => { void refreshCounts(); };
    window.addEventListener("focus", onFocus);
    return () => {
      mounted = false;
      window.removeEventListener("focus", onFocus);
      void supabase.removeChannel(channel);
    };
  }, []);

  // Filter modules based on dynamic permissions from DB
  const filteredModules = navigationConfig.filter((module) => {
    if (!module.module || role === "Super Admin") return true;
    return hasPermission(module.module, module.requiredAction || "canView");
  });

  useEffect(() => {
    filteredModules.forEach((module) => {
      if (module.children) {
        const hasActiveChild = module.children.some((child) => (pathname === child.href || pathname.startsWith(child.href + "/")));
        if (hasActiveChild) {
          setOpenMenus((prev) => ({ ...prev, [module.title]: true }));
        }
      }
    });
  }, [pathname]);

  const toggleMenu = (title: string) => {
    setOpenMenus((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <aside className="w-[248px] shrink-0 border-r border-slate-200 bg-white flex flex-col h-full z-40 transition-all select-none">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-5 h-[76px] border-b border-slate-200 shrink-0">
        <img src="/logo.png" alt="Barangay Tandang Sora seal" className="h-11 w-11 rounded-full object-contain shrink-0" />
        <div className="flex flex-col">
          <span className="font-bold text-[13px] tracking-tight text-slate-900 leading-tight">Tandang Sora</span>
          <span className="text-[10px] font-bold text-blue-700 tracking-wider uppercase mt-1">Admin Portal</span>
        </div>
      </div>

      {/* Navigation Tree */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1.5 sidebar-scroll">
        {filteredModules.map((module) => {
          const hasChildren = !!module.children && module.children.length > 0;
          const isOpen = !!openMenus[module.title];

          // Filter children based on their own module permissions
          const allowedChildren = module.children?.filter((child) => {
            if (!child.module || role === "Super Admin") return true;
            return hasPermission(child.module, child.requiredAction || "canView");
          }) || [];

          if (hasChildren && allowedChildren.length === 0) {
            return null;
          }

          if (hasChildren) {
            const hasActiveChild = allowedChildren.some((child) => pathname === child.href || pathname.startsWith(child.href + "/"));

            return (
              <div key={module.title} className="space-y-1">
                <button
                  onClick={() => toggleMenu(module.title)}
                  className={cn(
                    "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all group relative",
                    hasActiveChild
                      ? "text-primary bg-primary/10 border border-primary/15"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  {hasActiveChild && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-full" />
                  )}
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "h-6 w-6 rounded-lg flex items-center justify-center shrink-0 transition-all",
                      hasActiveChild ? "bg-primary/15" : "bg-transparent group-hover:bg-primary/10"
                    )}>
                      <module.icon className={cn("h-3.5 w-3.5 shrink-0", hasActiveChild ? "text-primary" : "text-muted-foreground")} />
                    </span>
                    <span>{module.title}</span>
                  </div>
                  {isOpen ? (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/70" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/70" />
                  )}
                </button>

                {isOpen && (
                  <div className="pl-4 pr-2 py-1 space-y-0.5 ml-4 my-1 border-l-2 border-primary/15 animate-in fade-in duration-200">
                    {allowedChildren.map((child) => {
                      const hasSiblingWithLongerPath = allowedChildren.some(
                        (sibling) => sibling.href !== child.href && sibling.href.startsWith(child.href + "/")
                      );
                      const isActive = pathname === child.href || (!hasSiblingWithLongerPath && pathname.startsWith(child.href + "/"));
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-semibold transition-all relative",
                            isActive
                              ? "text-primary bg-primary/15 font-bold shadow-2xs"
                              : "text-muted-foreground hover:bg-accent hover:text-foreground"
                          )}
                        >
                          {isActive && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-primary rounded-full" />
                          )}
                          <span className="pl-1 flex-1">{child.title}</span>
                          {(queueCounts[child.href] ?? 0) > 0 && (
                            <span className="ml-auto min-w-5 h-5 px-1.5 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center tabular-nums" aria-label={`${queueCounts[child.href]} pending`}>
                              {queueCounts[child.href] > 99 ? "99+" : queueCounts[child.href]}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          const isActive = pathname === module.href || (module.href ? pathname.startsWith(module.href + "/") : false);
          return (
            <Link
              key={module.title}
              href={module.href || "#"}
              className={cn(
                "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 relative overflow-hidden group",
                isActive
                  ? "bg-gradient-to-r from-primary to-blue-500 text-primary-foreground shadow-lg shadow-primary/30"
                  : "text-muted-foreground hover:bg-primary/8 hover:text-foreground"
              )}
            >
              {/* Active shimmer sweep */}
              {isActive && (
                <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 pointer-events-none" />
              )}
              {/* Icon container */}
              <span className={cn(
                "h-6 w-6 rounded-lg flex items-center justify-center shrink-0 transition-all",
                isActive
                  ? "bg-white/20"
                  : "bg-transparent group-hover:bg-primary/10"
              )}>
                <module.icon className="h-3.5 w-3.5" />
              </span>
              <span>{module.title}</span>
            </Link>
          );
        })}
      </nav>


    </aside>
  );
}
