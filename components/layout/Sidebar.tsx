"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight } from "lucide-react";
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
    <aside className="w-[248px] shrink-0 border-r border-slate-200 bg-white flex flex-col h-full z-40 transition-all select-none">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-5 h-[76px] border-b border-slate-200 shrink-0">
        <img src="/logo.png" alt="Barangay Tandang Sora seal" className="h-11 w-11 rounded-full object-contain shrink-0" />
        <div className="flex flex-col">
          <span className="font-bold text-[13px] tracking-tight text-slate-900 leading-tight">Barangay Tandang Sora</span>
          <span className="text-[10px] font-semibold text-blue-700 tracking-[0.14em] uppercase mt-1">Admin Portal</span>
        </div>
      </div>

      {/* Navigation Tree */}
      <nav className="flex-1 overflow-y-auto py-5 px-3 space-y-1 scrollbar-thin">
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
                    "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all group",
                    hasActiveChild
                      ? "text-blue-700 bg-blue-50"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <module.icon className={cn("h-4 w-4 shrink-0 transition-transform group-hover:scale-110", hasActiveChild ? "text-blue-700" : "text-slate-500")} />
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
                            "block px-3 py-2 rounded-md text-[11px] font-medium transition-all relative",
                            isActive
                              ? "text-blue-700 bg-blue-50 font-semibold"
                              : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
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
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all",
                isActive
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-600/20"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <module.icon className="h-4 w-4 shrink-0" />
              <span>{module.title}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer System Status */}
      <div className="p-3 m-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500 space-y-2">
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
