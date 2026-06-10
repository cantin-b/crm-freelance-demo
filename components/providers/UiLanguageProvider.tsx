"use client";

import { createContext, useContext } from "react";
import { translations, type T } from "@/lib/i18n";
import type { Language } from "@/lib/constants";

const UiLanguageContext = createContext<T>(translations.en);

export function UiLanguageProvider({
  language,
  children,
}: {
  language: Language;
  children: React.ReactNode;
}) {
  return (
    <UiLanguageContext.Provider value={translations[language]}>
      {children}
    </UiLanguageContext.Provider>
  );
}

export function useT(): T {
  return useContext(UiLanguageContext);
}
