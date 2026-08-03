import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTodayStartUTC } from "@/lib/date-utils";

const bodySchema = z.object({
  notes: z.string().min(1).max(5000),
});

export async function POST(request: NextRequest) {
  const supabaseAuth = createClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabaseAuth
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "superviseur" && profile.role !== "dev")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { notes } = parsed.data;
  const todayStart = getTodayStartUTC();
  const admin = createAdminClient();

  const { data: existing } = await (admin as any)
    .from("cashier_checklists")
    .select("id")
    .eq("user_id", user.id)
    .gte("submitted_at", todayStart.toISOString())
    .order("submitted_at", { ascending: false })
    .limit(1)
    .single();

  if (existing) {
    await (admin as any)
      .from("cashier_checklists")
      .update({ notes })
      .eq("id", existing.id);
  } else {
    await (admin as any)
      .from("cashier_checklists")
      .insert({
        user_id: user.id,
        completed_items: [],
        completed_timestamps: {},
        total_items: 0,
        notes,
      });
  }

  return NextResponse.json({ ok: true });
}
