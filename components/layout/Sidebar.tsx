"use client";

import { useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Users, PhoneCall, CheckCircle2, FolderOpen, Mail, Settings,
  ChevronLeft, ChevronRight, CalendarClock, CalendarRange, LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/components/providers/UiLanguageProvider";

const STORAGE_KEY = "sidebar-collapsed";

// useSyncExternalStore bindings — defined at module level so references are stable
function subscribeToStorage(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}
function getCollapsedSnapshot() {
  try { return localStorage.getItem(STORAGE_KEY) === "true"; } catch { return false; }
}
function getServerSnapshot() { return false; }

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const t = useT();

  const NAV_ITEMS = [
    { href: "/prospects",    label: t.page_prospects,    icon: Users },
    { href: "/callbacks",    label: t.page_callbacks,    icon: PhoneCall },
    { href: "/appointments", label: t.page_appointments, icon: CalendarClock },
    { href: "/calendar",     label: t.page_calendar,     icon: CalendarRange },
    { href: "/clients",      label: t.page_clients,      icon: CheckCircle2 },
    { href: "/lists",        label: t.page_lists,        icon: FolderOpen },
    { href: "/templates",    label: t.page_templates,    icon: Mail },
    { href: "/settings",     label: t.page_settings,     icon: Settings },
  ];

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  // useSyncExternalStore is the React-sanctioned way to read external stores.
  // It handles SSR (via getServerSnapshot), hydration, and cross-tab sync.
  const collapsed = useSyncExternalStore(
    subscribeToStorage,
    getCollapsedSnapshot,
    getServerSnapshot,
  );

  function toggle() {
    const next = !collapsed;
    try {
      localStorage.setItem(STORAGE_KEY, String(next));
      // Dispatch a storage event so the useSyncExternalStore subscription fires
      // and triggers a re-render in this tab (storage events are cross-tab only by default)
      window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
    } catch { /* localStorage may be unavailable */ }
  }

  return (
    <aside
      className={cn(
        "hidden md:flex shrink-0 flex-col min-h-screen border-r border-white/10 bg-brand-navy shadow-2xl shadow-zinc-950/10 transition-all duration-200",
        collapsed ? "w-16" : "w-56"
      )}
    >
      {/* Brand */}
      <div className={cn(
        "flex items-center border-b border-white/15 transition-all duration-200",
        collapsed ? "justify-center px-0 py-5" : "px-4 pt-6 pb-5"
      )}>
        {collapsed ? (
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white/15 text-[10px] font-bold text-white shadow-control ring-1 ring-white/10 select-none">
            CB
          </span>
        ) : (
          <Image
            src="/logo-white.png"
            alt="CB Web Artisan"
            width={140}
            height={60}
            priority
            unoptimized
            className="h-6 w-auto"
          />
        )}
      </div>

      {/* Navigation */}
      <nav className="px-2 py-4">
        {!collapsed && (
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
            {t.nav_menu}
          </p>
        )}
        <div className="space-y-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                title={collapsed ? label : undefined}
                className={cn(
                  "group relative flex items-center rounded-lg py-2 text-sm transition-[background-color,color,box-shadow]",
                  collapsed ? "justify-center px-0" : "gap-3 px-3",
                  active
                    ? "bg-white/15 text-white font-medium shadow-control ring-1 ring-white/10"
                    : "text-white/60 hover:bg-white/10 hover:text-white"
                )}
              >
                {/* Active accent bar (brand red) */}
                <span
                  className={cn(
                    "absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-brand-red transition-opacity",
                    active ? "opacity-100" : "opacity-0"
                  )}
                />
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    active ? "text-white" : "text-white/50 group-hover:text-white/80"
                  )}
                />
                {!collapsed && label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Flexible spacer */}
      <div className="flex-1" />

      {/* Actions: Sign out + Collapse */}
      <div className={cn("py-2", collapsed ? "px-2" : "px-2")}>
        <button
          onClick={handleLogout}
          title={collapsed ? t.nav_sign_out : undefined}
          className={cn(
            "flex items-center rounded-lg py-2 text-sm text-white/60 transition-colors hover:bg-white/10 hover:text-white",
            collapsed ? "w-full justify-center px-0" : "w-full gap-3 px-3"
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>{t.nav_sign_out}</span>}
        </button>

        <button
          onClick={toggle}
          title={collapsed ? t.nav_expand_sidebar : t.nav_collapse_sidebar}
          className={cn(
            "mt-0.5 flex items-center rounded-lg py-2 text-sm text-white/60 transition-colors hover:bg-white/10 hover:text-white",
            collapsed ? "w-full justify-center px-0" : "w-full gap-3 px-3"
          )}
        >
          {collapsed
            ? <ChevronRight className="h-4 w-4 shrink-0" />
            : <><ChevronLeft className="h-4 w-4 shrink-0" /><span>{t.nav_collapse}</span></>}
        </button>
      </div>

      {/* Footer: brand dots */}
      <div className={cn(
        "border-t border-white/15 py-3",
        collapsed ? "flex justify-center px-2" : "px-5"
      )}>
        <div className="flex items-center gap-2 text-[11px] font-medium text-white/45">
          <span className="inline-flex gap-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-white/70" />
            <span className="h-1.5 w-1.5 rounded-full bg-brand-red" />
          </span>
          {!collapsed && <span>CB Web Artisan</span>}
        </div>
      </div>
    </aside>
  );
}
