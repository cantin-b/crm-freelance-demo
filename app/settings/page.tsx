import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { SettingsForm } from "@/components/settings/SettingsForm";

export default async function SettingsPage() {
  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });

  return (
    <div className="p-6 md:p-8">
      <div className="mx-auto max-w-3xl">
        <PageHeader
          className="mb-6"
          title="Settings"
          description="Configure outbound email for sending to prospects."
        />
        <SettingsForm initialSettings={settings} />
      </div>
    </div>
  );
}
