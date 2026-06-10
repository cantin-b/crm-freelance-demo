import { CsvImporter } from "@/components/import/CsvImporter";
import { PageHeader } from "@/components/layout/PageHeader";

export default function ImportPage() {
  return (
    <div className="p-6 md:p-8">
      <div className="mx-auto max-w-5xl">
        <PageHeader
          className="mb-6"
          title="Import"
          description="Import prospects from a CSV file. Columns are auto-detected by header name."
        />
        <CsvImporter />
      </div>
    </div>
  );
}
