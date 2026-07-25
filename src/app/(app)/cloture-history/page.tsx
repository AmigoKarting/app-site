import { redirect } from "next/navigation";
import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/ui";
import { getCurrentProfile } from "@/domain/auth/role";
import { requireUser } from "@/domain/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerDictionary, getLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

interface CashRec {
  id: string;
  operator_name: string;
  date: string;
  cash_counted: number | null;
  interac_counted: number | null;
  cash_apex: number | null;
  interac_apex: number | null;
  explanation: string | null;
  created_at: string;
}

export default async function ClotureHistoryPage() {
  await requireUser();
  const profile = await getCurrentProfile();

  if (!profile || (profile.role !== "dev" && profile.role !== "superviseur")) {
    redirect("/feed");
  }

  const t = getServerDictionary();
  const locale = getLocale();
  const dateFmt = locale === "en" ? "en-US" : "fr-FR";

  const supabase = createAdminClient();
  const { data } = await (supabase as any)
    .from("cash_reconciliations")
    .select("*")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);

  const records = (data ?? []) as CashRec[];

  const byDate = new Map<string, CashRec[]>();
  for (const rec of records) {
    const list = byDate.get(rec.date) ?? [];
    list.push(rec);
    byDate.set(rec.date, list);
  }

  const c = (v: number | null) => v ?? 0;
  const fmt = (n: number) => n.toFixed(2) + " $";
  const diffColor = (n: number) =>
    n === 0
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-red-600 dark:text-red-400";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Clôtures de caisse" />

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-neutral-100 p-1 dark:bg-neutral-800">
        <Link
          href="/supervisor-history"
          className="flex-1 rounded-md px-3 py-2 text-center text-sm font-medium text-neutral-500 transition hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
        >
          {t.supervisor.historyTitle}
        </Link>
        <Link
          href="/checklist-history"
          className="flex-1 rounded-md px-3 py-2 text-center text-sm font-medium text-neutral-500 transition hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
        >
          {t.checklist.adminTitle}
        </Link>
        <span className="flex-1 rounded-md bg-white px-3 py-2 text-center text-sm font-semibold text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-neutral-100">
          Clôtures
        </span>
      </div>

      {records.length === 0 ? (
        <EmptyState
          title="Aucune clôture"
          description="Les clôtures de caisse apparaîtront ici."
        />
      ) : (
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
                {entries.map((rec) => {
                  const totalCounted = c(rec.cash_counted) + c(rec.interac_counted);
                  const totalApex = c(rec.cash_apex) + c(rec.interac_apex);
                  const diffCash = c(rec.cash_counted) - c(rec.cash_apex);
                  const diffInterac = c(rec.interac_counted) - c(rec.interac_apex);
                  const diffTotal = totalCounted - totalApex;
                  const isOk = diffTotal === 0;

                  return (
                    <div
                      key={rec.id}
                      className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800/50"
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-neutral-900 dark:text-neutral-100">
                            {rec.operator_name}
                          </p>
                          <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] font-semibold text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300">
                            Caissière
                          </span>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                            isOk
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                          }`}
                        >
                          {isOk ? "✓ OK" : `Diff: ${diffTotal >= 0 ? "+" : ""}${fmt(diffTotal)}`}
                        </span>
                      </div>

                      {/* Table */}
                      <div className="border-t border-neutral-100 px-4 pb-4 pt-3 dark:border-neutral-800">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-neutral-500 dark:text-neutral-400">
                              <th className="pb-1.5 text-left text-xs font-medium"></th>
                              <th className="pb-1.5 text-right text-xs font-medium">Comptant</th>
                              <th className="pb-1.5 text-right text-xs font-medium">Interac</th>
                              <th className="pb-1.5 text-right text-xs font-medium">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="py-1 text-neutral-700 dark:text-neutral-300">Compté</td>
                              <td className="py-1 text-right tabular-nums text-neutral-800 dark:text-neutral-200">
                                {fmt(c(rec.cash_counted))}
                              </td>
                              <td className="py-1 text-right tabular-nums text-neutral-800 dark:text-neutral-200">
                                {fmt(c(rec.interac_counted))}
                              </td>
                              <td className="py-1 text-right tabular-nums font-semibold text-neutral-800 dark:text-neutral-200">
                                {fmt(totalCounted)}
                              </td>
                            </tr>
                            <tr>
                              <td className="py-1 text-neutral-700 dark:text-neutral-300">Apex</td>
                              <td className="py-1 text-right tabular-nums text-neutral-800 dark:text-neutral-200">
                                {fmt(c(rec.cash_apex))}
                              </td>
                              <td className="py-1 text-right tabular-nums text-neutral-800 dark:text-neutral-200">
                                {fmt(c(rec.interac_apex))}
                              </td>
                              <td className="py-1 text-right tabular-nums font-semibold text-neutral-800 dark:text-neutral-200">
                                {fmt(totalApex)}
                              </td>
                            </tr>
                            <tr className="border-t border-neutral-200 dark:border-neutral-700">
                              <td className="py-1 font-bold text-neutral-800 dark:text-neutral-200">Diff.</td>
                              <td className={`py-1 text-right tabular-nums font-bold ${diffColor(diffCash)}`}>
                                {fmt(diffCash)}
                              </td>
                              <td className={`py-1 text-right tabular-nums font-bold ${diffColor(diffInterac)}`}>
                                {fmt(diffInterac)}
                              </td>
                              <td className={`py-1 text-right tabular-nums font-bold ${diffColor(diffTotal)}`}>
                                {fmt(diffTotal)}
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        {rec.explanation && (
                          <div className="mt-3 rounded-lg bg-amber-50 px-4 py-3 dark:bg-amber-900/20">
                            <p className="text-sm text-amber-900 dark:text-amber-200">
                              📝 {rec.explanation}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
