"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { AuthAvatar } from "@/components/auth-avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ProfileForm({
  email,
  displayName,
  avatarUrl,
}: {
  email: string;
  displayName: string;
  avatarUrl: string | null;
}) {
  const router = useRouter();
  const [name, setName] = useState(displayName);
  const [busyProfile, setBusyProfile] = useState(false);
  const [busyAvatar, setBusyAvatar] = useState(false);
  const [busyPassword, setBusyPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setBusyProfile(true);
    try {
      const response = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: name }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Không lưu được hồ sơ.");
      setMessage("Đã cập nhật tên hiển thị.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được hồ sơ.");
    } finally {
      setBusyProfile(false);
    }
  }

  async function uploadAvatar(file: File) {
    setError(null);
    setMessage(null);
    setBusyAvatar(true);
    try {
      const form = new FormData();
      form.set("file", file);
      const response = await fetch("/api/account/avatar", {
        method: "POST",
        body: form,
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Không tải được ảnh.");
      setMessage("Đã cập nhật ảnh đại diện.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được ảnh.");
    } finally {
      setBusyAvatar(false);
    }
  }

  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");
    if (password.length < 6) {
      setError("Mật khẩu mới cần ít nhất 6 ký tự.");
      return;
    }
    if (password !== confirm) {
      setError("Mật khẩu nhập lại không khớp.");
      return;
    }
    setBusyPassword(true);
    try {
      const response = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Không đổi được mật khẩu.");
      setMessage("Đã đổi mật khẩu.");
      event.currentTarget.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không đổi được mật khẩu.");
    } finally {
      setBusyPassword(false);
    }
  }

  return (
    <div className="grid gap-4">
      {error ? (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary">{message}</p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Thông tin cá nhân</CardTitle>
          <CardDescription>Email dùng để đăng nhập, không đổi được tại đây.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex items-center gap-4">
            <AuthAvatar url={avatarUrl} name={name || email} size={64} />
            <div className="grid gap-2">
              <Label htmlFor="avatar">Ảnh đại diện</Label>
              <Input
                id="avatar"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                disabled={busyAvatar}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadAvatar(file);
                }}
              />
              <p className="text-xs text-muted-foreground">JPG, PNG hoặc WEBP, tối đa 2MB.</p>
            </div>
          </div>
          <form className="grid gap-4" onSubmit={saveProfile}>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={email} readOnly disabled />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="displayName">Tên hiển thị</Label>
              <Input
                id="displayName"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                disabled={busyProfile}
              />
            </div>
            <Button type="submit" disabled={busyProfile}>
              {busyProfile ? <LoaderCircle className="animate-spin" /> : null}
              Lưu hồ sơ
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Đổi mật khẩu</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={changePassword}>
            <div className="grid gap-2">
              <Label htmlFor="password">Mật khẩu mới</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                disabled={busyPassword}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirm">Nhập lại mật khẩu mới</Label>
              <Input
                id="confirm"
                name="confirm"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                disabled={busyPassword}
              />
            </div>
            <Button type="submit" disabled={busyPassword}>
              {busyPassword ? <LoaderCircle className="animate-spin" /> : null}
              Đổi mật khẩu
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
