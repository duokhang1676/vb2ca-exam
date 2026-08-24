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
  averageScore,
}: {
  email: string;
  displayName: string;
  avatarUrl: string | null;
  averageScore: number | null;
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
          <span className="hidden items-center gap-1.5 sm:inline-flex">
            <span className="max-w-32 truncate">{displayName}</span>
            {averageScore != null ? (
              <span className="shrink-0 text-xs font-normal text-muted-foreground">
                · TB {averageScore.toFixed(1)}
              </span>
            ) : null}
          </span>
        </Link>
      </Button>
      <Button variant="outline" size="sm" type="button" onClick={signOut}>
        Đăng xuất
      </Button>
      <span className="sr-only">{email}</span>
    </div>
  );
}
