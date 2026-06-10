import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/gmail";

export async function POST() {
  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    create: {},
    update: {},
  });

  if (!settings.gmail_user || !settings.gmail_app_password) {
    return NextResponse.json(
      { error: "Email not configured in Settings" },
      { status: 400 }
    );
  }

  // Generate a random 12-char password
  const newPassword = crypto.randomBytes(8).toString("base64").slice(0, 12);
  const hash = await bcrypt.hash(newPassword, 10);
  await prisma.settings.update({ where: { id: 1 }, data: { password_hash: hash } });

  await sendEmail({
    to: settings.gmail_user,
    subject: "Your CRM - New password",
    html: `<p>Your new password is: <strong>${newPassword}</strong></p><p>Please log in and update it in Settings.</p>`,
    settings: {
      gmail_user: settings.gmail_user,
      gmail_app_password: settings.gmail_app_password,
      sender_name: settings.sender_name || "CRM",
    },
  });

  return NextResponse.json({ success: true });
}
