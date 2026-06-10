import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProspectDetail } from "@/components/prospects/ProspectDetail";

export default async function ProspectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) notFound();

  const prospect = await prisma.prospect.findUnique({ where: { id: numId } });
  if (!prospect) notFound();

  // Serialise through JSON so dates become ISO strings for the client component
  return <ProspectDetail prospect={JSON.parse(JSON.stringify(prospect))} />;
}
