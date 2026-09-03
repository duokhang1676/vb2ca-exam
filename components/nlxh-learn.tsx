"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import { ContributeAlert } from "@/components/contribute-alert";
import { Badge } from "@/components/ui/badge";
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
import { ESSAY_FRAMEWORKS } from "@/lib/nlxh/frameworks";
import type { SessionTask } from "@/lib/nlxh/session";
import type { GradeResult } from "@/lib/nlxh/grade";
import {
  PRACTICE_MODE_LABELS,
  QUESTION_TYPE_LABELS,
  QUESTION_TYPES,
  type PracticeAnswer,
} from "@/lib/nlxh/types";

function storageKey(task: SessionTask): string {
  return `nlxh:${task.essay?.id ?? "none"}:${task.skill}:${task.level}`;
}

function emptyAnswer(): PracticeAnswer {
  return {
    text: "",
    fields: {},
    items: ["", "", ""],
    selectedIds: [],
    keywords: [],
    keywordText: "",
  };
}

function parseKeywords(text: string): string[] {
  return text
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function NlxhLearn({
  mode = "guided",
  skill,
  essayId,
  level,
  stepId,
}: {
  mode?: "guided" | "free" | "daily" | "review";
  skill?: string;
  essayId?: string;
  level?: string;
  stepId?: string;
}) {
  const [task, setTask] = useState<SessionTask | null>(null);
  const [answer, setAnswer] = useState<PracticeAnswer>(emptyAnswer());
  const [hintIndex, setHintIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GradeResult | null>(null);
  const [externalJson, setExternalJson] = useState("");
  const [externalPrompt, setExternalPrompt] = useState<string | null>(null);
  const [startedAt] = useState(() => Date.now());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    const params = new URLSearchParams({ mode });
    if (skill) params.set("skill", skill);
    if (essayId) params.set("essayId", essayId);
    if (level) params.set("level", level);
    if (stepId) params.set("stepId", stepId);
    const response = await fetch(`/api/nlxh/session?${params}`);
    const data = (await response.json()) as { task?: SessionTask; error?: string };
    if (!response.ok || !data.task) {
      setError(data.error || "Không tải được nhiệm vụ.");
      setLoading(false);
      return;
    }
    setTask(data.task);
    const saved = localStorage.getItem(storageKey(data.task));
    try {
      const parsed = saved
        ? (JSON.parse(saved) as PracticeAnswer)
        : emptyAnswer();
      setAnswer({
        ...emptyAnswer(),
        ...parsed,
        keywordText:
          parsed.keywordText ?? (parsed.keywords ?? []).join(", "),
      });
    } catch {
      setAnswer(emptyAnswer());
    }
    setHintIndex(0);
    setLoading(false);
  }, [mode, skill, essayId, level, stepId]);

  useEffect(() => {
    load().catch(() => {
      setError("Không tải được nhiệm vụ.");
      setLoading(false);
    });
  }, [load]);

  useEffect(() => {
    if (!task) return;
    localStorage.setItem(storageKey(task), JSON.stringify(answer));
  }, [answer, task]);

  const hints = task?.seed?.data.hints ?? [];
  const fields = task?.seed?.data.requiredElements ?? [];
  const choices = task?.seed?.data.choices ?? [];

  const wordCount = useMemo(() => {
    const text =
      answer.text ||
      Object.values(answer.fields ?? {}).join(" ") ||
      (answer.items ?? []).join(" ");
    return text.trim().split(/\s+/).filter(Boolean).length;
  }, [answer]);

  async function completeFramework() {
    setBusy(true);
    const response = await fetch("/api/nlxh/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "complete_framework" }),
    });
    const data = (await response.json()) as { task?: SessionTask; error?: string };
    setBusy(false);
    if (!response.ok || !data.task) {
      setError(data.error || "Không chuyển bước được.");
      return;
    }
    setTask(data.task);
    setResult(null);
  }

  async function submit() {
    if (!task || task.skill === "framework" || !task.essay) return;
    setBusy(true);
    setError(null);
    const response = await fetch("/api/nlxh/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        essayId: task.essay.id,
        practiceMode: task.skill,
        level: task.level,
        pathMode: task.pathMode,
        stepId: task.stepId,
        answer: {
          ...answer,
          keywords: parseKeywords(answer.keywordText ?? ""),
        },
        usedHintCount: hintIndex,
        durationSeconds: Math.round((Date.now() - startedAt) / 1000),
        previousWeaknesses: result?.feedback.weaknesses,
      }),
    });
    const data = (await response.json()) as GradeResult & { error?: string };
    setBusy(false);
    if (!response.ok) {
      setError(data.error || "Không nộp được.");
      return;
    }
    setResult(data);
    localStorage.removeItem(storageKey(task));
  }

  async function loadExternalPrompt(attemptId: string) {
    const response = await fetch(`/api/nlxh/attempts/${attemptId}/external-grade`);
    const data = (await response.json()) as { prompt?: string; error?: string };
    if (data.prompt) setExternalPrompt(data.prompt);
    else setError(data.error || "Không tạo được prompt chấm ngoài.");
  }

  async function importExternalGrade(attemptId: string) {
    setBusy(true);
    const response = await fetch(`/api/nlxh/attempts/${attemptId}/external-grade`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ json: externalJson }),
    });
    const data = (await response.json()) as GradeResult & { error?: string };
    setBusy(false);
    if (!response.ok) {
      setError(data.error || "JSON chấm không hợp lệ.");
      return;
    }
    setResult(data);
    setExternalPrompt(null);
  }

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <LoaderCircle className="size-4 animate-spin" />
        Đang chuẩn bị bài luyện...
      </p>
    );
  }

  if (error && !task) {
    return <ContributeAlert tone="error" message={error} />;
  }

  if (!task) return null;

  if (!task.essay && task.skill !== "framework") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Chưa có đề nghị luận</CardTitle>
          <CardDescription>
            Ngân hàng chưa có đề phần 1. Hãy đóng góp đề hoặc import gói dữ liệu.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button asChild>
            <Link href="/">Về trang chủ</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/nlxh/packs">Tạo gói dữ liệu</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <div>
        <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>
            Bước {task.progressIndex + 1}/{task.progressTotal}
          </span>
          {task.pathMode === "review" ? <Badge variant="secondary">Làm lại</Badge> : null}
          {task.lastScore != null ? (
            <span>Điểm lần trước: {task.lastScore}/10</span>
          ) : null}
        </p>
        <h1 className="text-2xl font-semibold">{task.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{task.instruction}</p>
      </div>

      {error ? <ContributeAlert tone="error" message={error} /> : null}

      {task.needsPack ? (
        <ContributeAlert
          tone="info"
          title="Dữ liệu luyện tập đang dùng khung tĩnh"
          message="Có thể tạo gói prompt cho chatbot ngoài để import seed chất lượng hơn, tiết kiệm token Gemini."
        />
      ) : null}

      {task.essay ? (
        <Card>
          <CardHeader>
            <CardTitle>Đề đang luyện</CardTitle>
            {task.analysis ? (
              <CardDescription>
                {QUESTION_TYPE_LABELS[task.analysis.questionType]} · {task.analysis.coreIssue}
              </CardDescription>
            ) : null}
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{task.essay.prompt}</p>
          </CardContent>
        </Card>
      ) : null}

      {task.skill === "framework" ? (
        <div className="grid gap-4">
          {ESSAY_FRAMEWORKS.map((block) => (
            <Card key={block.title}>
              <CardHeader>
                <CardTitle>{block.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="list-decimal space-y-1 pl-5 text-sm">
                  {block.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          ))}
          <Button onClick={completeFramework} disabled={busy}>
            {busy ? "Đang lưu..." : "Đã hiểu khung bài"}
          </Button>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{PRACTICE_MODE_LABELS[task.skill]}</CardTitle>
            {task.seed?.data.targetWords ? (
              <CardDescription>Gợi ý độ dài: {task.seed.data.targetWords} chữ</CardDescription>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-4">
            {task.skill === "identify_type" ? (
              <div className="grid gap-2">
                {QUESTION_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setAnswer({ ...answer, selectedType: type })}
                    className={`rounded-lg border px-3 py-2 text-left text-sm ${
                      answer.selectedType === type
                        ? "border-primary bg-primary/10"
                        : "hover:bg-muted"
                    }`}
                  >
                    {QUESTION_TYPE_LABELS[type]}
                  </button>
                ))}
              </div>
            ) : null}

            {task.level === 1 && fields.length > 0 && task.skill !== "identify_type" ? (
              <div className="grid gap-3">
                {fields.map((field) => (
                  <div key={field} className="grid gap-1">
                    <Label>{field}</Label>
                    <Textarea
                      value={answer.fields?.[field] ?? ""}
                      onChange={(event) =>
                        setAnswer({
                          ...answer,
                          fields: { ...answer.fields, [field]: event.target.value },
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            ) : null}

            {choices.length > 0 && task.level === 1 ? (
              <div className="grid gap-2">
                {choices.map((choice) => {
                  const selected = answer.selectedIds?.includes(choice.id);
                  return (
                    <button
                      key={choice.id}
                      type="button"
                      onClick={() => {
                        const current = new Set(answer.selectedIds ?? []);
                        if (current.has(choice.id)) current.delete(choice.id);
                        else current.add(choice.id);
                        setAnswer({ ...answer, selectedIds: [...current] });
                      }}
                      className={`rounded-lg border px-3 py-2 text-left text-sm ${
                        selected ? "border-primary bg-primary/10" : "hover:bg-muted"
                      }`}
                    >
                      {choice.text}
                    </button>
                  );
                })}
              </div>
            ) : null}

            {(task.skill === "build_arguments" ||
              task.skill === "causes" ||
              task.skill === "solutions") &&
            task.level !== 1 ? (
              <div className="grid gap-3">
                {(answer.items ?? ["", "", ""]).slice(0, 3).map((item, index) => (
                  <div key={index} className="grid gap-1">
                    <Label>Ý {index + 1}</Label>
                    <Textarea
                      value={item}
                      onChange={(event) => {
                        const items = [...(answer.items ?? ["", "", ""])];
                        items[index] = event.target.value;
                        setAnswer({ ...answer, items });
                      }}
                    />
                  </div>
                ))}
              </div>
            ) : null}

            {task.skill === "identify_issue" ? (
              <div className="grid gap-3">
                <div className="grid gap-1">
                  <Label>Vấn đề nghị luận</Label>
                  <Textarea
                    value={answer.text ?? ""}
                    onChange={(event) => setAnswer({ ...answer, text: event.target.value })}
                  />
                </div>
                <div className="grid gap-1">
                  <Label>Từ khóa (cách nhau bởi dấu phẩy)</Label>
                  <Textarea
                    value={answer.keywordText ?? ""}
                    onChange={(event) =>
                      setAnswer({
                        ...answer,
                        keywordText: event.target.value,
                      })
                    }
                  />
                </div>
              </div>
            ) : null}

            {task.skill !== "identify_type" &&
            task.skill !== "identify_issue" &&
            !(task.level === 1 && (fields.length > 0 || choices.length > 0)) &&
            !(
              (task.skill === "build_arguments" ||
                task.skill === "causes" ||
                task.skill === "solutions") &&
              task.level !== 1
            ) ? (
              <div className="grid gap-1">
                <Label>Bài làm</Label>
                <Textarea
                  className="min-h-40"
                  value={answer.text ?? ""}
                  onChange={(event) => setAnswer({ ...answer, text: event.target.value })}
                />
              </div>
            ) : null}

            <p className="text-xs text-muted-foreground">{wordCount} chữ</p>

            {task.level <= 2 && hints.length > 0 ? (
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setHintIndex((value) => Math.min(hints.length, value + 1))}
                  disabled={hintIndex >= hints.length}
                >
                  Gợi ý {Math.min(hintIndex + 1, hints.length)}/{hints.length}
                </Button>
                {hints.slice(0, hintIndex).map((hint) => (
                  <p key={hint} className="rounded-md bg-muted px-3 py-2 text-sm">
                    {hint}
                  </p>
                ))}
              </div>
            ) : null}

            <Button onClick={submit} disabled={busy || Boolean(result)}>
              {busy ? "Đang chấm..." : "Nộp bài"}
            </Button>
          </CardContent>
        </Card>
      )}

      {result ? (
        <Card>
          <CardHeader>
            <CardTitle>Kết quả: {result.score}/10</CardTitle>
            <CardDescription>{result.feedback.summary}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {result.feedback.strengths.length > 0 ? (
              <p>
                <Badge>Điểm tốt</Badge> {result.feedback.strengths.join(" · ")}
              </p>
            ) : null}
            {result.feedback.weaknesses.length > 0 ? (
              <p>
                <Badge variant="destructive">Cần sửa</Badge>{" "}
                {result.feedback.weaknesses.join(" · ")}
              </p>
            ) : null}
            {result.feedback.suggestedRevision ? (
              <p>Gợi ý sửa: {result.feedback.suggestedRevision}</p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {result.rewrite ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setResult(null);
                  }}
                >
                  Viết lại
                </Button>
              ) : null}
              {task.pathMode === "review" ? (
                <Button variant="outline" asChild>
                  <Link href="/nlxh">Về lộ trình</Link>
                </Button>
              ) : null}
              {task.pathMode !== "review" && result.advanced && result.nextStepId ? (
                <Button onClick={() => load()}>Phần tiếp</Button>
              ) : null}
              {task.pathMode !== "review" && result.pathCompleted ? (
                <Button asChild>
                  <Link href="/?sectionMode=part1">Thi thử phần 1</Link>
                </Button>
              ) : null}
              {result.preferExternalGrade ? (
                <Button
                  variant="outline"
                  onClick={() => loadExternalPrompt(result.attemptId)}
                >
                  Chấm sâu bằng chatbot ngoài
                </Button>
              ) : null}
            </div>
            {externalPrompt ? (
              <div className="grid gap-2">
                <Label>Prompt chấm ngoài</Label>
                <Textarea readOnly value={externalPrompt} className="min-h-32" />
                <Label>Dán JSON kết quả</Label>
                <Textarea
                  value={externalJson}
                  onChange={(event) => setExternalJson(event.target.value)}
                />
                <Button onClick={() => importExternalGrade(result.attemptId)} disabled={busy}>
                  Nhập điểm
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-2 text-sm">
        <Button variant="ghost" asChild>
          <Link href="/nlxh">Dashboard</Link>
        </Button>
        {task.needsPack ? (
          <Button variant="ghost" asChild>
            <Link href="/nlxh/packs">Tạo gói dữ liệu</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
