"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { ProspectDetail } from "./ProspectDetail";
import { useT } from "@/components/providers/UiLanguageProvider";
import { isHighValueStatus } from "@/lib/constants";
import type { Prospect } from "@/types";

type ProspectData = Omit<Prospect, "callback_at" | "created_at" | "updated_at"> & {
  callback_at: string | null;
  created_at: string;
  updated_at: string;
};

type DetailSource = "prospects" | "clients";

export function ProspectDetailLoader({ id, source = "prospects" }: { id: number; source?: DetailSource }) {
  const t = useT();
  const router = useRouter();
  const [prospect, setProspect] = useState<ProspectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const backHref = source === "clients" ? "/clients" : "/prospects";
  const backLabel = source === "clients" ? t.page_clients : t.back_to_prospects;

  useEffect(() => {
    let cancelled = false;

    async function loadProspect() {
      setLoading(true);
      setNotFound(false);
      try {
        const res = await fetch(`/api/prospects/${id}`);
        if (!res.ok) {
          if (!cancelled) {
            setProspect(null);
            setNotFound(true);
          }
          return;
        }
        const data = await res.json() as ProspectData;
        if (source === "clients" && !isHighValueStatus(data.status)) {
          if (!cancelled) router.replace(`/prospects/${id}`);
          return;
        }
        if (!cancelled) setProspect(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadProspect();
    return () => { cancelled = true; };
  }, [id, router, source]);

  if (loading) {
    return (
      <div className="flex min-h-96 items-center justify-center text-sm text-zinc-400">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        {t.loading_appointments}
      </div>
    );
  }

  if (notFound || !prospect) {
    return (
      <div className="p-6 md:p-8">
        <div className="mx-auto max-w-3xl rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500 shadow-surface">
          <p>{t.no_prospects_filter}</p>
          <Link href={backHref} className="mt-3 inline-flex text-brand-navy underline-offset-2 hover:underline">
            {backLabel}
          </Link>
        </div>
      </div>
    );
  }

  return <ProspectDetail key={`${source}-${prospect.id}`} prospect={prospect} source={source} />;
}
