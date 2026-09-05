"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BankEssayFields,
  EditToolbar,
  useBankSave,
} from "@/components/bank-item-editor";
import { SampleExamBank, type BankSampleView } from "@/components/sample-exam-bank";
import { MathText } from "@/components/math-text";
import { SolutionReveal, TopicBadge } from "@/components/question-meta";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ExamCode } from "@/lib/exam/types";
import { cn } from "@/lib/utils";

export type BankEssayView = {
  id: string;
  prompt: string;
  sourceFilename: string | null;
  fingerprint: string;
  title?: string;
  topic?: string;
  solution?: string;
  marked?: boolean;
};

type Tab = "essay" | "sample";

export function QuestionBank({
  essays,
  samples,
  signedIn,
  initialTab = "essay",
  initialExamCode = "CA1",
}: {
  essays: BankEssayView[];
  samples: BankSampleView[];
  signedIn: boolean;
  initialTab?: Tab;
  initialExamCode?: ExamCode;
}) {
  const router = useRouter();
  const [essayItems, setEssayItems] = useState(essays);
  const [tab, setTab] = useState<Tab>(initialTab);
  const [examCode, setExamCode] = useState<ExamCode>(initialExamCode);
  const visibleSamples = useMemo(
    () => samples.filter((sample) => sample.examCode === examCode),
    [samples, examCode],
  );
  const counts = useMemo(() => {
    const byCode = {
      CA1: { exams: 0, questions: 0 },
      CA4: { exams: 0, questions: 0 },
    };
    for (const sample of samples) {
      byCode[sample.examCode].exams += 1;
      byCode[sample.examCode].questions += sample.questions.length;
    }
    return {
      essay: essayItems.length,
      sample: samples.length,
      byCode,
    };
  }, [essayItems.length, samples]);

  function replaceBankUrl(nextTab: Tab, nextCode: ExamCode) {
    const params = new URLSearchParams();
    params.set("tab", nextTab);
    if (nextTab === "sample") params.set("examCode", nextCode);
    router.replace(`/bank?${params.toString()}`, { scroll: false });
  }

  function handleTab(next: Tab) {
    setTab(next);
    replaceBankUrl(next, examCode);
  }

  function handleSampleExamCode(next: ExamCode) {
    setExamCode(next);
    setTab("sample");
    replaceBankUrl("sample", next);
  }

  function handleEssaySaved(updated: BankEssayView) {
    setEssayItems((current) =>
      current.map((item) => (item.id === updated.id ? updated : item)),
    );
  }

  function handleEssayDeleted(id: string) {
    setEssayItems((current) => current.filter((item) => item.id !== id));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Ngân hàng câu hỏi</h1>
        <p className="text-sm text-muted-foreground">
          Đề nghị luận và đề minh họa đang có trên hệ thống.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["essay", `Nghị luận (${counts.essay})`],
            ["sample", `Đề minh họa (${counts.sample})`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => handleTab(id)}
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
        essayItems.length === 0 ? (
          <Empty text="Chưa có đề nghị luận. Hãy đóng góp từ trang chủ hoặc dùng đề minh họa 2026." />
        ) : (
          <div className="grid gap-4">
            {essayItems.map((essay, index) => (
              <EssayCard
                key={essay.id}
                essay={essay}
                index={index}
                signedIn={signedIn}
                onSaved={handleEssaySaved}
                onDeleted={handleEssayDeleted}
              />
            ))}
          </div>
        )
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(["CA1", "CA4"] as const).map((code) => {
              const stats = counts.byCode[code];
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => handleSampleExamCode(code)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm",
                    examCode === code
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {code} ({stats.exams} đề · {stats.questions} câu)
                </button>
              );
            })}
          </div>
          <SampleExamBank
            key={examCode}
            samples={visibleSamples}
            examCode={examCode}
            signedIn={signedIn}
          />
        </div>
      )}
    </div>
  );
}

function MarkedBadge({
  marked,
  signedIn,
  busy,
  onUnmark,
}: {
  marked?: boolean;
  signedIn: boolean;
  busy?: boolean;
  onUnmark: () => void;
}) {
  if (!marked) return null;
  return (
    <>
      <Badge>Đã đánh dấu</Badge>
      {signedIn ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={onUnmark}
        >
          Bỏ đánh dấu
        </Button>
      ) : null}
    </>
  );
}

function EssayCard({
  essay,
  index,
  signedIn,
  onSaved,
  onDeleted,
}: {
  essay: BankEssayView;
  index: number;
  signedIn: boolean;
  onSaved: (essay: BankEssayView) => void;
  onDeleted: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [prompt, setPrompt] = useState(essay.prompt);
  const [title, setTitle] = useState(essay.title ?? "");
  const [topic, setTopic] = useState(essay.topic ?? "");
  const [solution, setSolution] = useState(essay.solution ?? "");
  const { busy, alertNode, setAlert, save } = useBankSave();
  const displayTitle =
    (essay.title ?? "").trim() || essay.prompt.slice(0, 80) || "Nghị luận";

  async function onSave() {
    const data = await save<{
      prompt: string;
      title: string | null;
      topic: string | null;
      solution: string | null;
    }>(() =>
      fetch(`/api/bank/essays/${essay.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, title, topic, solution }),
      }),
    );
    if (!data) return;
    onSaved({
      ...essay,
      prompt: data.prompt,
      title: data.title ?? undefined,
      topic: data.topic ?? undefined,
      solution: data.solution ?? undefined,
    });
    setTitle(data.title ?? "");
    setEditing(false);
  }

  async function onDelete() {
    if (!window.confirm("Xóa đề nghị luận này khỏi ngân hàng?")) return;
    const data = await save<{ ok?: boolean }>(() =>
      fetch(`/api/bank/essays/${essay.id}`, { method: "DELETE" }),
    );
    if (!data) return;
    onDeleted(essay.id);
  }

  async function onUnmark() {
    const data = await save<{ marked?: boolean }>(() =>
      fetch("/api/question-marks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "essay",
          fingerprint: essay.fingerprint,
          marked: false,
        }),
      }),
    );
    if (!data) return;
    onSaved({ ...essay, marked: false });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="flex flex-wrap items-center gap-2">
            <span>{displayTitle}</span>
            <Badge variant="secondary">Nghị luận {index + 1}</Badge>
            <TopicBadge topic={essay.topic} />
            {essay.marked ? (
              <MarkedBadge
                marked
                signedIn={signedIn}
                busy={busy}
                onUnmark={onUnmark}
              />
            ) : null}
          </span>
          <EditToolbar
            signedIn={signedIn}
            editing={editing}
            busy={busy}
            onEdit={() => {
              setPrompt(essay.prompt);
              setTitle(essay.title ?? "");
              setTopic(essay.topic ?? "");
              setSolution(essay.solution ?? "");
              setAlert(null);
              setEditing(true);
            }}
            onCancel={() => {
              setPrompt(essay.prompt);
              setTitle(essay.title ?? "");
              setTopic(essay.topic ?? "");
              setSolution(essay.solution ?? "");
              setAlert(null);
              setEditing(false);
            }}
            onSave={onSave}
            onDelete={onDelete}
          />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {alertNode}
        {editing ? (
          <BankEssayFields
            prompt={prompt}
            title={title}
            topic={topic}
            solution={solution}
            disabled={busy}
            onChange={(next) => {
              setPrompt(next.prompt);
              setTitle(next.title ?? "");
              setTopic(next.topic);
              setSolution(next.solution);
            }}
          />
        ) : (
          <>
            <MathText className="text-sm leading-7" text={essay.prompt} />
            <SolutionReveal solution={essay.solution} />
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground">{text}</p>;
}
