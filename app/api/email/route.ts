import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/gmail";

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const prospectId = parseInt(formString(formData, "prospectId"), 10);
  const to = formString(formData, "to");
  const subject = formString(formData, "subject");
  const html = formString(formData, "html");
  const attachmentEntries = formData
    .getAll("attachment")
    .filter((entry): entry is File => entry instanceof File);

  if (!to || !subject) {
    return NextResponse.json(
      { error: "Recipient and subject are required." },
      { status: 400 }
    );
  }

  if (attachmentEntries.length > 1) {
    return NextResponse.json(
      { error: "Only one attachment is supported." },
      { status: 400 }
    );
  }

  const attachment = attachmentEntries[0];
  if (attachment && attachment.size > MAX_ATTACHMENT_BYTES) {
    return NextResponse.json(
      { error: "Attachment must be 10 MB or smaller." },
      { status: 400 }
    );
  }

  // Load settings (Gmail credentials)
  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });

  if (!settings.gmail_user || !settings.gmail_app_password) {
    return NextResponse.json(
      { error: "Gmail credentials are not configured. Go to Settings first." },
      { status: 400 }
    );
  }

  try {
    await sendEmail({
      to,
      subject,
      html,
      settings,
      attachments: attachment
        ? [{
            filename: attachment.name,
            content: Buffer.from(await attachment.arrayBuffer()),
            contentType: attachment.type || undefined,
          }]
        : undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "SMTP error";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  // Auto-update status to "contacted" if currently "new"
  if (!isNaN(prospectId)) {
    const prospect = await prisma.prospect.findUnique({
      where: { id: prospectId },
      select: { status: true },
    });
    if (prospect?.status === "new") {
      await prisma.prospect.update({
        where: { id: prospectId },
        data: { status: "contacted" },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
