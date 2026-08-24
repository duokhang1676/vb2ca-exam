"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, LoaderCircle } from "lucide-react";
import { ExamTimer } from "@/components/exam-timer";
import { MathText } from "@/components/math-text";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  AUTOSAVE_INTERVAL_MS,
  OPTION_LETTERS,
  questionTypeLabel,
  sectionModeLabel,
} from "@/lib/exam/constants";
import { toDisplayBlocks } from "@/lib/exam/shuffle";
import {
  isMcq,
  isSectionMode,
  type AttemptAnswers,
  type DisplayQuestion,
  type ExamCode,
  type SectionMode,
} from "@/lib/exam/types";
import { cn } from "@/lib/utils";

type ExamPayload = {
  attempt: {
    id: string;
    startedAt: string;
    submittedAt: string | null;
    essayText: string;
    answers: AttemptAnswers;
    flagged: number[];
    essayFlagged: boolean;
    sectionMode: SectionMode;
    endsAt: number;
    serverNow: number;
  };
  exam: {
    title: string;
    examCode: ExamCode;
    essayPrompt: string;
    essayFingerprint: string;
    questions: Array<DisplayQuestion & { fingerprint?: string; marked?: boolean }>;
  };
};

export function ExamTaker({ attemptId }: { attemptId: string }) {
  const router = useRouter();
  const [data, setData] = useState<ExamPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [essayText, setEssayText] = useState("");
  const [answers, setAnswers] = useState<AttemptAnswers>({});
  const [flagged, setFlagged] = useState<number[]>([]);
  const [essayFlagged, setEssayFlagged] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [exiting, setExiting] = useState(false);
  const submittingRef = useRef(false);
  const exitingRef = useRef(false);
  const snapshotRef = useRef({
    essayText: "",
    answers: {} as AttemptAnswers,
    flagged: [] as number[],
    essayFlagged: false,
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const response = await fetch(`/api/attempts/${attemptId}`);
      const json = await response.json();
      if (!response.ok) {
        if (!cancelled) setError(json.error || "Không tải được bài làm.");
        return;
      }
      if (json.attempt.submittedAt) {
        router.replace(`/attempts/${attemptId}/result`);
        return;
      }
      if (!cancelled) {
        const sectionMode = isSectionMode(json.attempt.sectionMode)
          ? json.attempt.sectionMode
          : "full";
        const flaggedNumbers = Array.from(
          new Set<number>([
            ...(json.attempt.flagged ?? []),
            ...((json.exam.questions ?? [])
              .filter((question: { marked?: boolean; originalNumber: number }) => question.marked)
              .map((question: { originalNumber: number }) => question.originalNumber) as number[]),
          ]),
        );
        setData({
          ...json,
          attempt: { ...json.attempt, sectionMode },
        });
        setEssayText(json.attempt.essayText);
        setAnswers(json.attempt.answers);
        setFlagged(flaggedNumbers);
        setEssayFlagged(Boolean(json.attempt.essayFlagged));
        snapshotRef.current = {
          essayText: json.attempt.essayText,
          answers: json.attempt.answers,
          flagged: flaggedNumbers,
          essayFlagged: Boolean(json.attempt.essayFlagged),
        };
      }
    }
    load().catch(() => setError("Không tải được bài làm."));
    return () => {
      cancelled = true;
    };
  }, [attemptId, router]);

  const save = useCallback(async () => {
    if (submittingRef.current || exitingRef.current) return;
    const payload = {
      essayText: snapshotRef.current.essayText,
      answers: snapshotRef.current.answers,
      flagged: snapshotRef.current.flagged,
      essayFlagged: snapshotRef.current.essayFlagged,
    };
    await fetch(`/api/attempts/${attemptId}/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }, [attemptId]);

  useEffect(() => {
    snapshotRef.current = { essayText, answers, flagged, essayFlagged };
  }, [essayText, answers, flagged, essayFlagged]);

  useEffect(() => {
    const id = setInterval(() => {
      void save();
    }, AUTOSAVE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [save]);

  const exitWithoutSaving = useCallback(async () => {
    if (submittingRef.current || exitingRef.current) return;
    if (
      !window.confirm(
        "Thoát mà không lưu lịch sử làm bài? Bài đang làm sẽ bị xóa và không hiện trong lịch sử.",
      )
    ) {
      return;
    }
    exitingRef.current = true;
    submittingRef.current = true;
    setExiting(true);
    try {
      const response = await fetch(`/api/attempts/${attemptId}`, {
        method: "DELETE",
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(json.error || "Không thoát được bài thi.");
      }
      router.push("/");
    } catch (err) {
      exitingRef.current = false;
      submittingRef.current = false;
      setExiting(false);
      setError(err instanceof Error ? err.message : "Không thoát được bài thi.");
    }
  }, [attemptId, router]);

  const submit = useCallback(async () => {
    if (submittingRef.current || exitingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const response = await fetch(`/api/attempts/${attemptId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          essayText: snapshotRef.current.essayText,
          answers: snapshotRef.current.answers,
          flagged: snapshotRef.current.flagged,
          essayFlagged: snapshotRef.current.essayFlagged,
        }),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || "Nộp bài thất bại.");
      }
      router.push(json.resultUrl);
    } catch (err) {
      submittingRef.current = false;
      setSubmitting(false);
      setError(err instanceof Error ? err.message : "Nộp bài thất bại.");
    }
  }, [attemptId, router]);

  async function persistMark(params: {
    kind: "essay" | "question";
    fingerprint?: string;
    marked: boolean;
  }) {
    if (!data || !params.fingerprint) return;
    await fetch("/api/question-marks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: params.kind,
        fingerprint: params.fingerprint,
        examCode: data.exam.examCode,
        marked: params.marked,
      }),
    });
  }

  const answeredCount = useMemo(() => {
    if (!data) return 0;
    const sectionMode = data.attempt.sectionMode;
    const essayDone =
      sectionMode === "part2" ? 0 : essayText.trim() ? 1 : 0;
    const mcqDone = data.exam.questions.filter((q) =>
      Boolean(answers[String(q.originalNumber)]?.trim()),
    ).length;
    return essayDone + mcqDone;
  }, [answers, data, essayText]);

  if (error && !data) {
    return <p className="text-destructive">{error}</p>;
  }

  if (!data) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <LoaderCircle className="animate-spin" /> Đang tải đề...
      </div>
    );
  }

  const sectionMode = data.attempt.sectionMode;
  const showEssay = sectionMode !== "part2";
  const showPart2 = sectionMode !== "part1";
  const totalItems =
    (showEssay ? 1 : 0) + (showPart2 ? data.exam.questions.length : 0);
  const blocks = toDisplayBlocks(data.exam.questions);
  const flaggedSet = new Set(flagged);
  const locked = submitting || exiting;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_220px]">
      <div className="space-y-6">
        <div className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b bg-background/95 py-3 backdrop-blur">
          <div>
            <h1 className="text-lg font-semibold">{data.exam.title}</h1>
            <p className="text-xs text-muted-foreground">
              {sectionModeLabel(sectionMode)} · Đã trả lời {answeredCount}/{totalItems} phần
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <ExamTimer
              endsAt={data.attempt.endsAt}
              serverNow={data.attempt.serverNow}
              onExpire={submit}
            />
            <Button
              variant="outline"
              onClick={exitWithoutSaving}
              disabled={locked}
            >
              {exiting ? <LoaderCircle className="animate-spin" /> : null}
              {exiting ? "Đang thoát..." : "Thoát"}
            </Button>
            <Button onClick={submit} disabled={locked}>
              {submitting ? <LoaderCircle className="animate-spin" /> : null}
              {submitting ? "Đang chấm..." : "Nộp bài"}
            </Button>
          </div>
        </div>

        {error ? (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {showEssay ? (
          <Card id="essay">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2">
                <span>Phần 1 · Nghị luận xã hội (30 điểm)</span>
                <MarkButton
                  marked={essayFlagged}
                  disabled={locked}
                  onClick={() => {
                    const next = !essayFlagged;
                    setEssayFlagged(next);
                    void persistMark({
                      kind: "essay",
                      fingerprint: data.exam.essayFingerprint,
                      marked: next,
                    });
                  }}
                />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <MathText
                className="font-exam rounded-lg bg-muted/50 p-4 text-lg leading-8"
                text={data.exam.essayPrompt}
              />
              <div className="grid gap-2">
                <Label htmlFor="essay">Bài làm</Label>
                <Textarea
                  id="essay"
                  value={essayText}
                  onChange={(event) => setEssayText(event.currentTarget.value)}
                  placeholder="Nhập bài nghị luận tại đây..."
                  className="min-h-64 font-exam text-lg leading-8"
                  disabled={locked}
                />
              </div>
            </CardContent>
          </Card>
        ) : null}

        {showPart2 ? (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">
              Phần 2 · {data.exam.questions.length} câu (70 điểm)
            </h2>
            {blocks.map((block, blockIndex) => (
              <div key={`block-${blockIndex}`} className="space-y-4">
                {block.kind === "cluster" ? (
                  <div className="space-y-3 rounded-xl border bg-card p-4">
                    <p className="font-exam text-lg font-semibold">{block.header}</p>
                    {block.passage ? (
                      <MathText
                        className="font-exam rounded-lg bg-muted/50 p-4 text-lg leading-8"
                        text={block.passage}
                      />
                    ) : null}
                  </div>
                ) : null}
                {block.kind === "fill" ? (
                  <p className="font-exam text-lg font-semibold">{block.header}</p>
                ) : null}
                {block.questions.map((question) => (
                  <QuestionCard
                    key={question.originalNumber}
                    question={question}
                    value={answers[String(question.originalNumber)] ?? ""}
                    marked={flaggedSet.has(question.originalNumber)}
                    disabled={locked}
                    onChange={(value) =>
                      setAnswers((current) => ({
                        ...current,
                        [String(question.originalNumber)]: value,
                      }))
                    }
                    onToggleMark={() => {
                      const nextMarked = !flaggedSet.has(question.originalNumber);
                      setFlagged((current) =>
                        nextMarked
                          ? [...current, question.originalNumber]
                          : current.filter((n) => n !== question.originalNumber),
                      );
                      void persistMark({
                        kind: "question",
                        fingerprint: question.fingerprint,
                        marked: nextMarked,
                      });
                    }}
                  />
                ))}
              </div>
            ))}
          </section>
        ) : null}
      </div>

      <aside className="lg:sticky lg:top-20 h-fit rounded-xl border bg-card p-3">
        <p className="mb-2 text-xs font-medium text-muted-foreground">Mục lục</p>
        <div className="grid grid-cols-5 gap-1.5">
          {showEssay ? (
            <a
              href="#essay"
              className={cn(
                "flex h-8 items-center justify-center rounded-md text-xs",
                essayText.trim() ? "bg-primary text-primary-foreground" : "bg-muted",
                essayFlagged && "ring-2 ring-amber-500",
              )}
            >
              TL
            </a>
          ) : null}
          {showPart2
            ? data.exam.questions.map((question) => {
                const filled = Boolean(
                  answers[String(question.originalNumber)]?.trim(),
                );
                const marked = flaggedSet.has(question.originalNumber);
                return (
                  <a
                    key={question.originalNumber}
                    href={`#q-${question.displayIndex}`}
                    className={cn(
                      "flex h-8 items-center justify-center rounded-md text-xs",
                      filled ? "bg-primary text-primary-foreground" : "bg-muted",
                      marked && "ring-2 ring-amber-500",
                    )}
                  >
                    {question.displayIndex}
                  </a>
                );
              })
            : null}
        </div>
      </aside>
    </div>
  );
}

function MarkButton({
  marked,
  disabled,
  onClick,
}: {
  marked: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant={marked ? "default" : "outline"}
      size="sm"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={marked}
    >
      <Bookmark className={cn("size-4", marked && "fill-current")} />
      {marked ? "Đã đánh dấu" : "Đánh dấu"}
    </Button>
  );
}

function QuestionCard({
  question,
  value,
  marked,
  onChange,
  onToggleMark,
  disabled,
}: {
  question: DisplayQuestion & { fingerprint?: string };
  value: string;
  marked: boolean;
  onChange: (value: string) => void;
  onToggleMark: () => void;
  disabled: boolean;
}) {
  return (
    <Card id={`q-${question.displayIndex}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2 text-lg">
          <span>
            Câu {question.displayIndex}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {questionTypeLabel(question.type)}
            </span>
          </span>
          <MarkButton marked={marked} disabled={disabled} onClick={onToggleMark} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <MathText className="font-exam text-lg leading-8" text={question.stem} />
        {isMcq(question.type) && question.options ? (
          <div className="grid gap-2">
            {OPTION_LETTERS.map((letter) => (
              <label
                key={letter}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border p-3",
                  value === letter ? "border-primary bg-primary/5" : "border-border",
                )}
              >
                <input
                  type="radio"
                  className="mt-1"
                  name={`q-${question.originalNumber}`}
                  value={letter}
                  checked={value === letter}
                  disabled={disabled}
                  onChange={() => onChange(letter)}
                />
                <span className="font-exam text-lg font-medium">{letter}.</span>
                <MathText
                  className="font-exam text-lg leading-8"
                  text={question.options![letter]}
                />
              </label>
            ))}
          </div>
        ) : (
          <div className="max-w-xl">
            <Label htmlFor={`num-${question.originalNumber}`}>Đáp án</Label>
            <Input
              id={`num-${question.originalNumber}`}
              value={value}
              disabled={disabled}
              onChange={(event) => onChange(event.target.value)}
              placeholder="Nhập đáp án"
              className="font-exam text-lg"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
