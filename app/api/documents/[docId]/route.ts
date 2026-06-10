import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ docId: string }> };

// DELETE → remove the file from disk and the DB entry
export async function DELETE(_req: Request, { params }: Params) {
  const { docId } = await params;
  const document = await prisma.document.findUnique({
    where: { id: parseInt(docId, 10) },
  });
  if (!document) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  try {
    fs.unlinkSync(path.join(process.cwd(), document.filepath));
  } catch {
    /* file may already be missing */
  }

  await prisma.document.delete({ where: { id: document.id } });
  return NextResponse.json({ success: true });
}
