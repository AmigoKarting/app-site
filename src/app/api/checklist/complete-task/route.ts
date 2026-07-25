import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerDictionary } from "@/lib/i18n/server";
import { listActiveChecklistTasks } from "@/domain/checklists/tasks-repository";
import { notify } from "@/lib/messaging";
import { getTodayStartUTC } from "@/lib/date-utils";

const bodySchema = z.object({
  taskKey: z.string().min(1),
  operatorName: z.string().min(1).optional(),
});

export async function POST(request: NextRequest) {
  console.log("[complete-task] POST received");
  const supabaseAuth = createClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) {
    console.log("[complete-task] no user, 401");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Vérifier le rôle
  const { data: profile } = await supabaseAuth
    .from("profiles")
    .select("role, first_name, last_name, display_name")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !["caissiere", "superviseur", "dev"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const { taskKey, operatorName } = parsed.data;

  // Vérifier que la tâche existe et est active
  const activeTasks = await listActiveChecklistTasks();
  const task = activeTasks.find((t) => t.task_key === taskKey);
  if (!task) {
    return NextResponse.json({ error: "Unknown task" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const t = getServerDictionary();
  const todayStart = getTodayStartUTC();
  const now = new Date().toISOString();

  // Récupérer ou créer la checklist du jour
  const { data: existing } = await (supabase as any)
    .from("cashier_checklists")
    .select("id, completed_items, completed_timestamps")
    .eq("user_id", user.id)
    .gte("submitted_at", todayStart.toISOString())
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let completedItems: string[];
  let timestamps: Record<string, string | string[]>;
  const isDuringTask = task.section === "during";

  if (existing) {
    const current = (existing.completed_items ?? []) as string[];
    const existingTs = (existing.completed_timestamps ?? {}) as Record<string, string | string[]>;

    if (current.includes(taskKey) && !isDuringTask) {
      console.log("[complete-task] alreadyDone, skipping push", { taskKey });
      return NextResponse.json({ ok: true, alreadyDone: true });
    }

    completedItems = current.includes(taskKey) ? current : [...current, taskKey];

    if (isDuringTask) {
      const prev = existingTs[taskKey];
      const arr = Array.isArray(prev) ? prev : prev ? [prev] : [];
      timestamps = { ...existingTs, [taskKey]: [...arr, now] };
    } else {
      timestamps = { ...existingTs, [taskKey]: now };
    }

    await (supabase as any)
      .from("cashier_checklists")
      .update({
        completed_items: completedItems,
        completed_timestamps: timestamps,
        total_items: activeTasks.length,
        ...(operatorName ? { operator_name: operatorName } : {}),
      })
      .eq("id", existing.id);
  } else {
    completedItems = [taskKey];
    timestamps = { [taskKey]: isDuringTask ? [now] : now };
    await (supabase as any).from("cashier_checklists").insert({
      user_id: user.id,
      completed_items: completedItems,
      completed_timestamps: timestamps,
      total_items: activeTasks.length,
      ...(operatorName ? { operator_name: operatorName } : {}),
    });
  }

  const cashierName =
    operatorName ||
    (profile.first_name && profile.last_name
      ? `${profile.first_name} ${profile.last_name}`
      : profile.display_name?.trim()) ||
    user.email ||
    t.checklist.cashierFallback;

  const notifTitle = `✅ ${cashierName}`;
  const notifBody = `**${t.checklist.taskPrefix} :** ${task.label}`;

  await supabase.from("feed_items").insert({
    kind: "notification" as const,
    status: "sent" as const,
    title: notifTitle,
    body: notifBody,
    priority: "low" as const,
    target_mode: "all" as const,
    is_draft: false,
    is_pinned: false,
    send_channels: ["push"],
    created_by: user.id,
    published_at: new Date().toISOString(),
  });

  // Send push notification to the right recipients
  const isSupervisorTask = profile.role === "superviseur";
  const notifyRoles = isSupervisorTask ? ["dev"] : ["superviseur", "dev"];

  const debugLog: unknown[] = [];
  try {
    const { data: supervisors, error: supError } = await supabase
      .from("profiles")
      .select("id, role")
      .in("role", notifyRoles);

    debugLog.push({ step: "supervisors", count: supervisors?.length, error: supError?.message, userId: user.id });

    let pushSent = 0;
    let pushErrors = 0;
    if (supervisors) {
      const targets = supervisors.filter((s) => s.id !== user.id);
      debugLog.push({ targets: targets.length, skippedSelf: supervisors.length - targets.length });
      const pushResults = await Promise.allSettled(
        targets.map(async (sup) => {
          const results = await notify({
            channels: ["push"],
            recipient: { userId: sup.id },
            message: { subject: notifTitle, body: task.label },
            context: { source: "checklist-task", sourceId: taskKey },
          });
          for (const r of results) {
            debugLog.push({ to: sup.id, status: r.status, skip: r.skipReason, error: r.error, provider: r.provider });
            if (r.status === "sent") pushSent++;
            else pushErrors++;
          }
        })
      );
      void pushResults;
    }
    debugLog.push({ done: true, pushSent, pushErrors });
  } catch (err) {
    debugLog.push({ crash: err instanceof Error ? err.message : String(err) });
  }

  return NextResponse.json({
    ok: true,
    completed: completedItems.length,
    total: activeTasks.length,
    _debug: debugLog,
  });
}
