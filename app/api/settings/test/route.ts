import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/gmail";

export async function POST(request: Request) {
  const body = await request.json() as {
    gmail_user: string;
    gmail_app_password: string;
    sender_name: string;
  };

  const { gmail_user, gmail_app_password, sender_name } = body;

  if (!gmail_user || !gmail_app_password) {
    return NextResponse.json(
      { error: "Gmail address and app password are required." },
      { status: 400 }
    );
  }

  try {
    await sendEmail({
      to: gmail_user,
      subject: "Freelance CRM — Connection test",
      html: "<p>Your Gmail SMTP connection is working correctly.</p>",
      settings: { gmail_user, gmail_app_password, sender_name },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
