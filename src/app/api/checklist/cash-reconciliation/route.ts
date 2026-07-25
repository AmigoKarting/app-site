import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTodayDateString } from "@/lib/date-utils";

const bodySchema = z.object({
  operatorName: z.string().min(1),
  cashCounted: z.number().nullable(),
  interacCounted: z.number().nullable(),
  cashApex: z.number().nullable(),
  interacApex: z.number().nullable(),
  explanation: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const supabaseAuth = createClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const operator = request.nextUrl.searchParams.get("operator");
  if (!operator) return NextResponse.json({ error: "Missing operator" }, { status: 400 });

  const supabase = createAdminClient();
  const today = getTodayDateString();

  const { data } = await (supabase as any)
    .from("cash_reconciliations")
    .select("*")
    .eq("user_id", user.id)
    .eq("date", today)
    .eq("operator_name", operator)
    .maybeSingle();

  return NextResponse.json({ data: data ?? null });
}

export async function POST(request: NextRequest) {
  const supabaseAuth = createClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

  const { operatorName, cashCounted, interacCounted, cashApex, interacApex, explanation } = parsed.data;

  const supabase = createAdminClient();
  const today = getTodayDateString();

  const { error } = await (supabase as any)
    .from("cash_reconciliations")
    .upsert(
      {
        user_id: user.id,
        operator_name: operatorName,
        date: today,
        cash_counted: cashCounted,
        interac_counted: interacCounted,
        cash_apex: cashApex,
        interac_apex: interacApex,
        explanation: explanation || null,
      },
      { onConflict: "user_id,date,operator_name" },
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
