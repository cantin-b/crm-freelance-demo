import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findConflict, findCallbackWarnings } from "@/lib/appointments";

type Params = { params: Promise<{ appointmentId: string }> };

const VALID_TYPES = ["call", "visio"];
const VALID_STATUS = ["scheduled", "completed", "cancelled"];

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

// PATCH → partial update; re-checks conflict if date/duration change
export async function PATCH(request: Request, { params }: Params) {
  const { appointmentId } = await params;
  const apptId = parseInt(appointmentId, 10);

  const current = await prisma.appointment.findUnique({ where: { id: apptId } });
  if (!current) {
    return NextResponse.json({ error: "Appointment not found." }, { status: 404 });
  }

  const body = await request.json();
  const data: Record<string, unknown> = {};

  if ("title" in body) {
    if (typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json({ error: "Title is required." }, { status: 400 });
    }
    data.title = body.title.trim();
  }
  if ("type" in body) {
    if (!VALID_TYPES.includes(body.type)) {
      return NextResponse.json({ error: "Invalid type." }, { status: 400 });
    }
    data.type = body.type;
  }
  if ("status" in body) {
    if (!VALID_STATUS.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }
    data.status = body.status;
  }
  if ("meet_link" in body) {
    if (body.meet_link && !isValidUrl(String(body.meet_link))) {
      return NextResponse.json({ error: "Invalid meet link URL." }, { status: 400 });
    }
    data.meet_link = body.meet_link ? String(body.meet_link).trim() : null;
  }
  if ("notes" in body) {
    data.notes = typeof body.notes === "string" ? body.notes.trim() || null : null;
  }

  let when = new Date(current.date);
  let duration = current.duration;
  let timeChanged = false;

  if ("date" in body) {
    const d = new Date(body.date);
    if (isNaN(d.getTime())) {
      return NextResponse.json({ error: "Invalid date." }, { status: 400 });
    }
    when = d;
    data.date = d;
    timeChanged = true;
  }
  if ("duration" in body) {
    if (typeof body.duration !== "number" || body.duration <= 0 || body.duration % 15 !== 0) {
      return NextResponse.json({ error: "Duration must be a multiple of 15." }, { status: 400 });
    }
    duration = body.duration;
    data.duration = body.duration;
    timeChanged = true;
  }

  // Re-run conflict detection only when the time range changed and it stays scheduled
  const willBeScheduled = (data.status as string | undefined) ?? current.status;
  let warnings: Awaited<ReturnType<typeof findCallbackWarnings>> = [];
  if (timeChanged && willBeScheduled === "scheduled") {
    const conflict = await findConflict(when, duration, apptId);
    if (conflict) {
      return NextResponse.json({ error: "Conflict", conflictWith: conflict }, { status: 409 });
    }
    warnings = await findCallbackWarnings(when, duration, current.prospect_id);
  }

  const appointment = await prisma.appointment.update({ where: { id: apptId }, data });
  return NextResponse.json({ appointment, warnings });
}

// DELETE → remove the appointment
export async function DELETE(_req: Request, { params }: Params) {
  const { appointmentId } = await params;
  await prisma.appointment.delete({ where: { id: parseInt(appointmentId, 10) } });
  return NextResponse.json({ success: true });
}
