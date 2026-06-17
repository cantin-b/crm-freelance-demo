"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Plus, UserPlus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/layout/PageHeader";
import { CountrySelectItems } from "@/components/shared/CountrySelectItems";
import { CLIENT_STATUS_OPTIONS } from "@/lib/constants";
import { useT } from "@/components/providers/UiLanguageProvider";
import type { Prospect } from "@/types";

const CLIENTS_STATE_KEY = "crm_clients_state";
const DETAIL_SOURCE_KEY = "crm_prospect_detail_source";
const COUNTRY_SELECT_CONTENT_CLASS = "max-h-80 w-[var(--radix-select-trigger-width)] overflow-y-auto";

type FormState = {
  name: string;
  status: "proposal_sent" | "client";
  email: string;
  phone: string;
  category: string;
  website: string;
  address: string;
  city: string;
  postal_code: string;
  country: string;
  owner: string;
  notes: string;
};

type SavedClientsState = {
  navIds?: unknown;
  lastViewedProspectId?: unknown;
  pendingReturnProspectId?: unknown;
  updatedAt?: unknown;
};

const INITIAL_FORM: FormState = {
  name: "",
  status: "proposal_sent",
  email: "",
  phone: "",
  category: "",
  website: "",
  address: "",
  city: "",
  postal_code: "",
  country: "",
  owner: "",
  notes: "",
};

function parseNavIds(value: unknown): number[] {
  return Array.isArray(value)
    ? value.filter((id): id is number => typeof id === "number" && Number.isFinite(id))
    : [];
}

function markCreatedClientInListState(clientId: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem(DETAIL_SOURCE_KEY, "clients");

  try {
    const saved = JSON.parse(localStorage.getItem(CLIENTS_STATE_KEY) ?? "null") as SavedClientsState | null;
    const navIds = parseNavIds(saved?.navIds);
    localStorage.setItem(CLIENTS_STATE_KEY, JSON.stringify({
      ...(saved ?? {}),
      lastViewedProspectId: clientId,
      pendingReturnProspectId: clientId,
      navIds: [clientId, ...navIds.filter(id => id !== clientId)],
      updatedAt: Date.now(),
    }));
  } catch {
    localStorage.setItem(CLIENTS_STATE_KEY, JSON.stringify({
      lastViewedProspectId: clientId,
      pendingReturnProspectId: clientId,
      navIds: [clientId],
      updatedAt: Date.now(),
    }));
  }
}

export function NewClientForm() {
  const t = useT();
  const router = useRouter();
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!form.name.trim()) {
      setError(t.new_client_error_name_required);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json() as Prospect | { error?: string };
      if (!res.ok || !("id" in data)) {
        throw new Error("error" in data ? data.error : t.new_client_error_create);
      }

      markCreatedClientInListState(data.id);
      router.push(`/clients/${data.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : t.new_client_error_create);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 md:p-8 pb-20 md:pb-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-5">
        <PageHeader
          title={t.new_client_title}
          description={t.new_client_description}
          actions={
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link href="/clients">
                <ArrowLeft className="h-3.5 w-3.5" />
                {t.back_to_clients}
              </Link>
            </Button>
          }
        />

        <form onSubmit={handleSubmit} className="rounded-xl border border-zinc-200/90 bg-white/95 shadow-surface">
          <div className="flex items-start gap-3 border-b border-zinc-100/90 px-4 py-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <UserPlus className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-zinc-950">{t.new_client_form_title}</h2>
              <p className="mt-0.5 text-xs text-zinc-500">{t.new_client_source_hint}</p>
            </div>
          </div>

          <div className="grid gap-5 p-4 lg:grid-cols-[1.05fr_0.95fr]">
            <section className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="client-name">{t.field_name} *</Label>
                <Input
                  id="client-name"
                  value={form.name}
                  onChange={event => update("name", event.target.value)}
                  placeholder={t.new_client_name_placeholder}
                  autoFocus
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="client-status">{t.new_client_initial_status}</Label>
                  <Select value={form.status} onValueChange={value => update("status", value as FormState["status"])}>
                    <SelectTrigger id="client-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CLIENT_STATUS_OPTIONS
                        .filter(option => option.value === "proposal_sent" || option.value === "client")
                        .map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {t.status(option.value)}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="client-owner">{t.field_owner}</Label>
                  <Input
                    id="client-owner"
                    value={form.owner}
                    onChange={event => update("owner", event.target.value)}
                    placeholder={t.new_client_owner_placeholder}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="client-email">{t.field_email}</Label>
                  <Input
                    id="client-email"
                    type="email"
                    value={form.email}
                    onChange={event => update("email", event.target.value)}
                    placeholder="contact@example.com"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="client-phone">{t.field_phone}</Label>
                  <Input
                    id="client-phone"
                    value={form.phone}
                    onChange={event => update("phone", event.target.value)}
                    placeholder="+32 2 000 00 00"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="client-website">{t.field_website}</Label>
                <Input
                  id="client-website"
                  value={form.website}
                  onChange={event => update("website", event.target.value)}
                  placeholder="https://..."
                />
              </div>
            </section>

            <section className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="client-category">{t.field_category}</Label>
                <Input
                  id="client-category"
                  value={form.category}
                  onChange={event => update("category", event.target.value)}
                  placeholder={t.new_client_category_placeholder}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="client-address">{t.field_address}</Label>
                <Input
                  id="client-address"
                  value={form.address}
                  onChange={event => update("address", event.target.value)}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-[1fr_7rem]">
                <div className="grid gap-2">
                  <Label htmlFor="client-city">{t.col_city}</Label>
                  <Input
                    id="client-city"
                    value={form.city}
                    onChange={event => update("city", event.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="client-postal-code">{t.new_client_postal_code}</Label>
                  <Input
                    id="client-postal-code"
                    value={form.postal_code}
                    onChange={event => update("postal_code", event.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="client-country">{t.field_country}</Label>
                <Select value={form.country || "__none"} onValueChange={value => update("country", value === "__none" ? "" : value)}>
                  <SelectTrigger id="client-country">
                    <SelectValue placeholder={t.select_country_placeholder} />
                  </SelectTrigger>
                  <SelectContent className={COUNTRY_SELECT_CONTENT_CLASS}>
                    <SelectItem value="__none">—</SelectItem>
                    <CountrySelectItems />
                  </SelectContent>
                </Select>
              </div>
            </section>
          </div>

          <div className="border-t border-zinc-100/90 p-4">
            <div className="grid gap-2">
              <Label htmlFor="client-notes">{t.section_notes}</Label>
              <Textarea
                id="client-notes"
                value={form.notes}
                onChange={event => update("notes", event.target.value)}
                placeholder={t.new_client_notes_placeholder}
                className="min-h-24"
              />
            </div>
          </div>

          {error && (
            <div className="mx-4 mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 border-t border-zinc-100/90 px-4 py-4 sm:flex-row sm:justify-end">
            <Button asChild variant="outline" type="button">
              <Link href="/clients">{t.cancel}</Link>
            </Button>
            <Button type="submit" disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              {saving ? t.new_client_creating : t.new_client_create}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
