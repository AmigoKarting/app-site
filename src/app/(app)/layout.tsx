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
    <div className="min-h-screen bg-app-gradient">
      {/* Barre sombre dans les deux thèmes — look "outil pro" (style Shopify admin). */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-neutral-900/95 shadow-[0_1px_10px_rgba(0,0,0,0.25)] backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:gap-4 sm:px-6">
          <nav className="flex items-center gap-1 text-sm">
            <Link
              href={home}
              className="mr-3 flex items-center gap-2 font-semibold tracking-tight"
            >
              <AppLogo size={28} />
              {/* Caché entre md et lg : les liens de nav desktop prennent la place. */}
              <span className="hidden text-white sm:inline md:hidden lg:inline">{branding.app_name}</span>
            </Link>

            <DesktopNavLinks role={profile?.role ?? "superviseur"} />
          </nav>

          <div className="flex items-center gap-2 text-sm">
            <LanguageToggle />
            {isDev && (
              <Link
                href="/admin/aide"
                title={t.nav.helpTooltip}
                className="hidden h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-neutral-300 transition hover:border-white/20 hover:bg-white/10 hover:text-white md:flex"
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
              className="flex items-center gap-2 rounded-lg px-2 py-1 text-neutral-300 transition hover:bg-white/10 hover:text-white"
              title={user.email ?? undefined}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-semibold text-white shadow-sm">
                {displayLabel.slice(0, 1).toUpperCase()}
              </span>
              <span className="hidden font-medium lg:inline">{displayLabel}</span>
            </Link>
            {profile && isDev && (
              <span className="hidden rounded-full bg-brand-500/15 px-2 py-0.5 text-xs font-medium text-brand-300 ring-1 ring-inset ring-brand-500/30 lg:inline">
                {profile.role}
              </span>
            )}
            <form action={logoutAction}>
              {/* md à lg : icône seule, l'espace manque à côté des liens de nav. */}
              <button
                title={t.auth.logout}
                aria-label={t.auth.logout}
                className="hidden h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-neutral-300 transition hover:border-white/20 hover:bg-white/10 hover:text-white md:flex lg:hidden"
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
              <button className="hidden rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 font-medium text-neutral-300 transition hover:border-white/20 hover:bg-white/10 hover:text-white lg:inline-flex">
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
