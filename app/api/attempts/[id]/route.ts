import { NextResponse } from "next/server";
import { requireOwnedAttempt } from "@/lib/auth/attempt";
import { buildAttemptPayload } from "@/lib/exam/attempt-payload";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const { user, attempt, response } = await requireOwnedAttempt(id);
  if (!attempt || !user) return response;

  const result = await buildAttemptPayload(attempt, user.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.payload);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const { user, attempt, response } = await requireOwnedAttempt(id);
  if (!attempt || !user) return response;

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("attempts")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
