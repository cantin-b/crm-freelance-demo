import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { is_visible } = await req.json() as { is_visible?: boolean };
  if (is_visible === undefined) {
    return NextResponse.json({ error: "is_visible is required" }, { status: 400 });
  }
  const list = await prisma.list.update({
    where: { id: parseInt(id, 10) },
    data: { is_visible },
  });
  return NextResponse.json(list);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const listId = parseInt(id, 10);

  const list = await prisma.list.findUnique({ where: { id: listId } });
  if (!list) return NextResponse.json({ error: "List not found" }, { status: 404 });

  const HIGH_VALUE = ["proposal_sent", "client", "archived"];

  // Delete non-high-value prospects from this list
  await prisma.prospect.deleteMany({
    where: { list_name: list.name, status: { notIn: HIGH_VALUE } },
  });

  await prisma.list.delete({ where: { id: listId } });
  return NextResponse.json({ ok: true });
}
