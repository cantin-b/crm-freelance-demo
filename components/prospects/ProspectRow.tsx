"use client";

import { useRouter } from "next/navigation";
import { Phone, Mail, Globe, Map, MoreHorizontal } from "lucide-react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProspectStatusBadge } from "./ProspectStatusBadge";
import { useT } from "@/components/providers/UiLanguageProvider";
import { cn } from "@/lib/utils";
import type { Prospect } from "@/types";

interface Props {
  prospect: Prospect;
  selected: boolean;
  statusOptions: { value: string; label: string }[];
  onSelect: (id: number, checked: boolean) => void;
  onStatusChange: (id: number, status: string) => void;
  onDelete: (id: number) => void;
  onEmailClick: (prospect: Prospect) => void;
  onOpenDetail: (id: number) => void;
  highlighted?: boolean;
}

export function ProspectRow({
  prospect,
  selected,
  statusOptions,
  onSelect,
  onStatusChange,
  onDelete,
  onEmailClick,
  onOpenDetail,
  highlighted,
}: Props) {
  const router = useRouter();
  const t = useT();

  function navigateToDetail() {
    onOpenDetail(prospect.id);
    router.push(`/prospects/${prospect.id}`);
  }

  // Owner: split on ";" and show as tags if multiple
  const owners = prospect.owner
    ? prospect.owner.split(";").map(o => o.trim()).filter(Boolean)
    : [];

  return (
    <TableRow
      data-prospect-id={prospect.id}
      className={cn(
        "group cursor-pointer border-zinc-100/90 transition-colors hover:bg-zinc-50/70 [&>td]:py-2.5",
        highlighted && "border-l-2 border-l-brand-red bg-brand-navy/5 shadow-[inset_0_0_0_1px_rgb(28_43_120/0.08)] hover:bg-brand-navy/5"
      )}
      onClick={navigateToDetail}
    >
      {/* Checkbox */}
      <TableCell className="w-10 pr-0" onClick={e => e.stopPropagation()}>
        <Checkbox
          checked={selected}
          onCheckedChange={checked => onSelect(prospect.id, !!checked)}
          aria-label="Select row"
        />
      </TableCell>

      {/* Name */}
      <TableCell className="font-medium text-zinc-900 max-w-44 truncate">
        <span className="underline-offset-2 decoration-zinc-300 group-hover:underline">
          {prospect.name}
        </span>
      </TableCell>

      {/* City */}
      <TableCell className="text-zinc-600 max-w-28 truncate">
        {prospect.city ?? <span className="text-zinc-300">—</span>}
      </TableCell>

      {/* Country */}
      <TableCell className="text-zinc-600 w-14">
        {prospect.country ?? <span className="text-zinc-300">—</span>}
      </TableCell>

      {/* Category */}
      <TableCell className="text-zinc-600 max-w-36 truncate">
        {prospect.category ?? <span className="text-zinc-300">—</span>}
      </TableCell>

      {/* Phone */}
      <TableCell onClick={e => e.stopPropagation()}>
        {prospect.phone ? (
          <a
            href={`tel:${prospect.phone}`}
            className="flex items-center gap-1.5 whitespace-nowrap text-sm font-medium text-brand-navy hover:text-brand-red hover:underline"
          >
            <Phone className="w-3.5 h-3.5 shrink-0" />
            {prospect.phone}
          </a>
        ) : (
          <span className="text-zinc-300">—</span>
        )}
      </TableCell>

      {/* Email */}
      <TableCell onClick={e => e.stopPropagation()} className="max-w-44 truncate">
        {prospect.email ? (
          <button
            className="flex max-w-full items-center gap-1.5 truncate text-sm font-medium text-brand-navy hover:text-brand-red hover:underline"
            onClick={() => onEmailClick(prospect)}
          >
            <Mail className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{prospect.email}</span>
          </button>
        ) : (
          <span className="text-zinc-300">—</span>
        )}
      </TableCell>

      {/* Website icon */}
      <TableCell onClick={e => e.stopPropagation()} className="w-10">
        {prospect.website ? (
          <a
            href={prospect.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-400 transition-colors hover:text-brand-navy"
            title={prospect.website}
          >
            <Globe className="w-4 h-4" />
          </a>
        ) : (
          <span className="text-zinc-200">
            <Globe className="w-4 h-4" />
          </span>
        )}
      </TableCell>

      {/* Status badge — click opens change dropdown */}
      <TableCell onClick={e => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="focus:outline-none">
              <ProspectStatusBadge status={prospect.status} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {statusOptions.map(opt => (
              <DropdownMenuItem
                key={opt.value}
                onSelect={() => onStatusChange(prospect.id, opt.value)}
              >
                <ProspectStatusBadge status={opt.value} />
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>

      {/* Owner */}
      <TableCell className="max-w-36 truncate text-zinc-600 text-sm">
        {owners.length > 0 ? (
          <span title={owners.join(", ")}>{owners[0]}{owners.length > 1 && ` +${owners.length - 1}`}</span>
        ) : (
          <span className="text-zinc-300">—</span>
        )}
      </TableCell>

      {/* Actions */}
      <TableCell onClick={e => e.stopPropagation()} className="w-20">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {prospect.gm_link && (
            <a
              href={prospect.gm_link}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-brand-navy"
              title="Open in Google Maps"
            >
              <Map className="w-4 h-4" />
            </a>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-brand-navy">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={navigateToDetail}>
                {t.view_details}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600"
                onSelect={() => onDelete(prospect.id)}
              >
                {t.delete}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  );
}
