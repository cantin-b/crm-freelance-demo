import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findConflict, findCallbackWarnings } from "@/lib/appointments";

type Params = { params: Promise<{ id: string }> };

const VALID_TYPES = ["call", "visio"];

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

// GET → all appointments for the prospect, soonest first
export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const appointments = await prisma.appointment.findMany({
    where: { prospect_id: parseInt(id, 10) },
    orderBy: { date: "asc" },
  });
  return NextResponse.json(appointments);
}

// POST → create an appointment (with conflict blocking + callback warnings)
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const prospectId = parseInt(id, 10);
  const body = await request.json();

  const { title, date, duration, type, meet_link, notes } = body ?? {};

  // Validation
  if (typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }
  const when = new Date(date);
  if (isNaN(when.getTime())) {
    return NextResponse.json({ error: "Invalid date." }, { status: 400 });
  }
  if (typeof duration !== "number" || duration <= 0 || duration % 15 !== 0) {
    return NextResponse.json({ error: "Duration must be a multiple of 15." }, { status: 400 });
  }
  if (!VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: "Invalid type." }, { status: 400 });
  }
  if (meet_link && (typeof meet_link !== "string" || !isValidUrl(meet_link))) {
    return NextResponse.json({ error: "Invalid meet link URL." }, { status: 400 });
  }

  // Conflict check (blocking)
  const conflict = await findConflict(when, duration);
  if (conflict) {
    return NextResponse.json({ error: "Conflict", conflictWith: conflict }, { status: 409 });
  }

  // Callback warnings (non-blocking)
  const warnings = await findCallbackWarnings(when, duration, prospectId);

  const appointment = await prisma.appointment.create({
    data: {
      prospect_id: prospectId,
      title: title.trim(),
      date: when,
      duration,
      type,
      meet_link: meet_link?.trim() || null,
      notes: typeof notes === "string" ? notes.trim() || null : null,
    },
  });

  return NextResponse.json({ appointment, warnings }, { status: 201 });
}
