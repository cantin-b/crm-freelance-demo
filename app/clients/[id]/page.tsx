import { notFound } from "next/navigation";
import { ProspectDetailLoader } from "@/components/prospects/ProspectDetailLoader";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) notFound();

  return <ProspectDetailLoader id={numId} source="clients" />;
}
