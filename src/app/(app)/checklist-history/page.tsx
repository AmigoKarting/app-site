import { redirect } from "next/navigation";
import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/ui";
import { getCurrentProfile } from "@/domain/auth/role";
import { requireUser } from "@/domain/auth/session";
import { listRecentChecklists } from "@/domain/checklists/repository";
import { listAllChecklistTasks } from "@/domain/checklists/tasks-repository";
import { getServerDictionary, getLocale } from "@/lib/i18n/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOpenHoursForDate } from "@/lib/amigo-hours";
import { DayHistoryCard } from "./checklist-history-card";
import type { CashReconciliationData } from "./checklist-history-card";

export const dynamic = "force-dynamic";

const SECTION_ORDER = ["opening", "during", "closing", "free_time", "meeting"];

const SECTION_META: Record<string, { label: string; icon: string }> = {
  opening: { label: "Avant l'ouverture", icon: "🌅" },
  during: { label: "Plusieurs fois par jour", icon: "☀️" },
  closing: { label: "Avant de quitter", icon: "🌙" },
  free_time: { label: "Temps libre", icon: "🎯" },
  meeting: { label: "Réunion d'équipe", icon: "🤝" },
};

function formatInterval(totalHours: number, count: number): string {
  if (count === 0) return "";
  const interval = totalHours / count;
  const h = Math.floor(interval);
  const m = Math.round((interval - h) * 60);
  if (h === 0) return `aux ~${m}min`;
  if (m === 0) return `aux ~${h}h`;
  return `aux ~${h}h${String(m).padStart(2, "0")}`;
}

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

  const byDate = new Map<string, typeof checklists>();
  for (const cl of checklists) {
    const d = new Date(cl.submitted_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const list = byDate.get(key) ?? [];
    list.push(cl);
    byDate.set(key, list);
  }

  const dayCards = [...byDate.entries()].map(([dateKey, entries]) => {
    const dateObj = new Date(dateKey + "T12:00:00");
    const dateLabel = dateObj.toLocaleDateString(dateFmt, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const hours = getOpenHoursForDate(dateObj);
    const hoursLabel = hours ? `${hours.open}h à ${hours.close}h (${hours.totalHours}h)` : "";

    const persons = entries.map((cl) => {
      const accountName =
        (cl.first_name && cl.last_name
          ? `${cl.first_name} ${cl.last_name}`
          : cl.display_name?.trim()) || "—";
      const operatorName = cl.operator_name || accountName;
      const showAccount = cl.operator_name && cl.operator_name !== accountName;
      const isSupervisor = cl.role === "superviseur" || cl.role === "dev";
      const targetRole = isSupervisor ? "superviseur" : "caissiere";
      const roleTasks = activeTasks.filter((task) => (task as any).target_role === targetRole);
      const completedSet = new Set(cl.completed_items);
      const completed = roleTasks.filter((task) => completedSet.has(task.task_key)).length;
      const total = roleTasks.length;
      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
      const clDateKey = dateKey;
      const cashRec = cashRecMap.get(`${clDateKey}|${operatorName}`) ?? null;

      return {
        name: operatorName,
        isSupervisor,
        completed,
        total,
        pct,
        accountName,
        showAccount: !!showAccount,
        notes: cl.notes,
        cashRec,
        completedItems: cl.completed_items as string[],
        timestamps: (cl.completed_timestamps ?? {}) as Record<string, string | string[]>,
        targetRole,
      };
    });

    const allTargetRoles = [...new Set(persons.map((p) => p.targetRole))];
    const relevantTasks = activeTasks.filter((task) =>
      allTargetRoles.includes((task as any).target_role)
    );

    const sections = SECTION_ORDER.map((sec) => {
      const sectionTasks = relevantTasks.filter((task) => task.section === sec);
      if (sectionTasks.length === 0) return null;
      const meta = SECTION_META[sec] ?? { label: sec, icon: "📋" };

      const tasks = sectionTasks.map((task) => {
        const completions: Array<{ operator: string; time: string }> = [];
        let totalCount = 0;

        for (const p of persons) {
          const pRoleTasks = activeTasks.filter((t) => (t as any).target_role === p.targetRole);
          if (!pRoleTasks.some((t) => t.task_key === task.task_key)) continue;

          const ts = p.timestamps[task.task_key];
          if (!ts) continue;

          if (Array.isArray(ts)) {
            for (const t of ts) {
              completions.push({ operator: p.name, time: formatTimeStr(t) });
            }
            totalCount += ts.length;
          } else {
            completions.push({ operator: p.name, time: formatTimeStr(ts) });
            totalCount += 1;
          }
        }

        const intervalLabel = (sec === "during" && hours && totalCount > 0)
          ? formatInterval(hours.totalHours, totalCount)
          : "";

        return {
          task_key: task.task_key,
          label: task.label,
          completions,
          totalCount,
          intervalLabel,
        };
      });

      return {
        section: sec,
        label: meta.label,
        icon: meta.icon,
        total: tasks.length,
        tasks,
      };
    }).filter(Boolean) as Array<{
      section: string;
      label: string;
      icon: string;
      total: number;
      tasks: Array<{
        task_key: string;
        label: string;
        completions: Array<{ operator: string; time: string }>;
        totalCount: number;
        intervalLabel: string;
      }>;
    }>;

    return {
      dateKey,
      dateLabel,
      hoursLabel,
      persons: persons.map(({ name, isSupervisor, completed, total, pct, accountName, showAccount, notes, cashRec }) => ({
        name, isSupervisor, completed, total, pct, accountName, showAccount, notes, cashRec,
      })),
      sections,
    };
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title={t.checklist.historyShort} />

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

      {dayCards.length === 0 ? (
        <EmptyState
          title={t.checklist.noChecklists}
          description={t.checklist.noChecklistsDesc}
        />
      ) : (
        <div className="space-y-3">
          {dayCards.map((day) => (
            <DayHistoryCard
              key={day.dateKey}
              dateLabel={day.dateLabel}
              hoursLabel={day.hoursLabel}
              persons={day.persons}
              sections={day.sections}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function formatTimeStr(ts: string): string {
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Montreal" });
  } catch {
    return "";
  }
}
