import { ProfileForm } from "@/components/profile-form";
import { getAuthUser } from "@/lib/auth/session";
import { avatarPublicUrl } from "@/lib/supabase/avatar";
import { createServerSupabase } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login?next=/account");

  const supabase = await createServerSupabase();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_path")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <ProfileForm
      email={user.email ?? ""}
      displayName={profile?.display_name ?? ""}
      avatarUrl={avatarPublicUrl(profile?.avatar_path)}
    />
  );
}
