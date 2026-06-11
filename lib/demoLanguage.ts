import type { Language } from "./constants";

export const DEMO_LANGUAGE_PREFERENCE_STORAGE_KEY = "crm_demo_ui_language_preference";

export type DemoLanguageSource = "query" | "preference" | "host" | "default";

export function normalizeDemoLanguage(value: string | null | undefined): Language | null {
  const normalized = value?.toLowerCase();
  if (normalized === "fr" || normalized === "en") return normalized;
  return null;
}

export function readDemoLanguagePreference(): Language | null {
  if (typeof window === "undefined") return null;

  try {
    return normalizeDemoLanguage(localStorage.getItem(DEMO_LANGUAGE_PREFERENCE_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function writeDemoLanguagePreference(language: Language) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(DEMO_LANGUAGE_PREFERENCE_STORAGE_KEY, language);
  } catch {
    /* Keep the language in memory if storage is unavailable. */
  }
}

export function resolveDemoEntryLanguage(location: Pick<Location, "hostname" | "search">): {
  language: Language;
  source: DemoLanguageSource;
} {
  const queryLanguage = normalizeDemoLanguage(new URLSearchParams(location.search).get("lang"));
  if (queryLanguage) return { language: queryLanguage, source: "query" };

  const storedLanguage = readDemoLanguagePreference();
  if (storedLanguage) return { language: storedLanguage, source: "preference" };

  const hostname = location.hostname.toLowerCase();
  if (hostname === "fr.cantinbartel.dev" || hostname === "fr.localhost") {
    return { language: "fr", source: "host" };
  }

  return { language: "en", source: "default" };
}
