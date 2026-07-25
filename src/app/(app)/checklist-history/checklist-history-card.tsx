"use client";

import { useState } from "react";
import { Card, formatDateTime } from "@/components/ui";

interface TaskInfo {
  task_key: string;
  label: string;
}

interface SectionStat {
  section: string;
  label: string;
  icon: string;
  total: number;
  done: TaskInfo[];
  missed: TaskInfo[];
}

export interface CashReconciliationData {
  cashCounted: number | null;
  interacCounted: number | null;
  cashApex: number | null;
  interacApex: number | null;
  explanation: string | null;
}

interface Props {
  id: string;
  operatorName: string;
  accountName: string;
  showAccount: boolean;
  isSupervisor: boolean;
  completedForRole: number;
  totalForRole: number;
  pct: number;
  submittedAt: string;
  dateFmt: string;
  sections: SectionStat[];
  timestamps: Record<string, string | string[]>;
  notes: string | null;
  cashReconciliation?: CashReconciliationData | null;
}

function formatTime(ts: string): string {
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Montreal" });
  } catch {
    return "";
  }
}

export function ChecklistHistoryCard({
  id, operatorName, accountName, showAccount, isSupervisor,
  completedForRole, totalForRole, pct, submittedAt, dateFmt,
  sections, timestamps, notes, cashReconciliation,
}: Props) {
  const [open, setOpen] = useState(false);

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
            <p className="font-semibold text-neutral-900 dark:text-neutral-100">
              {operatorName}
            </p>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              isSupervisor
                ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
                : "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300"
            }`}>
              {isSupervisor ? "Superviseur" : "Caissiere"}
            </span>
          </div>
          <span className={`text-sm font-bold ${
            pct === 100
              ? "text-emerald-600 dark:text-emerald-400"
              : pct >= 70
                ? "text-amber-600 dark:text-amber-400"
                : "text-red-600 dark:text-red-400"
          }`}>
            {completedForRole}/{totalForRole}
          </span>
        </div>

        <p className="mt-1 pl-5 text-xs text-neutral-500 dark:text-neutral-400">
          {formatDateTime(submittedAt, dateFmt)}
          {showAccount && <span> · Compte: {accountName}</span>}
        </p>

        {!isSupervisor && (
          <div className="mt-2 pl-5">
            {cashReconciliation ? (() => {
              const c = (v: number | null) => v ?? 0;
              const diff = (c(cashReconciliation.cashCounted) + c(cashReconciliation.interacCounted))
                - (c(cashReconciliation.cashApex) + c(cashReconciliation.interacApex));
              const isOk = diff === 0;
              return (
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                  isOk
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                }`}>
                  💰 {isOk ? "Caisse OK" : `Diff: ${diff >= 0 ? "+" : ""}${diff.toFixed(2)} $`}
                </span>
              );
            })() : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400">
                💰 Pas de clôture
              </span>
            )}
          </div>
        )}

        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
          <div
            className={`h-full rounded-full ${
              pct === 100 ? "bg-emerald-500" : pct >= 70 ? "bg-amber-500" : "bg-red-500"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </button>

      {open && (
        <div className="border-t border-neutral-100 px-4 pb-4 pt-3 dark:border-neutral-800">
          <div className="space-y-3">
            {sections.map((sec) => (
              <div key={sec.section}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                    {sec.icon} {sec.label}
                  </span>
                  <span className={`text-xs font-semibold ${
                    sec.done.length === sec.total
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-neutral-500"
                  }`}>
                    {sec.done.length}/{sec.total}
                  </span>
                </div>

                <div className="mt-1 space-y-0.5 pl-5">
                  {sec.done.map((task) => {
                    const ts = timestamps[task.task_key];
                    const timeStr = typeof ts === "string" ? formatTime(ts) : Array.isArray(ts) && ts.length > 0 ? formatTime(ts[ts.length - 1]) : "";
                    return (
                      <div key={task.task_key} className="flex items-center justify-between text-xs">
                        <span className="text-neutral-700 dark:text-neutral-300">
                          ✓ {task.label}
                          {Array.isArray(ts) && ts.length > 1 && (
                            <span className="ml-1 text-emerald-600 dark:text-emerald-400">×{ts.length}</span>
                          )}
                        </span>
                        {timeStr && (
                          <span className="ml-2 shrink-0 text-neutral-400">{timeStr}</span>
                        )}
                      </div>
                    );
                  })}
                  {sec.missed.map((task) => (
                    <p key={task.task_key} className="text-xs text-neutral-400 dark:text-neutral-500">
                      ✗ {task.label}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {notes && (
            <div className="mt-3 border-t border-neutral-100 pt-3 dark:border-neutral-800">
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                💬 {notes}
              </p>
            </div>
          )}

          {cashReconciliation && (
            <CashReconciliationView data={cashReconciliation} />
          )}
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
    <div className="mt-3 border-t border-neutral-100 pt-3 dark:border-neutral-800">
      <p className="mb-2 text-xs font-bold text-neutral-700 dark:text-neutral-300">💰 Clôture de caisse</p>
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
    </div>
  );
}
