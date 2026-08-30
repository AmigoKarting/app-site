"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/lib/i18n";

interface MobileBottomNavProps {
  role: string;
}

export function MobileBottomNav({ role }: MobileBottomNavProps) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const isDev = role === "dev";
  const isGerant = role === "superviseur";
  const isCashier = role === "caissiere";

  // Pour les caissières, l'onglet Checklist passe en premier (page d'accueil).
  const checklistTab = {
    href: "/checklist",
    label: t.checklist.shortTitle,
    icon: ClipboardSvg,
    active: pathname === "/checklist",
  };
  const feedTab = {
    // Bypass nécessaire pour les caissières, sinon /feed les renvoie sur /checklist.
    href: isCashier ? "/feed?keep=1" : "/feed",
    label: t.nav.notifications,
    icon: BellSvg,
    active: pathname === "/feed",
  };

  const supervisorTab = {
    href: "/supervisor",
    label: t.supervisor.navTitle,
    icon: ShieldSvg,
    active: pathname === "/supervisor",
  };

  const historyTab = {
    href: "/supervisor-history",
    label: t.checklist.historyShort,
    icon: HistorySvg,
    // Les trois pages d'historique sont des onglets d'une même section.
    active: ["/supervisor-history", "/checklist-history", "/cloture-history"].includes(pathname),
  };

  // Caissière → Checklist d'abord (page d'accueil). Dev → accès aussi (test admin).
  const tabs = [
    ...(isCashier
      ? [checklistTab]
      : isDev
        ? [feedTab, checklistTab, historyTab]
        : isGerant
          ? [feedTab, checklistTab, supervisorTab]
          : [feedTab]),
    ...(isDev
      ? [
          {
            href: "/admin",
            label: t.nav.admin,
            icon: GridSvg,
            active: pathname.startsWith("/admin"),
          },
        ]
      : []),
    {
      href: "/settings",
      label: t.settings.title,
      icon: CogSvg,
      active: pathname === "/settings",
    },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-neutral-900/95 backdrop-blur-md md:hidden">
      <ul className="mx-auto flex max-w-md items-stretch justify-around">
        {tabs.map((tab) => (
          <li key={tab.href} className="flex-1">
            <Link
              href={tab.href}
              className={`mobile-nav-item ${
                tab.active ? "mobile-nav-item--active" : "text-neutral-400"
              }`}
            >
              <span className="mobile-nav-icon">
                <tab.icon active={tab.active} />
              </span>
              <span>{tab.label}</span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="safe-area-bottom" />
    </nav>
  );
}

function BellSvg({ active }: { active: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

function GridSvg({ active }: { active: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function ClipboardSvg({ active }: { active: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M12 11h4" />
      <path d="M12 16h4" />
      <path d="M8 11h.01" />
      <path d="M8 16h.01" />
    </svg>
  );
}

function ShieldSvg({ active }: { active: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function HistorySvg({ active }: { active: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function CogSvg({ active }: { active: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
