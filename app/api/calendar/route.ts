import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET → merged calendar events: scheduled appointments + pending callbacks
export async function GET() {
  const [appointments, callbacks] = await Promise.all([
    prisma.appointment.findMany({
      where: { status: "scheduled" },
      include: {
        prospect: { select: { id: true, name: true, city: true, phone: true } },
      },
    }),
    prisma.prospect.findMany({
      where: { callback_at: { not: null } },
      select: {
        id: true, name: true, city: true, phone: true,
        callback_at: true, callback_note: true,
      },
    }),
  ]);

  const appointmentEvents = appointments.map((a) => {
    const start = new Date(a.date);
    return {
      id: `appointment-${a.id}`,
      title: `${a.title} — ${a.prospect.name}`,
      start,
      end: new Date(start.getTime() + a.duration * 60 * 1000),
      type: "appointment" as const,
      meta: {
        appointmentId: a.id,
        prospectId: a.prospect.id,
        prospectName: a.prospect.name,
        city: a.prospect.city,
        phone: a.prospect.phone,
        appointmentType: a.type,
        meetLink: a.meet_link,
        notes: a.notes,
        duration: a.duration,
      },
    };
  });

  const callbackEvents = callbacks.map((p) => {
    const start = new Date(p.callback_at!);
    return {
      id: `callback-${p.id}`,
      title: `📞 ${p.name}`,
      start,
      end: new Date(start.getTime() + 30 * 60 * 1000),
      type: "callback" as const,
      meta: {
        prospectId: p.id,
        prospectName: p.name,
        city: p.city,
        phone: p.phone,
        callbackNote: p.callback_note,
      },
    };
  });

  const events = [...appointmentEvents, ...callbackEvents];
  return NextResponse.json({ events: JSON.parse(JSON.stringify(events)) });
}
