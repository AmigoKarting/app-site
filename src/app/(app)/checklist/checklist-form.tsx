"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "@/lib/i18n";

export interface ChecklistTaskProps {
  key: string;
  section: "opening" | "during" | "closing" | "free_time" | "meeting";
  label: string;
}

const SEND_DELAY = 3;
const DURING_RESET_MS = 1 * 60 * 60 * 1000;

interface TaskState {
  checked: boolean;
  countdown: number | null;
  sent: boolean;
  sending: boolean;
  sentAt: string | null;
  duringCount: number;
}

export function ChecklistForm({
  tasks,
  initialCompleted,
  initialTimestamps = {},
  initialOperator,
  userName,
  streak = 0,
  role = "caissiere",
  lockedTasks = [],
}: {
  tasks: ChecklistTaskProps[];
  initialCompleted: string[];
  initialTimestamps?: Record<string, string | string[]>;
  initialOperator?: string;
  userName?: string;
  streak?: number;
  role?: "caissiere" | "superviseur";
  lockedTasks?: string[];
}) {
  const { t } = useTranslation();

  const isSupervisor = role === "superviseur";

  const [selectedOperator, setSelectedOperator] = useState(initialOperator ?? "");
  const operatorRef = useRef(selectedOperator);
  useEffect(() => { operatorRef.current = selectedOperator; }, [selectedOperator]);

  const [states, setStates] = useState<Record<string, TaskState>>(() => {
    const init: Record<string, TaskState> = {};
    for (const task of tasks) {
      const ts = initialTimestamps[task.key];
      if (task.section === "during") {
        const arr = Array.isArray(ts) ? ts : ts ? [ts] : [];
        const lastTs = arr.length > 0 ? arr[arr.length - 1] : null;
        const elapsed = lastTs ? Date.now() - new Date(lastTs).getTime() : Infinity;
        const needsReset = elapsed > DURING_RESET_MS;
        init[task.key] = {
          checked: !needsReset && arr.length > 0,
          countdown: null,
          sent: !needsReset && arr.length > 0,
          sending: false,
          sentAt: lastTs,
          duringCount: arr.length,
        };
      } else {
        const done = initialCompleted.includes(task.key);
        init[task.key] = {
          checked: done,
          countdown: null,
          sent: done,
          sending: false,
          sentAt: (typeof ts === "string" ? ts : null),
          duringCount: 0,
        };
      }
    }
    return init;
  });

  const [showCelebration, setShowCelebration] = useState(false);
  const prevCompletedRef = useRef(
    Object.values(states).filter((s) => s.sent).length,
  );

  const statesRef = useRef(states);
  statesRef.current = states;

  const timersRef = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      Object.values(timers).forEach(clearInterval);
    };
  }, []);

  // Auto-reset "during" tasks after 2 hours
  const duringKeys = tasks.filter((t) => t.section === "during").map((t) => t.key);
  useEffect(() => {
    if (duringKeys.length === 0) return;
    const check = setInterval(() => {
      setStates((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const key of duringKeys) {
          const st = next[key];
          if (st?.sent && st.sentAt) {
            const elapsed = Date.now() - new Date(st.sentAt).getTime();
            if (elapsed > DURING_RESET_MS) {
              next[key] = { ...st, checked: false, sent: false, sentAt: null };
              changed = true;
            }
          }
        }
        return changed ? next : prev;
      });
    }, 60_000);
    return () => clearInterval(check);
  }, [duringKeys.join()]);

  const completedCount = Object.values(states).filter((s) => s.sent).length;
  const totalCount = tasks.length;

  useEffect(() => {
    const wasComplete = prevCompletedRef.current === totalCount;
    const isComplete = completedCount === totalCount && totalCount > 0;

    if (isComplete && !wasComplete) {
      setShowCelebration(true);
      if (navigator.vibrate) navigator.vibrate([80, 60, 80]);
    }

    prevCompletedRef.current = completedCount;
  }, [completedCount, totalCount]);

  const sendTask = useCallback(async (taskKey: string) => {
    console.log("[checklist] sendTask called for", taskKey);
    setStates((prev) => ({
      ...prev,
      [taskKey]: { ...prev[taskKey], sending: true, countdown: null },
    }));

    try {
      const body: Record<string, string> = { taskKey };
      if (operatorRef.current) body.operatorName = operatorRef.current;

      console.log("[checklist] POSTing to /api/checklist/complete-task", body);
      const res = await fetch("/api/checklist/complete-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const resBody = await res.json().catch(() => null);
      console.log("[checklist] response:", res.status, JSON.stringify(resBody));
      if (res.ok) {
        setStates((prev) => ({
          ...prev,
          [taskKey]: {
            ...prev[taskKey],
            sent: true,
            sending: false,
            sentAt: new Date().toISOString(),
            duringCount: prev[taskKey].duringCount + 1,
          },
        }));
        if (navigator.vibrate) navigator.vibrate(30);
      } else {
        const text = await res.text().catch(() => "");
        console.error("[checklist] error response:", res.status, text);
        setStates((prev) => ({
          ...prev,
          [taskKey]: { ...prev[taskKey], sending: false },
        }));
      }
    } catch (err) {
      console.error("[checklist] fetch error:", err);
      setStates((prev) => ({
        ...prev,
        [taskKey]: { ...prev[taskKey], sending: false },
      }));
    }
  }, []);

  const handleToggle = useCallback(
    (taskKey: string) => {
      if (!selectedOperator) return;

      const current = statesRef.current[taskKey];
      if (!current || current.sent || current.sending) return;

      if (!current.checked) {
        setStates((prev) => ({
          ...prev,
          [taskKey]: { ...prev[taskKey], checked: true, countdown: SEND_DELAY },
        }));

        const interval = setInterval(() => {
          setStates((s) => {
            const st = s[taskKey];
            if (!st || st.countdown === null) {
              clearInterval(timersRef.current[taskKey]);
              delete timersRef.current[taskKey];
              return s;
            }
            if (st.countdown <= 1) {
              clearInterval(timersRef.current[taskKey]);
              delete timersRef.current[taskKey];
              sendTask(taskKey);
              return { ...s, [taskKey]: { ...st, countdown: null } };
            }
            return { ...s, [taskKey]: { ...st, countdown: st.countdown - 1 } };
          });
        }, 1000);

        timersRef.current[taskKey] = interval;
      } else {
        if (timersRef.current[taskKey]) {
          clearInterval(timersRef.current[taskKey]);
          delete timersRef.current[taskKey];
        }
        setStates((prev) => ({
          ...prev,
          [taskKey]: { ...prev[taskKey], checked: false, countdown: null },
        }));
      }
    },
    [sendTask, selectedOperator],
  );

  const sections = isSupervisor
    ? [
        { id: "opening" as const, label: t.checklist.sectionOpening, icon: "🌅" },
        { id: "during" as const, label: "20h", icon: "🕗" },
        { id: "closing" as const, label: "22h", icon: "🌙" },
        { id: "meeting" as const, label: "Réunion", icon: "🤝" },
      ]
    : [
        { id: "opening" as const, label: t.checklist.sectionOpening, icon: "🌅" },
        { id: "during" as const, label: t.checklist.sectionDuring, icon: "☀️" },
        { id: "closing" as const, label: t.checklist.sectionClosing, icon: "🌙" },
        { id: "free_time" as const, label: t.checklist.sectionFreeTime, icon: "🧹" },
      ];

  const [meetingNotes, setMeetingNotes] = useState("");
  const [meetingNotesSaved, setMeetingNotesSaved] = useState(false);
  const [meetingNotesSaving, setMeetingNotesSaving] = useState(false);

  const saveMeetingNotes = useCallback(async () => {
    if (!meetingNotes.trim()) return;
    setMeetingNotesSaving(true);
    try {
      const res = await fetch("/api/checklist/meeting-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: meetingNotes.trim() }),
      });
      if (res.ok) {
        setMeetingNotesSaved(true);
        if (navigator.vibrate) navigator.vibrate(30);
      }
    } catch { /* ignore */ }
    setMeetingNotesSaving(false);
  }, [meetingNotes]);

  const [activeSection, setActiveSection] = useState<"opening" | "during" | "closing" | "free_time" | "meeting">(() => {
    const h = new Date().getHours();
    if (isSupervisor) {
      if (h < 20) return "opening";
      if (h < 22) return "during";
      return "closing";
    }
    if (h < 12) return "opening";
    if (h < 17) return "during";
    return "closing";
  });

  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const allDone = completedCount === totalCount && totalCount > 0;

  const needsOperator = !selectedOperator;

  const activeSectionData = sections.find((s) => s.id === activeSection)!;
  const activeItems = tasks.filter((i) => i.section === activeSection);
  const activeDoneCount = activeItems.filter((i) => states[i.key]?.sent).length;

  return (
    <div className="space-y-4">
      {/* Greeting + Streak */}
      <div className="flex items-center justify-between">
        <TimeGreeting name={userName} />
        {streak >= 2 && (
          <span className="animate-scale-in rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700 ring-1 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:ring-amber-700">
            🔥 {streak} {streak === 1 ? t.checklist.streakSingular : t.checklist.streakPlural}
          </span>
        )}
      </div>

      {/* Operator picker */}
      <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800/50">
        <p className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
          {t.checklist.operatorLabel}
        </p>
        <div className="grid grid-cols-3 gap-2">
          {(isSupervisor ? [
            { name: "Alexy", color: "bg-blue-500" },
            { name: "Adel", color: "bg-emerald-500" },
            { name: "Fred", color: "bg-orange-500" },
          ] : [
            { name: "Amia", color: "bg-pink-500" },
            { name: "Angélie", color: "bg-fuchsia-500" },
            { name: "Ariel", color: "bg-violet-500" },
            { name: "Kyana", color: "bg-rose-500" },
            { name: "Lili-Rose", color: "bg-purple-500" },
          ]).map((op) => {
            const color = op.color;
            return (
              <button
                key={op.name}
                type="button"
                onClick={() => setSelectedOperator(selectedOperator === op.name ? "" : op.name)}
                className={`relative rounded-xl px-2 py-3 text-sm font-bold text-white shadow-sm transition-all active:scale-95 ${color} ${
                  selectedOperator === op.name
                    ? "ring-3 ring-offset-2 ring-neutral-900 scale-105 shadow-lg"
                    : "opacity-80 hover:opacity-100 hover:shadow-md"
                }`}
              >
                {op.name}
                {selectedOperator === op.name && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2.5 6L5 8.5L9.5 3.5" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {needsOperator && (
          <p className="mt-2.5 text-center text-xs text-amber-600 dark:text-amber-400">
            {t.checklist.operatorRequired}
          </p>
        )}
      </div>

      {/* Celebration */}
      {allDone && (
        <div className="animate-scale-in rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center dark:border-emerald-800 dark:bg-emerald-900/20">
          <div className="text-3xl">🎉</div>
          <p className="mt-1 font-semibold text-emerald-700 dark:text-emerald-300">
            {t.checklist.allDone}
          </p>
          <p className="mt-0.5 text-xs text-emerald-600 dark:text-emerald-400">
            {t.checklist.allDoneDesc}
          </p>
        </div>
      )}

      {showCelebration && <Confetti />}

      {/* Section selector */}
      <div className="grid grid-cols-2 gap-2">
        {sections.map((s) => {
          const items = tasks.filter((i) => i.section === s.id);
          const done = items.filter((i) => states[i.key]?.sent).length;
          const allSectionDone = done === items.length && items.length > 0;
          const isActive = activeSection === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveSection(s.id)}
              className={`relative rounded-xl px-3 py-3 text-sm font-bold shadow-sm transition-all active:scale-95 ${
                isActive
                  ? "bg-brand-600 text-white ring-3 ring-offset-2 ring-neutral-900 scale-[1.02] shadow-lg dark:ring-offset-neutral-900"
                  : "bg-white text-neutral-700 border border-neutral-200 opacity-80 hover:opacity-100 hover:shadow-md dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-700"
              }`}
            >
              <span>{s.icon} {s.label}</span>
              <span className={`ml-1.5 inline-flex rounded-full px-1.5 py-0.5 text-[11px] font-bold ${
                isActive
                  ? allSectionDone ? "bg-emerald-400/30 text-emerald-100" : "bg-white/20 text-white/90"
                  : allSectionDone ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" : "bg-neutral-100 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400"
              }`}>
                {done}/{items.length}
              </span>
              {isActive && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-white shadow">
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6L5 8.5L9.5 3.5" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
        <div
          className="h-full rounded-full bg-brand-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Active section tasks */}
      <div className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-800/50">
        <ul className="space-y-1">
          {activeItems.map((item) => {
            const st = states[item.key];
            if (!st) return null;
            const isLocked = lockedTasks.includes(item.key);

            return (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={() => !isLocked && handleToggle(item.key)}
                  disabled={st.sent || st.sending || needsOperator || isLocked}
                  className={`flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left transition ${
                    isLocked
                      ? "cursor-not-allowed opacity-50 bg-neutral-100 dark:bg-neutral-800"
                      : st.sent
                        ? "bg-emerald-50 dark:bg-emerald-900/20"
                        : st.countdown !== null
                          ? "bg-amber-50 dark:bg-amber-900/20"
                          : needsOperator
                            ? "cursor-not-allowed opacity-50"
                            : "hover:bg-neutral-50 active:bg-neutral-100 dark:hover:bg-neutral-700/50 dark:active:bg-neutral-700"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all duration-200 ${
                      isLocked
                        ? "border-neutral-300 bg-neutral-200 text-neutral-400 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-500"
                        : st.sent
                          ? "scale-110 border-emerald-500 bg-emerald-500 text-white"
                          : st.checked
                            ? "scale-110 border-brand-500 bg-brand-500 text-white"
                            : "border-neutral-300 dark:border-neutral-600"
                    }`}
                  >
                    {isLocked ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2z"/>
                      </svg>
                    ) : (st.sent || st.checked) ? (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path
                          d="M2.5 6L5 8.5L9.5 3.5"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : null}
                  </span>

                  <span className="flex-1">
                    <span
                      className={`text-sm transition-all duration-300 ${
                        st.sent && item.section !== "during"
                          ? "text-emerald-700 line-through dark:text-emerald-400"
                          : st.sent
                            ? "text-emerald-700 dark:text-emerald-400"
                            : "text-neutral-800 dark:text-neutral-200"
                      }`}
                    >
                      {item.label}
                    </span>

                    {isLocked && (
                      <span className="mt-1 block text-xs text-neutral-400 dark:text-neutral-500">
                        Pas un jour de recyclage
                      </span>
                    )}

                    {st.duringCount > 0 && item.section === "during" && (
                      <span className="ml-2 inline-flex rounded-full bg-brand-100 px-1.5 py-0.5 text-[11px] font-bold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                        x{st.duringCount}
                      </span>
                    )}

                    {!isLocked && st.countdown !== null && (
                      <span className="mt-1 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                        <CountdownRing seconds={st.countdown} total={SEND_DELAY} />
                        {t.checklist.sendingIn.replace("{seconds}", String(st.countdown))}
                      </span>
                    )}

                    {st.sending && (
                      <span className="mt-1 block text-xs text-brand-600 dark:text-brand-400">
                        {t.checklist.sending}
                      </span>
                    )}

                    {st.sent && (
                      <span className="mt-1 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                        ✓ {t.checklist.sent}
                        {st.sentAt && (
                          <span className="text-emerald-500 dark:text-emerald-500">
                            — {formatTime(st.sentAt)}
                          </span>
                        )}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      {/* Meeting notes — supervisors only */}
      {isSupervisor && activeSection === "meeting" && activeItems.some((i) => states[i.key]?.sent) && (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800/50">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
              📝 Notes de réunion
            </h3>
            {meetingNotesSaved && !meetingNotesSaving && (
              <span className="text-xs text-emerald-500">✓ Envoyé</span>
            )}
          </div>
          <textarea
            value={meetingNotes}
            onChange={(e) => { setMeetingNotes(e.target.value); setMeetingNotesSaved(false); }}
            placeholder="De quoi avez-vous parlé pendant la réunion ?"
            rows={4}
            disabled={meetingNotesSaved}
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 disabled:opacity-60 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
          />
          {!meetingNotesSaved && (
            <button
              type="button"
              onClick={saveMeetingNotes}
              disabled={meetingNotesSaving || !meetingNotes.trim()}
              className="mt-2 w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50 active:scale-[0.98]"
            >
              {meetingNotesSaving ? "Envoi..." : "Envoyer les notes"}
            </button>
          )}
        </div>
      )}

      {/* Cash reconciliation form — cashiers only */}
      {!isSupervisor && selectedOperator && (
        <CashReconciliation operatorName={selectedOperator} />
      )}
    </div>
  );
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

/* ------------------------------------------------------------------ */
/* Greeting based on time of day                                       */
/* ------------------------------------------------------------------ */
function TimeGreeting({ name }: { name?: string }) {
  const { t } = useTranslation();
  const [greeting, setGreeting] = useState<string | null>(null);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) setGreeting(t.checklist.greetingMorning);
    else if (hour >= 12 && hour < 17) setGreeting(t.checklist.greetingAfternoon);
    else setGreeting(t.checklist.greetingEvening);
  }, [t]);

  if (!greeting) return null;

  return (
    <p className="animate-fade-in text-lg font-semibold text-neutral-800 dark:text-neutral-200">
      {greeting}
      {name ? `, ${name}` : ""} 👋
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* Confetti celebration                                                */
/* ------------------------------------------------------------------ */
function Confetti() {
  const colors = [
    "#6366f1", "#ec4899", "#f59e0b", "#10b981",
    "#3b82f6", "#8b5cf6", "#f43f5e", "#14b8a6",
  ];

  // Deterministic pseudo-random using golden ratio
  const pseudo = (i: number) => ((i * 2654435761) >>> 0) / 4294967296;

  useEffect(() => {
    const timeout = setTimeout(() => {
      const el = document.getElementById("confetti-container");
      if (el) el.style.opacity = "0";
    }, 3000);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div
      id="confetti-container"
      className="pointer-events-none fixed inset-0 z-[100] overflow-hidden transition-opacity duration-1000"
    >
      {Array.from({ length: 50 }, (_, i) => (
        <div
          key={i}
          className="confetti-particle"
          style={{
            left: `${pseudo(i) * 100}%`,
            width: `${6 + (i % 4) * 2}px`,
            height: `${6 + (i % 4) * 2}px`,
            backgroundColor: colors[i % colors.length],
            animationDuration: `${2 + pseudo(i + 50) * 2}s`,
            animationDelay: `${pseudo(i + 100) * 0.8}s`,
            borderRadius: i % 3 === 0 ? "50%" : "2px",
          }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Small sub-components                                                */
/* ------------------------------------------------------------------ */
function CashReconciliation({ operatorName }: { operatorName: string }) {
  const [cashCounted, setCashCounted] = useState("");
  const [interacCounted, setInteracCounted] = useState("");
  const [cashApex, setCashApex] = useState("");
  const [interacApex, setInteracApex] = useState("");
  const [explanation, setExplanation] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/checklist/cash-reconciliation?operator=${encodeURIComponent(operatorName)}`)
      .then((r) => r.json())
      .then((res) => {
        if (cancelled || !res.data) return;
        setCashCounted(res.data.cash_counted?.toString() ?? "");
        setInteracCounted(res.data.interac_counted?.toString() ?? "");
        setCashApex(res.data.cash_apex?.toString() ?? "");
        setInteracApex(res.data.interac_apex?.toString() ?? "");
        setExplanation(res.data.explanation ?? "");
        setSaved(true);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [operatorName]);

  const doSave = useCallback(() => {
    setSaving(true);
    fetch("/api/checklist/cash-reconciliation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operatorName,
        cashCounted: cashCounted ? parseFloat(cashCounted) : null,
        interacCounted: interacCounted ? parseFloat(interacCounted) : null,
        cashApex: cashApex ? parseFloat(cashApex) : null,
        interacApex: interacApex ? parseFloat(interacApex) : null,
        explanation: explanation || undefined,
      }),
    })
      .then(() => { setSaved(true); setSaving(false); })
      .catch(() => setSaving(false));
  }, [operatorName, cashCounted, interacCounted, cashApex, interacApex, explanation]);

  const schedSave = useCallback(() => {
    setSaved(false);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(doSave, 1500);
  }, [doSave]);

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  const parse = (v: string) => (v ? parseFloat(v) : 0);
  const totalCounted = parse(cashCounted) + parse(interacCounted);
  const totalApex = parse(cashApex) + parse(interacApex);
  const diffCash = parse(cashCounted) - parse(cashApex);
  const diffInterac = parse(interacCounted) - parse(interacApex);
  const diffTotal = totalCounted - totalApex;
  const hasDiff = diffCash !== 0 || diffInterac !== 0;

  const onlyNumbers = (value: string) => value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");

  const inputClass =
    "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-right tabular-nums focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100";

  const fmt = (n: number) => n.toFixed(2) + " $";

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800/50">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
          💰 Clôture de caisse
        </h3>
        {saving && <span className="text-xs text-brand-500">Sauvegarde...</span>}
        {saved && !saving && <span className="text-xs text-emerald-500">✓ Sauvegardé</span>}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-neutral-500 dark:text-neutral-400">
              <th className="pb-2 text-left font-medium"></th>
              <th className="pb-2 text-center font-medium">Comptant</th>
              <th className="pb-2 text-center font-medium">Interac</th>
              <th className="pb-2 text-center font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="py-1.5 pr-2 font-medium text-neutral-700 dark:text-neutral-300">Ce que j&apos;ai</td>
              <td className="p-1">
                <input
                  type="text"
                  inputMode="decimal"
                  value={cashCounted}
                  onChange={(e) => { setCashCounted(onlyNumbers(e.target.value)); schedSave(); }}
                  placeholder="0.00"
                  className={inputClass}
                />
              </td>
              <td className="p-1">
                <input
                  type="text"
                  inputMode="decimal"
                  value={interacCounted}
                  onChange={(e) => { setInteracCounted(onlyNumbers(e.target.value)); schedSave(); }}
                  placeholder="0.00"
                  className={inputClass}
                />
              </td>
              <td className="p-1 text-center font-semibold tabular-nums text-neutral-800 dark:text-neutral-200">
                {fmt(totalCounted)}
              </td>
            </tr>
            <tr>
              <td className="py-1.5 pr-2 font-medium text-neutral-700 dark:text-neutral-300">Ce que Apex dit</td>
              <td className="p-1">
                <input
                  type="text"
                  inputMode="decimal"
                  value={cashApex}
                  onChange={(e) => { setCashApex(onlyNumbers(e.target.value)); schedSave(); }}
                  placeholder="0.00"
                  className={inputClass}
                />
              </td>
              <td className="p-1">
                <input
                  type="text"
                  inputMode="decimal"
                  value={interacApex}
                  onChange={(e) => { setInteracApex(onlyNumbers(e.target.value)); schedSave(); }}
                  placeholder="0.00"
                  className={inputClass}
                />
              </td>
              <td className="p-1 text-center font-semibold tabular-nums text-neutral-800 dark:text-neutral-200">
                {fmt(totalApex)}
              </td>
            </tr>
            <tr className="border-t border-neutral-200 dark:border-neutral-700">
              <td className="py-1.5 pr-2 font-bold text-neutral-800 dark:text-neutral-200">Différence</td>
              <td className={`p-1 text-center font-bold tabular-nums ${diffCash === 0 ? "text-emerald-600" : "text-red-600"}`}>
                {fmt(diffCash)}
              </td>
              <td className={`p-1 text-center font-bold tabular-nums ${diffInterac === 0 ? "text-emerald-600" : "text-red-600"}`}>
                {fmt(diffInterac)}
              </td>
              <td className={`p-1 text-center font-bold tabular-nums ${diffTotal === 0 ? "text-emerald-600" : "text-red-600"}`}>
                {fmt(diffTotal)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {hasDiff && (
        <div className="mt-3">
          <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Explications
          </label>
          <textarea
            value={explanation}
            onChange={(e) => { setExplanation(e.target.value); schedSave(); }}
            placeholder="Expliquer la différence..."
            rows={2}
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
          />
        </div>
      )}
    </div>
  );
}

function CountdownRing({ seconds, total }: { seconds: number; total: number }) {
  const pct = seconds / total;
  const r = 6;
  const circ = 2 * Math.PI * r;
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" className="shrink-0">
      <circle cx="8" cy="8" r={r} fill="none" stroke="currentColor" strokeWidth="2" opacity={0.2} />
      <circle
        cx="8"
        cy="8"
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray={`${circ}`}
        strokeDashoffset={`${circ * (1 - pct)}`}
        strokeLinecap="round"
        transform="rotate(-90 8 8)"
        className="transition-all duration-1000 ease-linear"
      />
    </svg>
  );
}

