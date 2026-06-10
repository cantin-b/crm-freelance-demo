"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Trash2, RefreshCw, Download, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProspectRow } from "./ProspectRow";
import { ProspectCard } from "./ProspectCard";
import { ProspectStatusBadge } from "./ProspectStatusBadge";
import { useT } from "@/components/providers/UiLanguageProvider";
import { getCommonAllowedStatusOptions } from "@/lib/constants";
import type { Prospect } from "@/types";

function SkeletonCell({ className }: { className?: string }) {
  return <div className={`h-3.5 rounded bg-zinc-100 animate-pulse ${className ?? ""}`} />;
}

function SkeletonRow() {
  return (
    <TableRow className="pointer-events-none">
      <TableCell className="w-10 pr-0">
        <div className="w-4 h-4 rounded bg-zinc-100 animate-pulse" />
      </TableCell>
      <TableCell><SkeletonCell className="w-32" /></TableCell>
      <TableCell><SkeletonCell className="w-20" /></TableCell>
      <TableCell><SkeletonCell className="w-8" /></TableCell>
      <TableCell><SkeletonCell className="w-28" /></TableCell>
      <TableCell><SkeletonCell className="w-28" /></TableCell>
      <TableCell><SkeletonCell className="w-36" /></TableCell>
      <TableCell><div className="w-4 h-4 rounded-full bg-zinc-100 animate-pulse" /></TableCell>
      <TableCell><div className="h-5 w-20 rounded-full bg-zinc-100 animate-pulse" /></TableCell>
      <TableCell><SkeletonCell className="w-20" /></TableCell>
      <TableCell />
    </TableRow>
  );
}

interface Props {
  prospects: Prospect[];
  total: number;
  page: number;
  totalPages: number;
  loading: boolean;
  hasActiveFilters?: boolean;
  selectedIds: Set<number>;
  statusOptions: { value: string; label: string }[];
  onSelect: (id: number, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  onStatusChange: (id: number, status: string) => void;
  onBulkStatusChange: (status: string) => void;
  onBulkExport: () => void;
  onBulkDelete: () => void;
  onDelete: (id: number) => void;
  onEmailClick: (prospect: Prospect) => void;
  onOpenDetail: (id: number) => void;
  onPageChange: (page: number) => void;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  highlightedId?: number | null;
  detailBasePath: "/prospects" | "/clients";
}

export function ProspectTable({
  prospects,
  total,
  page,
  totalPages,
  loading,
  hasActiveFilters,
  selectedIds,
  statusOptions,
  onSelect,
  onSelectAll,
  onStatusChange,
  onBulkStatusChange,
  onBulkExport,
  onBulkDelete,
  onDelete,
  onEmailClick,
  onOpenDetail,
  onPageChange,
  pageSize,
  onPageSizeChange,
  highlightedId,
  detailBasePath,
}: Props) {
  const t = useT();
  const allSelected = prospects.length > 0 && prospects.every(p => selectedIds.has(p.id));
  const someSelected = selectedIds.size > 0;
  const selectedProspects = prospects.filter(prospect => selectedIds.has(prospect.id));
  const bulkStatusOptions = getCommonAllowedStatusOptions(selectedProspects.map(prospect => prospect.status));

  return (
    <div className="flex flex-col gap-0">
      {/* Bulk action bar */}
      {someSelected && (
        <div className="flex items-center gap-2 rounded-t-xl border border-zinc-900 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 shadow-surface">
          <span className="mr-2 text-zinc-400">
            {t.x_selected(selectedIds.size)}
          </span>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                disabled={bulkStatusOptions.length === 0}
                className="h-7 text-xs border-zinc-700 text-zinc-100 hover:bg-zinc-800 hover:text-white bg-transparent disabled:opacity-40"
              >
                <RefreshCw className="w-3 h-3" />
                {t.bulk_change_status}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {bulkStatusOptions.map(opt => (
                <DropdownMenuItem key={opt.value} onSelect={() => onBulkStatusChange(opt.value)}>
                  <ProspectStatusBadge status={opt.value} />
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs border-zinc-700 text-zinc-100 hover:bg-zinc-800 hover:text-white bg-transparent"
            onClick={onBulkExport}
          >
            <Download className="w-3 h-3" />
            {t.bulk_export}
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs border-red-800 text-red-400 hover:bg-red-950 hover:text-red-300 bg-transparent"
            onClick={onBulkDelete}
          >
            <Trash2 className="w-3 h-3" />
            {t.bulk_delete}
          </Button>
        </div>
      )}

      {/* Table (desktop) */}
      <div className={`hidden md:block overflow-x-auto rounded-xl border border-zinc-200/90 bg-white/95 shadow-surface ${someSelected ? "rounded-t-none border-t-0 shadow-none" : ""}`}>
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50/80 hover:bg-zinc-50/80 [&>th]:h-9">
              <TableHead className="w-10 pr-0">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={checked => onSelectAll(!!checked)}
                  aria-label={t.select_all}
                />
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{t.col_name}</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{t.col_city}</TableHead>
              <TableHead className="w-14 text-xs font-semibold uppercase tracking-wide text-zinc-500">{t.col_cc}</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{t.col_category}</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{t.col_phone}</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{t.col_email}</TableHead>
              <TableHead className="w-10 text-xs font-semibold uppercase tracking-wide text-zinc-500">{t.col_web}</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{t.col_status}</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{t.col_owner}</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 8 }, (_, i) => <SkeletonRow key={i} />)
            ) : prospects.length === 0 ? (
              <TableRow>
                <td colSpan={11} className="py-16 text-center text-sm">
                  {hasActiveFilters ? (
                    <span className="text-zinc-400">{t.no_prospects_filter}</span>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-zinc-400">
                      <Users className="w-8 h-8 text-zinc-200" />
                      <span>{t.no_prospects_yet}</span>
                      <Link href="/import" className="text-xs text-blue-500 hover:underline">
                        {t.import_csv_start}
                      </Link>
                    </div>
                  )}
                </td>
              </TableRow>
            ) : (
              prospects.map(prospect => (
                <ProspectRow
                  key={prospect.id}
                  prospect={prospect}
                  selected={selectedIds.has(prospect.id)}
                  statusOptions={statusOptions}
                  onSelect={onSelect}
                  onStatusChange={onStatusChange}
                  onDelete={onDelete}
                  onEmailClick={onEmailClick}
                  onOpenDetail={onOpenDetail}
                  detailBasePath={detailBasePath}
                  highlighted={highlightedId === prospect.id}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Cards (mobile) */}
      <div className={`md:hidden flex flex-col gap-3 ${someSelected ? "pt-3" : ""}`}>
        {loading ? (
          Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-28 rounded-xl border border-zinc-200/90 bg-white shadow-surface animate-pulse" />
          ))
        ) : prospects.length === 0 ? (
          <div className="rounded-xl border border-zinc-200/90 bg-white py-16 text-center text-sm shadow-surface">
            {hasActiveFilters ? (
              <span className="text-zinc-400">{t.no_prospects_filter}</span>
            ) : (
              <div className="flex flex-col items-center gap-2 text-zinc-400">
                <Users className="w-8 h-8 text-zinc-200" />
                <span>{t.no_prospects_yet}</span>
                <Link href="/import" className="text-xs text-blue-500 hover:underline">
                  {t.import_csv_start}
                </Link>
              </div>
            )}
          </div>
        ) : (
          prospects.map(prospect => (
            <ProspectCard
              key={prospect.id}
              prospect={prospect}
              selected={selectedIds.has(prospect.id)}
              statusOptions={statusOptions}
              onSelect={onSelect}
              onStatusChange={onStatusChange}
              onOpenDetail={onOpenDetail}
              detailBasePath={detailBasePath}
              highlighted={highlightedId === prospect.id}
            />
          ))
        )}
      </div>
      <div aria-hidden="true" className="md:hidden h-[calc(8rem+env(safe-area-inset-bottom,0px))]" />

      {/* Pagination — desktop (inline, always visible) */}
      <div className="hidden md:flex items-center justify-between py-3">
        <div className="flex items-center gap-2">
          <Select
            value={String(pageSize)}
            onValueChange={v => onPageSizeChange(Number(v))}
          >
            <SelectTrigger className="h-8 w-17.5 text-xs text-zinc-600 border-zinc-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-zinc-400">{t.per_page}</span>
        </div>

        <div className="flex items-center gap-3">
          {total > 0 && (
            <span className="text-sm text-zinc-500">
              {totalPages > 1
                ? t.prospects_page(total, page, totalPages)
                : t.x_prospects(total)}
            </span>
          )}
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 border-zinc-200 text-zinc-500 hover:text-zinc-900 disabled:opacity-30"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 border-zinc-200 text-zinc-500 hover:text-zinc-900 disabled:opacity-30"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Pagination — mobile (fixed bar above BottomNav, always visible) */}
      <div
        className="md:hidden fixed inset-x-0 z-30 h-12 bg-white/95 backdrop-blur-sm border-t border-zinc-200/80 shadow-[0_-4px_16px_-4px_rgb(24_24_27/0.08)] flex items-center justify-between px-4"
        style={{ bottom: "calc(4rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="flex items-center gap-1.5">
          <Select
            value={String(pageSize)}
            onValueChange={v => onPageSizeChange(Number(v))}
          >
            <SelectTrigger className="h-7 w-14.5 text-xs text-zinc-600 border-zinc-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-[11px] text-zinc-400">{t.per_page}</span>
        </div>

        <div className="flex items-center gap-2">
          {total > 0 && (
            <span className="text-xs text-zinc-500">
              {t.x_prospects_mobile(total)}
              {totalPages > 1 && (
                <span className="text-zinc-400"> · {page}/{totalPages}</span>
              )}
            </span>
          )}
          {totalPages > 1 && (
            <div className="flex gap-1 ml-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0 border-zinc-200 text-zinc-500 disabled:opacity-30"
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0 border-zinc-200 text-zinc-500 disabled:opacity-30"
                disabled={page >= totalPages}
                onClick={() => onPageChange(page + 1)}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
