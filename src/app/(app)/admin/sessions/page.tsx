import Link from "next/link";
import { Card, EmptyState, LinkButton, PageHeader, PageTip, formatDateTime } from "@/components/ui";
import { toggleSessionAction } from "@/domain/sessions/actions";
import { isSessionActive, listSessions } from "@/domain/sessions/repository";
import { getServerDictionary, getLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams?: { category?: string };
}

export default async function AdminSessionsPage({ searchParams }: PageProps) {
  const t = getServerDictionary();
  const locale = getLocale();
  const dateFmt = locale === "en" ? "en-US" : "fr-FR";
  const sessions = await listSessions({ categoryId: searchParams?.category });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.adminSessions.title}
        description={t.adminSessions.description}
        helpHref="/admin/aide/sessions"
        action={<LinkButton href="/admin/sessions/new">{t.adminSessions.newSession}</LinkButton>}
      />
      {sessions.length === 0 ? (
        <EmptyState
          title={t.adminSessions.noSessions}
          description={
            searchParams?.category
              ? t.adminCategories.noSessionDesc
              : t.adminSessions.noSessionsDesc
          }
          action={<LinkButton href="/admin/sessions/new">{t.adminSessions.newSession}</LinkButton>}
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-2 font-medium">{t.adminSessions.sessionName}</th>
                <th className="px-4 py-2 font-medium">{t.adminCategories.title}</th>
                <th className="px-4 py-2 font-medium">{t.feedForm.period}</th>
                <th className="px-4 py-2 font-medium">{t.adminSchedules.state}</th>
                <th className="px-4 py-2 font-medium text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {sessions.map((s) => {
                const inPeriod = isSessionActive(s);
                return (
                  <tr key={s.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-neutral-900">{s.name}</p>
                      <p className="text-xs text-neutral-500">{s.slug}</p>
                    </td>
                    <td className="px-4 py-3">
                      {s.category ? (
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset"
                          style={{
                            backgroundColor: `${s.category.color}20`,
                            color: s.category.color,
                            borderColor: `${s.category.color}40`,
                          }}
                        >
                          {s.category.icon && <span>{s.category.icon}</span>}
                          {s.category.name}
                        </span>
                      ) : (
                        <span className="text-xs text-neutral-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-neutral-700">
                      {formatDateTime(s.starts_at, dateFmt)} → {formatDateTime(s.ends_at, dateFmt)}
                    </td>
                    <td className="px-4 py-3">
                      <form action={toggleSessionAction} className="inline-flex items-center gap-2">
                        <input type="hidden" name="id" value={s.id} />
                        <input type="hidden" name="is_active" value={String(s.is_active)} />
                        <button
                          type="submit"
                          title={s.is_active ? t.adminCategories.deactivate : t.adminCategories.activate}
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset transition hover:opacity-80 ${
                            !s.is_active
                              ? "bg-neutral-100 text-neutral-700 ring-neutral-200"
                              : inPeriod
                                ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                : "bg-amber-50 text-amber-700 ring-amber-200"
                          }`}
                        >
                          {!s.is_active ? t.adminCategories.deactivated : inPeriod ? t.adminCategories.inProgress : t.adminCategories.outOfPeriod}
                        </button>
                      </form>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/sessions/${s.id}`}
                        className="text-sm font-medium text-neutral-900 hover:underline"
                      >
                        {t.common.edit}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
      <PageTip>{t.pageTips.adminSessions}</PageTip>
    </div>
  );
}
