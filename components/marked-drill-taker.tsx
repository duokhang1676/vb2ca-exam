"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MarkButton } from "@/components/mark-button";
import { MathText } from "@/components/math-text";
import { QuestionToc, tocItem } from "@/components/question-toc";
import { SolutionReveal, TopicBadge } from "@/components/question-meta";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { OPTION_LETTERS, questionTypeLabel } from "@/lib/exam/constants";
import { isFillMatch } from "@/lib/exam/grade";
import { persistQuestionMark } from "@/lib/exam/persist-mark";
import { toDisplayBlocks } from "@/lib/exam/shuffle";
import {
  isMcq,
  type AttemptAnswers,
  type DisplayQuestion,
  type ExamCode,
} from "@/lib/exam/types";
import { cn } from "@/lib/utils";

export type DrillQuestion = DisplayQuestion & {
  fingerprint?: string;
  marked?: boolean;
};

export function MarkedDrillTaker({
  title,
  examCode,
  essayPrompt,
  essayTopic,
  essaySolution,
  essayFingerprint,
  essayMarked,
  questions,
  subtitle,
  exitHref,
  part2Title,
}: {
  title: string;
  examCode: ExamCode;
  essayPrompt: string;
  essayTopic?: string;
  essaySolution?: string;
  essayFingerprint: string;
  essayMarked: boolean;
  questions: DrillQuestion[];
  subtitle?: string;
  exitHref?: string;
  part2Title?: string;
}) {
  const router = useRouter();
  const [essayText, setEssayText] = useState("");
  const [answers, setAnswers] = useState<AttemptAnswers>({});
  const [essayFlagged, setEssayFlagged] = useState(essayMarked);
  const [flagged, setFlagged] = useState<number[]>(() =>
    questions
      .filter((question) => question.marked !== false)
      .map((question) => question.originalNumber),
  );
  const flaggedSet = new Set(flagged);
  const showEssay = Boolean(essayPrompt.trim());
  const blocks = toDisplayBlocks(questions);
  const totalItems = (showEssay ? 1 : 0) + questions.length;
  const answeredCount =
    (showEssay && essayText.trim() ? 1 : 0) +
    questions.filter((question) =>
      Boolean(answers[String(question.originalNumber)]?.trim()),
    ).length;
  const doneHref = exitHref ?? `/bank?tab=sample&examCode=${examCode}`;

  async function persistMark(params: {
    kind: "essay" | "question";
    fingerprint?: string;
    marked: boolean;
  }) {
    await persistQuestionMark({
      kind: params.kind,
      fingerprint: params.fingerprint,
      examCode,
      marked: params.marked,
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_220px]">
      <div className="space-y-6">
        <div className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b bg-background/95 py-3 backdrop-blur">
          <div>
            <h1 className="text-lg font-semibold">{title}</h1>
            <p className="text-xs text-muted-foreground">
              {subtitle ??
                "Luyện tập câu đánh dấu · Không chấm điểm, không lưu lịch sử"}{" "}
              · Đã trả lời {answeredCount}/{totalItems} phần
            </p>
          </div>
          <Button variant="outline" onClick={() => router.push(doneHref)}>
            Xong
          </Button>
        </div>

        {showEssay ? (
          <Card id="essay">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2">
                <span className="flex flex-wrap items-center gap-2">
                  <span>Phần 1 · Nghị luận xã hội</span>
                  <TopicBadge topic={essayTopic} />
                </span>
                <MarkButton
                  marked={essayFlagged}
                  onClick={() => {
                    const next = !essayFlagged;
                    setEssayFlagged(next);
                    void persistMark({
                      kind: "essay",
                      fingerprint: essayFingerprint,
                      marked: next,
                    });
                  }}
                />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <MathText
                className="font-exam rounded-lg bg-muted/50 p-4 text-lg leading-8"
                text={essayPrompt}
              />
              <div className="grid gap-2">
                <Label htmlFor="drill-essay">Bài làm</Label>
                <Textarea
                  id="drill-essay"
                  value={essayText}
                  onChange={(event) => setEssayText(event.currentTarget.value)}
                  placeholder="Nhập bài nghị luận tại đây..."
                  className="min-h-64 font-exam text-lg leading-8"
                />
              </div>
              <SolutionReveal
                solution={essaySolution}
                textClassName="font-exam text-lg leading-8"
              />
            </CardContent>
          </Card>
        ) : null}

        {questions.length > 0 ? (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">
              {part2Title ?? `Phần 2 · ${questions.length} câu đánh dấu`}
            </h2>
            {blocks.map((block, blockIndex) => (
              <div key={`drill-block-${blockIndex}`} className="space-y-4">
                {block.kind === "cluster" ? (
                  <div className="space-y-3 rounded-xl border bg-card p-4">
                    <p className="font-exam text-lg font-semibold">
                      {block.header}
                    </p>
                    {block.passage ? (
                      <MathText
                        className="font-exam rounded-lg bg-muted/50 p-4 text-lg leading-8"
                        text={block.passage}
                      />
                    ) : null}
                  </div>
                ) : null}
                {block.kind === "fill" ? (
                  <p className="font-exam text-lg font-semibold">
                    {block.header}
                  </p>
                ) : null}
                {block.questions.map((question) => (
                  <QuestionCard
                    key={question.originalNumber}
                    question={question}
                    value={answers[String(question.originalNumber)] ?? ""}
                    marked={flaggedSet.has(question.originalNumber)}
                    onChange={(value) =>
                      setAnswers((current) => ({
                        ...current,
                        [String(question.originalNumber)]: value,
                      }))
                    }
                    onToggleMark={() => {
                      const next = flaggedSet.has(question.originalNumber);
                      setFlagged((current) =>
                        next
                          ? current.filter((n) => n !== question.originalNumber)
                          : [...current, question.originalNumber],
                      );
                      void persistMark({
                        kind: "question",
                        fingerprint: question.fingerprint,
                        marked: !next,
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
          ...questions.map((question) =>
            tocItem(
              `#q-${question.displayIndex}`,
              String(question.displayIndex),
              Boolean(answers[String(question.originalNumber)]?.trim())
                ? "filled"
                : "empty",
              flaggedSet.has(question.originalNumber),
            ),
          ),
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
}: {
  question: DrillQuestion;
  value: string;
  marked: boolean;
  onChange: (value: string) => void;
  onToggleMark: () => void;
}) {
  const [fillDraft, setFillDraft] = useState(value);
  const revealed = Boolean(value.trim());
  const correct = question.correctDisplayAnswer ?? "";
  const isCorrect = isMcq(question.type)
    ? value.trim().toUpperCase() === correct.trim().toUpperCase()
    : isFillMatch(value, correct);

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
          <MarkButton marked={marked} onClick={onToggleMark} />
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
                    revealed ? "cursor-default" : "cursor-pointer",
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
                    disabled={revealed}
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
                  value={revealed ? value : fillDraft}
                  disabled={revealed}
                  onChange={(event) => setFillDraft(event.target.value)}
                  placeholder="Nhập đáp án"
                  className="font-exam text-lg"
                />
              </div>
              {!revealed ? (
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0"
                  disabled={!fillDraft.trim()}
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
              Bạn chọn: {value ? <MathText inline text={value} /> : "—"} · Đáp án
              đúng: <MathText inline text={correct} />
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
