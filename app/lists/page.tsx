import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { ListsView } from "@/components/lists/ListsView";

export default async function ListsPage() {
  const lists = await prisma.list.findMany({ orderBy: { created_at: "desc" } });

  const listsWithCounts = await Promise.all(
    lists.map(async list => ({
      ...(JSON.parse(JSON.stringify(list)) as { id: number; name: string; is_visible: boolean; created_at: string }),
      prospectCount: await prisma.prospect.count({ where: { list_name: list.name } }),
    }))
  );

  return (
    <div className="p-6 md:p-8 pb-20 md:pb-8">
      <div className="mx-auto max-w-5xl">
        <PageHeader
          className="mb-6"
          title="Lists"
          description="Manage your import batches and their visibility on the Prospects page."
        />
        <ListsView lists={listsWithCounts} />
      </div>
    </div>
  );
}
