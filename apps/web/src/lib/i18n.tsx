import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import en from "../locales/en.json";
import sw from "../locales/sw.json";
import sh from "../locales/sh.json";
import type { Locale } from "./preferences.js";
export type TranslationKey = keyof typeof en;
const dictionaries = { en, sw, sh };
const I18nContext = createContext({
  locale: "en" as Locale,
  reviewPending: false,
  t: (key: TranslationKey): string => en[key],
});
export function I18nProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  const reviewPending =
    locale !== "en" &&
    dictionaries[locale]["meta.review"].includes("TODO(reviewers)");
  useEffect(() => {
    document.documentElement.lang = reviewPending
      ? "en"
      : locale === "sh"
        ? "sw-KE"
        : locale;
  }, [locale, reviewPending]);
  const value = useMemo(
    () => ({
      locale,
      reviewPending,
      t: (key: TranslationKey) => dictionaries[locale][key] ?? en[key],
    }),
    [locale, reviewPending],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
export const useI18n = () => useContext(I18nContext);
