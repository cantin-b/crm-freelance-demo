import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const language = searchParams.get("language");
  const templates = await prisma.emailTemplate.findMany({
    where: language ? { language } : undefined,
    orderBy: { updated_at: "desc" },
  });
  return NextResponse.json(templates);
}

export async function POST(request: Request) {
  const { name, subject, body, category, language } = await request.json() as {
    name: string;
    subject: string;
    body: string;
    category?: string | null;
    language?: string;
  };

  if (!name?.trim() || !subject?.trim()) {
    return NextResponse.json(
      { error: "Name and subject are required." },
      { status: 400 }
    );
  }

  const template = await prisma.emailTemplate.create({
    data: {
      name: name.trim(),
      subject: subject.trim(),
      body: body ?? "",
      category: category ?? null,
      language: language === "en" ? "en" : "fr",
    },
  });
  return NextResponse.json(template, { status: 201 });
}
