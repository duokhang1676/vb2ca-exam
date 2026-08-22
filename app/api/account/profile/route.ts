import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function PATCH(request: Request) {
  const { user, response } = await requireAuthUser();
  if (!user) return response;

  const body = (await request.json().catch(() => ({}))) as { displayName?: string };
  const displayName = body.displayName?.trim() ?? "";
  if (displayName.length < 1 || displayName.length > 80) {
    return NextResponse.json(
      { error: "Tên hiển thị cần từ 1 đến 80 ký tự." },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: displayName, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
