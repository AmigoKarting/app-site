import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTodayStartUTC, getTodayDateString } from "@/lib/date-utils";
import { getTodayOpenHours } from "@/lib/amigo-hours";
import { notify } from "@/lib/messaging";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUMMARY_EMAIL = "info@complexeamigo.com";

const SECTION_META: Record<string, { label: string; icon: string }> = {
  opening: { label: "Avant l'ouverture", icon: "🌅" },
  during: { label: "Plusieurs fois par jour", icon: "☀️" },
  closing: { label: "Avant de quitter", icon: "🌙" },
  free_time: { label: "Temps libre", icon: "🎯" },
  meeting: { label: "Réunion d'équipe", icon: "🤝" },
};

const SECTION_ORDER = ["opening", "during", "closing", "free_time", "meeting"];

function authorize(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  if (header.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < header.length; i++) diff |= header.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

function formatInterval(totalHours: number, count: number): string {
  if (count === 0) return "";
  const interval = totalHours / count;
  const h = Math.floor(interval);
  const m = Math.round((interval - h) * 60);
  if (h === 0) return `~${m}min`;
  if (m === 0) return `~${h}h`;
  return `~${h}h${String(m).padStart(2, "0")}`;
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit", timeZone: "America/Montreal" });
  } catch {
    return "";
  }
}

interface TaskDetail {
  label: string;
  section: string;
  done: boolean;
  count: number;
  interval: string;
  times: string[];
}

interface PersonSummary {
  name: string;
  role: string;
  completed: number;
  total: number;
  pct: number;
  sections: Array<{
    key: string;
    label: string;
    icon: string;
    tasks: TaskDetail[];
    doneCount: number;
    totalCount: number;
  }>;
  notes: string | null;
  cashRec: {
    cashCounted: number;
    interacCounted: number;
    cashApex: number;
    interacApex: number;
    totalDiff: number;
    explanation: string | null;
  } | null;
}

async function handle(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const todayStart = getTodayStartUTC();
  const todayDate = getTodayDateString();
  const hours = getTodayOpenHours();

  const [{ data: checklists }, { data: tasks }, { data: cashRecs }] = await Promise.all([
    (supabase as any)
      .from("cashier_checklists")
      .select("id, user_id, completed_items, completed_timestamps, operator_name, total_items, submitted_at, notes")
      .gte("submitted_at", todayStart.toISOString())
      .order("submitted_at", { ascending: false }),
    supabase
      .from("checklist_tasks")
      .select("*")
      .eq("is_active", true),
    (supabase as any)
      .from("cash_reconciliations")
      .select("*")
      .eq("date", todayDate),
  ]);

  const allChecklists = (checklists ?? []) as any[];
  const allTasks = (tasks ?? []) as any[];
  const allCashRecs = (cashRecs ?? []) as any[];

  if (allChecklists.length === 0) {
    return NextResponse.json({ ok: true, skipped: true, reason: "no checklists today" });
  }

  const userIds = [...new Set(allChecklists.map((c: any) => c.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, display_name, role")
    .in("id", userIds);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  const cashierTasks = allTasks.filter((t: any) => t.target_role === "caissiere");
  const supervisorTasks = allTasks.filter((t: any) => t.target_role === "superviseur");

  const summaries: PersonSummary[] = [];

  for (const cl of allChecklists) {
    const profile = profileMap.get(cl.user_id);
    const isSupervisor = profile?.role === "superviseur" || profile?.role === "dev";
    const roleTasks = isSupervisor ? supervisorTasks : cashierTasks;
    const completedSet = new Set(cl.completed_items as string[]);
    const timestamps = (cl.completed_timestamps ?? {}) as Record<string, string | string[]>;

    const operatorName =
      cl.operator_name ||
      (profile?.first_name && profile?.last_name
        ? `${profile.first_name} ${profile.last_name}`
        : profile?.display_name) ||
      "Inconnu";

    const sections = SECTION_ORDER.map((secKey) => {
      const sectionTasks = roleTasks.filter((t: any) => t.section === secKey);
      if (sectionTasks.length === 0) return null;
      const meta = SECTION_META[secKey] ?? { label: secKey, icon: "📋" };

      const taskDetails: TaskDetail[] = sectionTasks.map((t: any) => {
        const ts = timestamps[t.task_key];
        const isDuring = secKey === "during";
        const timesArr = Array.isArray(ts) ? ts : ts ? [ts] : [];
        const count = isDuring ? timesArr.length : (completedSet.has(t.task_key) ? 1 : 0);
        const done = isDuring ? count > 0 : completedSet.has(t.task_key);

        return {
          label: t.label,
          section: secKey,
          done,
          count,
          interval: isDuring && hours && count > 0 ? formatInterval(hours.totalHours, count) : "",
          times: timesArr.map((x: string) => formatTime(x)),
        };
      });

      const doneCount = taskDetails.filter((t) => t.done).length;

      return {
        key: secKey,
        label: meta.label,
        icon: meta.icon,
        tasks: taskDetails,
        doneCount,
        totalCount: taskDetails.length,
      };
    }).filter(Boolean) as PersonSummary["sections"];

    const completed = sections.reduce((s, sec) => s + sec.doneCount, 0);
    const total = sections.reduce((s, sec) => s + sec.totalCount, 0);

    const cr = allCashRecs.find((r: any) => r.operator_name === operatorName);
    let cashRec: PersonSummary["cashRec"] = null;
    if (cr) {
      const cc = cr.cash_counted ?? 0;
      const ic = cr.interac_counted ?? 0;
      const ca = cr.cash_apex ?? 0;
      const ia = cr.interac_apex ?? 0;
      cashRec = {
        cashCounted: cc,
        interacCounted: ic,
        cashApex: ca,
        interacApex: ia,
        totalDiff: (cc + ic) - (ca + ia),
        explanation: cr.explanation ?? null,
      };
    }

    summaries.push({
      name: operatorName,
      role: isSupervisor ? "Superviseur" : "Caissière",
      completed,
      total,
      pct: total > 0 ? Math.round((completed / total) * 100) : 0,
      sections,
      notes: cl.notes ?? null,
      cashRec,
    });
  }

  const displayDate = new Date(todayDate + "T12:00:00").toLocaleDateString("fr-CA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const hoursLabel = hours ? `${hours.open}h à ${hours.close}h (${hours.totalHours}h)` : "";

  const htmlBody = buildHtml(displayDate, hoursLabel, summaries);
  const textBody = buildText(displayDate, hoursLabel, summaries);

  await notify({
    channels: ["email"],
    recipient: { email: SUMMARY_EMAIL },
    message: {
      subject: `Résumé quotidien — ${displayDate}`,
      body: textBody,
      htmlBody,
    },
    context: { source: "daily-summary", sourceId: todayDate },
  });

  return NextResponse.json({ ok: true, summaries: summaries.length, date: todayDate });
}

function buildText(date: string, hours: string, summaries: PersonSummary[]): string {
  const totalPersons = summaries.length;
  const avgPct = totalPersons > 0 ? Math.round(summaries.reduce((s, p) => s + p.pct, 0) / totalPersons) : 0;

  let t = `Résumé quotidien — ${date}\n`;
  if (hours) t += `Heures: ${hours}\n`;
  t += `${totalPersons} employé(s) — moyenne: ${avgPct}%\n\n`;

  for (const s of summaries) {
    t += `━━━ ${s.name} (${s.role}) — ${s.completed}/${s.total} (${s.pct}%) ━━━\n`;
    for (const sec of s.sections) {
      t += `\n  ${sec.icon} ${sec.label} (${sec.doneCount}/${sec.totalCount})\n`;
      for (const task of sec.tasks) {
        if (task.done) {
          if (task.section === "during") {
            t += `    ✓ ${task.label}: ${task.count} fois ${task.interval}\n`;
            for (const time of task.times) t += `      → ${time}\n`;
          } else {
            t += `    ✓ ${task.label}${task.times[0] ? ` (${task.times[0]})` : ""}\n`;
          }
        } else {
          t += `    ✗ ${task.label}\n`;
        }
      }
    }
    if (s.notes) {
      t += `\n  📝 Notes de réunion:\n  ${s.notes}\n`;
    }
    if (s.cashRec) {
      const ok = s.cashRec.totalDiff === 0;
      t += `\n  💰 Clôture: ${ok ? "OK" : `Diff: ${s.cashRec.totalDiff >= 0 ? "+" : ""}${s.cashRec.totalDiff.toFixed(2)} $`}\n`;
      if (s.cashRec.explanation) t += `  Note: ${s.cashRec.explanation}\n`;
    } else if (s.role === "Caissière") {
      t += `\n  💰 Pas de clôture\n`;
    }
    t += "\n";
  }

  return t;
}

function buildHtml(date: string, hours: string, summaries: PersonSummary[]): string {
  const cashiers = summaries.filter((s) => s.role === "Caissière");
  const supervisors = summaries.filter((s) => s.role === "Superviseur");
  const totalPersons = summaries.length;
  const avgPct = totalPersons > 0 ? Math.round(summaries.reduce((s, p) => s + p.pct, 0) / totalPersons) : 0;
  const totalCompleted = summaries.reduce((s, p) => s + p.completed, 0);
  const totalTasks = summaries.reduce((s, p) => s + p.total, 0);

  const pctColor = (pct: number) =>
    pct === 100 ? "#059669" : pct >= 70 ? "#d97706" : "#dc2626";

  const diffColor = (d: number) => (d === 0 ? "#059669" : "#dc2626");

  function personBlock(s: PersonSummary): string {
    const badge =
      s.role === "Superviseur"
        ? `<span style="background:#ede9fe;color:#6d28d9;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;">Superviseur</span>`
        : `<span style="background:#cffafe;color:#0e7490;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;">Caissière</span>`;

    let html = `
      <div style="border:1px solid #e5e5e5;border-radius:12px;padding:16px;margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <div>
            <span style="font-weight:700;font-size:15px;">${s.name}</span>
            ${badge}
          </div>
          <span style="font-weight:700;font-size:15px;color:${pctColor(s.pct)};">
            ${s.completed}/${s.total} (${s.pct}%)
          </span>
        </div>
        <div style="background:#e5e5e5;border-radius:6px;height:6px;margin-bottom:16px;">
          <div style="background:${pctColor(s.pct)};border-radius:6px;height:6px;width:${s.pct}%;"></div>
        </div>`;

    for (const sec of s.sections) {
      const secPct = sec.totalCount > 0 ? Math.round((sec.doneCount / sec.totalCount) * 100) : 0;
      html += `
        <div style="margin-bottom:12px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <span style="font-size:12px;font-weight:700;color:#525252;">${sec.icon} ${sec.label}</span>
            <span style="font-size:12px;font-weight:700;color:${pctColor(secPct)};">${sec.doneCount}/${sec.totalCount}</span>
          </div>`;

      for (const task of sec.tasks) {
        if (task.done) {
          if (task.section === "during") {
            html += `
              <div style="margin:4px 0 4px 12px;">
                <span style="font-size:13px;color:#059669;font-weight:600;">✓ ${task.label}</span>
                <span style="background:#d1fae5;color:#065f46;padding:1px 6px;border-radius:8px;font-size:11px;font-weight:700;margin-left:6px;">${task.count}x</span>
                ${task.interval ? `<span style="font-size:11px;color:#6b7280;margin-left:4px;">(${task.interval})</span>` : ""}
                <div style="margin-top:2px;padding-left:8px;">
                  ${task.times.map((t) => `<span style="font-size:11px;color:#9ca3af;margin-right:8px;">→ ${t}</span>`).join("")}
                </div>
              </div>`;
          } else {
            html += `
              <p style="font-size:13px;margin:3px 0 3px 12px;color:#059669;font-weight:600;">
                ✓ ${task.label}
                ${task.times[0] ? `<span style="font-weight:400;color:#9ca3af;margin-left:6px;">${task.times[0]}</span>` : ""}
              </p>`;
          }
        } else {
          html += `<p style="font-size:13px;margin:3px 0 3px 12px;color:#dc2626;font-weight:600;">✗ ${task.label}</p>`;
        }
      }

      html += `</div>`;
    }

    if (s.notes) {
      html += `
        <div style="margin-top:10px;padding:10px 12px;background:#f0fdf4;border-radius:8px;border-left:3px solid #059669;">
          <p style="font-size:12px;font-weight:700;color:#065f46;margin:0 0 4px;">📝 Notes de réunion</p>
          <p style="font-size:13px;color:#374151;margin:0;white-space:pre-wrap;">${s.notes}</p>
        </div>`;
    }

    if (s.cashRec) {
      html += `
        <div style="margin-top:12px;padding-top:12px;border-top:1px solid #e5e5e5;">
          <p style="font-size:12px;font-weight:700;color:#525252;margin:0 0 6px;">💰 Clôture de caisse</p>
          <table style="width:100%;font-size:12px;border-collapse:collapse;">
            <tr style="color:#737373;">
              <td></td><td style="text-align:right;padding:2px 6px;">Comptant</td><td style="text-align:right;padding:2px 6px;">Interac</td><td style="text-align:right;padding:2px 6px;">Total</td>
            </tr>
            <tr>
              <td style="color:#525252;">Compté</td>
              <td style="text-align:right;padding:2px 6px;">${s.cashRec.cashCounted.toFixed(2)} $</td>
              <td style="text-align:right;padding:2px 6px;">${s.cashRec.interacCounted.toFixed(2)} $</td>
              <td style="text-align:right;padding:2px 6px;font-weight:600;">${(s.cashRec.cashCounted + s.cashRec.interacCounted).toFixed(2)} $</td>
            </tr>
            <tr>
              <td style="color:#525252;">Apex</td>
              <td style="text-align:right;padding:2px 6px;">${s.cashRec.cashApex.toFixed(2)} $</td>
              <td style="text-align:right;padding:2px 6px;">${s.cashRec.interacApex.toFixed(2)} $</td>
              <td style="text-align:right;padding:2px 6px;font-weight:600;">${(s.cashRec.cashApex + s.cashRec.interacApex).toFixed(2)} $</td>
            </tr>
            <tr style="border-top:1px solid #e5e5e5;">
              <td style="font-weight:700;color:#262626;">Diff.</td>
              <td style="text-align:right;padding:2px 6px;font-weight:700;color:${diffColor(s.cashRec.cashCounted - s.cashRec.cashApex)};">${(s.cashRec.cashCounted - s.cashRec.cashApex).toFixed(2)} $</td>
              <td style="text-align:right;padding:2px 6px;font-weight:700;color:${diffColor(s.cashRec.interacCounted - s.cashRec.interacApex)};">${(s.cashRec.interacCounted - s.cashRec.interacApex).toFixed(2)} $</td>
              <td style="text-align:right;padding:2px 6px;font-weight:700;color:${diffColor(s.cashRec.totalDiff)};">${s.cashRec.totalDiff.toFixed(2)} $</td>
            </tr>
          </table>
          ${s.cashRec.explanation ? `<p style="font-size:12px;color:#92400e;background:#fef3c7;padding:6px 10px;border-radius:6px;margin:6px 0 0;">📝 ${s.cashRec.explanation}</p>` : ""}
        </div>`;
    } else if (s.role === "Caissière") {
      html += `<p style="font-size:12px;color:#a3a3a3;margin-top:8px;">💰 Pas de clôture</p>`;
    }

    html += `</div>`;
    return html;
  }

  let body = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;color:#262626;">
      <div style="background:#f5f5f5;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
        <h1 style="margin:0;font-size:18px;">📊 Résumé quotidien</h1>
        <p style="margin:4px 0 0;font-size:14px;color:#525252;text-transform:capitalize;">${date}</p>
        ${hours ? `<p style="margin:2px 0 0;font-size:13px;color:#737373;">🕐 Heures d'ouverture: ${hours}</p>` : ""}
        <div style="margin-top:10px;display:flex;gap:16px;">
          <div style="background:white;border-radius:8px;padding:8px 12px;flex:1;text-align:center;">
            <p style="margin:0;font-size:11px;color:#737373;">Employés</p>
            <p style="margin:2px 0 0;font-size:18px;font-weight:700;">${totalPersons}</p>
          </div>
          <div style="background:white;border-radius:8px;padding:8px 12px;flex:1;text-align:center;">
            <p style="margin:0;font-size:11px;color:#737373;">Tâches complétées</p>
            <p style="margin:2px 0 0;font-size:18px;font-weight:700;">${totalCompleted}/${totalTasks}</p>
          </div>
          <div style="background:white;border-radius:8px;padding:8px 12px;flex:1;text-align:center;">
            <p style="margin:0;font-size:11px;color:#737373;">Moyenne</p>
            <p style="margin:2px 0 0;font-size:18px;font-weight:700;color:${pctColor(avgPct)};">${avgPct}%</p>
          </div>
        </div>
      </div>`;

  if (cashiers.length > 0) {
    body += `<h2 style="font-size:14px;color:#737373;margin:20px 0 8px;text-transform:uppercase;letter-spacing:0.5px;">Caissières</h2>`;
    for (const s of cashiers) body += personBlock(s);
  }

  if (supervisors.length > 0) {
    body += `<h2 style="font-size:14px;color:#737373;margin:20px 0 8px;text-transform:uppercase;letter-spacing:0.5px;">Superviseurs</h2>`;
    for (const s of supervisors) body += personBlock(s);
  }

  body += `
      <p style="font-size:11px;color:#a3a3a3;text-align:center;margin-top:24px;">
        Envoyé automatiquement par l'app Amigo Karting
      </p>
    </div>`;

  return body;
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
