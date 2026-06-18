"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ChevronLeft, ChevronRight, ChevronUp, Phone, Mail, Map, ExternalLink, Save,
  Loader2, Check, Trash2, Star, Clock, CalendarClock,
  Pencil, AlertTriangle, User as UserIcon, Building2, Link2, StickyNote,
  Paperclip, CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
} from "@/components/ui/accordion";
import { ProspectStatusBadge } from "./ProspectStatusBadge";
import { OpeningHours } from "./OpeningHours";
import { SendEmailModal } from "./SendEmailModal";
import { DocumentsSection } from "./DocumentsSection";
import { AppointmentsSection } from "./AppointmentsSection";
import {
  getAllowedStatusOptions,
  isHighValueStatus,
} from "@/lib/constants";
import { CountrySelectItems } from "@/components/shared/CountrySelectItems";
import { useT } from "@/components/providers/UiLanguageProvider";
import { cn } from "@/lib/utils";
import { recordDemoCall } from "@/lib/demoActivityClient";
import type { Prospect, Document as ProspectDocument, Appointment } from "@/types";

const DOCUMENT_STATUSES = ["proposal_sent", "client", "archived"];
const APPOINTMENT_STATUSES = ["proposal_sent", "client"];
const SCROLL_TOP_THRESHOLD = 360;
const COUNTRY_SELECT_CONTENT_CLASS = "max-h-80 w-[var(--radix-select-trigger-width)] overflow-y-auto";
const PROSPECTS_STATE_KEY = "crm_prospects_state";
const CLIENTS_STATE_KEY = "crm_clients_state";
const DETAIL_SOURCE_KEY = "crm_prospect_detail_source";
const LEGACY_PROSPECT_NAV_KEY = "crm_prospect_nav";

type DetailSource = "prospects" | "clients";

// Dates come as ISO strings after JSON serialisation from the server component
type ProspectData = Omit<Prospect, "callback_at" | "created_at" | "updated_at"> & {
  callback_at: string | null;
  created_at: string;
  updated_at: string;
};

type CallbackMode = "none" | "note" | "datetime";

// ── Tiny helper components ────────────────────────────────────────────────────

function SectionCard({
  title, icon, children, className, contentClassName,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <section className={cn("rounded-xl border border-zinc-200/90 bg-white/95 shadow-surface", className)}>
      <div className="flex items-center gap-2 border-b border-zinc-100/90 px-4 py-2.5">
        {icon && <span className="text-zinc-400">{icon}</span>}
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {title}
        </h3>
      </div>
      <div className={cn("p-4", contentClassName)}>{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[6.5rem_1fr] items-start gap-3 py-1.5">
      <span className="pt-1.5 text-sm text-zinc-500">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** Stacked label/control field used in the mobile accordion */
function MobileField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <span className="block text-xs font-medium text-zinc-500">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function SocialField({
  label, value, onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-1.5">
        <Input
          className="h-8 flex-1 text-sm"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="https://…"
        />
        {value && (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-zinc-200 text-zinc-400 transition-colors hover:bg-zinc-50 hover:text-zinc-600"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </Field>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso));
}

function formatCallbackPreview(iso: string): { text: string; overdue: boolean } {
  const d = new Date(iso);
  const overdue = d < new Date();
  const text = new Intl.DateTimeFormat("en-GB", {
    weekday: "long", day: "2-digit", month: "long",
    hour: "2-digit", minute: "2-digit",
  }).format(d);
  return { text, overdue };
}

function getStoredDetailSource(): DetailSource {
  if (typeof window === "undefined") return "prospects";
  return localStorage.getItem(DETAIL_SOURCE_KEY) === "clients" ? "clients" : "prospects";
}

function getListStorageKey(source: DetailSource): string {
  return source === "clients" ? CLIENTS_STATE_KEY : PROSPECTS_STATE_KEY;
}

function parseNavIds(value: unknown): number[] {
  return Array.isArray(value)
    ? value.filter((id): id is number => typeof id === "number" && Number.isFinite(id))
    : [];
}

function readStoredNavIds(source: DetailSource): number[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = JSON.parse(localStorage.getItem(getListStorageKey(source)) ?? "null") as { navIds?: unknown } | null;
    const ids = parseNavIds(saved?.navIds);
    if (ids.length) return ids;
  } catch {
    // Fall back to the legacy one-page navigation list below.
  }

  try {
    const legacy = JSON.parse(localStorage.getItem(LEGACY_PROSPECT_NAV_KEY) ?? "null") as { ids?: unknown } | null;
    return parseNavIds(legacy?.ids);
  } catch {
    return [];
  }
}

function markProspectVisitInStoredList(source: DetailSource, prospectId: number) {
  if (typeof window === "undefined") return;
  const storageKey = getListStorageKey(source);
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? "null") as Record<string, unknown> | null;
    localStorage.setItem(storageKey, JSON.stringify({
      ...(saved ?? {}),
      lastViewedProspectId: prospectId,
      pendingReturnProspectId: prospectId,
      updatedAt: Date.now(),
    }));
  } catch {
    localStorage.setItem(storageKey, JSON.stringify({
      lastViewedProspectId: prospectId,
      pendingReturnProspectId: prospectId,
      navIds: [],
      updatedAt: Date.now(),
    }));
  }
}

// ── Main component ────────────────────────────────────────────────────────────

export function ProspectDetail({ prospect: initial, source }: { prospect: ProspectData; source?: DetailSource }) {
  const router = useRouter();
  const t = useT();
  const [data, setData] = useState<ProspectData>(initial);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const [editingHours, setEditingHours] = useState(false);
  const [callbackMode, setCallbackMode] = useState<CallbackMode>(
    initial.callback_at ? "datetime" : initial.callback_note ? "note" : "none"
  );
  const [documents, setDocuments] = useState<ProspectDocument[]>([]);
  const [documentsLoaded, setDocumentsLoaded] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointmentsLoaded, setAppointmentsLoaded] = useState(false);
  const savedTimerRef = useRef<NodeJS.Timeout | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [initialNavigation] = useState(() => {
    const resolvedSource = source ?? getStoredDetailSource();
    return {
      source: resolvedSource,
      navIds: readStoredNavIds(resolvedSource),
    };
  });
  const navIds = initialNavigation.navIds;
  const [showScrollTop, setShowScrollTop] = useState(false);
  const detailSource = initialNavigation.source;

  const showDocuments = DOCUMENT_STATUSES.includes(data.status);
  const showAppointments = APPOINTMENT_STATUSES.includes(data.status);

  // Fetch documents the first time the prospect enters a document-bearing status
  useEffect(() => {
    if (!showDocuments || documentsLoaded) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/prospects/${data.id}/documents`);
        if (!res.ok) return;
        const docs: ProspectDocument[] = await res.json();
        if (!cancelled) {
          setDocuments(docs);
          setDocumentsLoaded(true);
        }
      } catch {
        /* ignore — section will show empty */
      }
    })();
    return () => { cancelled = true; };
  }, [showDocuments, documentsLoaded, data.id]);

  // Fetch appointments the first time the prospect enters proposal_sent / client
  useEffect(() => {
    if (!showAppointments || appointmentsLoaded) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/prospects/${data.id}/appointments`);
        if (!res.ok) return;
        const appts: Appointment[] = await res.json();
        if (!cancelled) {
          setAppointments(appts);
          setAppointmentsLoaded(true);
        }
      } catch {
        /* ignore — section will show empty */
      }
    })();
    return () => { cancelled = true; };
  }, [showAppointments, appointmentsLoaded, data.id]);

  // Clear "Saved ✓" after 2 s
  useEffect(() => {
    if (!justSaved) return;
    savedTimerRef.current = setTimeout(() => setJustSaved(false), 2000);
    return () => { if (savedTimerRef.current) clearTimeout(savedTimerRef.current); };
  }, [justSaved]);

  // Read prev/next navigation list from the last list view that opened this detail.
  useEffect(() => {
    markProspectVisitInStoredList(detailSource, data.id);
  }, [data.id, detailSource]);

  useEffect(() => {
    const scrollContainer = rootRef.current?.closest("main");
    if (!(scrollContainer instanceof HTMLElement)) return;

    const updateScrollTopVisibility = () => {
      setShowScrollTop(scrollContainer.scrollTop > SCROLL_TOP_THRESHOLD);
    };

    updateScrollTopVisibility();
    scrollContainer.addEventListener("scroll", updateScrollTopVisibility, { passive: true });
    return () => scrollContainer.removeEventListener("scroll", updateScrollTopVisibility);
  }, []);

  function update<K extends keyof ProspectData>(k: K, v: ProspectData[K]) {
    setData(prev => ({ ...prev, [k]: v }));
  }

  function str(v: string): string | null { return v.trim() || null; }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/prospects/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          category: str(data.category ?? ""),
          phone: str(data.phone ?? ""),
          email: str(data.email ?? ""),
          website: str(data.website ?? ""),
          address: str(data.address ?? ""),
          postal_code: str(data.postal_code ?? ""),
          city: str(data.city ?? ""),
          country: str(data.country ?? ""),
          gm_link: str(data.gm_link ?? ""),
          opening_hours: str(data.opening_hours ?? ""),
          owner: str(data.owner ?? ""),
          facebook_url: str(data.facebook_url ?? ""),
          instagram_url: str(data.instagram_url ?? ""),
          linkedin_url: str(data.linkedin_url ?? ""),
          status: data.status,
          notes: str(data.notes ?? ""),
          callback_at: callbackMode === "datetime" ? data.callback_at : null,
          callback_note: callbackMode === "note" ? str(data.callback_note ?? "") : null,
        }),
      });
      if (!res.ok) throw new Error("Save failed.");
      setJustSaved(true);
      if (detailSource === "clients" && !isHighValueStatus(data.status)) {
        localStorage.setItem(DETAIL_SOURCE_KEY, "prospects");
        router.replace(`/prospects/${data.id}`);
      }
    } catch {
      setError(t.failed_to_save);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(t.delete_prospect_confirm(data.name))) return;
    try {
      const res = await fetch(`/api/prospects/${data.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed.");
      router.push(backHref);
      router.refresh();
    } catch {
      setError(t.failed_to_delete);
    }
  }

  function handleScrollToTop() {
    const scrollContainer = rootRef.current?.closest("main");
    if (!(scrollContainer instanceof HTMLElement)) return;
    scrollContainer.scrollTo({ top: 0, behavior: "smooth" });
  }

  const owners = data.owner?.split(";").map(o => o.trim()).filter(Boolean) ?? [];
  const callbackPreview = data.callback_at ? formatCallbackPreview(data.callback_at) : null;

  const documentsContent = !documentsLoaded ? (
    <div className="flex items-center gap-2 py-4 text-sm text-zinc-400">
      <Loader2 className="h-4 w-4 animate-spin" />
      {t.loading_documents}
    </div>
  ) : (
    <DocumentsSection prospectId={data.id} initialDocuments={documents} />
  );

  const appointmentsContent = !appointmentsLoaded ? (
    <div className="flex items-center gap-2 py-4 text-sm text-zinc-400">
      <Loader2 className="h-4 w-4 animate-spin" />
      {t.loading_appointments}
    </div>
  ) : (
    <AppointmentsSection prospectId={data.id} initialAppointments={appointments} />
  );

  const scheduledCount = appointments.filter(a => a.status === "scheduled").length;
  const statusOptions = getAllowedStatusOptions(data.status);

  const navIndex = navIds.indexOf(data.id);
  const prevId = navIndex > 0 ? navIds[navIndex - 1] : null;
  const nextId = navIndex >= 0 && navIndex < navIds.length - 1 ? navIds[navIndex + 1] : null;
  const showNav = navIds.length > 0 && navIndex >= 0;
  const backHref = detailSource === "clients" ? "/clients" : "/prospects";
  const backLabel = detailSource === "clients" ? t.page_clients : t.back_to_prospects;
  const detailBaseHref = detailSource === "clients" && isHighValueStatus(data.status) ? "/clients" : "/prospects";

  function navigateToProspect(id: number) {
    markProspectVisitInStoredList(detailSource, id);
    router.push(`${detailBaseHref}/${id}`);
  }

  const saveButton = (
    <Button onClick={handleSave} disabled={saving} size="sm" className="min-w-24 gap-1.5">
      {saving
        ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> {t.saving}</>
        : justSaved
        ? <><Check className="h-3.5 w-3.5" /> {t.saved}</>
        : <><Save className="h-3.5 w-3.5" /> {t.save}</>}
    </Button>
  );

  const mobileSaveButton = (
    <Button
      onClick={handleSave}
      disabled={saving}
      size="sm"
      aria-label={t.save}
      title={t.save}
      className="h-11 w-11 shrink-0 rounded-xl p-0"
    >
      {saving
        ? <Loader2 className="h-4 w-4 animate-spin" />
        : justSaved
        ? <Check className="h-4 w-4" />
        : <Save className="h-4 w-4" />}
    </Button>
  );

  return (
    <div ref={rootRef} className="flex flex-col">
      <SendEmailModal
        prospect={data}
        open={emailOpen}
        onClose={() => setEmailOpen(false)}
        onSent={() => {
          if (data.status === "new") update("status", "contacted");
        }}
      />

      {/* ── Mobile action header ── */}
      <div className="border-b border-zinc-200/80 bg-white/95 shadow-control md:hidden">
        <div className="px-4 py-3">
          <div className="grid grid-cols-[2.75rem_minmax(0,1fr)] items-center gap-3">
            <Link
              href={backHref}
              aria-label={backLabel}
              className="-ml-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-zinc-500 transition-colors active:bg-zinc-100 active:text-zinc-800"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="min-w-0 text-center">
              <p className="truncate text-base font-semibold leading-tight text-zinc-900">{data.name}</p>
              <div className="mt-1 flex justify-center">
                <ProspectStatusBadge status={data.status} />
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-3">
            {showNav && (
              <div className="flex shrink-0 rounded-xl border border-zinc-200/90 bg-white p-1 shadow-control">
                <button
                  type="button"
                  disabled={!prevId}
                  aria-label={t.prev_prospect}
                  title={t.prev_prospect}
                  onClick={() => prevId && navigateToProspect(prevId)}
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-zinc-500 transition-colors disabled:pointer-events-none disabled:opacity-30 active:bg-zinc-100 active:text-zinc-900"
                >
                  <ChevronLeft className="h-4.5 w-4.5" />
                </button>
                <button
                  type="button"
                  disabled={!nextId}
                  aria-label={t.next_prospect}
                  title={t.next_prospect}
                  onClick={() => nextId && navigateToProspect(nextId)}
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-zinc-500 transition-colors disabled:pointer-events-none disabled:opacity-30 active:bg-zinc-100 active:text-zinc-900"
                >
                  <ChevronRight className="h-4.5 w-4.5" />
                </button>
              </div>
            )}

            <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
              {data.email && (
                <button
                  type="button"
                  onClick={() => setEmailOpen(true)}
                  aria-label={t.send_email_mobile_btn}
                  title={t.send_email_mobile_btn}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 shadow-control transition-colors active:bg-zinc-50"
                >
                  <Mail className="h-4.5 w-4.5" />
                </button>
              )}
              {data.phone && (
                <a
                  href={`tel:${data.phone}`}
                  onClick={() => recordDemoCall(data.id)}
                  aria-label={t.call}
                  title={t.call}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 shadow-control transition-colors active:bg-zinc-50"
                >
                  <Phone className="h-4.5 w-4.5" />
                </a>
              )}
              {data.gm_link && (
                <a
                  href={data.gm_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Google Maps"
                  title="Google Maps"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 shadow-control transition-colors active:bg-zinc-50"
                >
                  <Map className="h-4.5 w-4.5" />
                </a>
              )}
              {data.website && (
                <a
                  href={data.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t.field_website}
                  title={t.field_website}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 shadow-control transition-colors active:bg-zinc-50"
                >
                  <ExternalLink className="h-4.5 w-4.5" />
                </a>
              )}
              {mobileSaveButton}
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        aria-label={t.scroll_to_top}
        title={t.scroll_to_top}
        onClick={handleScrollToTop}
        className={cn(
          "fixed right-4 z-30 flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200/90 bg-white/95 text-brand-navy shadow-surface backdrop-blur transition-all duration-200 md:hidden",
          showScrollTop
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-2 opacity-0"
        )}
        style={{ bottom: "calc(5rem + env(safe-area-inset-bottom))" }}
      >
        <ChevronUp className="h-5 w-5" />
      </button>

      {/* ── Sticky page header (desktop) ── */}
      <div className="sticky top-0 z-10 hidden border-b border-zinc-200/80 bg-white/90 shadow-control backdrop-blur-md md:block">
        <div className="flex items-center gap-3 px-6 py-3.5">
          <Link
            href={backHref}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{backLabel}</span>
          </Link>

          {showNav && (
            <div className="flex gap-0.5">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-zinc-500 hover:text-zinc-900 disabled:opacity-30"
                disabled={!prevId}
                aria-label={t.prev_prospect}
                onClick={() => prevId && navigateToProspect(prevId)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-zinc-500 hover:text-zinc-900 disabled:opacity-30"
                disabled={!nextId}
                aria-label={t.next_prospect}
                onClick={() => nextId && navigateToProspect(nextId)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          <Separator orientation="vertical" className="h-5" />

          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <h1 className="truncate text-base font-semibold text-zinc-900">
              {data.name}
            </h1>
            <ProspectStatusBadge status={data.status} />
          </div>

          {/* Quick-action buttons */}
          <div className="flex shrink-0 items-center gap-1.5">
            {data.phone && (
              <Button asChild variant="outline" size="sm" className="gap-1.5">
                <a href={`tel:${data.phone}`} onClick={() => recordDemoCall(data.id)}>
                  <Phone className="h-3.5 w-3.5" /> {t.call}
                </a>
              </Button>
            )}
            {data.email && (
              <Button variant="outline" size="sm" className="gap-1.5"
                onClick={() => setEmailOpen(true)}>
                <Mail className="h-3.5 w-3.5" /> {t.send_email}
              </Button>
            )}
            {data.gm_link && (
              <Button asChild variant="outline" size="sm" title="Google Maps">
                <a href={data.gm_link} target="_blank" rel="noopener noreferrer">
                  <Map className="h-3.5 w-3.5" />
                </a>
              </Button>
            )}
            {data.website && (
              <Button asChild variant="outline" size="sm" title="Site web">
                <a href={data.website} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            )}

            <Separator orientation="vertical" className="mx-0.5 h-5" />

            {saveButton}
          </div>
        </div>
      </div>

      {/* ── Body: mobile accordion ── */}
      <div className="md:hidden space-y-4 px-4 py-4">
        {/* Status (always visible) */}
        <MobileField label={t.section_status}>
          <Select value={data.status} onValueChange={v => update("status", v)}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map(o => (
                <SelectItem key={o.value} value={o.value}>
                  <ProspectStatusBadge status={o.value} />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </MobileField>

        <Accordion
          type="multiple"
          defaultValue={["infos", "contact"]}
          className="rounded-xl border border-zinc-200/90 bg-white/95 px-4 shadow-surface"
        >
          {/* Informations générales */}
          <AccordionItem value="infos">
            <AccordionTrigger>{t.mobile_accordion_infos}</AccordionTrigger>
            <AccordionContent className="space-y-3">
              <MobileField label={t.field_name}>
                <Input className="h-9 text-sm font-medium" value={data.name}
                  onChange={e => update("name", e.target.value)} />
              </MobileField>
              <MobileField label={t.field_category}>
                <Input className="h-9 text-sm" value={data.category ?? ""}
                  onChange={e => update("category", e.target.value || null)}
                  placeholder="Peintre en bâtiment" />
              </MobileField>
              <MobileField label={t.field_address}>
                <Input className="h-9 text-sm" value={data.address ?? ""}
                  onChange={e => update("address", e.target.value || null)} />
              </MobileField>
              <div className="grid grid-cols-[1fr_5.5rem] gap-2">
                <MobileField label={t.field_city_pc}>
                  <Input className="h-9 text-sm" value={data.city ?? ""}
                    onChange={e => update("city", e.target.value || null)} placeholder="City" />
                </MobileField>
                <MobileField label="NPA">
                  <Input className="h-9 text-sm" value={data.postal_code ?? ""}
                    onChange={e => update("postal_code", e.target.value || null)} placeholder="0000" />
                </MobileField>
              </div>
              <MobileField label={t.field_country}>
                <Select value={data.country ?? "__none"}
                  onValueChange={v => update("country", v === "__none" ? null : v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder={t.select_country_placeholder} /></SelectTrigger>
                  <SelectContent className={COUNTRY_SELECT_CONTENT_CLASS}>
                    <SelectItem value="__none">—</SelectItem>
                    <CountrySelectItems />
                  </SelectContent>
                </Select>
              </MobileField>
              <MobileField label={t.field_website}>
                <div className="flex gap-1.5">
                  <Input className="h-9 flex-1 text-sm" value={data.website ?? ""}
                    onChange={e => update("website", e.target.value || null)} placeholder="https://…" />
                  {data.website && (
                    <a href={data.website} target="_blank" rel="noopener noreferrer"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-zinc-200 text-zinc-400 active:bg-zinc-50">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </MobileField>
              <MobileField label={t.field_google_maps}>
                <div className="flex gap-1.5">
                  <Input className="h-9 flex-1 font-mono text-xs" value={data.gm_link ?? ""}
                    onChange={e => update("gm_link", e.target.value || null)} placeholder="https://maps.google.com/…" />
                  {data.gm_link && (
                    <a href={data.gm_link} target="_blank" rel="noopener noreferrer"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-zinc-200 text-zinc-400 active:bg-zinc-50">
                      <Map className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </MobileField>
              <MobileField label={t.field_hours}>
                {data.opening_hours && !editingHours ? (
                  <div className="space-y-1.5">
                    <OpeningHours value={data.opening_hours} />
                    <button type="button" onClick={() => setEditingHours(true)}
                      className="flex items-center gap-1 text-xs text-zinc-400 active:text-zinc-600">
                      <Pencil className="h-3 w-3" /> Edit hours
                    </button>
                  </div>
                ) : (
                  <Textarea className="min-h-16 resize-y text-sm" value={data.opening_hours ?? ""}
                    onChange={e => update("opening_hours", e.target.value || null)}
                    onBlur={() => setEditingHours(false)}
                    placeholder="lundi: 08:00 to 17:00 | mardi: …" autoFocus={editingHours} />
                )}
              </MobileField>
              {data.rating != null && (
                <MobileField label={t.field_rating}>
                  <span className="flex items-center gap-1.5 text-sm text-zinc-700">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    <span className="font-medium">{data.rating}</span>
                    {data.reviews_count != null && (
                      <span className="text-zinc-400">· {t.x_reviews(data.reviews_count)}</span>
                    )}
                  </span>
                </MobileField>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* Contact */}
          <AccordionItem value="contact">
            <AccordionTrigger>{t.mobile_accordion_contact}</AccordionTrigger>
            <AccordionContent className="space-y-3">
              <MobileField label={t.field_phone}>
                <Input className="h-9 text-sm" value={data.phone ?? ""}
                  onChange={e => update("phone", e.target.value || null)} placeholder="+41 22 000 00 00" />
              </MobileField>
              <MobileField label={t.field_email}>
                <Input className="h-9 text-sm" type="email" value={data.email ?? ""}
                  onChange={e => update("email", e.target.value || null)} placeholder="contact@example.com" />
              </MobileField>
              <MobileField label={t.field_owner}>
                <Input className="h-9 text-sm" value={data.owner ?? ""}
                  onChange={e => update("owner", e.target.value || null)} placeholder="Jean Dupont" />
                {owners.length > 1 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {owners.map(o => (
                      <span key={o} className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">{o}</span>
                    ))}
                  </div>
                )}
              </MobileField>
              <MobileField label="Facebook">
                <Input className="h-9 text-sm" value={data.facebook_url ?? ""}
                  onChange={e => update("facebook_url", e.target.value || null)} placeholder="https://…" />
              </MobileField>
              <MobileField label="Instagram">
                <Input className="h-9 text-sm" value={data.instagram_url ?? ""}
                  onChange={e => update("instagram_url", e.target.value || null)} placeholder="https://…" />
              </MobileField>
              <MobileField label="LinkedIn">
                <Input className="h-9 text-sm" value={data.linkedin_url ?? ""}
                  onChange={e => update("linkedin_url", e.target.value || null)} placeholder="https://…" />
              </MobileField>
            </AccordionContent>
          </AccordionItem>

          {/* Notes */}
          <AccordionItem value="notes">
            <AccordionTrigger>{t.mobile_accordion_notes}</AccordionTrigger>
            <AccordionContent>
              <Textarea className="min-h-32 resize-y text-sm" value={data.notes ?? ""}
                onChange={e => update("notes", e.target.value || null)}
                placeholder={t.notes_placeholder} />
            </AccordionContent>
          </AccordionItem>

          {/* Rappel */}
          <AccordionItem value="callback">
            <AccordionTrigger>
              <span className="flex items-center gap-2">
                {t.mobile_accordion_callback}
                {data.callback_at && (
                  <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                    {t.callback_scheduled_badge}
                  </span>
                )}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="mb-3 grid grid-cols-3 gap-1 rounded-lg bg-zinc-100 p-1 text-xs">
                {(["none", "note", "datetime"] as const).map(mode => (
                  <button key={mode} onClick={() => setCallbackMode(mode)}
                    className={cn(
                      "rounded-md px-1.5 py-1.5 font-medium transition-colors whitespace-nowrap",
                      callbackMode === mode ? "bg-white text-zinc-900 shadow-control" : "text-zinc-500"
                    )}>
                    {mode === "none" ? t.callback_mode_none : mode === "note" ? t.callback_mode_note : t.callback_mode_date}
                  </button>
                ))}
              </div>
              {callbackMode === "none" && (
                <p className="text-xs text-zinc-400">{t.no_callback_scheduled}</p>
              )}
              {callbackMode === "note" && (
                <Textarea className="min-h-16 resize-none text-sm" value={data.callback_note ?? ""}
                  onChange={e => update("callback_note", e.target.value || null)}
                  placeholder={t.callback_note_placeholder} />
              )}
              {callbackMode === "datetime" && (
                <div className="space-y-2">
                  {callbackPreview && (
                    <div className={cn(
                      "flex items-start gap-2 rounded-md border px-3 py-2 text-sm",
                      callbackPreview.overdue ? "border-red-200 bg-red-50 text-red-700" : "border-amber-200 bg-amber-50 text-amber-800"
                    )}>
                      <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium capitalize leading-snug">{callbackPreview.text}</p>
                        {callbackPreview.overdue && <p className="text-xs font-medium text-red-500">{t.callback_overdue_label}</p>}
                      </div>
                    </div>
                  )}
                  <Input type="datetime-local" className="h-9 text-sm" value={toDatetimeLocal(data.callback_at)}
                    onChange={e => update("callback_at", e.target.value ? new Date(e.target.value).toISOString() : null)} />
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* Actions */}
          <AccordionItem value="actions" className={showDocuments ? undefined : "border-b-0"}>
            <AccordionTrigger>{t.mobile_accordion_actions}</AccordionTrigger>
            <AccordionContent className="space-y-2">
              {data.email && (
                <Button variant="outline" size="sm" className="w-full gap-1.5"
                  onClick={() => setEmailOpen(true)}>
                  <Mail className="h-3.5 w-3.5" /> {t.send_email_mobile_btn}
                </Button>
              )}
              <Button variant="outline" size="sm"
                className="w-full gap-1.5 border-red-200 text-red-600 active:bg-red-50"
                onClick={handleDelete}>
                <Trash2 className="h-3.5 w-3.5" /> {t.delete_prospect_mobile_btn}
              </Button>
            </AccordionContent>
          </AccordionItem>

          {/* Documents — only for proposal_sent / client / archived */}
          {showDocuments && (
            <AccordionItem value="documents" className={showAppointments ? undefined : "border-b-0"}>
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  Documents
                  {documentsLoaded && documents.length > 0 && (
                    <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                      {documents.length}
                    </span>
                  )}
                </span>
              </AccordionTrigger>
              <AccordionContent>{documentsContent}</AccordionContent>
            </AccordionItem>
          )}

          {/* Appointments — only for proposal_sent / client */}
          {showAppointments && (
            <AccordionItem value="appointments" className="border-b-0">
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  Appointments
                  {appointmentsLoaded && scheduledCount > 0 && (
                    <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                      {scheduledCount}
                    </span>
                  )}
                </span>
              </AccordionTrigger>
              <AccordionContent>{appointmentsContent}</AccordionContent>
            </AccordionItem>
          )}
        </Accordion>

        {error && (
          <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
      </div>

      {/* ── Body: two columns (desktop) ── */}
      <div className="hidden md:block p-6">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-start gap-5 lg:grid-cols-[1fr_360px]">

          {/* Left column */}
          <div className="space-y-5">

            <SectionCard title={t.section_contact} icon={<UserIcon className="h-3.5 w-3.5" />}>
              <Field label={t.field_name}>
                <Input
                  className="h-8 text-sm font-medium"
                  value={data.name}
                  onChange={e => update("name", e.target.value)}
                />
              </Field>
              <Field label={t.field_phone}>
                <Input
                  className="h-8 text-sm"
                  value={data.phone ?? ""}
                  onChange={e => update("phone", e.target.value || null)}
                  placeholder="+41 22 000 00 00"
                />
              </Field>
              <Field label={t.field_email}>
                <Input
                  className="h-8 text-sm"
                  type="email"
                  value={data.email ?? ""}
                  onChange={e => update("email", e.target.value || null)}
                  placeholder="contact@example.com"
                />
              </Field>
              <Field label={t.field_website}>
                <div className="flex gap-1.5">
                  <Input
                    className="h-8 flex-1 text-sm"
                    value={data.website ?? ""}
                    onChange={e => update("website", e.target.value || null)}
                    placeholder="https://…"
                  />
                  {data.website && (
                    <a
                      href={data.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-zinc-200 text-zinc-400 transition-colors hover:bg-zinc-50 hover:text-zinc-600"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </Field>
              <Field label={t.field_address}>
                <Input
                  className="h-8 text-sm"
                  value={data.address ?? ""}
                  onChange={e => update("address", e.target.value || null)}
                />
              </Field>
              <Field label={t.field_city_pc}>
                <div className="flex gap-1.5">
                  <Input
                    className="h-8 flex-1 text-sm"
                    value={data.city ?? ""}
                    onChange={e => update("city", e.target.value || null)}
                    placeholder="City"
                  />
                  <Input
                    className="h-8 w-20 text-sm"
                    value={data.postal_code ?? ""}
                    onChange={e => update("postal_code", e.target.value || null)}
                    placeholder="0000"
                  />
                </div>
              </Field>
              <Field label={t.field_country}>
                <Select
                  value={data.country ?? "__none"}
                  onValueChange={v => update("country", v === "__none" ? null : v)}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent className={COUNTRY_SELECT_CONTENT_CLASS}>
                    <SelectItem value="__none">—</SelectItem>
                    <CountrySelectItems />
                  </SelectContent>
                </Select>
              </Field>
              <Field label={t.field_google_maps}>
                <div className="flex gap-1.5">
                  <Input
                    className="h-8 flex-1 font-mono text-xs"
                    value={data.gm_link ?? ""}
                    onChange={e => update("gm_link", e.target.value || null)}
                    placeholder="https://maps.google.com/…"
                  />
                  {data.gm_link && (
                    <a
                      href={data.gm_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-zinc-200 text-zinc-400 transition-colors hover:bg-zinc-50 hover:text-zinc-600"
                    >
                      <Map className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </Field>
            </SectionCard>

            <SectionCard title={t.section_business} icon={<Building2 className="h-3.5 w-3.5" />}>
              <Field label={t.field_category}>
                <Input
                  className="h-8 text-sm"
                  value={data.category ?? ""}
                  onChange={e => update("category", e.target.value || null)}
                  placeholder="Peintre en bâtiment"
                />
              </Field>
              <Field label={t.field_owner}>
                <Input
                  className="h-8 text-sm"
                  value={data.owner ?? ""}
                  onChange={e => update("owner", e.target.value || null)}
                  placeholder="Jean Dupont"
                />
                {owners.length > 1 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {owners.map(o => (
                      <span key={o} className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                        {o}
                      </span>
                    ))}
                  </div>
                )}
                {(data.owner?.includes(";") ?? false) && (
                  <p className="mt-1 text-xs text-zinc-400">{t.separated_by_semicolon}</p>
                )}
              </Field>
              <Field label={t.field_rating}>
                {data.rating != null ? (
                  <span className="flex items-center gap-1.5 pt-1.5 text-sm text-zinc-700">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    <span className="font-medium">{data.rating}</span>
                    {data.reviews_count != null && (
                      <span className="text-zinc-400">
                        · {t.x_reviews(data.reviews_count)}
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="block pt-1.5 text-sm text-zinc-300">—</span>
                )}
              </Field>
              <Field label={t.field_hours}>
                {data.opening_hours && !editingHours ? (
                  <div className="space-y-1.5">
                    <OpeningHours value={data.opening_hours} />
                    <button
                      type="button"
                      onClick={() => setEditingHours(true)}
                      className="flex items-center gap-1 text-xs text-zinc-400 transition-colors hover:text-zinc-600"
                    >
                      <Pencil className="h-3 w-3" />
                      {t.edit_hours}
                    </button>
                  </div>
                ) : (
                  <Textarea
                    className="min-h-16 resize-y text-sm"
                    value={data.opening_hours ?? ""}
                    onChange={e => update("opening_hours", e.target.value || null)}
                    onBlur={() => setEditingHours(false)}
                    placeholder="lundi: 08:00 to 17:00 | mardi: …"
                    autoFocus={editingHours}
                  />
                )}
              </Field>
            </SectionCard>

            <SectionCard title={t.section_social_links} icon={<Link2 className="h-3.5 w-3.5" />}>
              <SocialField
                label="Facebook"
                value={data.facebook_url ?? ""}
                onChange={v => update("facebook_url", v || null)}
              />
              <SocialField
                label="Instagram"
                value={data.instagram_url ?? ""}
                onChange={v => update("instagram_url", v || null)}
              />
              <SocialField
                label="LinkedIn"
                value={data.linkedin_url ?? ""}
                onChange={v => update("linkedin_url", v || null)}
              />
            </SectionCard>

            <SectionCard title={t.section_notes} icon={<StickyNote className="h-3.5 w-3.5" />}>
              <Textarea
                className="min-h-32 resize-y text-sm"
                value={data.notes ?? ""}
                onChange={e => update("notes", e.target.value || null)}
                placeholder="Free-form notes about this prospect…"
              />
            </SectionCard>

            {error && (
              <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

          </div>

          {/* Right column — sticky, own scroll so long Docs/Appointments stay usable */}
          <div className="space-y-5 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-1">

            <SectionCard title={t.section_status}>
              <Select
                value={data.status}
                onValueChange={v => update("status", v)}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map(o => (
                    <SelectItem key={o.value} value={o.value}>
                      <ProspectStatusBadge status={o.value} />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SectionCard>

            <SectionCard title={t.section_callback} icon={<CalendarClock className="h-3.5 w-3.5" />}>
              <div className="mb-3 grid grid-cols-3 gap-1 rounded-lg bg-zinc-100 p-1 text-xs">
                {(["none", "note", "datetime"] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setCallbackMode(mode)}
                    className={cn(
                      "rounded-md px-1.5 py-1.5 font-medium transition-colors whitespace-nowrap",
                      callbackMode === mode
                        ? "bg-white text-zinc-900 shadow-control"
                        : "text-zinc-500 hover:text-zinc-800"
                    )}
                  >
                    {mode === "none" ? "None" : mode === "note" ? "Note" : "Date"}
                  </button>
                ))}
              </div>

              {callbackMode === "none" && (
                <p className="text-xs text-zinc-400">
                  No callback scheduled for this prospect.
                </p>
              )}

              {callbackMode === "note" && (
                <Textarea
                  className="min-h-16 resize-none text-sm"
                  value={data.callback_note ?? ""}
                  onChange={e => update("callback_note", e.target.value || null)}
                  placeholder="e.g. Thursday afternoon"
                />
              )}

              {callbackMode === "datetime" && (
                <div className="space-y-2">
                  {callbackPreview && (
                    <div
                      className={cn(
                        "flex items-start gap-2 rounded-md border px-3 py-2 text-sm",
                        callbackPreview.overdue
                          ? "border-red-200 bg-red-50 text-red-700"
                          : "border-amber-200 bg-amber-50 text-amber-800"
                      )}
                    >
                      <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium capitalize leading-snug">
                          {callbackPreview.text}
                        </p>
                        {callbackPreview.overdue && (
                          <p className="text-xs font-medium text-red-500">Overdue</p>
                        )}
                      </div>
                    </div>
                  )}
                  <Input
                    type="datetime-local"
                    className="h-8 text-sm"
                    value={toDatetimeLocal(data.callback_at)}
                    onChange={e =>
                      update(
                        "callback_at",
                        e.target.value ? new Date(e.target.value).toISOString() : null
                      )
                    }
                  />
                </div>
              )}
            </SectionCard>

            {showDocuments && (
              <SectionCard title={t.section_documents} icon={<Paperclip className="h-3.5 w-3.5" />}>
                {documentsContent}
              </SectionCard>
            )}

            {showAppointments && (
              <SectionCard title={t.section_appointments} icon={<CalendarDays className="h-3.5 w-3.5" />}>
                {appointmentsContent}
              </SectionCard>
            )}

            <SectionCard title={t.section_details}>
              <dl className="space-y-2 text-xs">
                {data.list_name && (
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-zinc-400">{t.field_list}</dt>
                    <dd className="truncate font-medium text-zinc-600">{data.list_name}</dd>
                  </div>
                )}
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-zinc-400">{t.field_created}</dt>
                  <dd className="text-zinc-600">{formatDate(data.created_at)}</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-zinc-400">{t.field_updated}</dt>
                  <dd className="text-zinc-600">{formatDate(data.updated_at)}</dd>
                </div>
              </dl>
            </SectionCard>

            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5 border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700"
              onClick={handleDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t.delete_prospect}
            </Button>

          </div>
        </div>
      </div>
    </div>
  );
}
