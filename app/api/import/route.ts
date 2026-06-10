import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type ImportRow = {
  name?: string;
  category?: string;
  address?: string;
  postal_code?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  gm_link?: string;
  rating?: string;
  reviews_count?: string;
  opening_hours?: string;
  owner?: string;
  facebook_url?: string;
  instagram_url?: string;
  linkedin_url?: string;
};

function str(v?: string): string | null {
  const s = v?.trim();
  return s || null;
}

function float(v?: string): number | null {
  if (!v?.trim()) return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

function int(v?: string): number | null {
  if (!v?.trim()) return null;
  const n = parseInt(v, 10);
  return isNaN(n) ? null : n;
}

export async function POST(request: Request) {
  const body = await request.json() as { rows: ImportRow[]; list_name: string };
  const { rows, list_name } = body;

  if (!list_name?.trim()) {
    return NextResponse.json({ error: "List name is required." }, { status: 400 });
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "No rows to import." }, { status: 400 });
  }

  // Batch-fetch existing gm_links to avoid N+1 queries
  const incomingLinks = rows
    .map(r => r.gm_link?.trim())
    .filter((l): l is string => Boolean(l));

  let existingLinks = new Set<string>();
  if (incomingLinks.length > 0) {
    const found = await prisma.prospect.findMany({
      where: { gm_link: { in: incomingLinks } },
      select: { gm_link: true },
    });
    existingLinks = new Set(found.map(p => p.gm_link).filter((l): l is string => Boolean(l)));
  }

  const toInsert: {
    name: string;
    list_name: string;
    category: string | null;
    address: string | null;
    postal_code: string | null;
    city: string | null;
    country: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    gm_link: string | null;
    rating: number | null;
    reviews_count: number | null;
    opening_hours: string | null;
    owner: string | null;
    facebook_url: string | null;
    instagram_url: string | null;
    linkedin_url: string | null;
  }[] = [];

  let skipped = 0;

  for (const row of rows) {
    const gmLink = str(row.gm_link);

    if (gmLink && existingLinks.has(gmLink)) {
      skipped++;
      continue;
    }
    if (!row.name?.trim()) {
      skipped++;
      continue;
    }

    toInsert.push({
      name: row.name.trim(),
      list_name: list_name.trim(),
      category: str(row.category),
      address: str(row.address),
      postal_code: str(row.postal_code),
      city: str(row.city),
      country: str(row.country),
      phone: str(row.phone),
      email: str(row.email),
      website: str(row.website),
      gm_link: gmLink,
      rating: float(row.rating),
      reviews_count: int(row.reviews_count),
      opening_hours: str(row.opening_hours),
      owner: str(row.owner),
      facebook_url: str(row.facebook_url),
      instagram_url: str(row.instagram_url),
      linkedin_url: str(row.linkedin_url),
    });
  }

  if (toInsert.length > 0) {
    const CHUNK = 500;
    for (let i = 0; i < toInsert.length; i += CHUNK) {
      await prisma.prospect.createMany({ data: toInsert.slice(i, i + CHUNK) });
    }
  }

  // Create or touch the List record for this batch
  await prisma.list.upsert({
    where: { name: list_name.trim() },
    update: {},
    create: { name: list_name.trim() },
  });

  return NextResponse.json({ imported: toInsert.length, skipped });
}
