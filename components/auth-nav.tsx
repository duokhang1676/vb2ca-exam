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
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_path")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <AuthMenu
      email={user.email ?? ""}
      displayName={profile?.display_name || user.email || "Tài khoản"}
      avatarUrl={avatarPublicUrl(profile?.avatar_path)}
    />
  );
}
