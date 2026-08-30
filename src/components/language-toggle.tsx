"use client";

import { useTranslation } from "@/lib/i18n";

export function LanguageToggle() {
  const { locale, setLocale } = useTranslation();

  return (
    <button
      type="button"
      onClick={() => setLocale(locale === "fr" ? "en" : "fr")}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-xs font-semibold text-neutral-300 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
      title={locale === "fr" ? "Switch to English" : "Passer en français"}
    >
      {locale === "fr" ? "EN" : "FR"}
    </button>
  );
}
