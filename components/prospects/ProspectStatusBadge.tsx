"use client";

import { cn } from "@/lib/utils";
import { STATUS_COLORS } from "@/lib/constants";
import { useT } from "@/components/providers/UiLanguageProvider";
import type { Status } from "@/lib/constants";

export function ProspectStatusBadge({ status }: { status: string }) {
  const t = useT();
  const colorClass = STATUS_COLORS[status as Status] ?? "bg-zinc-100 text-zinc-700";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        colorClass
      )}
    >
      {t.status(status)}
    </span>
  );
}
