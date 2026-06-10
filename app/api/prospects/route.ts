import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildProspectWhere } from "@/lib/prospectFilters";

const PROSPECT_STATUSES = ["new", "contacted", "callback", "not_interested", "no_answer"];
const PROSPECT_ORDER = [{ updated_at: "desc" as const }, { id: "desc" as const }];

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(params.get("page") ?? "1", 10));
  const limit = Math.min(200, Math.max(1, parseInt(params.get("limit") ?? "50", 10)));
  const baseWhere = buildProspectWhere(params);

  // Only show prospects from visible lists, restricted to prospect-only statuses
  const visibleLists = await prisma.list.findMany({
    where: { is_visible: true },
    select: { name: true },
  });
  const visibleNames = visibleLists.map(l => l.name);

  const where = {
    ...baseWhere,
    status: { in: PROSPECT_STATUSES },
    list_name: { in: visibleNames },
  };

  const [prospects, total, navRows, rawCategories, rawListNames] = await Promise.all([
    prisma.prospect.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: PROSPECT_ORDER,
    }),
    prisma.prospect.count({ where }),
    prisma.prospect.findMany({
      where,
      select: { id: true },
      orderBy: PROSPECT_ORDER,
    }),
    prisma.prospect.findMany({
      select: { category: true },
      where: { category: { not: null } },
      distinct: ["category"],
      orderBy: { category: "asc" },
    }),
    prisma.prospect.findMany({
      select: { list_name: true },
      where: { list_name: { not: null } },
      distinct: ["list_name"],
      orderBy: { list_name: "asc" },
    }),
  ]);

  return NextResponse.json({
    prospects,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    navIds: navRows.map(r => r.id),
    categories: rawCategories.map(r => r.category).filter(Boolean),
    listNames: rawListNames.map(r => r.list_name).filter(Boolean),
  });
}

// Bulk status update
export async function PATCH(request: Request) {
  const { ids, status } = await request.json() as { ids: number[]; status: string };
  if (!Array.isArray(ids) || ids.length === 0 || !status) {
    return NextResponse.json({ error: "ids and status are required." }, { status: 400 });
  }
  await prisma.prospect.updateMany({ where: { id: { in: ids } }, data: { status } });
  return NextResponse.json({ ok: true, updated: ids.length });
}

// Bulk delete
export async function DELETE(request: Request) {
  const { ids } = await request.json() as { ids: number[] };
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids are required." }, { status: 400 });
  }
  await prisma.prospect.deleteMany({ where: { id: { in: ids } } });
  return NextResponse.json({ ok: true, deleted: ids.length });
}
