"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthAvatar } from "@/components/auth-avatar";
import { Button } from "@/components/ui/button";
import { createBrowserSupabase } from "@/lib/supabase/client";

export function AuthMenu({
  email,
  displayName,
  avatarUrl,
}: {
  email: string;
  displayName: string;
  avatarUrl: string | null;
}) {
  const router = useRouter();

  async function signOut() {
    const supabase = createBrowserSupabase();
    await supabase.auth.signOut();
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/account" className="flex items-center gap-2">
          <AuthAvatar url={avatarUrl} name={displayName} size={28} />
          <span className="hidden max-w-32 truncate sm:inline">{displayName}</span>
        </Link>
      </Button>
      <Button variant="outline" size="sm" type="button" onClick={signOut}>
        Đăng xuất
      </Button>
      <span className="sr-only">{email}</span>
    </div>
  );
}
