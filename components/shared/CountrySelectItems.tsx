"use client";

import { Fragment } from "react";
import {
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
} from "@/components/ui/select";
import { useT } from "@/components/providers/UiLanguageProvider";
import { COUNTRY_OPTIONS, COUNTRY_REGION_ORDER } from "@/lib/constants";

export function CountrySelectItems() {
  const t = useT();
  const groups = COUNTRY_REGION_ORDER.map(region => ({
    region,
    label: t.country_region(region),
    countries: COUNTRY_OPTIONS
      .filter(country => country.region === region)
      .map(country => ({ value: country.value, label: t.country(country.value) }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" })),
  })).filter(group => group.countries.length > 0);

  return (
    <>
      {groups.map((group, index) => (
        <Fragment key={group.region}>
          {index > 0 && <SelectSeparator />}
          <SelectGroup>
            <SelectLabel className="pl-2 text-[10px] uppercase tracking-wide text-zinc-400">
              {group.label}
            </SelectLabel>
            {group.countries.map(country => (
              <SelectItem key={country.value} value={country.value}>
                {country.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </Fragment>
      ))}
    </>
  );
}
