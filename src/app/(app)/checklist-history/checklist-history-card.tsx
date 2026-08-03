"use client";

import { useState } from "react";
import { Card } from "@/components/ui";

interface SectionStat {
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
}

interface PersonSummary {
  name: string;
  isSupervisor: boolean;
  completed: number;
  total: number;
  pct: number;
  accountName: string;
  showAccount: boolean;
  notes: string | null;
  cashRec: CashReconciliationData | null;
}

export interface CashReconciliationData {
  cashCounted: number | null;
  interacCounted: number | null;
  cashApex: number | null;
  interacApex: number | null;
  explanation: string | null;
}

interface Props {
  dateLabel: string;
  hoursLabel: string;
  persons: PersonSummary[];
  sections: SectionStat[];
}

function pctColor(pct: number) {
  if (pct === 100) return "text-emerald-600 dark:text-emerald-400";
  if (pct >= 70) return "text-amber-600 dark:text-amber-400";
  return "text-red-500 dark:text-red-400";
}

function barColor(pct: number) {
  if (pct === 100) return "bg-emerald-500";
  if (pct >= 70) return "bg-amber-500";
  return "bg-red-500";
}

export function DayHistoryCard({ dateLabel, hoursLabel, persons, sections }: Props) {
  const [open, setOpen] = useState(false);

  const totalCompleted = persons.reduce((s, p) => s + p.completed, 0);
  const totalTasks = persons.reduce((s, p) => s + p.total, 0);
  const overallPct = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;

  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full p-4 text-left transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`shrink-0 text-neutral-400 transition-transform ${open ? "rotate-90" : ""}`}
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
            <p className="text-base font-bold capitalize text-neutral-900 dark:text-neutral-100">
              {dateLabel}
            </p>
          </div>
          <span className={`text-sm font-bold ${pctColor(overallPct)}`}>
            {totalCompleted}/{totalTasks}
          </span>
        </div>

        {hoursLabel && (
          <p className="mt-0.5 pl-5 text-xs text-neutral-400">{hoursLabel}</p>
        )}

        <div className="mt-2.5 space-y-2 pl-5">
          {persons.map((p) => (
            <div key={p.name}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{p.name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    p.isSupervisor
                      ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
                      : "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300"
                  }`}>
                    {p.isSupervisor ? "Superviseur" : "Caissière"}
                  </span>
                  {p.showAccount && (
                    <span className="text-[10px] text-neutral-400">({p.accountName})</span>
                  )}
                </div>
                <span className={`text-xs font-bold ${pctColor(p.pct)}`}>{p.completed}/{p.total}</span>
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
                <div className={`h-full rounded-full ${barColor(p.pct)}`} style={{ width: `${p.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </button>

      {open && (
        <div className="border-t border-neutral-100 px-4 pb-4 pt-3 dark:border-neutral-800">
          <div className="space-y-4">
            {sections.map((sec) => {
              const doneCount = sec.tasks.filter((t) => t.totalCount > 0).length;
              return (
                <div key={sec.section}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                      {sec.icon} {sec.label}
                    </span>
                    <span className={`text-xs font-semibold ${
                      doneCount === sec.total
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-neutral-500"
                    }`}>
                      {doneCount}/{sec.total}
                    </span>
                  </div>

                  <div className="mt-1.5 space-y-1.5 pl-4">
                    {sec.tasks.map((task) => (
                      <div key={task.task_key}>
                        {task.totalCount > 0 ? (
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                                ✓ {task.label}
                              </span>
                              {sec.section === "during" && (
                                <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                                  ×{task.totalCount}
                                  {task.intervalLabel && (
                                    <span className="ml-1 font-normal opacity-80">{task.intervalLabel}</span>
                                  )}
                                </span>
                              )}
                            </div>
                            <div className="mt-0.5 space-y-0 pl-4">
                              {task.completions.map((c, i) => (
                                <p key={i} className="text-xs text-neutral-600 dark:text-neutral-300">
                                  <span className="font-semibold">{c.operator}</span>
                                  {c.time && <span className="ml-1 text-neutral-400 dark:text-neutral-500">à {c.time}</span>}
                                </p>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs font-medium text-red-500 dark:text-red-400">
                            ✗ {task.label}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {persons.filter((p) => p.notes).map((p) => (
            <div key={p.name} className="mt-3 border-t border-neutral-100 pt-3 dark:border-neutral-800">
              <p className="mb-1 text-xs font-bold text-neutral-600 dark:text-neutral-400">📝 Notes de réunion — {p.name}</p>
              <p className="whitespace-pre-wrap rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                {p.notes}
              </p>
            </div>
          ))}

          {persons.filter((p) => p.cashRec).map((p) => (
            <div key={p.name} className="mt-3 border-t border-neutral-100 pt-3 dark:border-neutral-800">
              <p className="mb-2 text-xs font-bold text-neutral-700 dark:text-neutral-300">💰 Clôture — {p.name}</p>
              <CashReconciliationView data={p.cashRec!} />
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function CashReconciliationView({ data }: { data: CashReconciliationData }) {
  const c = (v: number | null) => v ?? 0;
  const fmt = (n: number) => n.toFixed(2) + " $";
  const totalCounted = c(data.cashCounted) + c(data.interacCounted);
  const totalApex = c(data.cashApex) + c(data.interacApex);
  const diffCash = c(data.cashCounted) - c(data.cashApex);
  const diffInterac = c(data.interacCounted) - c(data.interacApex);
  const diffTotal = totalCounted - totalApex;
  const diffColor = (n: number) => n === 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400";

  return (
    <>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-neutral-400">
            <th className="pb-1 text-left font-medium"></th>
            <th className="pb-1 text-right font-medium">Comptant</th>
            <th className="pb-1 text-right font-medium">Interac</th>
            <th className="pb-1 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="py-0.5 text-neutral-600 dark:text-neutral-400">Ce que j&apos;ai</td>
            <td className="py-0.5 text-right tabular-nums text-neutral-800 dark:text-neutral-200">{fmt(c(data.cashCounted))}</td>
            <td className="py-0.5 text-right tabular-nums text-neutral-800 dark:text-neutral-200">{fmt(c(data.interacCounted))}</td>
            <td className="py-0.5 text-right tabular-nums font-semibold text-neutral-800 dark:text-neutral-200">{fmt(totalCounted)}</td>
          </tr>
          <tr>
            <td className="py-0.5 text-neutral-600 dark:text-neutral-400">Apex</td>
            <td className="py-0.5 text-right tabular-nums text-neutral-800 dark:text-neutral-200">{fmt(c(data.cashApex))}</td>
            <td className="py-0.5 text-right tabular-nums text-neutral-800 dark:text-neutral-200">{fmt(c(data.interacApex))}</td>
            <td className="py-0.5 text-right tabular-nums font-semibold text-neutral-800 dark:text-neutral-200">{fmt(totalApex)}</td>
          </tr>
          <tr className="border-t border-neutral-200 dark:border-neutral-700">
            <td className="py-0.5 font-bold text-neutral-700 dark:text-neutral-300">Diff.</td>
            <td className={`py-0.5 text-right tabular-nums font-bold ${diffColor(diffCash)}`}>{fmt(diffCash)}</td>
            <td className={`py-0.5 text-right tabular-nums font-bold ${diffColor(diffInterac)}`}>{fmt(diffInterac)}</td>
            <td className={`py-0.5 text-right tabular-nums font-bold ${diffColor(diffTotal)}`}>{fmt(diffTotal)}</td>
          </tr>
        </tbody>
      </table>
      {data.explanation && (
        <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">📝 {data.explanation}</p>
      )}
    </>
  );
}
