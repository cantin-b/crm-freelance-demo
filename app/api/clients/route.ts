import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildProspectWhere } from "@/lib/prospectFilters";

const HIGH_VALUE = ["proposal_sent", "client", "archived"];
const CLIENT_ORDER = [{ updated_at: "desc" as const }, { id: "desc" as const }];

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(params.get("page") ?? "1", 10));
  const limit = Math.min(200, Math.max(1, parseInt(params.get("limit") ?? "50", 10)));
  const baseWhere = buildProspectWhere(params);

  const where = {
    ...baseWhere,
    status: { in: HIGH_VALUE },
  };

  const [prospects, total, navRows, rawCategories, rawListNames] = await Promise.all([
    prisma.prospect.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: CLIENT_ORDER,
    }),
    prisma.prospect.count({ where }),
    prisma.prospect.findMany({
      where,
      select: { id: true },
      orderBy: CLIENT_ORDER,
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
