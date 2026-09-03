"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { MathText } from "@/components/math-text";
import { SolutionReveal, TopicBadge } from "@/components/question-meta";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { questionTypeLabel } from "@/lib/exam/constants";
import type {
  MarkedEssayItem,
  MarkedQuestionItem,
  PracticeSummary,
  WrongQuestionItem,
} from "@/lib/exam/practice-stats";
import type { PracticeInsight } from "@/lib/exam/schema";
import { isMcq } from "@/lib/exam/types";

function formatScore(value: number | null): string {
  return value == null ? "—" : value.toFixed(1);
}

function formatRate(value: number | null): string {
  return value == null ? "—" : `${Math.round(value * 100)}%`;
}

export function PracticeReview({
  summary,
  markedEssays,
  markedQuestions,
  wrongQuestions,
  initialInsight,
  insightAt,
}: {
  summary: PracticeSummary;
  markedEssays: MarkedEssayItem[];
  markedQuestions: MarkedQuestionItem[];
  wrongQuestions: WrongQuestionItem[];
  initialInsight: PracticeInsight | null;
  insightAt: string | null;
}) {
  const router = useRouter();
  const [essays, setEssays] = useState(markedEssays);
  const [questions, setQuestions] = useState(markedQuestions);
  const [insight, setInsight] = useState(initialInsight);
  const [insightAtState, setInsightAtState] = useState(insightAt);
  const [busyMark, setBusyMark] = useState<string | null>(null);
  const [busyInsight, setBusyInsight] = useState(false);
  const [insightMessage, setInsightMessage] = useState<string | null>(null);
  const [insightError, setInsightError] = useState<string | null>(null);

  async function unmark(kind: "essay" | "question", fingerprint: string) {
    setBusyMark(`${kind}:${fingerprint}`);
    try {
      const response = await fetch("/api/question-marks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, fingerprint, marked: false }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Không bỏ đánh dấu được.");
      }
      if (kind === "essay") {
        setEssays((current) =>
          current.filter((item) => item.fingerprint !== fingerprint),
        );
      } else {
        setQuestions((current) =>
          current.filter((item) => item.fingerprint !== fingerprint),
        );
      }
      router.refresh();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Không bỏ đánh dấu được.");
    } finally {
      setBusyMark(null);
    }
  }

  async function requestInsight() {
    if (busyInsight) return;
    setBusyInsight(true);
    setInsightError(null);
    setInsightMessage(null);
    try {
      const response = await fetch("/api/account/insights", { method: "POST" });
      const data = (await response.json()) as {
        insight?: PracticeInsight;
        unchanged?: boolean;
        error?: string;
      };
      if (!response.ok || !data.insight) {
        throw new Error(data.error || "Không tạo được nhận xét.");
      }
      setInsight(data.insight);
      if (data.unchanged) {
        setInsightMessage("Chưa có bài mới, đang dùng nhận xét đã lưu.");
      } else {
        setInsightAtState(new Date().toISOString());
        setInsightMessage(null);
      }
    } catch (error) {
      setInsightError(
        error instanceof Error ? error.message : "Không tạo được nhận xét.",
      );
    } finally {
      setBusyInsight(false);
    }
  }

  const hasSubmitted = summary.submitted > 0;
  const insightLabel = insight ? "Làm mới nhận xét" : "Đánh giá & gợi ý";

  return (
    <div className="grid gap-6">
      <section className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Bài đã nộp" value={String(summary.submitted)} />
        <StatCard label="Điểm trung bình" value={formatScore(summary.avgTotal)} />
        <StatCard label="Điểm gần nhất" value={formatScore(summary.latestTotal)} />
        <StatCard label="Điểm cao nhất" value={formatScore(summary.bestTotal)} />
        <StatCard label="Tỷ lệ đúng MCQ" value={formatRate(summary.mcqCorrectRate)} />
        <StatCard label="Điểm TB nghị luận" value={formatScore(summary.avgEssay)} />
        <StatCard
          label="Theo mã đề"
          value={`CA1 ${summary.byCode.CA1} · CA4 ${summary.byCode.CA4}`}
        />
        <StatCard
          label="Theo phạm vi"
          value={`Cả bài ${summary.bySection.full} · P1 ${summary.bySection.part1} · P2 ${summary.bySection.part2}`}
        />
        <StatCard label="Câu đang đánh dấu" value={String(essays.length + questions.length)} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Nhận xét luyện tập</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Dùng tóm tắt điểm và dạng bài sai. Chỉ gọi AI khi dữ liệu đổi.
          </p>
          {insight ? (
            <div className="space-y-2">
              <p className="text-sm leading-6">{insight.evaluation}</p>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {insight.suggestions.map((item, index) => (
                  <li key={`${index}-${item}`}>{item}</li>
                ))}
              </ul>
              {insightAtState ? (
                <p className="text-xs text-muted-foreground">
                  Lưu {new Date(insightAtState).toLocaleString("vi-VN")}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Chưa có nhận xét. Nộp bài rồi bấm đánh giá.
            </p>
          )}
          {insightMessage ? (
            <p className="text-sm text-muted-foreground">{insightMessage}</p>
          ) : null}
          {insightError ? (
            <p className="text-sm text-destructive">{insightError}</p>
          ) : null}
          <Button
            type="button"
            disabled={busyInsight || !hasSubmitted}
            onClick={() => void requestInsight()}
          >
            {busyInsight ? <LoaderCircle className="animate-spin" /> : null}
            {busyInsight ? "Đang đánh giá..." : insightLabel}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Câu đã đánh dấu</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {essays.length === 0 && questions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Chưa đánh dấu câu nào khi làm bài.
            </p>
          ) : null}
          {essays.map((essay) => (
            <div key={essay.fingerprint} className="space-y-2 rounded-lg border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">Nghị luận</p>
                  <TopicBadge topic={essay.topic} />
                  <Badge>Đã đánh dấu</Badge>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={busyMark === `essay:${essay.fingerprint}`}
                  onClick={() => void unmark("essay", essay.fingerprint)}
                >
                  Bỏ đánh dấu
                </Button>
              </div>
              <MathText className="font-exam text-sm leading-7" text={essay.prompt} />
              <SolutionReveal solution={essay.solution} />
            </div>
          ))}
          {questions.map((question) => (
            <div key={question.fingerprint} className="space-y-2 rounded-lg border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{question.examCode}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {questionTypeLabel(question.type)}
                  </span>
                  <TopicBadge topic={question.topic} />
                  <Badge>Đã đánh dấu</Badge>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={busyMark === `question:${question.fingerprint}`}
                  onClick={() => void unmark("question", question.fingerprint)}
                >
                  Bỏ đánh dấu
                </Button>
              </div>
              <MathText className="font-exam text-sm leading-7" text={question.stem} />
              {isMcq(question.type) && question.options
                ? (["A", "B", "C", "D"] as const).map((letter) => (
                    <p key={letter} className="text-sm text-muted-foreground">
                      {letter}.{" "}
                      <MathText inline text={question.options?.[letter] ?? ""} />
                    </p>
                  ))
                : null}
              <p className="text-sm">
                Đáp án:{" "}
                <MathText inline className="font-medium" text={question.answer} />
              </p>
              <SolutionReveal solution={question.solution} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Câu làm sai</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {wrongQuestions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Chưa có câu sai từ bài đã nộp, hoặc chưa nộp phần 2.
            </p>
          ) : (
            wrongQuestions.map((question) => (
              <div key={question.fingerprint} className="space-y-2 rounded-lg border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{question.examCode}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {questionTypeLabel(question.type)}
                  </span>
                  <TopicBadge topic={question.topic} />
                  <Badge variant="destructive">Sai {question.timesWrong} lần</Badge>
                </div>
                <MathText className="font-exam text-sm leading-7" text={question.stem} />
                <p className="text-sm text-muted-foreground">
                  Bạn chọn:{" "}
                  {question.userAnswer ? (
                    <MathText inline text={question.userAnswer} />
                  ) : (
                    "—"
                  )}{" "}
                  · Đáp án đúng:{" "}
                  <MathText inline className="font-medium text-emerald-700" text={question.correctDisplayAnswer} />
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dạng bài làm sai</CardTitle>
        </CardHeader>
        <CardContent>
          {summary.wrongTopics.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có thống kê dạng bài sai.</p>
          ) : (
            <ul className="grid gap-2">
              {summary.wrongTopics.map((item) => (
                <li
                  key={item.topic}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                >
                  <span>{item.topic}</span>
                  <Badge variant="outline">{item.count} lần sai</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}
