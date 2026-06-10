import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildProspectWhere } from "@/lib/prospectFilters";

const EXPORT_COLUMNS = [
  "id", "name", "category", "address", "postal_code", "city", "country",
  "phone", "email", "website", "gm_link", "rating", "reviews_count",
  "opening_hours", "owner", "facebook_url", "instagram_url", "linkedin_url",
  "status", "callback_at", "callback_note", "notes", "list_name",
  "created_at", "updated_at",
] as const;

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCSV(rows: Record<string, unknown>[]): string {
  const header = EXPORT_COLUMNS.join(",");
  const lines = rows.map(row =>
    EXPORT_COLUMNS.map(col => escapeCell(row[col])).join(",")
  );
  return [header, ...lines].join("\r\n");
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  // Support exporting by explicit IDs or by current filters
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let where: any = {};

  const ids = params.get("ids");
  if (ids) {
    where = { id: { in: ids.split(",").map(Number) } };
  } else {
    where = buildProspectWhere(params);
  }

  const prospects = await prisma.prospect.findMany({
    where,
    orderBy: { updated_at: "desc" },
  });

  const csv = toCSV(prospects as unknown as Record<string, unknown>[]);
  const filename = `prospects_${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
