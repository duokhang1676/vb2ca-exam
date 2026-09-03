"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

export function NlxhPacks() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [json, setJson] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function exportPrompt() {
    setBusy(true);
    setError(null);
    const response = await fetch("/api/nlxh/packs/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
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
    const response = await fetch("/api/nlxh/packs/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ json }),
    });
    const data = (await response.json()) as {
      draftId?: string;
      error?: string;
      seedCount?: number;
    };
    setBusy(false);
    if (!response.ok || !data.draftId) {
      setError(data.error || "JSON không hợp lệ.");
      return;
    }
    router.push(`/nlxh/packs/review/${data.draftId}`);
  }

  async function copyPrompt() {
    await navigator.clipboard.writeText(prompt);
    setMessage("Đã copy prompt.");
  }

  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Gói dữ liệu chatbot ngoài</h1>
        <p className="text-sm text-muted-foreground">
          Gom các đề chưa có seed, copy prompt sang ChatGPT/Claude/Gemini, rồi dán JSON
          để nạp vào ngân hàng dùng chung.
        </p>
      </div>
      {error ? <ContributeAlert tone="error" message={error} /> : null}
      {message ? <ContributeAlert tone="success" message={message} /> : null}
      <Card>
        <CardHeader>
          <CardTitle>1. Tạo prompt gộp</CardTitle>
          <CardDescription>
            Prompt đã gồm schema JSON. Không gửi lịch sử người học.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={exportPrompt} disabled={busy}>
            Tạo prompt từ đề thiếu seed
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
            placeholder='{"version":1,"frameworkVersion":"framework_v1",...}'
          />
          <Button onClick={parseJson} disabled={busy || !json.trim()}>
            Xem trước và nạp
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
