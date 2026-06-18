"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, PhoneCall, CheckCircle2, Mail, CalendarDays, CalendarRange, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/components/providers/UiLanguageProvider";

export function BottomNav() {
  const pathname = usePathname();
  const t = useT();

  const NAV_ITEMS = [
    { href: "/dashboard",    label: t.nav_mobile_dashboard,       icon: LayoutDashboard },
    { href: "/prospects",    label: t.page_prospects,             icon: Users },
    { href: "/callbacks",    label: t.page_callbacks,             icon: PhoneCall },
    { href: "/appointments", label: t.nav_mobile_appointments,    icon: CalendarDays },
    { href: "/calendar",     label: t.nav_mobile_calendar,        icon: CalendarRange },
    { href: "/clients",      label: t.page_clients,               icon: CheckCircle2 },
    { href: "/templates",    label: t.page_templates,             icon: Mail },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200/80 bg-white/95 shadow-[0_-10px_30px_-24px_rgb(24_24_27/0.45)] backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex h-16 items-stretch">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
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
      </div>
    </nav>
  );
}
