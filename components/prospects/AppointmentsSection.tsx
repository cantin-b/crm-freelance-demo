"use client";

import { useState } from "react";
import {
  Plus, Pencil, CheckCircle2, RotateCcw, Trash2, ExternalLink,
  ChevronDown, ChevronRight, Phone, Video, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppointmentForm } from "./AppointmentForm";
import { APPOINTMENT_DURATIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useT } from "@/components/providers/UiLanguageProvider";
import type { Appointment } from "@/types";

type Props = {
  prospectId: number;
  initialAppointments: Appointment[];
};

const STATUS_STYLES: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-zinc-100 text-zinc-500",
};

const pad = (n: number) => String(n).padStart(2, "0");

function durationLabel(minutes: number): string {
  return APPOINTMENT_DURATIONS.find((d) => d.value === minutes)?.label ?? `${minutes} min`;
}


function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const datePart = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  }).format(d);
  const capitalised = datePart.charAt(0).toUpperCase() + datePart.slice(1);
  return `${capitalised} à ${pad(d.getHours())}h${pad(d.getMinutes())}`;
}

export function AppointmentsSection({ prospectId, initialAppointments }: Props) {
  const t = useT();
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showPast, setShowPast] = useState(false);

  const upcoming = appointments
    .filter((a) => a.status === "scheduled")
    .sort((a, b) => +new Date(a.date) - +new Date(b.date));
  const past = appointments
    .filter((a) => a.status !== "scheduled")
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));

  function handleSuccess(saved: Appointment) {
    setAppointments((prev) => [...prev.filter((a) => a.id !== saved.id), saved]);
  }
  function handleCancel() {
    setShowForm(false);
    setEditingId(null);
  }

  async function changeStatus(appt: Appointment, status: string) {
    try {
      const res = await fetch(`/api/appointments/${appt.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) return;
      const data = await res.json();
      handleSuccess(data.appointment);
    } catch {
      /* ignore */
    }
  }

  async function handleDelete(appt: Appointment) {
    if (!window.confirm(t.delete_appt_confirm(appt.title))) return;
    try {
      const res = await fetch(`/api/appointments/${appt.id}`, { method: "DELETE" });
      if (!res.ok) return;
      setAppointments((prev) => prev.filter((a) => a.id !== appt.id));
    } catch {
      /* ignore */
    }
  }

  function renderCard(appt: Appointment) {
    if (editingId === appt.id) {
      return (
        <AppointmentForm
          key={appt.id}
          prospectId={prospectId}
          appointment={appt}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      );
    }

    const TypeIcon = appt.type === "visio" ? Video : Phone;
    return (
      <div key={appt.id} className="space-y-1.5 rounded-xl border border-zinc-200/90 bg-white p-3.5 shadow-surface">
        {/* Line 1: title + badges */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-zinc-900">{appt.title}</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
            <TypeIcon className="h-3 w-3" /> {t.appt_type(appt.type)}
          </span>
          <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_STYLES[appt.status])}>
            {t.appt_status(appt.status)}
          </span>
        </div>

        {/* Line 2: date + duration */}
        <div className="flex items-center gap-1.5 text-sm text-zinc-600">
          <Clock className="h-3.5 w-3.5 text-zinc-400" />
          <span className="capitalize">{formatDateTime(appt.date)}</span>
          <span className="text-zinc-400">· {durationLabel(appt.duration)}</span>
        </div>

        {/* Line 3: meet link */}
        {appt.meet_link && (
          <a
            href={appt.meet_link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-brand-navy hover:text-brand-red hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" /> {t.join_meeting}
          </a>
        )}

        {/* Line 4: notes */}
        {appt.notes && <p className="text-sm text-zinc-500">{appt.notes}</p>}

        {/* Actions */}
        <div className="flex items-center gap-1 pt-1">
          <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs text-zinc-600"
            onClick={() => { setShowForm(false); setEditingId(appt.id); }}>
            <Pencil className="h-3.5 w-3.5" /> {t.edit}
          </Button>

          {appt.status === "scheduled" ? (
            <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
              onClick={() => changeStatus(appt, "completed")}>
              <CheckCircle2 className="h-3.5 w-3.5" /> {t.mark_complete}
            </Button>
          ) : (
            <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs text-zinc-600"
              onClick={() => changeStatus(appt, "scheduled")}>
              <RotateCcw className="h-3.5 w-3.5" /> {t.reopen}
            </Button>
          )}

          <Button variant="ghost" size="sm" className="ml-auto h-7 w-7 p-0 text-red-500 hover:bg-red-50 hover:text-red-700"
            onClick={() => handleDelete(appt)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Upcoming */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{t.upcoming_label}</h4>
          {!showForm && (
            <Button size="sm" variant="outline" className="h-8 gap-1.5"
              onClick={() => { setEditingId(null); setShowForm(true); }}>
              <Plus className="h-3.5 w-3.5" /> {t.new_appointment_btn}
            </Button>
          )}
        </div>

        {showForm && (
          <AppointmentForm
            prospectId={prospectId}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        )}

        {upcoming.length === 0 && !showForm ? (
          <p className="text-sm text-zinc-400">{t.no_upcoming_appointments}</p>
        ) : (
          <div className="space-y-2.5">{upcoming.map(renderCard)}</div>
        )}
      </div>

      {/* Past */}
      {past.length > 0 && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setShowPast((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-700"
          >
            {showPast ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            {t.show_past_appointments(past.length)}
          </button>
          {showPast && <div className="space-y-2.5">{past.map(renderCard)}</div>}
        </div>
      )}
    </div>
  );
}
