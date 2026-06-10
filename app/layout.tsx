import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const uiLanguage: Language = "en";

  return (
    <html lang={uiLanguage} className={`${geist.variable} h-full`}>
      <body className="h-full flex antialiased bg-zinc-50 font-(family-name:--font-geist-sans)">
        <AppShell uiLanguage={uiLanguage}>{children}</AppShell>
      </body>
    </html>
  );
}
