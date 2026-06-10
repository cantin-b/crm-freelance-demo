"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Upload, FileText, CheckCircle2, Loader2, AlertCircle, RotateCcw, Tag, Info, Lock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useT } from "@/components/providers/UiLanguageProvider";
import { cn } from "@/lib/utils";
import { parseCsv, normalizeCsvRow, type CsvRow } from "@/lib/csv";
import { CSV_COLUMNS } from "@/lib/constants";
import {
  getRecommendedCategoryGroups,
  groupRawCategories,
  type GroupedProspectCategories,
} from "@/lib/prospectCategories";

type Step = "idle" | "preview" | "importing" | "done";

interface ImportResult {
  imported: number;
  skipped: number;
}

const SCHEMA_COLS = new Set<string>(CSV_COLUMNS);

export function CsvImporter() {
  const router = useRouter();
  const t = useT();
  const language = t.ui_language;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [step, setStep] = useState<Step>("idle");
  const [fileName, setFileName] = useState("");
  const [allRows, setAllRows] = useState<CsvRow[]>([]);
  const [detectedCols, setDetectedCols] = useState<string[]>([]);
  const [unknownCols, setUnknownCols] = useState<string[]>([]);
  const [listName, setListName] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const processFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError(t.import_select_csv_error);
      return;
    }
    setError(null);
    try {
      const rows = await parseCsv(file);
      if (rows.length === 0) {
        setError(t.import_empty_file_error);
        return;
      }
      const headers = Object.keys(rows[0]);
      const detected = (CSV_COLUMNS as readonly string[]).filter(c => headers.includes(c));
      const unknown = headers.filter(h => !SCHEMA_COLS.has(h));
      setFileName(file.name);
      setAllRows(rows);
      setDetectedCols(detected);
      setUnknownCols(unknown);
      setStep("preview");
    } catch (e) {
      setError(e instanceof Error ? e.message : t.import_parse_error);
    }
  }, [t]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  function reset() {
    setStep("idle");
    setFileName("");
    setAllRows([]);
    setDetectedCols([]);
    setUnknownCols([]);
    setListName("");
    setResult(null);
    setError(null);
  }

  async function handleImport() {
    if (!listName.trim() || allRows.length === 0) return;
    setStep("importing");
    setError(null);
    try {
      const normalizedRows = allRows.map(normalizeCsvRow);
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: normalizedRows, list_name: listName.trim() }),
      });
      const data = await res.json() as { imported?: number; skipped?: number; error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? t.import_failed);
      setResult({ imported: data.imported ?? 0, skipped: data.skipped ?? 0 });
      setStep("done");
      setTimeout(() => router.push("/lists"), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.import_failed);
      setStep("preview");
    }
  }

  const previewRows = allRows.slice(0, 5);
  const missingCols = (CSV_COLUMNS as readonly string[]).filter(c => !detectedCols.includes(c));
  const rawCategories = allRows
    .map(row => row.category?.trim())
    .filter((category): category is string => Boolean(category));
  const detectedCategoryGroups = groupRawCategories(rawCategories, language);
  const recommendedGroups = getRecommendedCategoryGroups(language);

  const importDisabled = process.env.NEXT_PUBLIC_CRM_DEMO_IMPORT_DISABLED !== "false";
  if (importDisabled) {
    return (
      <div className="rounded-xl border border-zinc-200/90 bg-white/95 p-6 text-center shadow-surface">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-500">
          <Lock className="h-5 w-5" />
        </div>
        <h2 className="mt-4 text-base font-semibold text-zinc-900">{t.import_demo_disabled_title}</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-zinc-500">
          {t.import_demo_disabled_desc}
        </p>
        <Button onClick={() => router.push("/prospects")} className="mt-5">
          {t.import_demo_disabled_action}
        </Button>
      </div>
    );
  }

  if (step === "idle") {
    return (
      <div className="space-y-6">
        {error && <ErrorBanner message={error} />}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "flex min-h-64 cursor-pointer select-none flex-col items-center justify-center gap-4 rounded-lg border border-dashed bg-white/80 p-8 text-center shadow-surface transition-[background-color,border-color,box-shadow] md:min-h-80",
              isDragging
                ? "border-brand-navy/45 bg-brand-navy/5 shadow-premium"
                : "border-zinc-300 hover:border-brand-navy/30 hover:bg-white"
            )}
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50">
              <Upload className="h-7 w-7 text-zinc-400" />
            </span>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-zinc-800">{t.import_drop_title}</p>
              <p className="text-xs text-zinc-400">{t.import_drop_hint}</p>
            </div>
          </div>

          <div className="space-y-3">
            <InfoPanel
              icon={<FileText className="h-4 w-4" />}
              title={t.import_expected_format}
              description={t.import_expected_format_desc}
            >
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  {t.import_expected_columns}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {CSV_COLUMNS.map(column => (
                    <Badge
                      key={column}
                      variant="outline"
                      className="border-zinc-200 bg-white font-mono text-[11px] font-medium text-zinc-600"
                    >
                      {column}
                    </Badge>
                  ))}
                </div>
              </div>
            </InfoPanel>

            <details className="rounded-lg border border-zinc-200/90 bg-white/90 shadow-control">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-zinc-800">
                <span className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-zinc-400" />
                  {t.import_recommended_categories}
                </span>
                <span className="text-xs font-medium text-zinc-400">{t.import_category_guide}</span>
              </summary>
              <div className="border-t border-zinc-100 px-4 py-3">
                <p className="mb-3 text-xs leading-5 text-zinc-500">
                  {t.import_recommended_categories_desc}
                </p>
                <CategoryGroups groups={recommendedGroups} compact />
              </div>
            </details>

            <InfoPanel
              icon={<Info className="h-4 w-4" />}
              title={t.import_category_guide}
              description={t.import_category_guide_desc}
            />
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    );
  }

  if (step === "done" && result) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 shadow-control">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
          <div>
            <p className="text-sm font-semibold text-green-800">{t.import_complete}</p>
            <p className="mt-0.5 text-sm text-green-700">
              {t.import_complete_detail(result.imported, result.skipped)}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={reset} className="gap-2">
          <RotateCcw className="h-3.5 w-3.5" />
          {t.import_another_file}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 rounded-lg border border-zinc-200/90 bg-white/90 p-4 shadow-control md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <FileText className="h-4 w-4 shrink-0 text-zinc-400" />
          <span className="truncate font-medium text-zinc-800">{fileName}</span>
          <span className="shrink-0 text-zinc-400">· {t.import_rows_count(allRows.length)}</span>
        </div>
        <button
          onClick={reset}
          disabled={step === "importing"}
          className="self-start text-xs font-medium text-zinc-500 underline underline-offset-2 transition-colors hover:text-zinc-800 disabled:opacity-50 md:self-auto"
        >
          {t.import_change_file}
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-zinc-200/90 bg-white/90 p-4 text-sm shadow-control">
          <p className="font-semibold text-zinc-800">
            {t.import_columns_detected(detectedCols.length, CSV_COLUMNS.length)}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {detectedCols.map(column => (
              <Badge
                key={column}
                variant="outline"
                className="border-brand-navy/15 bg-brand-navy/5 font-mono text-[11px] font-medium text-brand-navy"
              >
                {column}
              </Badge>
            ))}
          </div>
          {missingCols.length > 0 && (
            <p className="mt-3 text-xs leading-5 text-zinc-500">
              <span className="font-medium text-zinc-600">{t.import_missing_columns}:</span>{" "}
              {missingCols.join(", ")}
            </p>
          )}
          {unknownCols.length > 0 && (
            <p className="mt-2 text-xs leading-5 text-zinc-400">
              <span className="font-medium">{t.import_ignored_columns}:</span>{" "}
              <span className="font-mono">{unknownCols.join(", ")}</span>
            </p>
          )}
        </div>

        <div className="rounded-lg border border-zinc-200/90 bg-white/90 p-4 shadow-control">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-zinc-800">{t.import_categories_detected}</p>
              <p className="mt-0.5 text-xs leading-5 text-zinc-500">{t.import_categories_detected_desc}</p>
            </div>
            <Tag className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
          </div>
          {detectedCategoryGroups.length > 0 ? (
            <CategoryGroups groups={detectedCategoryGroups} />
          ) : (
            <p className="rounded-md border border-zinc-100 bg-zinc-50 px-3 py-2 text-xs text-zinc-500">
              {t.import_no_categories}
            </p>
          )}
        </div>
      </div>

      {detectedCols.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {t.import_preview_title(previewRows.length)}
          </p>
          <div className="rounded-lg border border-zinc-200/90 bg-white/95 shadow-control">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {detectedCols.map(col => (
                      <TableHead
                        key={col}
                        className="whitespace-nowrap py-2 font-mono text-xs"
                      >
                        {col}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.map((row, i) => (
                    <TableRow key={i}>
                      {detectedCols.map(col => (
                        <TableCell
                          key={col}
                          className="max-w-[14rem] truncate py-1.5 text-xs"
                          title={row[col] || undefined}
                        >
                          {row[col] || <span className="text-zinc-300">-</span>}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-zinc-200/90 bg-white/90 p-4 shadow-control">
        <div className="max-w-sm space-y-1.5">
          <Label htmlFor="list_name">
            {t.import_list_name} <span className="text-red-500">*</span>
          </Label>
          <Input
            id="list_name"
            placeholder={t.import_list_name_placeholder}
            value={listName}
            onChange={e => setListName(e.target.value)}
            disabled={step === "importing"}
          />
          <p className="text-xs text-zinc-400">{t.import_list_name_hint}</p>
        </div>
      </div>

      {error && <ErrorBanner message={error} />}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button
          onClick={handleImport}
          disabled={step === "importing" || !listName.trim()}
          className="sm:w-auto"
        >
          {step === "importing" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t.import_importing}
            </>
          ) : (
            t.import_import_rows(allRows.length)
          )}
        </Button>
        <Button
          variant="outline"
          onClick={reset}
          disabled={step === "importing"}
          className="sm:w-auto"
        >
          {t.import_cancel}
        </Button>
      </div>
    </div>
  );
}

function InfoPanel({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-zinc-200/90 bg-white/90 p-4 shadow-control">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-zinc-50 text-zinc-400">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-zinc-800">{title}</p>
          <p className="mt-1 text-xs leading-5 text-zinc-500">{description}</p>
        </div>
      </div>
      {children && <div className="mt-4">{children}</div>}
    </section>
  );
}

function CategoryGroups({
  groups,
  compact = false,
}: {
  groups: GroupedProspectCategories[];
  compact?: boolean;
}) {
  return (
    <div className="space-y-3">
      {groups.map(group => (
        <div key={group.groupKey} className="space-y-1.5">
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
              {group.groupLabel}
            </p>
            <span className="h-px flex-1 bg-zinc-100" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {group.categories.map(category => (
              <span
                key={category.raw || category.label}
                className={cn(
                  "inline-flex max-w-full flex-col rounded-md border bg-white px-2 py-1 text-xs shadow-control",
                  category.recognized
                    ? "border-brand-navy/10 text-zinc-700"
                    : "border-zinc-200 bg-zinc-50 text-zinc-600",
                  compact && "py-0.5"
                )}
              >
                <span className="truncate font-medium">{category.label || category.raw}</span>
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      <AlertCircle className="h-4 w-4 shrink-0" />
      {message}
    </div>
  );
}
