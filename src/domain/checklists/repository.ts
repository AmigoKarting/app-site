import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTodayStartUTC } from "@/lib/date-utils";

export interface TodayChecklistData {
  completedItems: string[];
  timestamps: Record<string, string | string[]>;
  operatorName: string | null;
}

export async function getTodayCompleted(userId: string): Promise<TodayChecklistData> {
  const supabase = createClient();

  const { data } = await (supabase as any)
    .from("cashier_checklists")
    .select("completed_items, completed_timestamps, operator_name")
    .eq("user_id", userId)
    .gte("submitted_at", getTodayStartUTC().toISOString())
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    completedItems: (data?.completed_items as string[]) ?? [],
    timestamps: (data?.completed_timestamps as Record<string, string | string[]>) ?? {},
    operatorName: (data?.operator_name as string) ?? null,
  };
}

export interface CashierProfile {
  id: string;
  displayName: string;
}

export async function listCashierProfiles(): Promise<CashierProfile[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, display_name, role")
    .in("role", ["caissiere", "dev"])
    .order("first_name", { ascending: true });

  return (data ?? []).map((p) => ({
    id: p.id,
    displayName:
      (p.first_name && p.last_name
        ? `${p.first_name} ${p.last_name}`
        : p.display_name?.trim()) || p.id.slice(0, 8),
  }));
}

export async function hasSubmittedToday(userId: string): Promise<boolean> {
  const data = await getTodayCompleted(userId);
  return data.completedItems.length > 0;
}

export async function getStreak(userId: string): Promise<number> {
  const supabase = createClient();

  const { data } = await supabase
    .from("cashier_checklists")
    .select("submitted_at")
    .eq("user_id", userId)
    .order("submitted_at", { ascending: false })
    .limit(120);

  if (!data || data.length === 0) return 0;

  const uniqueDates = new Set<string>();
  for (const row of data) {
    const d = new Date(row.submitted_at);
    uniqueDates.add(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
    );
  }

  const sortedDates = [...uniqueDates].sort().reverse();

  let streak = 0;
  const checkDate = new Date();

  for (const dateStr of sortedDates) {
    const checkStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, "0")}-${String(checkDate.getDate()).padStart(2, "0")}`;

    if (dateStr === checkStr) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (dateStr < checkStr) {
      break;
    }
  }

  return streak;
}

export interface ChecklistWithProfile {
  id: string;
  user_id: string;
  completed_items: string[];
  completed_timestamps: Record<string, string | string[]>;
  operator_name: string | null;
  total_items: number;
  notes: string | null;
  submitted_at: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  role: string | null;
}

export async function listRecentChecklists(limit = 30): Promise<ChecklistWithProfile[]> {
  const supabase = createAdminClient();

  const { data: checklists } = await (supabase as any)
    .from("cashier_checklists")
    .select("id, user_id, completed_items, completed_timestamps, operator_name, total_items, notes, submitted_at")
    .order("submitted_at", { ascending: false })
    .limit(limit);

  const rows = (checklists ?? []) as Array<{
    id: string; user_id: string; completed_items: string[];
    completed_timestamps: Record<string, string> | null; operator_name: string | null;
    total_items: number; notes: string | null; submitted_at: string;
  }>;
  if (rows.length === 0) return [];

  const userIds = [...new Set(rows.map((c) => c.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, display_name, role")
    .in("id", userIds);

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, p]),
  );

  return rows.map((c) => {
    const profile = profileMap.get(c.user_id);
    return {
      ...c,
      completed_timestamps: c.completed_timestamps ?? {},
      first_name: profile?.first_name ?? null,
      last_name: profile?.last_name ?? null,
      display_name: profile?.display_name ?? null,
      role: profile?.role ?? null,
    };
  });
}
