"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBrowserSupabase } from "@/lib/supabase/client";

export function RegisterForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const displayName = String(form.get("displayName") ?? "").trim();
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");
    if (password.length < 6) {
      setError("Mật khẩu cần ít nhất 6 ký tự.");
      setBusy(false);
      return;
    }
    if (password !== confirm) {
      setError("Mật khẩu nhập lại không khớp.");
      setBusy(false);
      return;
    }
    try {
      const supabase = createBrowserSupabase();
      const { data, error: signError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (signError) throw new Error(signError.message);
      if (data.session) {
        router.replace("/");
        router.refresh();
        return;
      }
      setInfo(
        "Đã tạo tài khoản. Nếu dự án yêu cầu xác nhận email, hãy mở hộp thư rồi quay lại đăng nhập.",
      );
      setBusy(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không đăng ký được.");
      setBusy(false);
    }
  }

  return (
    <form className="grid gap-4" onSubmit={onSubmit}>
      <div className="grid gap-2">
        <Label htmlFor="displayName">Tên hiển thị</Label>
        <Input
          id="displayName"
          name="displayName"
          required
          disabled={busy}
          placeholder="Nguyễn Văn A"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={busy}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">Mật khẩu</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          disabled={busy}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="confirm">Nhập lại mật khẩu</Label>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          disabled={busy}
        />
      </div>
      {error ? (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {info ? (
        <p className="rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary">{info}</p>
      ) : null}
      <Button type="submit" disabled={busy}>
        {busy ? <LoaderCircle className="animate-spin" /> : null}
        {busy ? "Đang tạo tài khoản..." : "Đăng ký"}
      </Button>
      <p className="text-sm text-muted-foreground">
        Đã có tài khoản?{" "}
        <Link className="text-primary underline-offset-4 hover:underline" href="/login">
          Đăng nhập
        </Link>
      </p>
    </form>
  );
}
