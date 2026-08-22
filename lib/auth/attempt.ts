import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function requireOwnedAttempt(id: string) {
  const { user, response } = await requireAuthUser();
  if (!user) return { user: null, attempt: null, response };

  const supabase = getSupabaseAdmin();
  const { data: attempt, error } = await supabase
    .from("attempts")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !attempt) {
    return {
      user,
      attempt: null,
      response: NextResponse.json(
        { error: "Không tìm thấy bài làm." },
        { status: 404 },
      ),
    };
  }

  return { user, attempt, response: null };
}
