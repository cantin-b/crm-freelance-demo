"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarClock,
  CalendarRange,
  CheckCircle2,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Mail,
  MoreHorizontal,
  PhoneCall,
  Settings,
  Users,
} from "lucide-react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useT } from "@/components/providers/UiLanguageProvider";

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const t = useT();

  const primaryItems = [
    { href: "/dashboard",    label: t.nav_mobile_dashboard,       icon: LayoutDashboard },
    { href: "/prospects",    label: t.page_prospects,             icon: Users },
    { href: "/calendar",     label: t.nav_mobile_calendar,        icon: CalendarRange },
    { href: "/clients",      label: t.page_clients,               icon: CheckCircle2 },
  ];

  const secondaryItems = [
    { href: "/callbacks",    label: t.page_callbacks,             icon: PhoneCall },
    { href: "/appointments", label: t.page_appointments,          icon: CalendarClock },
    { href: "/lists",        label: t.page_lists,                 icon: FolderOpen },
    { href: "/templates",    label: t.page_templates,             icon: Mail },
    { href: "/settings",     label: t.page_settings,              icon: Settings },
  ];
  const moreActive = secondaryItems.some(item => pathname === item.href || pathname.startsWith(item.href + "/"));

  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200/80 bg-white/95 shadow-[0_-10px_30px_-24px_rgb(24_24_27/0.45)] backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex h-16 items-stretch">
        {primaryItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 transition-colors",
                active ? "text-brand-navy" : "text-zinc-400 hover:text-zinc-600"
              )}
            >
              <Icon className={cn("h-5 w-5", active && "text-brand-navy")} />
              <span className="text-[9px] font-medium leading-none">{label}</span>
            </Link>
          );
        })}

        <Sheet>
          <SheetTrigger asChild>
            <button
              type="button"
              aria-label={t.nav_mobile_more}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 transition-colors",
                moreActive ? "text-brand-navy" : "text-zinc-400 hover:text-zinc-600"
              )}
            >
              <MoreHorizontal className={cn("h-5 w-5", moreActive && "text-brand-navy")} />
              <span className="text-[9px] font-medium leading-none">{t.nav_mobile_more}</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[82vh] rounded-t-2xl p-0">
            <SheetHeader className="border-b border-zinc-100 px-5 py-4 pr-12 text-left">
              <SheetTitle>{t.mobile_menu_title}</SheetTitle>
              <SheetDescription className="sr-only">
                {t.mobile_menu_description}
              </SheetDescription>
            </SheetHeader>
            <div className="grid gap-1 px-3 py-3">
              {secondaryItems.map(({ href, label, icon: Icon }) => {
                const active = pathname === href || pathname.startsWith(href + "/");
                return (
                  <SheetClose asChild key={href}>
                    <Link
                      href={href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors",
                        active
                          ? "bg-brand-navy/10 text-brand-navy"
                          : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950"
                      )}
                    >
                      <Icon className={cn("h-4.5 w-4.5 shrink-0", active ? "text-brand-navy" : "text-zinc-400")} />
                      <span>{label}</span>
                    </Link>
                  </SheetClose>
                );
              })}
            </div>
            <div className="border-t border-zinc-100 px-3 py-3">
              <SheetClose asChild>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-950"
                >
                  <LogOut className="h-4.5 w-4.5 shrink-0 text-zinc-400" />
                  <span>{t.nav_sign_out}</span>
                </button>
              </SheetClose>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
