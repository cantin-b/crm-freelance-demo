import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

const ALLOWED_CATEGORIES = ["form", "quote", "invoice", "other"];
const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".docx", ".xlsx"];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

/** Keep alphanumerics, dashes and dots; collapse whitespace to dashes. */
function sanitizeFilename(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9.-]/g, "");
}

// GET → all documents for the prospect, newest first
export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const documents = await prisma.document.findMany({
    where: { prospect_id: parseInt(id, 10) },
    orderBy: { created_at: "desc" },
  });
  return NextResponse.json(documents);
}

// POST → upload (multipart/form-data: file + category)
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const prospectId = parseInt(id, 10);

  const prospect = await prisma.prospect.findUnique({
    where: { id: prospectId },
    select: { id: true, uuid: true },
  });
  if (!prospect) {
    return NextResponse.json({ error: "Prospect not found." }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const category = formData.get("category");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  if (typeof category !== "string" || !ALLOWED_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Invalid category." }, { status: 400 });
  }

  const ext = path.extname(file.name).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return NextResponse.json(
      { error: `Unsupported file type. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}` },
      { status: 400 }
    );
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File exceeds the 10 MB limit." }, { status: 400 });
  }

  // Ensure uploads/[uuid]/ exists
  const dirRelative = path.join("uploads", prospect.uuid);
  const dirAbsolute = path.join(process.cwd(), dirRelative);
  fs.mkdirSync(dirAbsolute, { recursive: true });

  // Write the file to disk as [timestamp]-[sanitized-name]
  const safeName = sanitizeFilename(file.name);
  const diskName = `${Date.now()}-${safeName}`;
  const filepathRelative = path.join(dirRelative, diskName);
  const filepathAbsolute = path.join(process.cwd(), filepathRelative);

  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(filepathAbsolute, buffer);

  // Overwrite logic: a document with the same original filename already exists?
  const existing = await prisma.document.findFirst({
    where: { prospect_id: prospectId, filename: file.name },
  });

  let document;
  if (existing) {
    // Remove the old file from disk (ignore if already gone)
    try {
      fs.unlinkSync(path.join(process.cwd(), existing.filepath));
    } catch {
      /* file may already be missing */
    }
    document = await prisma.document.update({
      where: { id: existing.id },
      data: {
        filepath: filepathRelative,
        category,
        size: file.size,
        created_at: new Date(),
      },
    });
  } else {
    document = await prisma.document.create({
      data: {
        prospect_id: prospectId,
        filename: file.name,
        filepath: filepathRelative,
        category,
        size: file.size,
      },
    });
  }

  return NextResponse.json(document);
}
