import { prisma } from "@/lib/prisma";
import { AppointmentsView } from "@/components/appointments/AppointmentsView";
import type { AppointmentWithProspect } from "@/types";

export default async function AppointmentsPage() {
  const raw = await prisma.appointment.findMany({
    include: {
      prospect: {
        select: { id: true, name: true, city: true, phone: true, status: true },
      },
    },
    orderBy: { date: "asc" },
  });

  const appointments: AppointmentWithProspect[] = JSON.parse(JSON.stringify(raw));

  return <AppointmentsView appointments={appointments} />;
}
