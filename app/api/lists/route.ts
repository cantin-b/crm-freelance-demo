import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const lists = await prisma.list.findMany({
    orderBy: { created_at: "desc" },
  });
  return NextResponse.json(lists);
}

export async function POST(req: Request) {
  try {
    const { name } = await req.json() as { name?: string };
    if (!name?.trim()) {
      return NextResponse.json({ error: "List name is required" }, { status: 400 });
    }
    const list = await prisma.list.create({ data: { name: name.trim() } });
    return NextResponse.json(list);
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes("Unique constraint")) {
      return NextResponse.json({ error: "A list with this name already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create list" }, { status: 500 });
  }
}
