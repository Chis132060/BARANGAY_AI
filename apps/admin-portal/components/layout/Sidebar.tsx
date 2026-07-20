"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight, ShieldCheck, Sparkles, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "../auth-provider";
import { navigationConfig, NavigationModule } from "../../lib/navigation";

export function Sidebar() {
  const pathname = usePathname();
  const { role } = useAuth();
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  const filteredModules = navigationConfig.filter((module) => {
    if (module.allowedRoles && (!role || !module.allowedRoles.includes(role))) {
      return false;
    }
    return true;
  });

  useEffect(() => {
    filteredModules.forEach((module) => {
      if (module.children) {
        const hasActiveChild = module.children.some((child) => pathname.startsWith(child.href));
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
    <aside className="w-64 shrink-0 border-r bg-card/95 flex flex-col h-full z-40 transition-all select-none">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-6 h-16 border-b shrink-0">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="font-extrabold text-sm tracking-tight text-foreground leading-none">Smart Barangay</span>
          <span className="text-[10px] font-bold text-primary tracking-wider uppercase mt-1">Admin Portal</span>
        </div>
      </div>

      {/* Navigation Tree */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1.5 scrollbar-thin">
        {filteredModules.map((module) => {
          const hasChildren = !!module.children && module.children.length > 0;
          const isOpen = !!openMenus[module.title];

          const allowedChildren = module.children?.filter((child) => {
            if (child.allowedRoles && (!role || !child.allowedRoles.includes(role))) {
              return false;
            }
            return true;
          }) || [];

          if (hasChildren && allowedChildren.length === 0) {
            return null;
          }

          if (hasChildren) {
            const hasActiveChild = allowedChildren.some((child) => pathname === child.href);

            return (
              <div key={module.title} className="space-y-1">
                <button
                  onClick={() => toggleMenu(module.title)}
                  className={cn(
                    "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all group",
                    hasActiveChild
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <module.icon className={cn("h-4 w-4 shrink-0 transition-transform group-hover:scale-110", hasActiveChild ? "text-primary" : "text-muted-foreground")} />
                    <span>{module.title}</span>
                  </div>
                  {isOpen ? (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/70" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/70" />
                  )}
                </button>

                {isOpen && (
                  <div className="pl-8 pr-2 py-1 space-y-1 border-l-2 border-primary/20 ml-5 my-1 animate-in fade-in duration-200">
                    {allowedChildren.map((child) => {
                      const isActive = pathname === child.href;
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            "block px-3 py-2 rounded-lg text-[11px] font-semibold transition-all relative",
                            isActive
                              ? "text-primary bg-primary/15 font-bold shadow-2xs"
                              : "text-muted-foreground hover:bg-accent hover:text-foreground"
                          )}
                        >
                          {child.title}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          const isActive = pathname === module.href;
          return (
            <Link
              key={module.title}
              href={module.href || "#"}
              className={cn(
                "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <module.icon className="h-4 w-4 shrink-0" />
              <span>{module.title}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer System Status */}
      <div className="p-3 m-3 rounded-xl bg-muted/40 border text-xs text-muted-foreground space-y-2">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 uppercase">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> System Online
          </span>
          <span className="text-[10px] font-mono text-muted-foreground">v0.2.0</span>
        </div>
      </div>
    </aside>
  );
}
