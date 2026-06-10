import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET → all appointments (all statuses) with their associated prospect
export async function GET() {
  const appointments = await prisma.appointment.findMany({
    include: {
      prospect: {
        select: { id: true, name: true, city: true, phone: true, status: true },
      },
    },
    orderBy: { date: "asc" },
  });
  return NextResponse.json(JSON.parse(JSON.stringify(appointments)));
}
