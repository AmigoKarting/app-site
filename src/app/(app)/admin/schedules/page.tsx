import Link from "next/link";
import { Card, EmptyState, LinkButton, PageHeader, PageTip, formatDateTime } from "@/components/ui";
import { listSchedules } from "@/domain/notification-schedules/repository";
import { toggleScheduleAction } from "@/domain/notification-schedules/actions";
import { getServerDictionary, getLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

function summarizeDays(
  days: number[],
  labels: readonly string[],
  allDays: string,
  weekdays: string,
  weekend: string,
): string {
  if (days.length === 7) return allDays;
  if (
    days.length === 5 &&
    [1, 2, 3, 4, 5].every((d) => days.includes(d))
  ) {
    return weekdays;
  }
  if (
    days.length === 2 &&
    [6, 7].every((d) => days.includes(d))
  ) {
    return weekend;
  }
  return days.map((d) => labels[d]).join(" · ");
}

export default async function AdminSchedulesPage() {
  const t = getServerDictionary();
  const locale = getLocale();
  const dateFmt = locale === "en" ? "en-US" : "fr-FR";
  const schedules = await listSchedules();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.adminSchedules.title}
        description={t.adminSchedules.description}
        helpHref="/admin/aide/planifier"
        action={<LinkButton href="/admin/schedules/new">{t.adminSchedules.newSchedule}</LinkButton>}
      />
      {schedules.length === 0 ? (
        <EmptyState
          title={t.adminSchedules.noSchedules}
          description={t.adminSchedules.noSchedulesDesc}
          action={<LinkButton href="/admin/schedules/new">{t.adminSchedules.createSchedule}</LinkButton>}
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-2 font-medium">{t.feedForm.title}</th>
                <th className="px-4 py-2 font-medium">{t.adminSchedules.recurrence}</th>
                <th className="px-4 py-2 font-medium">{t.adminSchedules.nextRun}</th>
                <th className="px-4 py-2 font-medium">{t.adminSchedules.state}</th>
                <th className="px-4 py-2 font-medium text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {schedules.map((s) => (
                <tr key={s.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3 align-top">
                    <p className="font-medium text-neutral-900">{s.title}</p>
                    <p className="text-xs text-neutral-500">
                      {s.kind === "reminder" ? t.feed.reminder : t.feed.notification}
                      {s.category && ` • ${s.category.name}`}
                    </p>
                  </td>
                  <td className="px-4 py-3 align-top text-neutral-700">
                    <p>{s.times.join(" · ")}</p>
                    <p className="text-xs text-neutral-500">
                      {summarizeDays(s.days_of_week, t.adminSchedules.dayLabels, t.adminSchedules.allDays, t.adminSchedules.weekdays, t.adminSchedules.weekend)} • {s.timezone}
                    </p>
                  </td>
                  <td className="px-4 py-3 align-top text-neutral-700">
                    {s.is_active && s.next_run_at ? (
                      <span title={s.timezone}>
                        {new Date(s.next_run_at).toLocaleString(locale, {
                          dateStyle: "short",
                          timeStyle: "short",
                          timeZone: s.timezone,
                        })}
                      </span>
                    ) : (
                      <span className="text-neutral-400">—</span>
                    )}
                    {s.last_run_at && (
                      <p className="text-xs text-neutral-500">
                        {t.adminSchedules.lastRun} {formatDateTime(s.last_run_at, dateFmt)}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <form action={toggleScheduleAction} className="inline-flex items-center gap-2">
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="is_active" value={String(s.is_active)} />
                      <button
                        type="submit"
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset transition hover:opacity-80 ${
                          s.is_active
                            ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                            : "bg-neutral-100 text-neutral-700 ring-neutral-200"
                        }`}
                        title={t.adminSchedules.toggleState}
                      >
                        {s.is_active ? t.adminSchedules.active : t.adminSchedules.paused}
                      </button>
                    </form>
                  </td>
                  <td className="px-4 py-3 align-top text-right">
                    <Link
                      href={`/admin/schedules/${s.id}`}
                      className="text-sm font-medium text-neutral-900 hover:underline"
                    >
                      {t.adminSchedules.edit}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      <PageTip>{t.pageTips.adminSchedules}</PageTip>
    </div>
  );
}
