import { prisma } from "@/lib/prisma";
import { CallbacksView } from "@/components/callbacks/CallbacksView";

export default async function CallbacksPage() {
  const all = await prisma.prospect.findMany({
    where: { status: "callback" },
    orderBy: { updated_at: "desc" },
  });

  // Sort: precise (callback_at set) first → ascending by date
  //       vague  (only callback_note)   → descending by updated_at (already the default)
  const precise = all
    .filter(p => p.callback_at !== null)
    .sort((a, b) => new Date(a.callback_at!).getTime() - new Date(b.callback_at!).getTime());

  const vague = all.filter(p => p.callback_at === null);

  // Serialise dates for the client component
  const serialise = (arr: typeof all) => JSON.parse(JSON.stringify(arr));

  return <CallbacksView precise={serialise(precise)} vague={serialise(vague)} />;
}
