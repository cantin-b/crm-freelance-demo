import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { TemplatesList } from "@/components/templates/TemplatesList";

export default async function TemplatesPage() {
  const [templates, settings] = await Promise.all([
    prisma.emailTemplate.findMany({ orderBy: { name: "asc" } }),
    prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } }),
  ]);

  return (
    <div className="p-6 md:p-8">
      <div className="mx-auto max-w-5xl">
        <PageHeader
          className="mb-6"
          title="Email Templates"
          description="Manage your email templates"
          actions={
            <Button asChild size="sm" className="gap-1.5">
              <Link href="/templates/new">
                <Plus className="w-4 h-4" />
                New template
              </Link>
            </Button>
          }
        />

        <TemplatesList
          templates={JSON.parse(JSON.stringify(templates))}
          defaultLanguage={settings.content_language === "en" ? "en" : "fr"}
        />
      </div>
    </div>
  );
}
