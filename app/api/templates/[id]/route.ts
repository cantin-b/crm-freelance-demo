import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const template = await prisma.emailTemplate.findUnique({
    where: { id: parseInt(id, 10) },
  });
  if (!template) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json(template);
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const { name, subject, body, category, language } = await request.json() as {
    name?: string;
    subject?: string;
    body?: string;
    category?: string | null;
    language?: string;
  };

  const template = await prisma.emailTemplate.update({
    where: { id: parseInt(id, 10) },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(subject !== undefined && { subject: subject.trim() }),
      ...(body !== undefined && { body }),
      ...(category !== undefined && { category }),
      ...(language !== undefined && { language: language === "en" ? "en" : "fr" }),
    },
  });
  return NextResponse.json(template);
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  await prisma.emailTemplate.delete({ where: { id: parseInt(id, 10) } });
  return NextResponse.json({ ok: true });
}
