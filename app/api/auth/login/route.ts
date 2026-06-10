import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { createSession, getSessionCookieOptions } from "@/lib/auth";

export async function POST(request: Request) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    create: {},
    update: {},
  });

  // Email must match gmail_user (case-insensitive)
  if (settings.gmail_user && email.toLowerCase() !== settings.gmail_user.toLowerCase()) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // First launch: password_hash is empty → set password from this first login
  if (!settings.password_hash) {
    const hash = await bcrypt.hash(password, 10);
    await prisma.settings.update({ where: { id: 1 }, data: { password_hash: hash } });
  } else {
    const valid = await bcrypt.compare(password, settings.password_hash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
  }

  const token = await createSession();
  const opts = getSessionCookieOptions();
  const cookieStore = await cookies();
  cookieStore.set(opts.name, token, opts);

  return NextResponse.json({ success: true });
}
