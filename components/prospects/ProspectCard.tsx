"use client";

import { useRouter } from "next/navigation";
import { Phone, Mail, ChevronRight } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ProspectStatusBadge } from "./ProspectStatusBadge";
import { getAllowedStatusValues, type Status } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Prospect } from "@/types";

interface Props {
  prospect: Prospect;
  selected: boolean;
  statusOptions: { value: string; label: string }[];
  onSelect: (id: number, checked: boolean) => void;
  onStatusChange: (id: number, status: string) => void;
  onOpenDetail: (id: number) => void;
  detailBasePath: "/prospects" | "/clients";
  highlighted?: boolean;
}

export function ProspectCard({
  prospect,
  selected,
  statusOptions,
  onSelect,
  onStatusChange,
  onOpenDetail,
  detailBasePath,
  highlighted,
}: Props) {
  const router = useRouter();
  const allowedStatusValues = new Set(getAllowedStatusValues(prospect.status));
  const allowedStatusOptions = statusOptions.filter(option => allowedStatusValues.has(option.value as Status));

  const owners = prospect.owner
    ? prospect.owner.split(";").map(o => o.trim()).filter(Boolean)
    : [];
  const meta = [prospect.city, prospect.category].filter(Boolean).join(" · ");
  const hasContact = !!prospect.phone || !!prospect.email;

  function navigateToDetail() {
    onOpenDetail(prospect.id);
    router.push(`${detailBasePath}/${prospect.id}`);
  }

  return (
    <div
      data-prospect-id={prospect.id}
      className={cn(
        "relative flex flex-col gap-3 rounded-xl border border-zinc-200/90 bg-white p-4 shadow-surface transition-colors",
        highlighted && "border-brand-navy/20 bg-brand-navy/5 ring-1 ring-brand-navy/10 before:absolute before:bottom-4 before:left-0 before:top-4 before:w-0.5 before:rounded-r-full before:bg-brand-red"
      )}
      onClick={navigateToDetail}
    >
      {/* Top row: checkbox + name + status */}
      <div className="flex items-start gap-3">
        <div onClick={e => e.stopPropagation()} className="pt-0.5">
          <Checkbox
            checked={selected}
            onCheckedChange={checked => onSelect(prospect.id, !!checked)}
            aria-label="Select card"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-zinc-900">{prospect.name}</p>
          {meta && <p className="mt-0.5 truncate text-xs text-zinc-500">{meta}</p>}
        </div>
        <ProspectStatusBadge status={prospect.status} />
      </div>

      {/* Contact row */}
      {hasContact && (
        <div
          className="flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-3"
          onClick={e => e.stopPropagation()}
        >
          {prospect.phone && (
            <a
              href={`tel:${prospect.phone}`}
              className="inline-flex items-center gap-1.5 rounded-md bg-zinc-50 px-2.5 py-1.5 text-xs font-medium text-brand-navy active:bg-zinc-100"
            >
              <Phone className="h-3.5 w-3.5 shrink-0" />
              <span className="whitespace-nowrap">{prospect.phone}</span>
            </a>
          )}
          {prospect.email && (
            <a
              href={`mailto:${prospect.email}`}
              className="inline-flex min-w-0 items-center gap-1.5 rounded-md bg-zinc-50 px-2.5 py-1.5 text-xs font-medium text-brand-navy active:bg-zinc-100"
            >
              <Mail className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{prospect.email}</span>
            </a>
          )}
        </div>
      )}

      {/* Bottom row: status change + detail link */}
      <div
        className="flex items-center justify-between gap-2 border-t border-zinc-100 pt-3"
        onClick={e => e.stopPropagation()}
      >
        <Select
          value={prospect.status}
          onValueChange={v => { if (v !== "__none") onStatusChange(prospect.id, v); }}
        >
          <SelectTrigger className="h-8 w-auto gap-1.5 text-xs">
            <SelectValue placeholder="Change status" />
          </SelectTrigger>
          <SelectContent>
            {allowedStatusOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                <ProspectStatusBadge status={opt.value} />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <button
          type="button"
          onClick={navigateToDetail}
          className={cn(
            "flex h-8 items-center gap-0.5 rounded-md px-2 text-xs font-medium text-zinc-500",
            "transition-colors active:bg-zinc-100"
          )}
        >
          Detail
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {owners.length > 0 && (
        <p className="-mt-1 truncate text-xs text-zinc-400">
          {owners[0]}{owners.length > 1 && ` +${owners.length - 1}`}
        </p>
      )}
    </div>
  );
}
