import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ docId: string }> };

const CONTENT_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
};

export async function GET(_req: Request, { params }: Params) {
  const { docId } = await params;
  const document = await prisma.document.findUnique({
    where: { id: parseInt(docId, 10) },
  });
  if (!document) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  const ext = path.extname(document.filename).toLowerCase();
  const contentType = CONTENT_TYPES[ext];
  if (!contentType) {
    return new NextResponse(null, { status: 415 });
  }

  let buffer: Buffer;
  try {
    buffer = fs.readFileSync(path.join(process.cwd(), document.filepath));
  } catch {
    return NextResponse.json({ error: "File missing on disk." }, { status: 404 });
  }

  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${document.filename}"`,
      "Content-Length": String(buffer.length),
    },
  });
}
