import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(request: Request) {
  const authenticated = await getSession();
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { currentPassword, newPassword } = await request.json();

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    create: {},
    update: {},
  });

  const valid = await bcrypt.compare(currentPassword, settings.password_hash);
  if (!valid) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
  }

  const hash = await bcrypt.hash(newPassword, 10);
  await prisma.settings.update({ where: { id: 1 }, data: { password_hash: hash } });

  return NextResponse.json({ success: true });
}
