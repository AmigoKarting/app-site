import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppLogo, getBranding } from "@/components/app-brand";
import { RoleBanner } from "@/components/role-banner";
import { LanguageToggle } from "@/components/language-toggle";
import { logoutAction } from "@/domain/auth/actions";
import { getCurrentProfile } from "@/domain/auth/role";
import { requireUser } from "@/domain/auth/session";
import { hasSubmittedToday } from "@/domain/checklists/repository";
import { getBannerForRole } from "@/domain/role-banners/repository";
import { OnboardingModal } from "@/components/onboarding-modal";
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts";
import { InstallAppBanner } from "@/components/install-app";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { DesktopNavLinks } from "@/components/desktop-nav-links";
import { PushAutoSubscribe } from "@/components/push-auto-subscribe";
import { ScrollToTop } from "@/components/scroll-to-top";
import { getServerDictionary } from "@/lib/i18n/server";

const DEV_ONLY_PREFIXES = ["/admin"];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const t = getServerDictionary();

  let profile: Awaited<ReturnType<typeof getCurrentProfile>> = null;
  try {
    profile = await getCurrentProfile();
  } catch (e) {
    console.error("[LAYOUT] getCurrentProfile error:", e);
  }

  let branding: Awaited<ReturnType<typeof getBranding>>;
  try {
    branding = await getBranding();
  } catch (e) {
    console.error("[LAYOUT] getBranding error:", e);
    branding = {
      id: 1,
      app_name: "Amigo Karting",
      app_tagline: null,
      logo_url: null,
      cashier_banner_enabled: true,
      cashier_banner_message: null,
      cashier_banner_cta: null,
      updated_at: new Date(0).toISOString(),
      updated_by: null,
    };
  }

  const isDev = profile?.role === "dev";
  const isGerant = profile?.role === "superviseur";
  const isCashier = profile?.role === "caissiere";
  const displayLabel =
    (profile?.first_name && profile?.last_name
      ? `${profile.first_name} ${profile.last_name}`
      : profile?.display_name?.trim()) || user.email || "";

  const pathname = headers().get("x-pathname") ?? "";
  // Page d'accueil par défaut selon le rôle.
  const home = isDev ? "/admin" : isCashier ? "/checklist" : "/feed";
  if (!isDev && DEV_ONLY_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    redirect(home);
  }

  // Bannière configurée pour le rôle courant (table role_banners).
  // L'évaluation du dismiss_condition est faite ici côté serveur.
  let activeBanner: Awaited<ReturnType<typeof getBannerForRole>> = null;
  if (profile?.role) {
    try {
      activeBanner = await getBannerForRole(profile.role);
      if (activeBanner?.dismiss_condition === "cashier_checklist_done") {
        const done = await hasSubmittedToday(user.id);
        if (done) activeBanner = null;
      }
    } catch (e) {
      console.error("[LAYOUT] getBannerForRole error:", e);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/85 backdrop-blur-md transition-colors duration-300 dark:border-neutral-700/50 dark:bg-neutral-900/85">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:gap-4 sm:px-6">
          <nav className="flex items-center gap-1 text-sm">
            <Link
              href={home}
              className="mr-3 flex items-center gap-2 font-semibold tracking-tight"
            >
              <AppLogo size={28} />
              {/* Caché entre md et lg : les liens de nav desktop prennent la place. */}
              <span className="hidden sm:inline md:hidden lg:inline dark:text-neutral-100">{branding.app_name}</span>
            </Link>

            <DesktopNavLinks role={profile?.role ?? "superviseur"} />
          </nav>

          <div className="flex items-center gap-2 text-sm">
            <LanguageToggle />
            {isDev && (
              <Link
                href="/admin/aide"
                title={t.nav.helpTooltip}
                className="hidden h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 transition hover:border-neutral-300 hover:bg-neutral-50 hover:text-brand-700 md:flex dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-600 dark:hover:bg-neutral-700 dark:hover:text-brand-400"
                aria-label={t.nav.help}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </Link>
            )}
            <Link
              href="/settings"
              className="flex items-center gap-2 rounded-lg px-2 py-1 text-neutral-700 transition hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
              title={user.email ?? undefined}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-semibold text-white shadow-sm">
                {displayLabel.slice(0, 1).toUpperCase()}
              </span>
              <span className="hidden font-medium lg:inline">{displayLabel}</span>
            </Link>
            {profile && isDev && (
              <span className="hidden rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 ring-1 ring-inset ring-brand-200 lg:inline dark:bg-brand-900/30 dark:text-brand-300 dark:ring-brand-700">
                {profile.role}
              </span>
            )}
            <form action={logoutAction}>
              {/* md à lg : icône seule, l'espace manque à côté des liens de nav. */}
              <button
                title={t.auth.logout}
                aria-label={t.auth.logout}
                className="hidden h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 transition hover:border-neutral-300 hover:bg-neutral-50 md:flex lg:hidden dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-600 dark:hover:bg-neutral-700"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
              <button className="hidden rounded-lg border border-neutral-200 bg-white px-3 py-1.5 font-medium text-neutral-700 transition hover:border-neutral-300 hover:bg-neutral-50 lg:inline-flex dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:border-neutral-600 dark:hover:bg-neutral-700">
                {t.auth.logout}
              </button>
            </form>
          </div>
        </div>
      </header>

      {activeBanner && !isCashier && <RoleBanner banner={activeBanner} />}

      <main className="mx-auto max-w-6xl px-4 py-4 pb-20 sm:px-6 sm:py-8 md:pb-8">{children}</main>


      {!isCashier && <MobileBottomNav role={profile?.role ?? "superviseur"} />}
      <ScrollToTop />
      {!isCashier && <InstallAppBanner />}
      <PushAutoSubscribe />
      <OnboardingModal />
      <KeyboardShortcuts isDev={isDev} />
    </div>
  );
}
