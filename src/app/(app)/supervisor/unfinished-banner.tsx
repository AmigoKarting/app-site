"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface UnfinishedTask {
  id: string;
  date: string;
  task_label: string;
  task_section: string;
  supervisor_name: string | null;
  done_by: string | null;
  rating: number | null;
  comment: string | null;
}

export function UnfinishedBanner({ tasks: initialTasks }: { tasks: UnfinishedTask[] }) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [resolving, setResolving] = useState<string | null>(null);

  async function handleResolve(taskId: string) {
    setResolving(taskId);
    try {
      const res = await fetch("/api/supervisor/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      if (res.ok) {
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
        router.refresh();
      }
    } finally {
      setResolving(null);
    }
  }

  if (tasks.length === 0) return null;

  return (
    <div className="rounded-xl border-2 border-amber-400 bg-amber-50 p-4 dark:border-amber-600 dark:bg-amber-900/20">
      <div className="mb-3 flex items-center gap-2">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600 dark:text-amber-400">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <h2 className="text-base font-bold text-amber-800 dark:text-amber-300">
          Taches non terminees ({tasks.length})
        </h2>
      </div>
      <p className="mb-4 text-xs text-amber-700 dark:text-amber-400">
        Ces taches ont ete marquees comme non terminees. Vous recevrez des rappels tant qu&apos;elles ne sont pas resolues.
      </p>
      <div className="space-y-3">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="rounded-lg border border-amber-200 bg-white p-3 dark:border-amber-700 dark:bg-neutral-800"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    task.task_section === "caisse"
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                      : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                  }`}>
                    {task.task_section === "caisse" ? "Caisse" : "Piste"}
                  </span>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                    {task.rating}/10
                  </span>
                </div>
                <p className="mt-1.5 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  {task.task_label}
                </p>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                  {task.supervisor_name && (
                    <span>Superviseur: <strong>{task.supervisor_name}</strong></span>
                  )}
                  {task.done_by && (
                    <span>Fait par: <strong>{task.done_by}</strong></span>
                  )}
                  <span>{task.date}</span>
                </div>
                {task.comment && (
                  <p className="mt-1.5 rounded bg-neutral-50 px-2 py-1 text-xs text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">
                    💬 {task.comment}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleResolve(task.id)}
                disabled={resolving === task.id}
                className="shrink-0 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-95 disabled:opacity-50 dark:bg-emerald-700"
              >
                {resolving === task.id ? "..." : "Terminee ✓"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
