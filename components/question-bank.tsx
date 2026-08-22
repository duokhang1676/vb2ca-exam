"use client";

import { useMemo, useState } from "react";
import { MathText } from "@/components/math-text";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OPTION_LETTERS, questionTypeLabel } from "@/lib/exam/constants";
import { isMcq, type ExamCode, type McqOptions, type QuestionType } from "@/lib/exam/types";
import { cn } from "@/lib/utils";

export type BankEssayView = {
  id: string;
  prompt: string;
  sourceFilename: string | null;
};

export type BankQuestionView = {
  id: string;
  examCode: ExamCode;
  type: QuestionType;
  stem: string;
  options?: McqOptions;
  answer: string;
};

type Tab = "essay" | ExamCode;

export function QuestionBank({
  essays,
  questions,
}: {
  essays: BankEssayView[];
  questions: BankQuestionView[];
}) {
  const [tab, setTab] = useState<Tab>("essay");
  const counts = useMemo(
    () => ({
      essay: essays.length,
      CA1: questions.filter((item) => item.examCode === "CA1").length,
      CA4: questions.filter((item) => item.examCode === "CA4").length,
    }),
    [essays.length, questions],
  );
  const visible = questions.filter((item) => item.examCode === tab);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Ngân hàng câu hỏi</h1>
        <p className="text-sm text-muted-foreground">
          Toàn bộ đề nghị luận và câu hỏi phần 2 đang có trên hệ thống.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["essay", `Nghị luận (${counts.essay})`],
            ["CA1", `CA1 (${counts.CA1})`],
            ["CA4", `CA4 (${counts.CA4})`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm",
              tab === id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "essay" ? (
        essays.length === 0 ? (
          <Empty text="Chưa có đề nghị luận. Hãy đóng góp từ trang chủ hoặc dùng đề minh họa 2026." />
        ) : (
          <div className="grid gap-4">
            {essays.map((essay, index) => (
              <Card key={essay.id}>
                <CardHeader>
                  <CardTitle className="flex flex-wrap items-center gap-2 text-sm">
                    <span>NL-{essay.id.slice(0, 8).toUpperCase()}</span>
                    <Badge variant="secondary">Nghị luận {index + 1}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <MathText className="text-sm leading-7" text={essay.prompt} />
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : visible.length === 0 ? (
        <Empty text={`Chưa có câu hỏi mã ${tab}.`} />
      ) : (
        <div className="grid gap-4">
          {visible.map((question, index) => (
            <Card key={question.id}>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2 text-sm">
                  <span>
                    {question.examCode}-{question.id.slice(0, 8).toUpperCase()}
                  </span>
                  <Badge variant="secondary">Câu {index + 1}</Badge>
                  <Badge variant="outline">{questionTypeLabel(question.type)}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <MathText className="text-sm leading-7" text={question.stem} />
                {isMcq(question.type) && question.options
                  ? OPTION_LETTERS.map((letter) => (
                      <p
                        key={letter}
                        className={cn(
                          "flex items-start gap-2 text-sm",
                          letter === question.answer
                            ? "font-medium text-emerald-700"
                            : "text-muted-foreground",
                        )}
                      >
                        <span>{letter}.</span>
                        <MathText
                          inline
                          className="flex-1"
                          text={question.options?.[letter] ?? ""}
                        />
                      </p>
                    ))
                  : null}
                <p className="text-sm">
                  Đáp án:{" "}
                  <MathText
                    inline
                    className="font-medium text-primary"
                    text={question.answer}
                  />
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground">{text}</p>;
}
