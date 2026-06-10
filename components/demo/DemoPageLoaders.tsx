"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppointmentsView } from "@/components/appointments/AppointmentsView";
import { CallbacksView } from "@/components/callbacks/CallbacksView";
import { ListsView } from "@/components/lists/ListsView";
import { CsvImporter } from "@/components/import/CsvImporter";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { TemplateEditorView } from "@/components/templates/TemplateEditorView";
import { TemplatesList } from "@/components/templates/TemplatesList";
import { useT } from "@/components/providers/UiLanguageProvider";
import { DEMO_STATE_UPDATED_EVENT } from "@/components/providers/DemoDataProvider";
import type { AppointmentWithProspect, EmailTemplate, List, Prospect, Settings } from "@/types";
import type { Language } from "@/lib/constants";

type SerializedProspect = Omit<Prospect, "callback_at" | "created_at" | "updated_at"> & {
  callback_at: string | null;
  created_at: string;
  updated_at: string;
};

type SerializedTemplate = Omit<EmailTemplate, "created_at" | "updated_at"> & {
  created_at: string;
  updated_at: string;
};

type ListWithCount = Omit<List, "created_at"> & {
  created_at: string;
  prospectCount: number;
};

function useDemoLoader<T>(load: () => Promise<T>, fallback: T) {
  const [data, setData] = useState<T>(fallback);
  const [loading, setLoading] = useState(true);
  const loadRef = useRef(load);

  useEffect(() => {
    loadRef.current = load;
  }, [load]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      try {
        const nextData = await loadRef.current();
        if (!cancelled) setData(nextData);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    window.addEventListener(DEMO_STATE_UPDATED_EVENT, run);
    return () => {
      cancelled = true;
      window.removeEventListener(DEMO_STATE_UPDATED_EVENT, run);
    };
  }, []);

  return { data, loading };
}

function PageLoading({ title }: { title: string }) {
  return (
    <div className="p-6 md:p-8">
      <PageHeader title={title} description=" " />
      <div className="mt-8 h-32 rounded-xl border border-zinc-200/90 bg-white/70 shadow-surface" />
    </div>
  );
}

function makeDataKey(items: Array<{ id: number; updated_at?: string; status?: string; is_visible?: boolean; prospectCount?: number }>) {
  return items.map(item => [
    item.id,
    item.updated_at ?? "",
    item.status ?? "",
    item.is_visible ?? "",
    item.prospectCount ?? "",
  ].join(":")).join("|");
}

export function CallbacksPageClient() {
  const t = useT();
  const { data, loading } = useDemoLoader(async () => {
    const res = await fetch("/api/prospects?status=callback&limit=200");
    const json = await res.json() as { prospects: SerializedProspect[] };
    const all = json.prospects ?? [];
    return {
      precise: all
        .filter(prospect => prospect.callback_at !== null)
        .sort((a, b) => new Date(a.callback_at!).getTime() - new Date(b.callback_at!).getTime()),
      vague: all.filter(prospect => prospect.callback_at === null),
    };
  }, { precise: [] as SerializedProspect[], vague: [] as SerializedProspect[] });

  if (loading) return <PageLoading title={t.callbacks_title} />;
  return <CallbacksView precise={data.precise} vague={data.vague} />;
}

export function AppointmentsPageClient() {
  const t = useT();
  const { data, loading } = useDemoLoader(async () => {
    const res = await fetch("/api/appointments");
    return await res.json() as AppointmentWithProspect[];
  }, [] as AppointmentWithProspect[]);

  if (loading) return <PageLoading title={t.appointments_title} />;
  return <AppointmentsView key={makeDataKey(data)} appointments={data} />;
}

export function ListsPageClient() {
  const t = useT();
  const { data, loading } = useDemoLoader(async () => {
    const res = await fetch("/api/lists");
    return await res.json() as ListWithCount[];
  }, [] as ListWithCount[]);

  return (
    <div className="p-6 md:p-8 pb-20 md:pb-8">
      <div className="mx-auto max-w-5xl">
        <PageHeader
          className="mb-6"
          title={t.page_lists}
          description={t.lists_demo_description}
        />
        {loading ? <PageLoading title={t.page_lists} /> : <ListsView key={makeDataKey(data)} lists={data} />}
      </div>
    </div>
  );
}

export function TemplatesPageClient() {
  const t = useT();
  const { data, loading } = useDemoLoader(async () => {
    const [templatesRes, settingsRes] = await Promise.all([
      fetch("/api/templates"),
      fetch("/api/settings"),
    ]);
    const templates = await templatesRes.json() as SerializedTemplate[];
    const settings = await settingsRes.json() as Settings;
    return {
      templates,
      defaultLanguage: settings.content_language === "en" ? "en" as Language : "fr" as Language,
    };
  }, { templates: [] as SerializedTemplate[], defaultLanguage: "fr" as Language });

  return (
    <div className="p-6 md:p-8">
      <div className="mx-auto max-w-5xl">
        <PageHeader
          className="mb-6"
          title={t.page_templates}
          description={t.templates_page_description}
          actions={
            <Button asChild size="sm" className="gap-1.5">
              <Link href="/templates/new">
                <Plus className="h-4 w-4" />
                {t.templates_create}
              </Link>
            </Button>
          }
        />

        {loading ? (
          <div className="h-40 rounded-xl border border-zinc-200/90 bg-white/70 shadow-surface" />
        ) : (
          <TemplatesList
            key={`${data.defaultLanguage}:${makeDataKey(data.templates)}`}
            templates={data.templates}
            defaultLanguage={data.defaultLanguage}
          />
        )}
      </div>
    </div>
  );
}

export function TemplateEditorPageClient({ id }: { id: string }) {
  const t = useT();
  const [loading, setLoading] = useState(true);
  const [template, setTemplate] = useState<SerializedTemplate | null>(null);
  const [defaultLanguage, setDefaultLanguage] = useState<Language>("fr");
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setNotFound(false);
      const settingsRes = await fetch("/api/settings");
      const settings = await settingsRes.json() as Settings;
      if (!cancelled) setDefaultLanguage(settings.content_language === "en" ? "en" : "fr");

      if (id === "new") {
        if (!cancelled) {
          setTemplate(null);
          setLoading(false);
        }
        return;
      }

      const res = await fetch(`/api/templates/${id}`);
      if (!res.ok) {
        if (!cancelled) {
          setNotFound(true);
          setLoading(false);
        }
        return;
      }
      const nextTemplate = await res.json() as SerializedTemplate;
      if (!cancelled) {
        setTemplate(nextTemplate);
        setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) return <PageLoading title={t.page_templates} />;
  if (notFound) {
    return (
      <div className="p-6 md:p-8">
        <div className="mx-auto max-w-3xl rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500 shadow-surface">
          {t.template_not_found}
        </div>
      </div>
    );
  }
  return <TemplateEditorView template={template} defaultLanguage={defaultLanguage} />;
}

export function SettingsPageClient() {
  const t = useT();
  const { data, loading } = useDemoLoader(async () => {
    const res = await fetch("/api/settings");
    return await res.json() as Settings;
  }, null as Settings | null);

  return (
    <div className="p-6 md:p-8">
      <div className="mx-auto max-w-3xl">
        <PageHeader
          className="mb-6"
          title={t.settings_page_title}
          description={t.settings_demo_description}
        />
        {loading || !data ? (
          <div className="h-40 rounded-xl border border-zinc-200/90 bg-white/70 shadow-surface" />
        ) : (
          <SettingsForm initialSettings={data} />
        )}
      </div>
    </div>
  );
}

export function ImportPageClient() {
  const t = useT();

  return (
    <div className="p-6 md:p-8">
      <div className="mx-auto max-w-5xl">
        <PageHeader
          className="mb-6"
          title={t.import_title}
          description={t.import_description}
        />
        <CsvImporter />
      </div>
    </div>
  );
}
