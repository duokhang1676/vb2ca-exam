"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ContributeAlert } from "@/components/contribute-alert";
import { countWords } from "@/lib/nlxh/types";
import {
  isSectionKey,
  MAX_HINTS_PER_SECTION,
  SECTION_CONFIG,
  type SectionGradeResult,
  type SectionKey,
} from "@/lib/nlxh/section-types";

function wordCountClass(count: number, min: number, max: number): string {
  if (count < min) return "text-muted-foreground";
  if (count > max) return "text-amber-600";
  return "text-green-600";
}

export function NlxhSectionPractice({
  sections: sectionsParam,
  essayId: essayIdParam,
  packId: packIdParam,
}: {
  sections?: string;
  essayId?: string;
  packId?: string;
}) {
  const sections = useMemo(
    () =>
      (sectionsParam ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(isSectionKey),
    [sectionsParam],
  );
  const [essayId, setEssayId] = useState(essayIdParam ?? "");
  const [packId, setPackId] = useState(packIdParam ?? "");
  const [prompt, setPrompt] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [hints, setHints] = useState<Record<string, string[]>>({});
  const [busyHint, setBusyHint] = useState<SectionKey | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SectionGradeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sections.length === 0) return;
    const params = new URLSearchParams();
    if (essayIdParam) params.set("essayId", essayIdParam);
    if (packIdParam) params.set("packId", packIdParam);
    fetch(`/api/nlxh/section/session?${params.toString()}`)
      .then((response) => response.json())
      .then((data: { essayId?: string; packId?: string | null; prompt?: string; error?: string }) => {
        if (data.error) {
          setError(data.error);
          return;
        }
        setPrompt(data.prompt ?? "");
        if (data.essayId) setEssayId(data.essayId);
        if (data.packId) setPackId(data.packId);
      })
      .catch(() => setError("Không tải được đề bài."));
  }, [essayIdParam, packIdParam, sections.length]);

  async function requestHint(section: SectionKey) {
    const used = hints[section]?.length ?? 0;
    if (used >= MAX_HINTS_PER_SECTION) return;
    setBusyHint(section);
    setError(null);
    const response = await fetch("/api/nlxh/section/hints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        essayId: essayId || undefined,
        packId: packId || undefined,
        section,
        hintIndex: used,
        currentAnswer: answers[section] ?? "",
      }),
    });
    const data = (await response.json()) as { hint?: string; error?: string };
    setBusyHint(null);
    if (!response.ok || !data.hint) {
      setError(data.error || "Không tạo được gợi ý.");
      return;
    }
    setHints((current) => ({
      ...current,
      [section]: [...(current[section] ?? []), data.hint!],
    }));
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    const hintCounts = Object.fromEntries(
      sections.map((section) => [section, hints[section]?.length ?? 0]),
    );
    const response = await fetch("/api/nlxh/section/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        essayId: essayId || undefined,
        packId: packId || undefined,
        sections,
        answers,
        hintCounts,
      }),
    });
    const data = (await response.json()) as SectionGradeResult & { error?: string };
    setSubmitting(false);
    if (!response.ok) {
      setError(data.error || "Không nộp được bài.");
      return;
    }
    setResult(data);
  }

  if (sections.length === 0) {
    return (
      <div className="mx-auto max-w-3xl space-y-3">
        <ContributeAlert tone="error" message="Chưa chọn phần luyện tập." />
        <Button asChild>
          <Link href="/nlxh/section">Quay lại</Link>
        </Button>
      </div>
    );
  }

  const maxTotal = sections.reduce((sum, section) => sum + SECTION_CONFIG[section].maxScore, 0);

  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Làm bài theo phần</h1>
        <p className="text-sm text-muted-foreground">
          Viết từng phần đã chọn. Mỗi phần có tối đa 3 gợi ý.
        </p>
      </div>

      {error ? <ContributeAlert tone="error" message={error} /> : null}

      <Card>
        <CardHeader>
          <CardTitle>Đề bài</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm">{prompt || "Đang tải đề..."}</p>
        </CardContent>
      </Card>

      {sections.map((section) => {
        const config = SECTION_CONFIG[section];
        const text = answers[section] ?? "";
        const words = countWords(text);
        const used = hints[section]?.length ?? 0;
        return (
          <Card key={section}>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base">
                  {config.label}: {config.wordMin}–{config.wordMax} chữ, {config.maxScore} điểm
                </CardTitle>
                <CardDescription>Barem đã gắn với phần này khi chấm.</CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={used >= MAX_HINTS_PER_SECTION || busyHint === section || Boolean(result)}
                onClick={() => requestHint(section)}
              >
                {busyHint === section
                  ? "Đang tạo gợi ý..."
                  : `Gợi ý (${used}/${MAX_HINTS_PER_SECTION})`}
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {(hints[section] ?? []).map((hint, index) => (
                <div key={`${section}-${index}`} className="rounded-lg bg-muted px-3 py-2 text-sm">
                  <p className="mb-1 text-xs font-medium text-muted-foreground">
                    Gợi ý {index + 1}
                  </p>
                  <p className="whitespace-pre-wrap">{hint}</p>
                </div>
              ))}
              <Textarea
                className="min-h-36"
                value={text}
                disabled={Boolean(result)}
                onChange={(event) =>
                  setAnswers((current) => ({ ...current, [section]: event.target.value }))
                }
                placeholder={`Viết ${config.shortLabel.toLowerCase()}...`}
              />
              <p className={`text-xs ${wordCountClass(words, config.wordMin, config.wordMax)}`}>
                {words}/{config.wordMax}
              </p>
              {result?.feedback[section] ? (
                <div className="rounded-lg border px-3 py-2 text-sm">
                  <p className="font-medium">
                    Điểm: {result.scores[section] ?? 0}/{config.maxScore}
                  </p>
                  <p className="mt-1 text-muted-foreground">{result.feedback[section]}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        );
      })}

      {result ? (
        <Card>
          <CardHeader>
            <CardTitle>
              Tổng điểm: {result.total}/{maxTotal}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="font-medium">Đánh giá</p>
              <p className="whitespace-pre-wrap text-muted-foreground">{result.overall}</p>
            </div>
            <div>
              <p className="font-medium">Gợi ý cải thiện</p>
              <p className="whitespace-pre-wrap text-muted-foreground">{result.suggestions}</p>
            </div>
            <Button asChild>
              <Link href="/nlxh/section">Luyện phần khác</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Button onClick={submit} disabled={submitting || !prompt}>
          {submitting ? "Đang chấm..." : "Nộp bài"}
        </Button>
      )}
    </div>
  );
}
