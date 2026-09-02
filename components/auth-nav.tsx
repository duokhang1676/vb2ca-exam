import { AuthMenu } from "@/components/auth-menu";
import { getAuthUser } from "@/lib/auth/session";
import { avatarPublicUrl } from "@/lib/supabase/avatar";
import { createServerSupabase } from "@/lib/supabase/server";

export async function AuthNav() {
  const user = await getAuthUser();
  if (!user) return null;

  const supabase = await createServerSupabase();
  const [{ data: profile }, { data: latestAttempt }] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, avatar_path, updated_at")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("attempts")
      .select("total_score")
      .eq("user_id", user.id)
      .not("submitted_at", "is", null)
      .order("submitted_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const parsedScore =
    latestAttempt?.total_score == null
      ? null
      : Number(latestAttempt.total_score);
  const latestScore =
    parsedScore != null && Number.isFinite(parsedScore) ? parsedScore : null;

  return (
    <AuthMenu
      email={user.email ?? ""}
      displayName={profile?.display_name || user.email || "Tài khoản"}
      avatarUrl={avatarPublicUrl(profile?.avatar_path, profile?.updated_at)}
      latestScore={latestScore}
    />
  );
}
