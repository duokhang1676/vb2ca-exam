import Link from "next/link";
import { MathText } from "@/components/math-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ESSAY_MAX_SCORE,
  MCQ_MAX_SCORE,
  OPTION_LETTERS,
  TOTAL_MAX_SCORE,
  questionTypeLabel,
} from "@/lib/exam/constants";
import { isMcq, type McqDetailItem } from "@/lib/exam/types";
import { cn } from "@/lib/utils";

export function ResultsView({
  title,
  essayPrompt,
  essayText,
  essayScore,
  essayFeedback,
  mcqScore,
  correctCount,
  totalQuestions,
  totalScore,
  detail,
}: {
  title: string;
  essayPrompt: string;
  essayText: string;
  essayScore: number;
  essayFeedback: string;
  mcqScore: number;
  correctCount: number;
  totalQuestions: number;
  totalScore: number;
  detail: McqDetailItem[];
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="text-sm text-muted-foreground">Kết quả bài làm</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/">Làm đề khác</Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <ScoreCard label="Tự luận" value={`${essayScore}/${ESSAY_MAX_SCORE}`} />
        <ScoreCard
          label="Trắc nghiệm"
          value={`${mcqScore}/${MCQ_MAX_SCORE}`}
          hint={`${correctCount}/${totalQuestions} câu đúng`}
        />
        <ScoreCard
          label="Tổng điểm"
          value={`${totalScore}/${TOTAL_MAX_SCORE}`}
          highlight
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Phần 1 · Chấm nghị luận</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <MathText className="text-sm text-muted-foreground" text={essayPrompt} />
          <div className="rounded-lg bg-muted/50 p-4 whitespace-pre-wrap text-sm">
            {essayText.trim() || "Không có bài làm."}
          </div>
          <p className="text-sm leading-6">{essayFeedback}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Phần 2 · Chi tiết trắc nghiệm</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {detail.map((item) => (
            <div key={item.originalNumber} className="rounded-lg border p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  Câu {item.displayIndex}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {questionTypeLabel(item.type)}
                  </span>
                </p>
                <Badge variant={item.isCorrect ? "secondary" : "destructive"}>
                  {item.isCorrect ? "Đúng" : "Sai"} · {item.points}đ
                </Badge>
              </div>
              <MathText className="mb-3 text-sm" text={item.stem} />
              {isMcq(item.type) && item.options
                ? OPTION_LETTERS.map((letter) => (
                    <p
                      key={letter}
                      className={cn(
                        "flex items-start gap-2 text-sm",
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
                    <p className="text-sm text-muted-foreground">
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
            </div>
          ))}
        </CardContent>
      </Card>
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
