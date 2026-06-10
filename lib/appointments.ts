import { prisma } from "@/lib/prisma";

export type ConflictInfo = {
  id: number;
  title: string;
  date: string;
  duration: number;
};

/**
 * Find a scheduled appointment whose time range overlaps [date, date+duration).
 * The check is global across all prospects (it's the freelancer's calendar).
 * `excludeId` skips the appointment currently being edited.
 * Overlap rule: (date < existingEnd) AND (end > existingDate)
 */
export async function findConflict(
  date: Date,
  duration: number,
  excludeId?: number
): Promise<ConflictInfo | null> {
  const end = new Date(date.getTime() + duration * 60_000);

  const scheduled = await prisma.appointment.findMany({
    where: {
      status: "scheduled",
      ...(excludeId != null ? { id: { not: excludeId } } : {}),
    },
  });

  for (const appt of scheduled) {
    const existingStart = new Date(appt.date);
    const existingEnd = new Date(existingStart.getTime() + appt.duration * 60_000);
    if (date < existingEnd && end > existingStart) {
      return {
        id: appt.id,
        title: appt.title,
        date: existingStart.toISOString(),
        duration: appt.duration,
      };
    }
  }
  return null;
}

export type CallbackWarning = {
  prospectId: number;
  prospectName: string;
  callback_at: string;
};

/**
 * Non-blocking: find other prospects whose callback_at falls within [date, end].
 */
export async function findCallbackWarnings(
  date: Date,
  duration: number,
  excludeProspectId: number
): Promise<CallbackWarning[]> {
  const end = new Date(date.getTime() + duration * 60_000);

  const prospects = await prisma.prospect.findMany({
    where: {
      id: { not: excludeProspectId },
      callback_at: { gte: date, lte: end },
    },
    select: { id: true, name: true, callback_at: true },
  });

  return prospects
    .filter((p) => p.callback_at != null)
    .map((p) => ({
      prospectId: p.id,
      prospectName: p.name,
      callback_at: (p.callback_at as Date).toISOString(),
    }));
}
