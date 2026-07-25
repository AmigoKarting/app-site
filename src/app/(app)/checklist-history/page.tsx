import { redirect } from "next/navigation";
import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/ui";
import { getCurrentProfile } from "@/domain/auth/role";
import { requireUser } from "@/domain/auth/session";
import { listRecentChecklists } from "@/domain/checklists/repository";
import { listAllChecklistTasks } from "@/domain/checklists/tasks-repository";
import { getServerDictionary, getLocale } from "@/lib/i18n/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ChecklistHistoryCard } from "./checklist-history-card";
import type { CashReconciliationData } from "./checklist-history-card";

export const dynamic = "force-dynamic";

const SECTION_META: Record<string, { label: string; icon: string; color: string; darkColor: string }> = {
  opening: { label: "Avant l'ouverture", icon: "🌅", color: "bg-sky-100 text-sky-700", darkColor: "dark:bg-sky-900/30 dark:text-sky-300" },
  during: { label: "Plusieurs fois par jour", icon: "☀️", color: "bg-amber-100 text-amber-700", darkColor: "dark:bg-amber-900/30 dark:text-amber-300" },
  closing: { label: "Avant de quitter", icon: "🌙", color: "bg-indigo-100 text-indigo-700", darkColor: "dark:bg-indigo-900/30 dark:text-indigo-300" },
  free_time: { label: "Temps libre", icon: "🎯", color: "bg-purple-100 text-purple-700", darkColor: "dark:bg-purple-900/30 dark:text-purple-300" },
};

export default async function ChecklistHistoryPage() {
  await requireUser();
  const profile = await getCurrentProfile();

  if (!profile || (profile.role !== "dev" && profile.role !== "superviseur")) {
    redirect("/feed");
  }

  const t = getServerDictionary();
  const locale = getLocale();
  const dateFmt = locale === "en" ? "en-US" : "fr-FR";
  const supabase = createAdminClient();
  const [checklists, allTasks, { data: cashRecs }] = await Promise.all([
    listRecentChecklists(),
    listAllChecklistTasks(),
    (supabase as any).from("cash_reconciliations").select("*").order("date", { ascending: false }).limit(200),
  ]);

  const cashRecMap = new Map<string, CashReconciliationData>();
  for (const cr of cashRecs ?? []) {
    cashRecMap.set(`${cr.date}|${cr.operator_name}`, {
      cashCounted: cr.cash_counted,
      interacCounted: cr.interac_counted,
      cashApex: cr.cash_apex,
      interacApex: cr.interac_apex,
      explanation: cr.explanation,
    });
  }

  const activeTasks = allTasks.filter((task) => task.is_active);
  const sectionOrder = ["opening", "during", "closing", "free_time"];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title={t.checklist.historyShort} />

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-neutral-100 p-1 dark:bg-neutral-800">
        <Link
          href="/supervisor-history"
          className="flex-1 rounded-md px-3 py-2 text-center text-sm font-medium text-neutral-500 transition hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
        >
          {t.supervisor.historyTitle}
        </Link>
        <span className="flex-1 rounded-md bg-white px-3 py-2 text-center text-sm font-semibold text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-neutral-100">
          {t.checklist.adminTitle}
        </span>
        <Link
          href="/cloture-history"
          className="flex-1 rounded-md px-3 py-2 text-center text-sm font-medium text-neutral-500 transition hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
        >
          Clôtures
        </Link>
      </div>

      {checklists.length === 0 ? (
        <EmptyState
          title={t.checklist.noChecklists}
          description={t.checklist.noChecklistsDesc}
        />
      ) : (() => {
        const byDate = new Map<string, typeof checklists>();
        for (const cl of checklists) {
          const d = new Date(cl.submitted_at);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          const list = byDate.get(key) ?? [];
          list.push(cl);
          byDate.set(key, list);
        }

        return (
          <div className="space-y-5">
            {[...byDate.entries()].map(([dateKey, entries]) => (
              <div key={dateKey}>
                <div className="mb-3 rounded-lg bg-neutral-100 px-4 py-2.5 dark:bg-neutral-800">
                  <p className="text-base font-bold capitalize text-neutral-900 dark:text-neutral-100">
                    {new Date(dateKey + "T12:00:00").toLocaleDateString(dateFmt, {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div className="space-y-3">
                  {entries.map((cl) => {
                    const accountName =
                      (cl.first_name && cl.last_name
                        ? `${cl.first_name} ${cl.last_name}`
                        : cl.display_name?.trim()) || "—";
                    const operatorName = cl.operator_name || accountName;
                    const showAccount = cl.operator_name && cl.operator_name !== accountName;
                    const isSupervisor = cl.role === "superviseur" || cl.role === "dev";
                    const targetRole = isSupervisor ? "superviseur" : "caissiere";
                    const roleTasks = activeTasks.filter((task) => (task as any).target_role === targetRole);
                    const totalForRole = roleTasks.length;
                    const completedSet = new Set(cl.completed_items);
                    const completedForRole = roleTasks.filter((task) => completedSet.has(task.task_key)).length;
                    const pct = totalForRole > 0 ? Math.round((completedForRole / totalForRole) * 100) : 0;

                    const sectionStats = sectionOrder.map((sec) => {
                      const sectionTasks = roleTasks.filter((task) => task.section === sec);
                      const done = sectionTasks.filter((task) => completedSet.has(task.task_key));
                      const missed = sectionTasks.filter((task) => !completedSet.has(task.task_key));
                      return { section: sec, total: sectionTasks.length, done, missed };
                    }).filter((s) => s.total > 0);

                    const timestamps = cl.completed_timestamps ?? {};
                    const clDate = new Date(cl.submitted_at);
                    const clDateKey = `${clDate.getFullYear()}-${String(clDate.getMonth() + 1).padStart(2, "0")}-${String(clDate.getDate()).padStart(2, "0")}`;
                    const cashRec = cashRecMap.get(`${clDateKey}|${operatorName}`) ?? null;

                    return (
                      <ChecklistHistoryCard
                        key={cl.id}
                        id={cl.id}
                        operatorName={operatorName}
                        accountName={accountName}
                        showAccount={!!showAccount}
                        isSupervisor={isSupervisor}
                        completedForRole={completedForRole}
                        totalForRole={totalForRole}
                        pct={pct}
                        submittedAt={cl.submitted_at}
                        dateFmt={dateFmt}
                        sections={sectionStats.map((s) => {
                          const meta = SECTION_META[s.section] ?? { label: s.section, icon: "📋" };
                          return {
                            section: s.section,
                            label: meta.label,
                            icon: meta.icon,
                            total: s.total,
                            done: s.done.map((tk) => ({ task_key: tk.task_key, label: tk.label })),
                            missed: s.missed.map((tk) => ({ task_key: tk.task_key, label: tk.label })),
                          };
                        })}
                        timestamps={timestamps}
                        notes={cl.notes}
                        cashReconciliation={cashRec}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
}
