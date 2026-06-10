"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FilePen, Trash2, Clock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  LANGUAGE_OPTIONS,
  UNCATEGORIZED_LABEL,
  getTemplateCategories,
  type Language,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useT } from "@/components/providers/UiLanguageProvider";
import type { EmailTemplate } from "@/types";

type TemplateItem = Omit<EmailTemplate, "created_at" | "updated_at"> & {
  created_at: string;
  updated_at: string;
};

interface SavedTemplatesState {
  viewLang: Language;
  updatedAt: number;
}

const TEMPLATES_STATE_KEY = "crm_templates_state";

function sanitizeLanguage(value: unknown, fallback: Language): Language {
  return value === "en" || value === "fr" ? value : fallback;
}

function readTemplatesState(defaultLanguage: Language): SavedTemplatesState {
  const fallback = { viewLang: defaultLanguage, updatedAt: Date.now() };
  if (typeof window === "undefined") return fallback;

  try {
    const saved = JSON.parse(localStorage.getItem(TEMPLATES_STATE_KEY) ?? "null") as Partial<SavedTemplatesState> | null;
    if (saved) {
      return {
        viewLang: sanitizeLanguage(saved.viewLang, defaultLanguage),
        updatedAt: typeof saved.updatedAt === "number" && Number.isFinite(saved.updatedAt) ? saved.updatedAt : Date.now(),
      };
    }
  } catch {
    // Ignore malformed saved state.
  }

  return fallback;
}

function writeTemplatesState(viewLang: Language) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TEMPLATES_STATE_KEY, JSON.stringify({
    viewLang,
    updatedAt: Date.now(),
  }));
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  }).format(new Date(iso));
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function TemplateCard({
  tpl,
  deleting,
  onDelete,
}: {
  tpl: TemplateItem;
  deleting: number | null;
  onDelete: (id: number, name: string) => void;
}) {
  const router = useRouter();
  const t = useT();

  function open() {
    router.push(`/templates/${tpl.id}`);
  }

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      }}
      className="group flex cursor-pointer items-start gap-4 rounded-xl border border-zinc-200/90 bg-white/95 px-4 py-3 shadow-surface transition-[background-color,border-color,box-shadow] hover:border-zinc-300 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-zinc-900">{tpl.name}</p>
        <p className="mt-0.5 truncate text-xs text-zinc-500">
          <span className="font-medium">{t.templates_subject_prefix}</span> {tpl.subject}
        </p>
        {tpl.body && (
          <p className="mt-0.5 line-clamp-1 text-xs text-zinc-400">
            {stripHtml(tpl.body)}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <span className="flex items-center gap-1 text-xs text-zinc-400">
          <Clock className="h-3 w-3" />
          {formatDate(tpl.updated_at)}
        </span>
        <div className="flex gap-1">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-zinc-400 opacity-0 transition-opacity hover:text-zinc-700 group-hover:opacity-100"
            onClick={(e) => e.stopPropagation()}
          >
            <Link href={`/templates/${tpl.id}`} title="Edit template">
              <FilePen className="h-3.5 w-3.5" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-red-500 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-700 group-hover:opacity-100"
            disabled={deleting === tpl.id}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(tpl.id, tpl.name);
            }}
            title="Delete template"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function TemplatesList({
  templates: initial,
  defaultLanguage = "fr",
}: {
  templates: TemplateItem[];
  defaultLanguage?: Language;
}) {
  const t = useT();
  const [initialViewState] = useState(() => readTemplatesState(defaultLanguage));
  const [templates, setTemplates] = useState(initial);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [viewLang, setViewLang] = useState<Language>(initialViewState.viewLang);

  useEffect(() => {
    writeTemplatesState(viewLang);
  }, [viewLang]);

  async function handleDelete(id: number, name: string) {
    if (!window.confirm(t.templates_delete_confirm(name))) return;
    setDeleting(id);
    try {
      await fetch(`/api/templates/${id}`, { method: "DELETE" });
      setTemplates(prev => prev.filter(t => t.id !== id));
    } finally {
      setDeleting(null);
    }
  }

  const langToggle = (
    <div className="mb-5 flex items-center justify-end">
      <div className="inline-flex overflow-hidden rounded-md border border-zinc-200">
        {LANGUAGE_OPTIONS.map((opt) => {
          const count = templates.filter(t => (t.language === "en" ? "en" : "fr") === opt.value).length;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setViewLang(opt.value)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium transition-colors",
                viewLang === opt.value
                  ? "bg-zinc-900 text-white"
                  : "bg-white text-zinc-500 hover:bg-zinc-50"
              )}
            >
              {opt.label}
              <span className={cn("ml-1.5", viewLang === opt.value ? "text-zinc-300" : "text-zinc-300")}>
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  // Filter to the selected content language
  const visible = templates.filter(t => (t.language === "en" ? "en" : "fr") === viewLang);
  const categoryOrder = getTemplateCategories(viewLang);
  const uncategorizedLabel = UNCATEGORIZED_LABEL[viewLang];

  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-zinc-400 text-sm gap-3">
        <FilePen className="w-8 h-8 text-zinc-200" />
        <p>{t.templates_no_templates}</p>
        <Button asChild size="sm">
          <Link href="/templates/new" className="gap-1.5">
            <Plus className="w-4 h-4" />
            {t.templates_create_first}
          </Link>
        </Button>
      </div>
    );
  }

  // Group the visible (selected-language) templates: known categories in order,
  // then uncategorised.
  const grouped = new Map<string, TemplateItem[]>();
  for (const cat of categoryOrder) grouped.set(cat, []);
  grouped.set(uncategorizedLabel, []);

  for (const t of visible) {
    const key = t.category && categoryOrder.includes(t.category)
      ? t.category
      : uncategorizedLabel;
    grouped.get(key)!.push(t);
  }

  const sections = [...grouped.entries()].filter(([, items]) => items.length > 0);

  let content: React.ReactNode;
  if (visible.length === 0) {
    content = (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-400 text-sm gap-3">
        <FilePen className="w-8 h-8 text-zinc-200" />
        <p>{t.templates_no_lang}</p>
        <Button asChild size="sm">
          <Link href="/templates/new" className="gap-1.5">
            <Plus className="w-4 h-4" />
            {t.templates_create}
          </Link>
        </Button>
      </div>
    );
  } else if (sections.length === 1 && sections[0][0] === uncategorizedLabel) {
    // If every visible template is uncategorised, render a flat list
    content = (
      <div className="space-y-2">
        {visible.map(t => (
          <TemplateCard key={t.id} tpl={t} deleting={deleting} onDelete={handleDelete} />
        ))}
      </div>
    );
  } else {
    content = (
      <div className="space-y-8">
        {sections.map(([category, items]) => (
          <section key={category}>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3 px-1">
              {category}
              <span className="ml-2 font-normal normal-case tracking-normal text-zinc-300">
                {items.length}
              </span>
            </h2>
            <div className="space-y-2">
              {items.map(t => (
                <TemplateCard key={t.id} tpl={t} deleting={deleting} onDelete={handleDelete} />
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  }

  return (
    <div>
      {langToggle}
      {content}
    </div>
  );
}
