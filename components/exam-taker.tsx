"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { ExamTimer } from "@/components/exam-timer";
import { MathText } from "@/components/math-text";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { AUTOSAVE_INTERVAL_MS, OPTION_LETTERS, questionTypeLabel } from "@/lib/exam/constants";
import { isMcq, type AttemptAnswers, type DisplayQuestion } from "@/lib/exam/types";
import { cn } from "@/lib/utils";

type ExamPayload = {
  attempt: {
    id: string;
    startedAt: string;
    submittedAt: string | null;
    essayText: string;
    answers: AttemptAnswers;
    endsAt: number;
    serverNow: number;
  };
  exam: {
    title: string;
    essayPrompt: string;
    questions: DisplayQuestion[];
  };
};

export function ExamTaker({ attemptId }: { attemptId: string }) {
  const router = useRouter();
  const [data, setData] = useState<ExamPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [essayText, setEssayText] = useState("");
  const [answers, setAnswers] = useState<AttemptAnswers>({});
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const snapshotRef = useRef({ essayText: "", answers: {} as AttemptAnswers });

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
        setData(json);
        setEssayText(json.attempt.essayText);
        setAnswers(json.attempt.answers);
        snapshotRef.current = {
          essayText: json.attempt.essayText,
          answers: json.attempt.answers,
        };
      }
    }
    load().catch(() => setError("Không tải được bài làm."));
    return () => {
      cancelled = true;
    };
  }, [attemptId, router]);

  const save = useCallback(async () => {
    if (submittingRef.current) return;
    const payload = {
      essayText: snapshotRef.current.essayText,
      answers: snapshotRef.current.answers,
    };
    await fetch(`/api/attempts/${attemptId}/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }, [attemptId]);

  useEffect(() => {
    snapshotRef.current = { essayText, answers };
  }, [essayText, answers]);

  useEffect(() => {
    const id = setInterval(() => {
      void save();
    }, AUTOSAVE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [save]);

  const submit = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const response = await fetch(`/api/attempts/${attemptId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          essayText: snapshotRef.current.essayText,
          answers: snapshotRef.current.answers,
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

  const answeredCount = useMemo(() => {
    if (!data) return 0;
    const essayDone = essayText.trim() ? 1 : 0;
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

  const totalItems = data.exam.questions.length + 1;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_220px]">
      <div className="space-y-6">
        <div className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b bg-background/95 py-3 backdrop-blur">
          <div>
            <h1 className="text-lg font-semibold">{data.exam.title}</h1>
            <p className="text-xs text-muted-foreground">
              Đã trả lời {answeredCount}/{totalItems} phần
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ExamTimer
              endsAt={data.attempt.endsAt}
              serverNow={data.attempt.serverNow}
              onExpire={submit}
            />
            <Button onClick={submit} disabled={submitting}>
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

        <Card id="essay">
          <CardHeader>
            <CardTitle>Phần 1 · Nghị luận xã hội (30 điểm)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <MathText
              className="font-exam rounded-lg bg-muted/50 p-4 text-sm leading-7"
              text={data.exam.essayPrompt}
            />
            <div className="grid gap-2">
              <Label htmlFor="essay">Bài làm</Label>
              <Textarea
                id="essay"
                value={essayText}
                onChange={(event) => setEssayText(event.target.value)}
                placeholder="Nhập bài nghị luận tại đây..."
                className="min-h-64"
                disabled={submitting}
              />
            </div>
          </CardContent>
        </Card>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">
            Phần 2 · {data.exam.questions.length} câu (70 điểm)
          </h2>
          {data.exam.questions.map((question) => (
            <QuestionCard
              key={question.originalNumber}
              question={question}
              value={answers[String(question.originalNumber)] ?? ""}
              disabled={submitting}
              onChange={(value) =>
                setAnswers((current) => ({
                  ...current,
                  [String(question.originalNumber)]: value,
                }))
              }
            />
          ))}
        </section>
      </div>

      <aside className="lg:sticky lg:top-20 h-fit rounded-xl border bg-card p-3">
        <p className="mb-2 text-xs font-medium text-muted-foreground">Mục lục</p>
        <div className="grid grid-cols-5 gap-1.5">
          <a
            href="#essay"
            className={cn(
              "flex h-8 items-center justify-center rounded-md text-xs",
              essayText.trim() ? "bg-primary text-primary-foreground" : "bg-muted",
            )}
          >
            TL
          </a>
          {data.exam.questions.map((question) => {
            const filled = Boolean(
              answers[String(question.originalNumber)]?.trim(),
            );
            return (
              <a
                key={question.originalNumber}
                href={`#q-${question.displayIndex}`}
                className={cn(
                  "flex h-8 items-center justify-center rounded-md text-xs",
                  filled ? "bg-primary text-primary-foreground" : "bg-muted",
                )}
              >
                {question.displayIndex}
              </a>
            );
          })}
        </div>
      </aside>
    </div>
  );
}

function QuestionCard({
  question,
  value,
  onChange,
  disabled,
}: {
  question: DisplayQuestion;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <Card id={`q-${question.displayIndex}`}>
      <CardHeader>
        <CardTitle className="text-sm">
          Câu {question.displayIndex}
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {questionTypeLabel(question.type)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <MathText className="font-exam text-sm leading-7" text={question.stem} />
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
                <span className="font-exam text-sm font-medium">{letter}.</span>
                <MathText
                  className="font-exam text-sm"
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
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
