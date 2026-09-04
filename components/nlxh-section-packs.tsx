"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
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
import { Textarea } from "@/components/ui/textarea";
import { ContributeAlert } from "@/components/contribute-alert";
import {
  SECTION_CONFIG,
  SECTION_KEYS,
  type SectionHints,
  type SectionKey,
  type SectionPackRow,
} from "@/lib/nlxh/section-types";

type PackDetail = {
  id: string;
  title: string;
  serialNumber: number;
  essayPrompt: string;
  hints: SectionHints;
};

type Panel = "view" | "rename" | "edit" | null;

export function NlxhSectionPacks() {
  const [prompt, setPrompt] = useState("");
  const [json, setJson] = useState("");
  const [draftId, setDraftId] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [packs, setPacks] = useState<SectionPackRow[]>([]);
  const [detail, setDetail] = useState<PackDetail | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [renameTitle, setRenameTitle] = useState("");
  const [editPrompt, setEditPrompt] = useState("");
  const [editHints, setEditHints] = useState<SectionHints | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadPacks = useCallback(async () => {
    const response = await fetch("/api/nlxh/section/packs");
    const data = (await response.json()) as { packs?: SectionPackRow[]; error?: string };
    if (!response.ok) throw new Error(data.error || "Không tải được danh sách đề.");
    setPacks(data.packs ?? []);
  }, []);

  useEffect(() => {
    loadPacks().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : "Không tải được danh sách đề.");
    });
  }, [loadPacks]);

  async function exportPrompt() {
    setBusy(true);
    setError(null);
    const response = await fetch("/api/nlxh/section/packs/export", { method: "POST" });
    const data = (await response.json()) as { prompt?: string; error?: string };
    setBusy(false);
    if (!response.ok || !data.prompt) {
      setError(data.error || "Không tạo được prompt.");
      return;
    }
    setPrompt(data.prompt);
  }

  async function parseJson(raw = json) {
    setBusy(true);
    setError(null);
    setMessage(null);
    const response = await fetch("/api/nlxh/section/packs/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ json: raw }),
    });
    const data = (await response.json()) as {
      draftId?: string;
      essayPrompt?: string;
      hintCount?: number;
      error?: string;
    };
    setBusy(false);
    if (!response.ok || !data.draftId) {
      setError(data.error || "JSON không hợp lệ.");
      return;
    }
    setDraftId(data.draftId);
    setPreview(
      `${data.essayPrompt ?? "Đề chatbot"} · ${data.hintCount ?? 18} gợi ý (6 phần × 3).`,
    );
  }

  async function onPickFile(file: File | undefined) {
    if (!file) return;
    const text = await file.text();
    setJson(text);
    await parseJson(text);
  }

  async function commit() {
    if (!draftId) return;
    setBusy(true);
    setError(null);
    const response = await fetch("/api/nlxh/section/packs/commit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draftId }),
    });
    const data = (await response.json()) as {
      packId?: string;
      title?: string;
      error?: string;
    };
    setBusy(false);
    if (!response.ok || !data.packId) {
      setError(data.error || "Không nạp được gói.");
      return;
    }
    setMessage(`Đã nạp ${data.title ?? "đề chatbot"}. Có thể chọn ở trang luyện tập theo phần.`);
    setDraftId(null);
    setPreview(null);
    setJson("");
    await loadPacks().catch(() => undefined);
  }

  async function copyPrompt() {
    await navigator.clipboard.writeText(prompt);
    setMessage("Đã copy prompt.");
  }

  async function openPack(id: string, nextPanel: Exclude<Panel, null>) {
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/nlxh/section/packs/${id}`);
    const data = (await response.json()) as { pack?: PackDetail; error?: string };
    setBusy(false);
    if (!response.ok || !data.pack) {
      setError(data.error || "Không tải được đề.");
      return;
    }
    setDetail(data.pack);
    setPanel(nextPanel);
    setRenameTitle(data.pack.title);
    setEditPrompt(data.pack.essayPrompt);
    setEditHints(data.pack.hints);
  }

  async function saveRename() {
    if (!detail) return;
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/nlxh/section/packs/${detail.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: renameTitle }),
    });
    const data = (await response.json()) as { pack?: PackDetail; error?: string };
    setBusy(false);
    if (!response.ok || !data.pack) {
      setError(data.error || "Không đổi tên được.");
      return;
    }
    setDetail(data.pack);
    setMessage(`Đã đổi tên thành ${data.pack.title}.`);
    setPanel(null);
    await loadPacks().catch(() => undefined);
  }

  async function saveEdit() {
    if (!detail || !editHints) return;
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/nlxh/section/packs/${detail.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ essayPrompt: editPrompt, hints: editHints }),
    });
    const data = (await response.json()) as { pack?: PackDetail; error?: string };
    setBusy(false);
    if (!response.ok || !data.pack) {
      setError(data.error || "Không lưu được đề.");
      return;
    }
    setDetail(data.pack);
    setMessage(`Đã cập nhật ${data.pack.title}.`);
    setPanel(null);
    await loadPacks().catch(() => undefined);
  }

  async function removePack(pack: SectionPackRow) {
    if (!window.confirm(`Xóa ${pack.title}?`)) return;
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/nlxh/section/packs/${pack.id}`, { method: "DELETE" });
    const data = (await response.json()) as { error?: string };
    setBusy(false);
    if (!response.ok) {
      setError(data.error || "Không xóa được đề.");
      return;
    }
    if (detail?.id === pack.id) {
      setDetail(null);
      setPanel(null);
    }
    setMessage(`Đã xóa ${pack.title}.`);
    await loadPacks().catch(() => undefined);
  }

  function setHint(section: SectionKey, index: number, value: string) {
    setEditHints((current) => {
      if (!current) return current;
      const next = [...current[section]];
      next[index] = value;
      return { ...current, [section]: next };
    });
  }

  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Gói đề luyện tập theo phần</h1>
        <p className="text-sm text-muted-foreground">
          Tải file JSON mẫu, nhờ chatbot điền đề và 18 gợi ý, rồi nạp vào ngân hàng dùng chung.
          Hệ thống tự đặt tên Đề NLXH số 1, 2, 3... Có thể đổi tên, sửa, xem hoặc xóa.
        </p>
      </div>
      {error ? <ContributeAlert tone="error" message={error} /> : null}
      {message ? <ContributeAlert tone="success" message={message} /> : null}

      <Card>
        <CardHeader>
          <CardTitle>1. Tạo prompt gộp</CardTitle>
          <CardDescription>Prompt đã gồm schema JSON. Không gửi lịch sử người học.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={exportPrompt} disabled={busy}>
            Tạo prompt từ đề ngân hàng
          </Button>
          {prompt ? (
            <>
              <Label>Prompt</Label>
              <Textarea readOnly value={prompt} className="min-h-48" />
              <Button variant="outline" onClick={copyPrompt}>
                Copy prompt
              </Button>
            </>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Nạp JSON</CardTitle>
          <CardDescription>Dùng file JSON hoặc dán nội dung chatbot trả về.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <a href="/nlxh/section-pack.sample.json" download>
                Tải file JSON mẫu
              </a>
            </Button>
          </div>
          <div className="grid gap-1">
            <Label htmlFor="pack-json-file">Chọn file JSON</Label>
            <Input
              id="pack-json-file"
              type="file"
              accept="application/json,.json"
              disabled={busy}
              onChange={(event) => {
                const file = event.target.files?.[0];
                void onPickFile(file);
                event.target.value = "";
              }}
            />
          </div>
          <Label>Hoặc dán JSON</Label>
          <Textarea
            className="min-h-40"
            value={json}
            onChange={(event) => setJson(event.target.value)}
            placeholder='{"essayPrompt":"...","hints":{"mo_bai":["...","...","..."],...}}'
          />
          <Button onClick={() => parseJson()} disabled={busy || !json.trim()}>
            Xem trước
          </Button>
        </CardContent>
      </Card>

      {draftId && preview ? (
        <Card>
          <CardHeader>
            <CardTitle>3. Nạp vào ngân hàng</CardTitle>
            <CardDescription>{preview}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={commit} disabled={busy}>
              Nạp gói
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Danh sách đề chatbot</CardTitle>
          <CardDescription>Chỉ hiện tên đề. Có thể xem, đổi tên, sửa hoặc xóa.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {packs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có đề chatbot.</p>
          ) : (
            packs.map((pack) => (
              <div
                key={pack.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2"
              >
                <p className="text-sm font-medium">{pack.title}</p>
                <div className="flex flex-wrap gap-1">
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => openPack(pack.id, "view")}>
                    Xem
                  </Button>
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => openPack(pack.id, "rename")}>
                    Đổi tên
                  </Button>
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => openPack(pack.id, "edit")}>
                    Sửa
                  </Button>
                  <Button size="sm" variant="destructive" disabled={busy} onClick={() => removePack(pack)}>
                    Xóa
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {detail && panel === "view" ? (
        <Card>
          <CardHeader>
            <CardTitle>{detail.title}</CardTitle>
            <CardDescription>Nội dung đề và 18 gợi ý.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="font-medium">Đề bài</p>
              <p className="whitespace-pre-wrap text-muted-foreground">{detail.essayPrompt}</p>
            </div>
            {SECTION_KEYS.map((section) => (
              <div key={section}>
                <p className="font-medium">{SECTION_CONFIG[section].label}</p>
                <ol className="mt-1 list-decimal space-y-1 pl-5 text-muted-foreground">
                  {detail.hints[section].map((hint, index) => (
                    <li key={`${section}-${index}`}>{hint}</li>
                  ))}
                </ol>
              </div>
            ))}
            <Button variant="ghost" size="sm" onClick={() => setPanel(null)}>
              Đóng
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {detail && panel === "rename" ? (
        <Card>
          <CardHeader>
            <CardTitle>Đổi tên · {detail.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              value={renameTitle}
              maxLength={120}
              onChange={(event) => setRenameTitle(event.target.value)}
            />
            <div className="flex gap-2">
              <Button onClick={saveRename} disabled={busy || !renameTitle.trim()}>
                Lưu tên
              </Button>
              <Button variant="ghost" onClick={() => setPanel(null)}>
                Hủy
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {detail && panel === "edit" && editHints ? (
        <Card>
          <CardHeader>
            <CardTitle>Sửa · {detail.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-1">
              <Label>Đề bài</Label>
              <Textarea
                className="min-h-28"
                value={editPrompt}
                onChange={(event) => setEditPrompt(event.target.value)}
              />
            </div>
            {SECTION_KEYS.map((section) => (
              <div key={section} className="grid gap-2">
                <Label>{SECTION_CONFIG[section].label}</Label>
                {editHints[section].map((hint, index) => (
                  <Textarea
                    key={`${section}-${index}`}
                    className="min-h-16"
                    value={hint}
                    onChange={(event) => setHint(section, index, event.target.value)}
                  />
                ))}
              </div>
            ))}
            <div className="flex gap-2">
              <Button onClick={saveEdit} disabled={busy || !editPrompt.trim()}>
                Lưu đề
              </Button>
              <Button variant="ghost" onClick={() => setPanel(null)}>
                Hủy
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Button variant="outline" asChild>
        <Link href="/nlxh/section">Về luyện tập theo phần</Link>
      </Button>
    </div>
  );
}
