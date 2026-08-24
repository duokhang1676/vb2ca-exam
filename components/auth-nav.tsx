import Link from "next/link";
import { AuthMenu } from "@/components/auth-menu";
import { Button } from "@/components/ui/button";
import { getAuthUser } from "@/lib/auth/session";
import { avatarPublicUrl } from "@/lib/supabase/avatar";
import { createServerSupabase } from "@/lib/supabase/server";

export async function AuthNav() {
  const user = await getAuthUser();
  if (!user) {
    return (
      <Button size="sm" asChild>
        <Link href="/login">Đăng nhập</Link>
      </Button>
    );
  }

  const supabase = await createServerSupabase();
  const [{ data: profile }, { data: attemptRows }] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, avatar_path, updated_at")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("attempts")
      .select("total_score")
      .eq("user_id", user.id)
      .not("submitted_at", "is", null),
  ]);

  const scores = (attemptRows ?? [])
    .map((row) => Number(row.total_score))
    .filter((score) => Number.isFinite(score));
  const averageScore =
    scores.length === 0
      ? null
      : scores.reduce((sum, score) => sum + score, 0) / scores.length;

  return (
    <AuthMenu
      email={user.email ?? ""}
      displayName={profile?.display_name || user.email || "Tài khoản"}
      avatarUrl={avatarPublicUrl(profile?.avatar_path, profile?.updated_at)}
      averageScore={averageScore}
    />
  );
}
