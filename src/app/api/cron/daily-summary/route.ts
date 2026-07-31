import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTodayStartUTC, getTodayDateString } from "@/lib/date-utils";
import { getTodayOpenHours } from "@/lib/amigo-hours";
import { notify } from "@/lib/messaging";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUMMARY_EMAIL = "info@complexeamigo.com";

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
  if (h === 0) return `aux ~${m}min`;
  if (m === 0) return `aux ~${h}h`;
  return `aux ~${h}h${String(m).padStart(2, "0")}`;
}

interface CashierSummary {
  name: string;
  role: string;
  completed: number;
  total: number;
  pct: number;
  duringStats: Array<{ label: string; count: number; interval: string }>;
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
      .select("id, user_id, completed_items, completed_timestamps, operator_name, total_items, submitted_at")
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

  const duringTasks = allTasks.filter((t: any) => t.section === "during");
  const cashierTasks = allTasks.filter((t: any) => t.target_role === "caissiere");
  const supervisorTasks = allTasks.filter((t: any) => t.target_role === "superviseur");

  const summaries: CashierSummary[] = [];

  for (const cl of allChecklists) {
    const profile = profileMap.get(cl.user_id);
    const isSupervisor = profile?.role === "superviseur" || profile?.role === "dev";
    const roleTasks = isSupervisor ? supervisorTasks : cashierTasks;
    const completedSet = new Set(cl.completed_items as string[]);
    const completed = roleTasks.filter((t: any) => completedSet.has(t.task_key)).length;
    const total = roleTasks.length;
    const operatorName =
      cl.operator_name ||
      (profile?.first_name && profile?.last_name
        ? `${profile.first_name} ${profile.last_name}`
        : profile?.display_name) ||
      "Inconnu";

    const timestamps = (cl.completed_timestamps ?? {}) as Record<string, string | string[]>;
    const duringStats: CashierSummary["duringStats"] = [];

    for (const task of duringTasks) {
      if (!roleTasks.some((t: any) => t.task_key === task.task_key)) continue;
      const ts = timestamps[task.task_key];
      const count = Array.isArray(ts) ? ts.length : ts ? 1 : 0;
      if (count > 0) {
        duringStats.push({
          label: task.label,
          count,
          interval: hours ? formatInterval(hours.totalHours, count) : "",
        });
      }
    }

    const cr = allCashRecs.find((r: any) => r.operator_name === operatorName);
    let cashRec: CashierSummary["cashRec"] = null;
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
      duringStats,
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

function buildText(date: string, hours: string, summaries: CashierSummary[]): string {
  let t = `Résumé quotidien — ${date}\n`;
  if (hours) t += `Heures: ${hours}\n`;
  t += "\n";

  for (const s of summaries) {
    t += `${s.name} (${s.role}) — ${s.completed}/${s.total} tâches (${s.pct}%)\n`;
    for (const d of s.duringStats) {
      t += `  - ${d.label}: ${d.count} fois ${d.interval}\n`;
    }
    if (s.cashRec) {
      const ok = s.cashRec.totalDiff === 0;
      t += `  Clôture: ${ok ? "OK" : `Diff: ${s.cashRec.totalDiff >= 0 ? "+" : ""}${s.cashRec.totalDiff.toFixed(2)} $`}\n`;
      if (s.cashRec.explanation) t += `  Note: ${s.cashRec.explanation}\n`;
    } else if (s.role === "Caissière") {
      t += `  Clôture: pas de clôture\n`;
    }
    t += "\n";
  }

  return t;
}

function buildHtml(date: string, hours: string, summaries: CashierSummary[]): string {
  const cashiers = summaries.filter((s) => s.role === "Caissière");
  const supervisors = summaries.filter((s) => s.role === "Superviseur");

  const pctColor = (pct: number) =>
    pct === 100 ? "#059669" : pct >= 70 ? "#d97706" : "#dc2626";

  const diffColor = (d: number) => (d === 0 ? "#059669" : "#dc2626");

  function personBlock(s: CashierSummary): string {
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
        <div style="background:#e5e5e5;border-radius:6px;height:6px;margin-bottom:12px;">
          <div style="background:${pctColor(s.pct)};border-radius:6px;height:6px;width:${s.pct}%;"></div>
        </div>`;

    if (s.duringStats.length > 0) {
      html += `<p style="font-size:12px;font-weight:600;color:#737373;margin:0 0 4px;">Tâches récurrentes</p>`;
      for (const d of s.duringStats) {
        html += `<p style="font-size:13px;margin:2px 0;color:#404040;">
          &bull; ${d.label}: <strong>${d.count} fois</strong>${d.interval ? ` <span style="color:#6b7280;">(${d.interval})</span>` : ""}
        </p>`;
      }
    }

    if (s.cashRec) {
      const ok = s.cashRec.totalDiff === 0;
      const diffStr = ok
        ? `<span style="color:#059669;font-weight:700;">✓ OK</span>`
        : `<span style="color:#dc2626;font-weight:700;">Diff: ${s.cashRec.totalDiff >= 0 ? "+" : ""}${s.cashRec.totalDiff.toFixed(2)} $</span>`;

      html += `
        <div style="margin-top:10px;padding-top:10px;border-top:1px solid #e5e5e5;">
          <p style="font-size:12px;font-weight:600;color:#737373;margin:0 0 6px;">Clôture de caisse</p>
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
        ${hours ? `<p style="margin:2px 0 0;font-size:13px;color:#737373;">Heures d'ouverture: ${hours}</p>` : ""}
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
