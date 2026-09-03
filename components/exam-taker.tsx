"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { ExamTimer } from "@/components/exam-timer";
import { MarkButton } from "@/components/mark-button";
import { MathText } from "@/components/math-text";
import { QuestionToc, tocItem } from "@/components/question-toc";
import { SolutionReveal, TopicBadge } from "@/components/question-meta";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  AUTOSAVE_INTERVAL_MS,
  OPTION_LETTERS,
  attemptModeLabel,
  questionTypeLabel,
  sectionModeLabel,
} from "@/lib/exam/constants";
import { isFillMatch } from "@/lib/exam/grade";
import { persistQuestionMark } from "@/lib/exam/persist-mark";
import { toDisplayBlocks } from "@/lib/exam/shuffle";
import {
  isAttemptMode,
  isMcq,
  isSectionMode,
  type AttemptAnswers,
  type AttemptMode,
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
    attemptMode?: AttemptMode;
    showTopic?: boolean;
    endsAt: number | null;
    serverNow: number;
  };
  exam: {
    title: string;
    examCode: ExamCode;
    essayPrompt: string;
    essayTopic?: string;
    essaySolution?: string;
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
        const attemptMode = isAttemptMode(json.attempt.attemptMode)
          ? json.attempt.attemptMode
          : "exam";
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
          attempt: { ...json.attempt, sectionMode, attemptMode },
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
    if (!data) return;
    await persistQuestionMark({
      kind: params.kind,
      fingerprint: params.fingerprint,
      examCode: data.exam.examCode,
      marked: params.marked,
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
  const attemptMode = isAttemptMode(data.attempt.attemptMode)
    ? data.attempt.attemptMode
    : "exam";
  const practice = attemptMode === "practice";
  const showEssay =
    sectionMode !== "part2" && Boolean(data.exam.essayPrompt.trim());
  const showPart2 = sectionMode !== "part1" && data.exam.questions.length > 0;
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
              {attemptModeLabel(attemptMode)} ·{" "}
              {sectionModeLabel(sectionMode, attemptMode)} · Đã trả lời{" "}
              {answeredCount}/{totalItems} phần
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {practice || data.attempt.endsAt == null ? null : (
              <ExamTimer
                endsAt={data.attempt.endsAt}
                serverNow={data.attempt.serverNow}
                onExpire={submit}
              />
            )}
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
              {submitting
                ? "Đang chấm..."
                : practice
                  ? "Kết thúc luyện tập"
                  : "Nộp bài"}
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
                <span className="flex flex-wrap items-center gap-2">
                  <span>Phần 1 · Nghị luận xã hội (30 điểm)</span>
                  <TopicBadge topic={data.exam.essayTopic} />
                </span>
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
              {practice ? (
                <SolutionReveal
                  solution={data.exam.essaySolution}
                  textClassName="font-exam text-lg leading-8"
                />
              ) : null}
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
                    practice={practice}
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

      <QuestionToc
        items={[
          ...(showEssay
            ? [tocItem("#essay", "TL", essayText.trim() ? "filled" : "empty", essayFlagged)]
            : []),
          ...(showPart2
            ? data.exam.questions.map((question) =>
                tocItem(
                  `#q-${question.displayIndex}`,
                  String(question.displayIndex),
                  Boolean(answers[String(question.originalNumber)]?.trim())
                    ? "filled"
                    : "empty",
                  flaggedSet.has(question.originalNumber),
                ),
              )
            : []),
        ]}
      />
    </div>
  );
}

function QuestionCard({
  question,
  value,
  marked,
  onChange,
  onToggleMark,
  disabled,
  practice = false,
}: {
  question: DisplayQuestion & { fingerprint?: string };
  value: string;
  marked: boolean;
  onChange: (value: string) => void;
  onToggleMark: () => void;
  disabled: boolean;
  practice?: boolean;
}) {
  const [fillDraft, setFillDraft] = useState(value);
  const revealed = practice && Boolean(value.trim());
  const correct = question.correctDisplayAnswer ?? "";
  const isCorrect = isMcq(question.type)
    ? value.trim().toUpperCase() === correct.trim().toUpperCase()
    : isFillMatch(value, correct);
  const inputLocked = disabled || revealed;

  useEffect(() => {
    if (value) setFillDraft(value);
  }, [value]);

  return (
    <Card id={`q-${question.displayIndex}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2 text-lg">
          <span className="flex flex-wrap items-center gap-2">
            <span>
              Câu {question.displayIndex}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {questionTypeLabel(question.type)}
              </span>
            </span>
            <TopicBadge topic={question.topic} />
            {revealed ? (
              <Badge variant={isCorrect ? "secondary" : "destructive"}>
                {isCorrect ? "Đúng" : "Sai"}
              </Badge>
            ) : null}
          </span>
          <MarkButton marked={marked} disabled={disabled} onClick={onToggleMark} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <MathText className="font-exam text-lg leading-8" text={question.stem} />
        {isMcq(question.type) && question.options ? (
          <div className="grid gap-2">
            {OPTION_LETTERS.map((letter) => {
              const isCorrectOption = revealed && letter === correct;
              const isWrongPick =
                revealed && letter === value && letter !== correct;
              return (
                <label
                  key={letter}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border p-3",
                    inputLocked ? "cursor-default" : "cursor-pointer",
                    isCorrectOption
                      ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                      : isWrongPick
                        ? "border-destructive bg-destructive/5 text-destructive"
                        : value === letter
                          ? "border-primary bg-primary/5"
                          : "border-border",
                  )}
                >
                  <input
                    type="radio"
                    className="mt-1"
                    name={`q-${question.originalNumber}`}
                    value={letter}
                    checked={value === letter}
                    disabled={inputLocked}
                    onChange={() => onChange(letter)}
                  />
                  <span className="font-exam text-lg font-medium">{letter}.</span>
                  <MathText
                    className="font-exam text-lg leading-8"
                    text={question.options![letter]}
                  />
                </label>
              );
            })}
          </div>
        ) : (
          <div className="max-w-xl space-y-3">
            <Label htmlFor={`num-${question.originalNumber}`}>Đáp án</Label>
            <div className="flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <Input
                  id={`num-${question.originalNumber}`}
                  value={practice ? fillDraft : value}
                  disabled={inputLocked}
                  onChange={(event) => {
                    const next = event.target.value;
                    if (practice) setFillDraft(next);
                    else onChange(next);
                  }}
                  placeholder="Nhập đáp án"
                  className="font-exam text-lg"
                />
              </div>
              {practice && !revealed ? (
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0"
                  disabled={disabled || !fillDraft.trim()}
                  onClick={() => onChange(fillDraft.trim())}
                >
                  Kiểm tra
                </Button>
              ) : null}
            </div>
          </div>
        )}
        {revealed ? (
          <>
            <p className="text-xs text-muted-foreground">
              Bạn chọn:{" "}
              {value ? <MathText inline text={value} /> : "—"} · Đáp án đúng:{" "}
              <MathText inline text={correct} />
            </p>
            <SolutionReveal
              defaultOpen
              solution={question.solution}
              textClassName="font-exam text-lg leading-8"
            />
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
