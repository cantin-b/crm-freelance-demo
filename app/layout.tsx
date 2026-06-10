import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";
import { prisma } from "@/lib/prisma";
import type { Language } from "@/lib/constants";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Freelance CRM",
  description: "Prospecting CRM for freelance web developers",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await prisma.settings.findFirst({
    where: { id: 1 },
    select: { ui_language: true },
  });
  const uiLanguage: Language = settings?.ui_language === "fr" ? "fr" : "en";

  return (
    <html lang={uiLanguage} className={`${geist.variable} h-full`}>
      <body className="h-full flex antialiased bg-zinc-50 font-(family-name:--font-geist-sans)">
        <AppShell uiLanguage={uiLanguage}>{children}</AppShell>
      </body>
    </html>
  );
}
