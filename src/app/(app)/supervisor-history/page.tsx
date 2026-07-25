import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { getCurrentProfile } from "@/domain/auth/role";
import { requireUser } from "@/domain/auth/session";
import { listRecentSupervisorHistory } from "@/domain/supervisor/repository";
import { getServerDictionary, getLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function SupervisorHistoryPage() {
  await requireUser();
  const profile = await getCurrentProfile();

  if (!profile || (profile.role !== "dev" && profile.role !== "superviseur")) {
    redirect("/feed");
  }

  const t = getServerDictionary();
  const locale = getLocale();
  const dateFmt = locale === "en" ? "en-US" : "fr-FR";
  const supervisorHistory = await listRecentSupervisorHistory();

  const byDate = new Map<string, typeof supervisorHistory>();
  for (const entry of supervisorHistory) {
    const list = byDate.get(entry.date) ?? [];
    list.push(entry);
    byDate.set(entry.date, list);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title={t.checklist.historyShort} />

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-neutral-100 p-1 dark:bg-neutral-800">
        <span className="flex-1 rounded-md bg-white px-3 py-2 text-center text-sm font-semibold text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-neutral-100">
          {t.supervisor.historyTitle}
        </span>
        <Link
          href="/checklist-history"
          className="flex-1 rounded-md px-3 py-2 text-center text-sm font-medium text-neutral-500 transition hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
        >
          {t.checklist.adminTitle}
        </Link>
        <Link
          href="/cloture-history"
          className="flex-1 rounded-md px-3 py-2 text-center text-sm font-medium text-neutral-500 transition hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
        >
          Clôtures
        </Link>
      </div>

      {supervisorHistory.length === 0 ? (
        <EmptyState
          title={t.supervisor.historyEmpty}
          description={t.supervisor.historyEmptyDesc}
        />
      ) : (
        <div className="space-y-5">
          {[...byDate.entries()].map(([date, entries]) => (
            <div key={date}>
              <div className="mb-3 rounded-lg bg-neutral-100 px-4 py-2.5 dark:bg-neutral-800">
                <p className="text-base font-bold capitalize text-neutral-900 dark:text-neutral-100">
                  {new Date(date + "T12:00:00").toLocaleDateString(dateFmt, {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
              <div className="space-y-3">
                {entries.map((entry) => (
                  <Card key={entry.id} className="p-4">
                    {/* Header: task name + rating */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-neutral-900 dark:text-neutral-100">
                          {entry.task_label}
                        </p>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          entry.task_section === "caisse"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                            : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                        }`}>
                          {entry.task_section === "caisse" ? "Caisse" : "Piste"}
                        </span>
                      </div>
                      {entry.verified_at ? (
                        <span className="shrink-0 text-lg font-bold text-emerald-600 dark:text-emerald-400">
                          {entry.rating}/10
                        </span>
                      ) : (
                        <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                          {t.supervisor.historyAssignedOnly}
                        </span>
                      )}
                    </div>

                    {entry.verified_at && (
                      <div className="mt-2 space-y-2">
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-500 dark:text-neutral-400">
                          <span>Superviseur: <span className="font-medium text-neutral-900 dark:text-neutral-100">{entry.supervisor_name}</span></span>
                          {entry.done_by && (
                            <span>Fait par: <span className="font-medium text-neutral-900 dark:text-neutral-100">{entry.done_by}</span></span>
                          )}
                        </div>

                        {(entry.no_time_to_finish || entry.quality_certified) && (
                          <div className="flex flex-wrap gap-3 text-xs">
                            {entry.no_time_to_finish && (
                              <span className="text-amber-600 dark:text-amber-400">⏱ Pas eu le temps de terminer</span>
                            )}
                            {entry.quality_certified && (
                              <span className="text-emerald-600 dark:text-emerald-400">✓ Qualité certifiée</span>
                            )}
                          </div>
                        )}

                        {entry.comment && (
                          <p className="border-t border-neutral-100 pt-2 text-sm text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">
                            💬 {entry.comment}
                          </p>
                        )}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
