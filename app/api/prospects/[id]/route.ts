import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const prospect = await prisma.prospect.findUnique({ where: { id: parseInt(id, 10) } });
  if (!prospect) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json(prospect);
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const prospect = await prisma.prospect.update({
    where: { id: parseInt(id, 10) },
    data: body,
  });
  return NextResponse.json(prospect);
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  await prisma.prospect.delete({ where: { id: parseInt(id, 10) } });
  return NextResponse.json({ ok: true });
}
