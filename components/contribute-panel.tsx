"use client";

import { useState } from "react";
import { FileUp, LoaderCircle } from "lucide-react";
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
import type { ExamCode } from "@/lib/exam/types";
import { cn } from "@/lib/utils";

type Summary = { added: number; skipped: number };

function ResultBanner({
  summary,
  error,
}: {
  summary: Summary | null;
  error: string | null;
}) {
  if (error) {
    return (
      <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {error}
      </p>
    );
  }
  if (!summary) return null;
  return (
    <p className="rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary">
      Đã thêm {summary.added} mục mới, bỏ qua {summary.skipped} mục trùng.
    </p>
  );
}

export function ContributePanel() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <EssayContributeForm />
      <QuestionContributeForm />
    </div>
  );
}

function EssayContributeForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSummary(null);
    setBusy(true);
    try {
      const form = new FormData(event.currentTarget);
      const response = await fetch("/api/bank/essays", {
        method: "POST",
        body: form,
      });
      const data = (await response.json()) as Summary & { error?: string };
      if (!response.ok) throw new Error(data.error || "Không nạp được đề.");
      setSummary({ added: data.added, skipped: data.skipped });
      event.currentTarget.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Đóng góp phần 1</CardTitle>
        <CardDescription>
          Nghị luận xã hội dùng chung cho CA1 và CA4. File PDF hoặc DOCX. Câu
          trùng với ngân hàng sẽ bị loại.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={onSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="essay-file">File đề nghị luận</Label>
            <Input
              id="essay-file"
              name="file"
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              required
              disabled={busy}
            />
          </div>
          <ResultBanner summary={summary} error={error} />
          <Button type="submit" disabled={busy}>
            {busy ? <LoaderCircle className="animate-spin" /> : <FileUp />}
            {busy ? "Đang trích xuất..." : "Nạp vào ngân hàng"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function QuestionContributeForm() {
  const [examCode, setExamCode] = useState<ExamCode>("CA1");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSummary(null);
    setBusy(true);
    try {
      const form = new FormData(event.currentTarget);
      form.set("examCode", examCode);
      const response = await fetch("/api/bank/questions", {
        method: "POST",
        body: form,
      });
      const data = (await response.json()) as Summary & { error?: string };
      if (!response.ok) throw new Error(data.error || "Không nạp được câu hỏi.");
      setSummary({ added: data.added, skipped: data.skipped });
      event.currentTarget.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Đóng góp phần 2</CardTitle>
        <CardDescription>
          Chọn mã đề, upload PDF/DOCX câu hỏi và TXT đáp án. Câu trùng theo mã
          đề sẽ bị loại, câu mới được giữ.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={onSubmit}>
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
            {(["CA1", "CA4"] as const).map((code) => (
              <button
                key={code}
                type="button"
                disabled={busy}
                onClick={() => setExamCode(code)}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium",
                  examCode === code
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground",
                )}
              >
                {code}
              </button>
            ))}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="question-file">File câu hỏi (PDF/DOCX)</Label>
            <Input
              id="question-file"
              name="file"
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              required
              disabled={busy}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="answer-file">File đáp án (TXT)</Label>
            <Input
              id="answer-file"
              name="answers"
              type="file"
              accept="text/plain,.txt"
              required
              disabled={busy}
            />
            <p className="text-xs text-muted-foreground">
              Mỗi dòng một câu, ví dụ: <code>1 A</code>, <code>46 72</code>,{" "}
              <code>55 Năng lực pháp luật</code>.
            </p>
          </div>
          <ResultBanner summary={summary} error={error} />
          <Button type="submit" disabled={busy}>
            {busy ? <LoaderCircle className="animate-spin" /> : <FileUp />}
            {busy ? "Đang trích xuất..." : "Nạp vào ngân hàng"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
