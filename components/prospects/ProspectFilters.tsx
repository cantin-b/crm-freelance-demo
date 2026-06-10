"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X, ChevronDown, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem,
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
  SheetTrigger, SheetClose,
} from "@/components/ui/sheet";
import { COUNTRY_OPTIONS } from "@/lib/constants";
import { groupRawCategories, type GroupedProspectCategories } from "@/lib/prospectCategories";
import { cn } from "@/lib/utils";
import { useT } from "@/components/providers/UiLanguageProvider";

export interface Filters {
  search: string;
  countries: string[];
  categories: string[];
  statuses: string[];
  hasEmail: "all" | "yes" | "no";
  hasWebsite: "all" | "yes" | "no";
  listName: string;
}

export const INITIAL_FILTERS: Filters = {
  search: "",
  countries: [],
  categories: [],
  statuses: [],
  hasEmail: "all",
  hasWebsite: "all",
  listName: "",
};

export type VisibleFilter = "status" | "category" | "country" | "email" | "website" | "list";

interface Props {
  filters: Filters;
  categories: string[];
  listNames: string[];
  statusOptions: { value: string; label: string }[];
  visibleFilters?: VisibleFilter[];
  onChange: (filters: Filters) => void;
}

function MultiSelect({
  label,
  options,
  value,
  onChange,
  resetLabel,
  triggerClassName,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string[];
  onChange: (v: string[]) => void;
  /** When set, shows a reset item (e.g. t.filter_all_categories) at the top */
  resetLabel?: string;
  /** Extra classes for the trigger button (e.g. full-width in the mobile sheet) */
  triggerClassName?: string;
}) {
  const toggle = (v: string, checked: boolean) =>
    onChange(checked ? [...value, v] : value.filter(x => x !== v));
  const active = value.length > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("h-8 gap-1 font-normal", active && "border-brand-navy/25 bg-brand-navy/5 text-zinc-950", triggerClassName)}
        >
          {label}
          <ChevronDown className="w-3 h-3 text-zinc-400" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
        {resetLabel && (
          <>
            <DropdownMenuItem
              onSelect={() => onChange([])}
              className={!active ? "font-medium" : ""}
            >
              {resetLabel}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        {options.map(opt => (
          <DropdownMenuCheckboxItem
            key={opt.value}
            checked={value.includes(opt.value)}
            onCheckedChange={checked => toggle(opt.value, !!checked)}
          >
            {opt.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function GroupedCategorySelect({
  label,
  groups,
  value,
  onChange,
  resetLabel,
  triggerClassName,
}: {
  label: string;
  groups: GroupedProspectCategories[];
  value: string[];
  onChange: (v: string[]) => void;
  resetLabel: string;
  triggerClassName?: string;
}) {
  const active = value.length > 0;
  const toggle = (v: string, checked: boolean) =>
    onChange(checked ? [...value, v] : value.filter(x => x !== v));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("h-8 gap-1 font-normal", active && "border-brand-navy/25 bg-brand-navy/5 text-zinc-950", triggerClassName)}
        >
          {label}
          <ChevronDown className="h-3 w-3 shrink-0 text-zinc-400" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72 max-h-80 overflow-y-auto">
        <DropdownMenuItem
          onSelect={() => onChange([])}
          className={!active ? "font-medium" : ""}
        >
          {resetLabel}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {groups.map((group, groupIndex) => (
          <div key={group.groupKey}>
            {groupIndex > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
              {group.groupLabel}
            </DropdownMenuLabel>
            {group.categories.map(category => (
              <DropdownMenuCheckboxItem
                key={category.raw}
                checked={value.includes(category.raw)}
                onCheckedChange={checked => toggle(category.raw, !!checked)}
                className="items-start gap-2 py-2"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate">{category.label}</span>
                </span>
              </DropdownMenuCheckboxItem>
            ))}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ToggleFilter({
  label,
  hasLabel,
  noLabel,
  value,
  onChange,
  triggerClassName,
}: {
  label: string;
  hasLabel: string;
  noLabel: string;
  value: "all" | "yes" | "no";
  onChange: (v: "all" | "yes" | "no") => void;
  triggerClassName?: string;
}) {
  const active = value !== "all";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("h-8 gap-1 font-normal", active && "border-brand-navy/25 bg-brand-navy/5 text-zinc-950", triggerClassName)}
        >
          {label}
          <ChevronDown className="w-3 h-3 text-zinc-400" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {(["all", "yes", "no"] as const).map(v => (
          <DropdownMenuItem
            key={v}
            onSelect={() => onChange(v)}
            className={value === v ? "font-medium" : ""}
          >
            {v === "all" ? label : v === "yes" ? hasLabel : noLabel}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FilterPill({
  prefix, value, onRemove,
}: {
  prefix: string;
  value: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-zinc-200 bg-white/95 py-0.5 pl-2.5 pr-1 text-xs text-zinc-700 shadow-control">
      <span className="text-zinc-400">{prefix}</span>
      <span className="font-medium">{value}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${prefix} ${value} filter`}
        className="flex h-4 w-4 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

const DEFAULT_VISIBLE_FILTERS: VisibleFilter[] = ["status", "category", "country", "email", "website", "list"];

export function ProspectFilters({
  filters,
  categories,
  listNames,
  statusOptions,
  visibleFilters = DEFAULT_VISIBLE_FILTERS,
  onChange,
}: Props) {
  const searchRef = useRef<HTMLInputElement>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const t = useT();
  const isVisible = (filter: VisibleFilter) => visibleFilters.includes(filter);

  // Auto-focus search on mount
  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const update = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });

  const hasActiveFilters =
    filters.search ||
    (isVisible("country") && filters.countries.length > 0) ||
    (isVisible("category") && filters.categories.length > 0) ||
    (isVisible("status") && filters.statuses.length > 0) ||
    (isVisible("email") && filters.hasEmail !== "all") ||
    (isVisible("website") && filters.hasWebsite !== "all") ||
    (isVisible("list") && !!filters.listName);

  const countryOptions = COUNTRY_OPTIONS.map(o => ({ value: o.value, label: t.country(o.value) }));

  const groupedCategoryOptions = groupRawCategories(categories, t.ui_language);
  const categoryOptions = groupedCategoryOptions.flatMap(group =>
    group.categories.map(category => ({ value: category.raw, label: category.label }))
  );
  const listNameOptions = listNames.map(l => ({ value: l, label: l }));

  const statusLabel = (v: string) => statusOptions.find(o => o.value === v)?.label ?? v;
  const countryLabel = (v: string) => countryOptions.find(o => o.value === v)?.label ?? v;
  const categoryLabel = (v: string) => categoryOptions.find(o => o.value === v)?.label ?? v;

  // Active filters represented as individually-removable pills (search excluded —
  // it has its own inline clear control inside the input)
  const pills: { id: string; prefix: string; value: string; onRemove: () => void }[] = [
    ...(isVisible("status") ? filters.statuses.map(v => ({
      id: `status:${v}`, prefix: t.pill_status, value: statusLabel(v),
      onRemove: () => update({ statuses: filters.statuses.filter(x => x !== v) }),
    })) : []),
    ...(isVisible("category") ? filters.categories.map(v => ({
      id: `category:${v}`, prefix: t.pill_category, value: categoryLabel(v),
      onRemove: () => update({ categories: filters.categories.filter(x => x !== v) }),
    })) : []),
    ...(isVisible("country") ? filters.countries.map(v => ({
      id: `country:${v}`, prefix: t.pill_country, value: countryLabel(v),
      onRemove: () => update({ countries: filters.countries.filter(x => x !== v) }),
    })) : []),
  ];
  if (isVisible("email") && filters.hasEmail !== "all") {
    pills.push({
      id: "email", prefix: t.pill_email,
      value: filters.hasEmail === "yes" ? t.filter_has_email : t.filter_no_email,
      onRemove: () => update({ hasEmail: "all" }),
    });
  }
  if (isVisible("website") && filters.hasWebsite !== "all") {
    pills.push({
      id: "website", prefix: t.pill_website,
      value: filters.hasWebsite === "yes" ? t.filter_has_website : t.filter_no_website,
      onRemove: () => update({ hasWebsite: "all" }),
    });
  }
  if (isVisible("list") && filters.listName) {
    pills.push({
      id: "list", prefix: t.pill_list, value: filters.listName,
      onRemove: () => update({ listName: "" }),
    });
  }

  const activeCount = pills.length + (filters.search ? 1 : 0);

  return (
    <div className="space-y-2.5">
    {/* ── Mobile: Filtres button → bottom sheet ── */}
    <div className="flex md:hidden">
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="relative h-9 gap-1.5">
            <SlidersHorizontal className="h-4 w-4" />
            {t.filter_filters_mobile}
            {activeCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-navy px-1 text-[10px] font-semibold text-white">
                {activeCount}
              </span>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="flex max-h-[85vh] flex-col gap-0 rounded-t-2xl p-0">
          <SheetHeader className="flex-row items-center justify-between border-b border-zinc-100 px-4 py-3.5 pr-12 text-left">
            <SheetTitle>{t.filter_filters_mobile}</SheetTitle>
            <SheetDescription className="sr-only">
              {t.filter_sheet_description}
            </SheetDescription>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => onChange(INITIAL_FILTERS)}
                className="text-xs font-medium text-zinc-500 hover:text-zinc-800"
              >
                {t.filter_reset}
              </button>
            )}
          </SheetHeader>

          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            {/* Search */}
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-zinc-500">{t.filter_search_label}</span>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                <Input
                  className="h-9 pl-8 text-sm"
                  placeholder={t.filter_search_placeholder}
                  value={filters.search}
                  onChange={e => update({ search: e.target.value })}
                />
              </div>
            </label>

            {/* Status */}
            {isVisible("status") && (
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-zinc-500">{t.filter_status}</span>
                <MultiSelect
                  label={filters.statuses.length ? t.x_selected_count(filters.statuses.length) : t.filter_any_status}
                  options={statusOptions}
                  value={filters.statuses}
                  onChange={statuses => update({ statuses })}
                  triggerClassName="w-full h-9 justify-between"
                />
              </div>
            )}

            {/* Category */}
            {isVisible("category") && categoryOptions.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-zinc-500">{t.filter_category}</span>
                <GroupedCategorySelect
                  label={filters.categories.length ? t.x_selected_count(filters.categories.length) : t.filter_all_categories}
                  groups={groupedCategoryOptions}
                  value={filters.categories}
                  onChange={categories => update({ categories })}
                  resetLabel={t.filter_all_categories}
                  triggerClassName="w-full h-9 justify-between"
                />
              </div>
            )}

            {/* Country */}
            {isVisible("country") && (
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-zinc-500">{t.filter_country}</span>
                <MultiSelect
                  label={filters.countries.length ? t.x_selected_count(filters.countries.length) : t.filter_any_country}
                  options={countryOptions}
                  value={filters.countries}
                  onChange={countries => update({ countries })}
                  triggerClassName="w-full h-9 justify-between"
                />
              </div>
            )}

            {/* Email */}
            {isVisible("email") && (
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-zinc-500">{t.filter_email}</span>
                <ToggleFilter
                  label={t.filter_email}
                  hasLabel={t.filter_has_email}
                  noLabel={t.filter_no_email}
                  value={filters.hasEmail}
                  onChange={hasEmail => update({ hasEmail })}
                  triggerClassName="w-full h-9 justify-between"
                />
              </div>
            )}

            {/* Website */}
            {isVisible("website") && (
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-zinc-500">{t.filter_website}</span>
                <ToggleFilter
                  label={t.filter_website}
                  hasLabel={t.filter_has_website}
                  noLabel={t.filter_no_website}
                  value={filters.hasWebsite}
                  onChange={hasWebsite => update({ hasWebsite })}
                  triggerClassName="w-full h-9 justify-between"
                />
              </div>
            )}

            {/* List */}
            {isVisible("list") && listNameOptions.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-zinc-500">{t.filter_list}</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "h-9 w-full justify-between gap-1 font-normal",
                        filters.listName && "border-brand-navy/25 bg-brand-navy/5 text-zinc-950"
                      )}
                    >
                      <span className="truncate">{filters.listName || t.filter_all_lists}</span>
                      <ChevronDown className="h-3 w-3 shrink-0 text-zinc-400" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="max-h-60 overflow-y-auto">
                    <DropdownMenuItem onSelect={() => update({ listName: "" })}>
                      All lists
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {listNameOptions.map(opt => (
                      <DropdownMenuItem
                        key={opt.value}
                        onSelect={() => update({ listName: opt.value })}
                        className={filters.listName === opt.value ? "font-medium" : ""}
                      >
                        {opt.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>

          <div
            className="border-t border-zinc-100 px-4 py-3"
            style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
          >
            <SheetClose asChild>
              <Button className="w-full">{t.filter_apply}</Button>
            </SheetClose>
          </div>
        </SheetContent>
      </Sheet>
    </div>

    {/* ── Desktop: horizontal filter bar ── */}
    <div className="hidden md:flex flex-wrap items-center gap-2">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
        <Input
          ref={searchRef}
          className="h-8 pl-8 w-56 text-sm"
          placeholder="Name, city, owner…"
          value={filters.search}
          onChange={e => update({ search: e.target.value })}
        />
        {filters.search && (
          <button
            className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
            onClick={() => update({ search: "" })}
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Status */}
      {isVisible("status") && (
        <MultiSelect
          label={t.filter_status}
          options={statusOptions}
          value={filters.statuses}
          onChange={statuses => update({ statuses })}
        />
      )}

      {/* Category */}
      {isVisible("category") && categoryOptions.length > 0 && (
        <GroupedCategorySelect
          label={t.filter_category}
          groups={groupedCategoryOptions}
          value={filters.categories}
          onChange={categories => update({ categories })}
          resetLabel={t.filter_all_categories}
        />
      )}

      {/* Country */}
      {isVisible("country") && (
        <MultiSelect
          label={t.filter_country}
          options={countryOptions}
          value={filters.countries}
          onChange={countries => update({ countries })}
        />
      )}

      {/* Has email */}
      {isVisible("email") && (
        <ToggleFilter
          label={t.filter_email}
          hasLabel={t.filter_has_email}
          noLabel={t.filter_no_email}
          value={filters.hasEmail}
          onChange={hasEmail => update({ hasEmail })}
        />
      )}

      {/* Has website */}
      {isVisible("website") && (
        <ToggleFilter
          label={t.filter_website}
          hasLabel={t.filter_has_website}
          noLabel={t.filter_no_website}
          value={filters.hasWebsite}
          onChange={hasWebsite => update({ hasWebsite })}
        />
      )}

      {/* List name */}
      {isVisible("list") && listNameOptions.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-8 gap-1 font-normal max-w-36 truncate",
              filters.listName && "border-brand-navy/25 bg-brand-navy/5 text-zinc-950"
            )}
            >
              <span className="truncate">{filters.listName || t.filter_list}</span>
              <ChevronDown className="w-3 h-3 text-zinc-400 shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-60 overflow-y-auto">
            <DropdownMenuItem onSelect={() => update({ listName: "" })}>
              All lists
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {listNameOptions.map(opt => (
              <DropdownMenuItem
                key={opt.value}
                onSelect={() => update({ listName: opt.value })}
                className={filters.listName === opt.value ? "font-medium" : ""}
              >
                {opt.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Clear all */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-zinc-500 hover:text-zinc-800"
          onClick={() => onChange(INITIAL_FILTERS)}
        >
          <X className="w-3.5 h-3.5" />
          {t.filter_clear}
        </Button>
      )}
    </div>

      {/* Active filter pills */}
      {pills.length > 0 && (
        <div className="-mx-4 flex flex-nowrap items-center gap-1.5 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
          {pills.map(pill => (
            <FilterPill
              key={pill.id}
              prefix={pill.prefix}
              value={pill.value}
              onRemove={pill.onRemove}
            />
          ))}
        </div>
      )}
    </div>
  );
}
