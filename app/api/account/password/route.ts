import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/session";
import { createServerSupabase } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const { user, response } = await requireAuthUser();
  if (!user) return response;

  const body = (await request.json().catch(() => ({}))) as { password?: string };
  const password = body.password ?? "";
  if (password.length < 6) {
    return NextResponse.json(
      { error: "Mật khẩu mới cần ít nhất 6 ký tự." },
      { status: 400 },
    );
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
