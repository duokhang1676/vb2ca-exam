"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ContributeAlert } from "@/components/contribute-alert";

export function NlxhSectionPacks() {
  const [prompt, setPrompt] = useState("");
  const [json, setJson] = useState("");
  const [draftId, setDraftId] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  async function parseJson() {
    setBusy(true);
    setError(null);
    setMessage(null);
    const response = await fetch("/api/nlxh/section/packs/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ json }),
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

  async function commit() {
    if (!draftId) return;
    setBusy(true);
    setError(null);
    const response = await fetch("/api/nlxh/section/packs/commit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draftId }),
    });
    const data = (await response.json()) as { packId?: string; matched?: boolean; error?: string };
    setBusy(false);
    if (!response.ok || !data.packId) {
      setError(data.error || "Không nạp được gói.");
      return;
    }
    setMessage(
      data.matched
        ? "Đã nạp gói và khớp đề trong ngân hàng."
        : "Đã nạp đề chatbot. Có thể chọn ở trang luyện tập theo phần.",
    );
    setDraftId(null);
    setPreview(null);
    setJson("");
  }

  async function copyPrompt() {
    await navigator.clipboard.writeText(prompt);
    setMessage("Đã copy prompt.");
  }

  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Gói đề luyện tập theo phần</h1>
        <p className="text-sm text-muted-foreground">
          Gom các đề chưa có seed, copy prompt sang ChatGPT/Claude/Gemini, rồi dán JSON
          để nạp vào ngân hàng dùng chung. JSON gồm đề tự luận và 18 gợi ý (3 gợi ý / 6 phần).
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
          <CardTitle>2. Dán JSON trả về</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            className="min-h-40"
            value={json}
            onChange={(event) => setJson(event.target.value)}
            placeholder='{"essayPrompt":"...","hints":{"mo_bai":["...","...","..."],...}}'
          />
          <Button onClick={parseJson} disabled={busy || !json.trim()}>
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

      <Button variant="outline" asChild>
        <Link href="/nlxh/section">Về luyện tập theo phần</Link>
      </Button>
    </div>
  );
}
