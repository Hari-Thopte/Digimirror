/** Locale contract only. Hindi copy needs a reviewed translation before enabling it. */
import type { LocaleCatalog } from "./en";
export type SupportedLocale = "en" | "hi";
export const localeInfo = {
  en: { language: "English", ready: true },
  hi: { language: "हिन्दी [[REVIEW]]", ready: false },
} as const;
export function expansionCopy(catalog: LocaleCatalog): LocaleCatalog {
  return Object.fromEntries(
    Object.entries(catalog).map(([key, value]) => [key, `${value} ${value}`]),
  ) as LocaleCatalog;
}
