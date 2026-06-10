"use client";

import { useRef, useState } from "react";
import {
  FileText, Image as ImageIcon, Table, File as FileIcon,
  Download, Trash2, Loader2, Upload, Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useT } from "@/components/providers/UiLanguageProvider";
import type { Document } from "@/types";

type Props = {
  prospectId: number;
  initialDocuments: Document[];
};

const CATEGORY_OPTIONS = [
  { value: "form" },
  { value: "quote" },
  { value: "invoice" },
  { value: "other" },
];

const CATEGORY_STYLES: Record<string, string> = {
  form: "bg-blue-100 text-blue-700",
  quote: "bg-amber-100 text-amber-700",
  invoice: "bg-emerald-100 text-emerald-700",
  other: "bg-zinc-100 text-zinc-600",
};


function iconForFile(filename: string) {
  const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg" || ext === ".png") return ImageIcon;
  if (ext === ".xlsx") return Table;
  if (ext === ".pdf" || ext === ".docx") return FileText;
  return FileIcon;
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  }).format(new Date(iso));
}

export function DocumentsSection({ prospectId, initialDocuments }: Props) {
  const t = useT();
  const [documents, setDocuments] = useState<Document[]>(initialDocuments);
  const [category, setCategory] = useState<string>("__none");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function resetForm() {
    setFile(null);
    setCategory("__none");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleUpload() {
    if (!file || category === "__none") return;
    setError(null);

    // UI-side overwrite confirmation
    const duplicate = documents.some(d => d.filename === file.name);
    if (duplicate) {
      const ok = window.confirm(
        t.doc_overwrite_confirm(file.name)
      );
      if (!ok) return;
    }

    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("category", category);
      const res = await fetch(`/api/prospects/${prospectId}/documents`, {
        method: "POST",
        body,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Upload failed.");
      }
      const saved: Document = await res.json();
      // Replace the existing entry (same id) or prepend the new one
      setDocuments(prev => {
        const without = prev.filter(d => d.id !== saved.id);
        return [saved, ...without];
      });
      resetForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(doc: Document) {
    if (!window.confirm(t.doc_delete_confirm(doc.filename))) return;
    try {
      const res = await fetch(`/api/documents/${doc.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setDocuments(prev => prev.filter(d => d.id !== doc.id));
    } catch {
      setError(t.doc_failed_delete);
    }
  }

  async function openDocument(doc: Document, mode: "view" | "download") {
    if (doc.data_url) {
      if (mode === "view") {
        window.open(doc.data_url, "_blank", "noopener,noreferrer");
        return;
      }
      const link = document.createElement("a");
      link.href = doc.data_url;
      link.download = doc.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      return;
    }

    const res = await fetch(`/api/documents/${doc.id}/${mode}`);
    if (!res.ok) return;
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    if (mode === "view") {
      window.open(objectUrl, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
      return;
    }
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = doc.filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  }

  return (
    <div className="space-y-4">
      {/* Document list */}
      {documents.length === 0 ? (
        <p className="text-sm text-zinc-400">{t.doc_no_documents}</p>
      ) : (
        <ul className="space-y-2">
          {documents.map(doc => {
            const Icon = iconForFile(doc.filename);
            return (
              <li
                key={doc.id}
                className="flex items-center gap-3 rounded-lg border border-zinc-200/90 bg-white px-3 py-2.5 shadow-control"
              >
                <Icon className="h-5 w-5 shrink-0 text-zinc-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-800">
                    {doc.filename}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-zinc-400">
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 font-medium",
                        CATEGORY_STYLES[doc.category] ?? CATEGORY_STYLES.other
                      )}
                    >
                      {t.doc_category(doc.category)}
                    </span>
                    <span className="tabular-nums">{formatSize(doc.size)}</span>
                    <span>·</span>
                    <span>{formatDate(doc.created_at)}</span>
                  </div>
                </div>
                {[".pdf", ".jpg", ".jpeg", ".png"].includes(
                  doc.filename.slice(doc.filename.lastIndexOf(".")).toLowerCase()
                ) && (
                  <button
                    type="button"
                    onClick={() => void openDocument(doc, "view")}
                    title="Preview"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void openDocument(doc, "download")}
                  title="Download"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(doc)}
                  title="Delete"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-red-400 transition-colors hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Upload form */}
      <div className="space-y-2 rounded-lg border border-dashed border-zinc-300 bg-white/75 p-3 shadow-control">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-9 w-full text-sm sm:w-36">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none" disabled>{t.doc_category_placeholder}…</SelectItem>
              {CATEGORY_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>{t.doc_category(o.value)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx"
            onChange={e => setFile(e.target.files?.[0] ?? null)}
            className="flex-1 text-sm text-zinc-600 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-200 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-zinc-700 hover:file:bg-zinc-300"
          />

          <Button
            size="sm"
            className="gap-1.5"
            disabled={!file || category === "__none" || uploading}
            onClick={handleUpload}
          >
            {uploading
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> {t.doc_uploading}</>
              : <><Upload className="h-3.5 w-3.5" /> {t.doc_upload}</>}
          </Button>
        </div>

        {error && <p className="text-xs font-medium text-red-600">{error}</p>}
      </div>
    </div>
  );
}
