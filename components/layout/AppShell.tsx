"use client";

import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Settings } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { UiLanguageProvider } from "@/components/providers/UiLanguageProvider";
import type { Language } from "@/lib/constants";

export function AppShell({
  uiLanguage,
  children,
}: {
  uiLanguage: Language;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  if (pathname === "/login") {
    return (
      <UiLanguageProvider language={uiLanguage}>
        <div className="w-full">{children}</div>
      </UiLanguageProvider>
    );
  }

  return (
    <UiLanguageProvider language={uiLanguage}>
      <div className="flex h-full w-full bg-background">
        <Sidebar />
        <main className="flex-1 min-w-0 flex flex-col overflow-auto bg-[linear-gradient(180deg,rgba(255,255,255,0.82)_0%,rgba(247,247,250,0.92)_48%,rgba(244,244,247,1)_100%)] pb-16 md:pb-0">
          {/* Mobile top bar (logo + Settings) */}
          <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center justify-between border-b border-zinc-200/80 bg-white/90 px-4 shadow-control backdrop-blur md:hidden">
            <Link href="/prospects" className="flex items-center">
              <Image src="/logo.png" alt="CB Web Artisan" width={140} height={60} priority unoptimized className="h-5 w-auto" />
            </Link>
            <Link
              href="/settings"
              aria-label="Settings"
              className="flex h-9 w-9 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800"
            >
              <Settings className="h-5 w-5" />
            </Link>
          </header>
          {children}
        </main>
        <div className="md:hidden">
          <BottomNav />
        </div>
      </div>
    </UiLanguageProvider>
  );
}
