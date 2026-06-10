import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TemplateEditorView } from "@/components/templates/TemplateEditorView";

export default async function TemplateEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (id === "new") {
    const settings = await prisma.settings.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1 },
    });
    return (
      <TemplateEditorView
        template={null}
        defaultLanguage={settings.content_language === "en" ? "en" : "fr"}
      />
    );
  }

  const numId = parseInt(id, 10);
  if (isNaN(numId)) notFound();

  const template = await prisma.emailTemplate.findUnique({ where: { id: numId } });
  if (!template) notFound();

  return <TemplateEditorView template={JSON.parse(JSON.stringify(template))} />;
}
