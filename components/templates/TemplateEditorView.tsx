"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TemplateEditor } from "./TemplateEditor";
import { LANGUAGE_OPTIONS, UNCATEGORIZED_LABEL, getTemplateCategories, type Language } from "@/lib/constants";
import type { EmailTemplate } from "@/types";
import { useT } from "@/components/providers/UiLanguageProvider";

// Dates serialised as strings from server
type TemplateData = Omit<EmailTemplate, "created_at" | "updated_at"> & {
  created_at: string;
  updated_at: string;
};

const PROSPECT_VARIABLES = ["name", "owner", "city", "website"] as const;

const SENDER_VARIABLES = [
  "senderName",
  "senderFirstName",
  "senderLastName",
  "senderTitle",
  "senderBusinessName",
  "senderEmail",
  "senderPhone",
  "senderWebsite",
  "senderLinkedIn",
  "senderInstagram",
  "senderFacebook",
  "senderWhatsApp",
  "senderGithub",
  "signature",
] as const;

interface Props {
  template: TemplateData | null; // null = new template
  defaultLanguage?: Language; // language for a new template (from content_language)
}

export function TemplateEditorView({ template, defaultLanguage = "fr" }: Props) {
  const t = useT();
  const router = useRouter();
  const [name, setName] = useState(template?.name ?? "");
  const [subject, setSubject] = useState(template?.subject ?? "");
  const [body, setBody] = useState(template?.body ?? "");
  const [language, setLanguage] = useState<Language>(
    (template?.language ?? defaultLanguage) === "en" ? "en" : "fr"
  );
  const [category, setCategory] = useState<string>(template?.category ?? "__none");
  const categories = getTemplateCategories(language);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isNew = template === null;

  async function handleSave() {
    if (!name.trim() || !subject.trim()) {
      setError("Name and subject are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: name.trim(),
        subject: subject.trim(),
        body,
        category: category === "__none" ? null : category,
        language,
      };
      const res = await fetch(
        isNew ? "/api/templates" : `/api/templates/${template.id}`,
        {
          method: isNew ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? "Save failed.");
      }
      if (isNew) {
        router.push("/templates");
      } else {
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 2000);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!template) return;
    if (!window.confirm(`Delete template "${template.name}"?`)) return;
    await fetch(`/api/templates/${template.id}`, { method: "DELETE" });
    router.push("/templates");
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-zinc-100 shrink-0">
        <Link
          href="/templates"
          className="flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-700 transition-colors mr-1"
        >
          <ArrowLeft className="w-4 h-4" />
          {t.template_back}
        </Link>

        <h1 className="text-base font-semibold text-zinc-900 flex-1 truncate">
          {isNew ? t.template_new_title : name || t.template_edit_title}
        </h1>

        <div className="flex items-center gap-1.5 shrink-0">
          {!isNew && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 hover:text-red-700"
                onClick={handleDelete}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </Button>
              <Separator orientation="vertical" className="h-5" />
            </>
          )}
          <Button onClick={handleSave} disabled={saving} size="sm" className="gap-1.5 min-w-20">
            {saving
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {t.template_saving}</>
              : justSaved
              ? <><Check className="w-3.5 h-3.5" /> {t.template_saved}</>
              : <><Save className="w-3.5 h-3.5" /> {isNew ? t.template_save : t.template_save}</>}
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto p-6 md:p-8 mx-auto w-full max-w-3xl space-y-5">

        {/* Template name */}
        <div className="space-y-1.5">
          <Label htmlFor="tpl-name">{t.template_name_label}</Label>
          <Input
            id="tpl-name"
            className="h-9"
            placeholder='e.g. "Initial outreach — no website"'
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        {/* Language + Category */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="tpl-language">{t.template_language_label}</Label>
            <Select
              value={language}
              onValueChange={(v) => {
                const next = v as Language;
                setLanguage(next);
                // A category from the other language won't exist in the new list
                if (category !== "__none" && !getTemplateCategories(next).includes(category)) {
                  setCategory("__none");
                }
              }}
            >
              <SelectTrigger id="tpl-language" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGE_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tpl-category">{t.template_category_label}</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="tpl-category" className="h-9">
                <SelectValue placeholder={UNCATEGORIZED_LABEL[language]} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">{UNCATEGORIZED_LABEL[language]}</SelectItem>
                {categories.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Subject */}
        <div className="space-y-1.5">
          <Label htmlFor="tpl-subject">{t.template_subject_label}</Label>
          <Input
            id="tpl-subject"
            className="h-9"
            placeholder="e.g. Amélioration de votre présence en ligne"
            value={subject}
            onChange={e => setSubject(e.target.value)}
          />
          <p className="text-xs text-zinc-400">
            Plain text — variables like <code className="font-mono bg-zinc-100 px-1 rounded">{"{{name}}"}</code> are replaced when sending.
          </p>
        </div>

        {/* Variable helper */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-zinc-500">Variables prospect</p>
          <div className="flex flex-wrap gap-1.5">
            {PROSPECT_VARIABLES.map(v => (
              <button
                key={v}
                type="button"
                className="font-mono text-xs bg-zinc-100 hover:bg-zinc-200 text-zinc-700 px-2 py-1 rounded border border-zinc-200 transition-colors"
                onClick={() => setBody(b => b + `{{${v}}}`)}
                title={`Insert {{${v}}}`}
              >
                {`{{${v}}}`}
              </button>
            ))}
          </div>

          <p className="text-xs font-medium text-zinc-500 pt-1">Variables expéditeur</p>
          <div className="flex flex-wrap gap-1.5">
            {SENDER_VARIABLES.map(v => (
              <button
                key={v}
                type="button"
                className="font-mono text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-1 rounded border border-blue-200 transition-colors"
                onClick={() => setBody(b => b + `{{${v}}}`)}
                title={`Insert {{${v}}}`}
              >
                {`{{${v}}}`}
              </button>
            ))}
          </div>

          <p className="text-xs text-zinc-400">
            Click a variable to append it to the body. You can then move it with cut/paste.
          </p>
        </div>

        {/* Rich text body */}
        <div className="space-y-1.5">
          <Label>{t.template_body_label}</Label>
          <TemplateEditor content={body} onChange={setBody} />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {/* Bottom save */}
        <div className="flex gap-2 pt-1">
          <Button onClick={handleSave} disabled={saving} className="gap-1.5">
            {saving
              ? <><Loader2 className="w-4 h-4 animate-spin" /> {t.template_saving}</>
              : isNew ? "Create template" : "Save changes"}
          </Button>
          <Button variant="outline" asChild>
            <Link href="/templates">{t.cancel}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
