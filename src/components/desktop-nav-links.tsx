"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/lib/i18n";

interface DesktopNavLinksProps {
  role: string;
}

export function DesktopNavLinks({ role }: DesktopNavLinksProps) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const isDev = role === "dev";
  const isGerant = role === "superviseur";
  const isCashier = role === "caissiere";

  return (
    <span className="hidden md:contents">
      {(isCashier || isGerant || isDev) && (
        <NavLink href="/checklist" label={t.checklist.shortTitle} active={pathname === "/checklist"} />
      )}
      {!isCashier && (
        <NavLink
          href="/feed"
          label={t.nav.notifications}
          active={pathname === "/feed"}
        />
      )}
      {(isGerant || isDev) && (
        <NavLink href="/supervisor" label={t.supervisor.navTitle} active={pathname === "/supervisor"} />
      )}
      {isDev && (
        <NavLink
          href="/supervisor-history"
          label={t.checklist.historyShort}
          active={["/supervisor-history", "/checklist-history", "/cloture-history"].includes(pathname)}
        />
      )}
      {isDev && (
        <Link
          href="/admin"
          className={`ml-2 inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm font-medium ring-1 transition ${
            pathname.startsWith("/admin")
              ? "bg-brand-100 text-brand-800 ring-brand-300 dark:bg-brand-900/50 dark:text-brand-200 dark:ring-brand-600"
              : "bg-brand-50 text-brand-700 ring-brand-200 hover:bg-brand-100 hover:text-brand-800 dark:bg-brand-900/30 dark:text-brand-300 dark:ring-brand-700 dark:hover:bg-brand-900/50"
          }`}
        >
          {t.nav.admin}
        </Link>
      )}
    </span>
  );
}

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`relative rounded-md px-3 py-1.5 transition ${
        active
          ? "font-medium text-brand-700 dark:text-brand-300"
          : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
      }`}
    >
      {label}
      {active && (
        <span className="absolute inset-x-1 -bottom-[13px] h-0.5 rounded-full bg-brand-500" />
      )}
    </Link>
  );
}
