import Link from "next/link";
import { MathText } from "@/components/math-text";
import { SolutionReveal, TopicBadge } from "@/components/question-meta";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ESSAY_MAX_SCORE,
  MCQ_MAX_SCORE,
  OPTION_LETTERS,
  TOTAL_MAX_SCORE,
  questionTypeLabel,
  sectionModeLabel,
} from "@/lib/exam/constants";
import { toDisplayBlocks } from "@/lib/exam/shuffle";
import { isMcq, isSectionMode, type McqDetailItem, type SectionMode } from "@/lib/exam/types";
import { cn } from "@/lib/utils";

export function ResultsView({
  title,
  essayPrompt,
  essayTopic,
  essaySolution,
  essayText,
  essayScore,
  essayFeedback,
  mcqScore,
  correctCount,
  totalQuestions,
  totalScore,
  detail,
  sectionMode = "full",
}: {
  title: string;
  essayPrompt: string;
  essayTopic?: string | null;
  essaySolution?: string | null;
  essayText: string;
  essayScore: number;
  essayFeedback: string;
  mcqScore: number;
  correctCount: number;
  totalQuestions: number;
  totalScore: number;
  detail: McqDetailItem[];
  sectionMode?: SectionMode;
}) {
  const mode = isSectionMode(sectionMode) ? sectionMode : "full";
  const showEssay = mode !== "part2";
  const showPart2 = mode !== "part1";
  const maxEssay = showEssay ? ESSAY_MAX_SCORE : 0;
  const maxMcq = showPart2 ? MCQ_MAX_SCORE : 0;
  const maxTotal = maxEssay + maxMcq;
  const blocks = toDisplayBlocks(
    detail.map((item) => ({
      originalNumber: item.originalNumber,
      displayIndex: item.displayIndex,
      type: item.type,
      stem: item.stem,
      options: item.options,
      clusterId: item.clusterId,
      clusterKind: item.clusterKind,
      passage: item.passage,
    })),
  );
  const detailByNumber = new Map(
    detail.map((item) => [item.originalNumber, item]),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="text-sm text-muted-foreground">
            Kết quả bài làm · {sectionModeLabel(mode)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/account/attempts">Lịch sử làm bài</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Làm đề khác</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {showEssay ? (
          <ScoreCard label="Tự luận" value={`${essayScore}/${ESSAY_MAX_SCORE}`} />
        ) : null}
        {showPart2 ? (
          <ScoreCard
            label="Trắc nghiệm"
            value={`${mcqScore}/${MCQ_MAX_SCORE}`}
            hint={`${correctCount}/${totalQuestions} câu đúng`}
          />
        ) : null}
        <ScoreCard
          label="Tổng điểm"
          value={`${totalScore}/${maxTotal || TOTAL_MAX_SCORE}`}
          highlight
        />
      </div>

      {showEssay ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2">
              <span>Phần 1 · Chấm nghị luận</span>
              <TopicBadge topic={essayTopic} />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <MathText className="font-exam text-lg leading-8 text-muted-foreground" text={essayPrompt} />
            <div className="rounded-lg bg-muted/50 p-4 font-exam whitespace-pre-wrap text-lg leading-8">
              {essayText.trim() || "Không có bài làm."}
            </div>
            <p className="text-sm leading-6">{essayFeedback}</p>
            <SolutionReveal
              solution={essaySolution}
              textClassName="font-exam text-lg leading-8"
            />
          </CardContent>
        </Card>
      ) : null}

      {showPart2 ? (
      <Card>
        <CardHeader>
          <CardTitle>Phần 2 · Chi tiết trắc nghiệm</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {blocks.map((block, blockIndex) => (
            <div key={`result-block-${blockIndex}`} className="space-y-4">
              {block.kind === "cluster" ? (
                <div className="space-y-2">
                  <p className="font-exam text-lg font-semibold">{block.header}</p>
                  {block.passage ? (
                    <MathText
                      className="font-exam rounded-lg bg-muted/50 p-3 text-lg leading-8"
                      text={block.passage}
                    />
                  ) : null}
                </div>
              ) : null}
              {block.kind === "fill" ? (
                <p className="font-exam text-lg font-semibold">{block.header}</p>
              ) : null}
              {block.questions.map((question) => {
                const item = detailByNumber.get(question.originalNumber);
                if (!item) return null;
                return (
                  <ResultQuestion key={item.originalNumber} item={item} />
                );
              })}
            </div>
          ))}
        </CardContent>
      </Card>
      ) : null}
    </div>
  );
}

function ResultQuestion({ item }: { item: McqDetailItem }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="flex flex-wrap items-center gap-2 text-lg font-medium">
          <span>
            Câu {item.displayIndex}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {questionTypeLabel(item.type)}
            </span>
          </span>
          <TopicBadge topic={item.topic} />
        </p>
        <Badge variant={item.isCorrect ? "secondary" : "destructive"}>
          {item.isCorrect ? "Đúng" : "Sai"} · {item.points}đ
        </Badge>
      </div>
      <MathText className="mb-3 font-exam text-lg leading-8" text={item.stem} />
      {isMcq(item.type) && item.options
        ? OPTION_LETTERS.map((letter) => (
            <p
              key={letter}
              className={cn(
                "flex items-start gap-2 font-exam text-lg leading-8",
                letter === item.correctDisplayAnswer
                  ? "font-medium text-emerald-700"
                  : letter === item.userAnswer
                    ? "text-destructive"
                    : "text-muted-foreground",
              )}
            >
              <span>{letter}.</span>
              <MathText
                inline
                className="flex-1"
                text={item.options?.[letter] ?? ""}
              />
            </p>
          ))
        : (
            <p className="font-exam text-lg text-muted-foreground">
              Đáp án đúng:{" "}
              <MathText
                inline
                className="font-medium text-emerald-700"
                text={item.correctDisplayAnswer}
              />
            </p>
          )}
      <p className="mt-2 text-xs text-muted-foreground">
        Bạn chọn:{" "}
        {item.userAnswer ? (
          <MathText inline text={item.userAnswer} />
        ) : (
          "—"
        )}{" "}
        · Đáp án đúng:{" "}
        <MathText inline text={item.correctDisplayAnswer} />
      </p>
      <SolutionReveal
        className="mt-3"
        solution={item.solution}
        textClassName="font-exam text-lg leading-8"
      />
    </div>
  );
}

function ScoreCard({
  label,
  value,
  hint,
  highlight,
}: {
  label: string;
  value: string;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "ring-1 ring-primary" : undefined}>
      <CardContent className="pt-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold">{value}</p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
