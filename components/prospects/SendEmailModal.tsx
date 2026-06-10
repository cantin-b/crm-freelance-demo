"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Send, Mail, Paperclip, X, Copy, Check } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { TemplateEditor } from "@/components/templates/TemplateEditor";
import { replaceVariables } from "@/lib/templates";
import { UNCATEGORIZED_LABEL, getTemplateCategories, type Language } from "@/lib/constants";
import { useT } from "@/components/providers/UiLanguageProvider";
import type { EmailTemplate, Settings } from "@/types";

type SettingsForEmail = Pick<
  Settings,
  | "first_name" | "last_name" | "display_name" | "professional_title"
  | "professional_title_en"
  | "business_name" | "contact_email" | "phone" | "website_url"
  | "linkedin_url" | "instagram_url" | "facebook_url" | "whatsapp_url"
  | "github_url"
  | "signature_enabled" | "signature_logo_enabled" | "signature_custom_enabled"
  | "signature_visible_fields" | "signature_html"
  | "content_language"
>;

// Only the fields the modal actually needs
interface ProspectForEmail {
  id: number;
  name: string;
  email: string | null;
  owner: string | null;
  city: string | null;
  website: string | null;
  status: string;
}

interface Props {
  prospect: ProspectForEmail | null;
  open: boolean;
  onClose: () => void;
  /** Called after a successful send so the list/detail can refresh status */
  onSent?: (prospectId: number) => void;
}

type TemplateItem = Omit<EmailTemplate, "created_at" | "updated_at"> & {
  created_at: string;
  updated_at: string;
};

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function getAssetBaseUrl(): string | undefined {
  return typeof window === "undefined" ? undefined : window.location.origin;
}

export function SendEmailModal({ prospect, open, onClose, onSent }: Props) {
  const t = useT();
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [settings, setSettings] = useState<SettingsForEmail | null>(null);
  const [selectedId, setSelectedId] = useState<string>("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [editorKey, setEditorKey] = useState(0);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Fetch templates and settings in parallel when the modal opens
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setSent(false);
      setError(null);
      setSelectedId("");
      setRecipientEmail(prospect?.email ?? "");
      setSubject("");
      setBodyHtml("");
      setAttachment(null);
      setSettings(null);
      if (attachmentInputRef.current) attachmentInputRef.current.value = "";
    });
    Promise.all([
      fetch("/api/templates").then(r => r.json() as Promise<TemplateItem[]>),
      fetch("/api/settings").then(r => r.json() as Promise<SettingsForEmail>),
    ])
      .then(([tpls, cfg]) => {
        if (cancelled) return;
        setTemplates(tpls);
        setSettings(cfg);
      })
      .catch(() => {
        if (!cancelled) setTemplates([]);
      });
    return () => { cancelled = true; };
  }, [open, prospect?.email]);

  // Active content language (from settings) drives which templates show and the
  // signature language.
  const contentLanguage: Language = settings?.content_language === "en" ? "en" : "fr";
  const visibleTemplates = templates.filter(
    t => (t.language === "en" ? "en" : "fr") === contentLanguage
  );

  function handleTemplateSelect(id: string) {
    setSelectedId(id);
    const tpl = templates.find(t => String(t.id) === id);
    if (!tpl || !prospect) return;
    setSubject(replaceVariables(tpl.subject, prospect, settings ?? undefined, { language: contentLanguage }));
    setBodyHtml(
      replaceVariables(tpl.body, prospect, settings ?? undefined, {
        appendSignature: true,
        assetBaseUrl: getAssetBaseUrl(),
        language: contentLanguage,
      })
    );
    setEditorKey(k => k + 1); // remount TipTap with new content
    setError(null);
  }

  function handleAttachmentChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;

    if (file.size > MAX_ATTACHMENT_BYTES) {
      setAttachment(null);
      e.target.value = "";
      setError(t.email_attachment_too_large);
      return;
    }

    setAttachment(file);
    setError(null);
  }

  function clearAttachment() {
    setAttachment(null);
    if (attachmentInputRef.current) attachmentInputRef.current.value = "";
  }

  function handleCopy() {
    const htmlBlob = new Blob([bodyHtml], { type: "text/html" });

    // Plain text fallback: preserve block-level line breaks
    const div = document.createElement("div");
    div.innerHTML = bodyHtml;
    div.querySelectorAll("p, div, tr, li").forEach(el => {
      el.after(document.createTextNode("\n"));
    });
    div.querySelectorAll("br").forEach(el => el.replaceWith("\n"));
    const plainBody = (div.textContent ?? "").replace(/\n{3,}/g, "\n\n").trim();
    const plainText = subject.trim()
      ? `${subject.trim()}\n\n${plainBody}`
      : plainBody;
    const textBlob = new Blob([plainText], { type: "text/plain" });

    navigator.clipboard
      .write([new ClipboardItem({ "text/html": htmlBlob, "text/plain": textBlob })])
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })
      .catch(() => {
        navigator.clipboard.writeText(plainText).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      });
  }

  async function handleSend() {
    if (!prospect) return;
    const to = recipientEmail.trim();
    if (!to) {
      setError(t.email_recipient_required);
      return;
    }
    if (!subject.trim()) {
      setError(t.email_subject_required);
      return;
    }
    setSending(true);
    setError(null);
    try {
      const payload = new FormData();
      payload.set("prospectId", String(prospect.id));
      payload.set("to", to);
      payload.set("subject", subject.trim());
      payload.set("html", bodyHtml);
      if (attachment) payload.set("attachment", attachment);

      const res = await fetch("/api/email", {
        method: "POST",
        body: payload,
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? t.email_sending);
      setSent(true);
      onSent?.(prospect.id);
      // Auto-close after 1.5 s
      setTimeout(() => {
        onClose();
        setSent(false);
      }, 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Send failed.");
    } finally {
      setSending(false);
    }
  }

  if (!prospect) return null;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-zinc-100 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Mail className="w-4 h-4 text-zinc-400" />
            {t.send_email_to}{" "}
            <span className="font-semibold">{prospect.name}</span>
          </DialogTitle>
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {/* Recipient */}
          <div className="space-y-1.5">
            <Label htmlFor="recipient-email">{t.email_recipient_label}</Label>
            <Input
              id="recipient-email"
              type="email"
              className="h-9"
              value={recipientEmail}
              onChange={e => {
                setRecipientEmail(e.target.value);
                setError(null);
              }}
              placeholder={t.email_recipient_placeholder}
              disabled={sending}
            />
          </div>

          {/* Template picker */}
          <div className="space-y-1.5">
            <Label>{t.email_template_label}</Label>
            <Select
              value={selectedId}
              onValueChange={handleTemplateSelect}
              disabled={sending}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder={
                  visibleTemplates.length === 0
                    ? t.email_no_templates
                    : t.email_pick_template
                } />
              </SelectTrigger>
              <SelectContent className="max-h-75 overflow-y-auto">
                {(() => {
                  const categoryOrder = getTemplateCategories(contentLanguage);
                  const uncategorized = UNCATEGORIZED_LABEL[contentLanguage];
                  const grouped = new Map<string, TemplateItem[]>();
                  for (const cat of categoryOrder) grouped.set(cat, []);
                  grouped.set(uncategorized, []);
                  for (const t of visibleTemplates) {
                    const key = t.category && categoryOrder.includes(t.category)
                      ? t.category
                      : uncategorized;
                    grouped.get(key)!.push(t);
                  }
                  return [...grouped.entries()]
                    .filter(([, items]) => items.length > 0)
                    .map(([cat, items]) => (
                      <SelectGroup key={cat}>
                        <SelectLabel>{cat}</SelectLabel>
                        {items.map(t => (
                          <SelectItem key={t.id} value={String(t.id)}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ));
                })()}
              </SelectContent>
            </Select>
          </div>

          {/* Subject */}
          <div className="space-y-1.5">
            <Label htmlFor="email-subject">{t.email_subject_label}</Label>
            <Input
              id="email-subject"
              className="h-9"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder={t.email_subject_placeholder}
              disabled={sending}
            />
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <Label>{t.email_body_label}</Label>
            <TemplateEditor
              key={editorKey}
              content={bodyHtml}
              onChange={setBodyHtml}
            />
          </div>

          {/* Attachment */}
          <div className="pt-1">
            <input
              ref={attachmentInputRef}
              type="file"
              className="hidden"
              onChange={handleAttachmentChange}
              disabled={sending}
            />
            {attachment ? (
              <div className="flex items-center justify-between gap-3 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm">
                <div className="flex min-w-0 items-center gap-2">
                  <Paperclip className="h-4 w-4 shrink-0 text-zinc-400" />
                  <span className="truncate text-zinc-700">{attachment.name}</span>
                  <span className="shrink-0 text-xs text-zinc-400">
                    {formatFileSize(attachment.size)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={clearAttachment}
                  disabled={sending}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-200 hover:text-zinc-700 disabled:pointer-events-none disabled:opacity-50"
                  aria-label="Remove attachment"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 font-normal text-zinc-600"
                disabled={sending}
                onClick={() => attachmentInputRef.current?.click()}
              >
                <Paperclip className="h-3.5 w-3.5" />
                {t.email_attach_file}
              </Button>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </p>
          )}

          {sent && (
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
              {t.email_sent_success}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-zinc-100 shrink-0">
          {/* Copy button — left */}
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 disabled:opacity-30 transition-colors"
                  disabled={!subject.trim() && !bodyHtml}
                  onClick={handleCopy}
                  aria-label={t.email_copy_content}
                >
                  {copied
                    ? <Check className="w-4 h-4 text-emerald-500" />
                    : <Copy className="w-4 h-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {copied ? t.email_copied : t.email_copy_content}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Cancel + Send — right */}
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose} disabled={sending}>
              {t.cancel}
            </Button>
            <Button
              onClick={handleSend}
              disabled={sending || !recipientEmail.trim() || !subject.trim() || sent}
              className="gap-1.5 min-w-27.5"
            >
              {sending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> {t.email_sending}</>
                : <><Send className="w-4 h-4" /> {t.email_send_btn}</>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
