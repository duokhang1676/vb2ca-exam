"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LoaderCircle } from "lucide-react";
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

type GuideItem = {
  id: string;
  title: string;
  originalName: string;
  mime: string;
  createdBy: string;
  createdAt: string;
};

export function NlxhGuides() {
  const [guides, setGuides] = useState<GuideItem[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function reload() {
    const response = await fetch("/api/nlxh/guides");
    const data = (await response.json()) as {
      guides?: GuideItem[];
      userId?: string;
      error?: string;
    };
    if (!response.ok) {
      setError(data.error ?? "Không tải được tài liệu hướng dẫn.");
      return;
    }
    setGuides(data.guides ?? []);
    setUserId(data.userId ?? null);
    setError(null);
  }

  useEffect(() => {
    reload().catch(() => undefined);
  }, []);

  async function onUpload() {
    if (!file) {
      setError("Chọn file PDF hoặc DOCX trước khi tải lên.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("file", file);
      if (title.trim()) form.set("title", title.trim());
      const response = await fetch("/api/nlxh/guides", {
        method: "POST",
        body: form,
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Không tải lên được.");
      }
      setTitle("");
      setFile(null);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải lên được.");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    if (!window.confirm("Xóa tài liệu này?")) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/nlxh/guides/${id}`, { method: "DELETE" });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Không xóa được.");
      }
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không xóa được.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tài liệu hướng dẫn</CardTitle>
        <CardDescription>
          Tải PDF hoặc DOCX (tối đa 15MB). Mở xem trực tiếp trên web, không cần
          Google Docs hay Office Online.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 rounded-lg border p-3">
          <div className="grid gap-2">
            <Label htmlFor="guide-title">Tên tài liệu</Label>
            <Input
              id="guide-title"
              value={title}
              disabled={busy}
              placeholder="Để trống sẽ dùng tên file"
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="guide-file">File PDF / DOCX</Label>
            <Input
              id="guide-file"
              type="file"
              disabled={busy}
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </div>
          <Button disabled={busy} onClick={onUpload}>
            {busy ? <LoaderCircle className="animate-spin" /> : null}
            Tải lên
          </Button>
        </div>
        {error ? (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {guides.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có tài liệu hướng dẫn.</p>
        ) : (
          <div className="grid gap-2">
            {guides.map((guide) => (
              <div
                key={guide.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">{guide.title}</p>
                  <p className="text-xs text-muted-foreground">{guide.originalName}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/nlxh/guides/${guide.id}`}>Xem</Link>
                  </Button>
                  {userId && guide.createdBy === userId ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => onDelete(guide.id)}
                    >
                      Xóa
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
