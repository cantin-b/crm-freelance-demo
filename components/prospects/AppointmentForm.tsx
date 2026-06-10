"use client";

import { useState } from "react";
import { Loader2, AlertTriangle, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { TimePicker } from "@/components/ui/TimePicker";
import { APPOINTMENT_DURATIONS, APPOINTMENT_TYPES } from "@/lib/constants";
import { useT } from "@/components/providers/UiLanguageProvider";
import type { Appointment } from "@/types";

type Warning = {
  prospectId: number;
  prospectName: string;
  callback_at: string;
};

type Props = {
  prospectId: number;
  appointment?: Appointment; // present → edit mode
  onSuccess: (appointment: Appointment) => void;
  onCancel: () => void;
};

const pad = (n: number) => String(n).padStart(2, "0");

function isoToDateStr(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function isoToTimeStr(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatConflictDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long", day: "2-digit", month: "long",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso));
}

export function AppointmentForm({ prospectId, appointment, onSuccess, onCancel }: Props) {
  const t = useT();
  const editing = !!appointment;

  const [title, setTitle] = useState(appointment?.title ?? "");
  const [dateStr, setDateStr] = useState(appointment ? isoToDateStr(appointment.date) : "");
  const [timeStr, setTimeStr] = useState(appointment ? isoToTimeStr(appointment.date) : "");
  const [duration, setDuration] = useState<number>(appointment?.duration ?? 30);
  const [type, setType] = useState(appointment?.type ?? "call");
  const [meetLink, setMeetLink] = useState(appointment?.meet_link ?? "");
  const [notes, setNotes] = useState(appointment?.notes ?? "");

  const [saving, setSaving] = useState(false);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<Warning[]>([]);

  const canSubmit = title.trim() && dateStr && timeStr && duration && type && !saving;

  async function handleSubmit() {
    setConflictError(null);
    setError(null);
    setWarnings([]);

    // Build an ISO datetime from the local date + time inputs
    const localDate = new Date(`${dateStr}T${timeStr}:00`);
    if (isNaN(localDate.getTime())) {
      setError(t.invalid_date_time);
      return;
    }

    const payload = {
      title: title.trim(),
      date: localDate.toISOString(),
      duration,
      type,
      meet_link: type === "visio" ? meetLink.trim() || null : null,
      notes: notes.trim() || null,
    };

    setSaving(true);
    try {
      const url = editing
        ? `/api/appointments/${appointment!.id}`
        : `/api/prospects/${prospectId}/appointments`;
      const res = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 409) {
        const data = await res.json();
        const c = data.conflictWith;
        setConflictError(
          t.conflict_with(c.title, formatConflictDate(c.date))
        );
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Save failed.");
      }

      const data = await res.json();
      const saved: Appointment = data.appointment;
      const resultWarnings: Warning[] = data.warnings ?? [];

      onSuccess(saved);

      if (resultWarnings.length > 0) {
        // Saved successfully, but surface the callback warnings before closing
        setWarnings(resultWarnings);
      } else {
        onCancel();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-zinc-200/90 bg-white/90 p-4 shadow-surface">
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-500">{t.form_title_label}</label>
        <Input
          className="h-9 text-sm"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t.form_title_placeholder}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs font-medium text-zinc-500">{t.form_date}</label>
          <Input
            type="date"
            className="h-9 text-sm"
            value={dateStr}
            onChange={(e) => setDateStr(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-zinc-500">{t.form_start_time}</label>
          <TimePicker value={timeStr} onChange={setTimeStr} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs font-medium text-zinc-500">{t.form_duration}</label>
          <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {APPOINTMENT_DURATIONS.map((d) => (
                <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-zinc-500">{t.form_type}</label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {APPOINTMENT_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {type === "visio" && (
        <div className="space-y-1">
          <label className="text-xs font-medium text-zinc-500">{t.form_meet_link}</label>
          <Input
            className="h-9 text-sm"
            value={meetLink}
            onChange={(e) => setMeetLink(e.target.value)}
            placeholder={t.form_meet_link_placeholder}
          />
        </div>
      )}

      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-500">{t.form_notes}</label>
        <Textarea
          className="min-h-20 resize-y text-sm"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t.form_notes_placeholder}
        />
      </div>

      {conflictError && (
        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {conflictError}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {warnings.map((w) => (
        <div
          key={w.prospectId}
          className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
        >
          <Bell className="mt-0.5 h-4 w-4 shrink-0" />
          {t.callback_warning(w.prospectName)}
        </div>
      ))}

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={saving}>
          {warnings.length > 0 ? t.close : t.cancel}
        </Button>
        <Button size="sm" className="min-w-20 gap-1.5" onClick={handleSubmit} disabled={!canSubmit}>
          {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> {t.saving}</> : t.save}
        </Button>
      </div>
    </div>
  );
}
