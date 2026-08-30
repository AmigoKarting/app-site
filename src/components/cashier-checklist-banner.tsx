import Link from "next/link";
import { getServerDictionary } from "@/lib/i18n/server";

interface Props {
  /** True si la caissière a déjà soumis sa checklist aujourd'hui (la bannière est alors masquée). */
  alreadySubmitted: boolean;
  /** Toggle global (configurable par un dev). Si false → bannière masquée. */
  enabled?: boolean;
  /** Message personnalisé. Null → fallback i18n. */
  customMessage?: string | null;
  /** Libellé bouton personnalisé. Null → fallback i18n. */
  customCta?: string | null;
}

/**
 * Bannière de rappel affichée en haut de l'app pour les caissières
 * tant qu'elles n'ont pas rempli leur checklist du jour.
 * Server component — l'état "soumise ou pas" est calculé côté serveur.
 * Le texte et l'activation sont configurables par un dev dans /settings.
 */
export function CashierChecklistBanner({
  alreadySubmitted,
  enabled = true,
  customMessage,
  customCta,
}: Props) {
  if (!enabled || alreadySubmitted) return null;
  const t = getServerDictionary();
  const message = customMessage?.trim() || t.checklist.bannerTitle;
  const cta = customCta?.trim() || t.checklist.bannerCta;

  return (
    <div className="border-b border-amber-200 bg-amber-50 dark:border-amber-800/60 dark:bg-amber-900/20">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        <p className="flex items-center gap-2 text-sm font-medium text-amber-900 dark:text-amber-200">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            <path d="m9 14 2 2 4-4" />
          </svg>
          <span>{message}</span>
        </p>
        <Link
          href="/checklist"
          className="shrink-0 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-400"
        >
          {cta}
        </Link>
      </div>
    </div>
  );
}
