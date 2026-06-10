import { TemplateEditorPageClient } from "@/components/demo/DemoPageLoaders";

export default async function TemplateEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TemplateEditorPageClient id={id} />;
}
