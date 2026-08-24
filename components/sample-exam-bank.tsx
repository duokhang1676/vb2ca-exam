"use client";

import { useState } from "react";
import { LoaderCircle, Trash2 } from "lucide-react";
import {
  BankEssayFields,
  BankQuestionFields,
  EditToolbar,
  useBankSave,
} from "@/components/bank-item-editor";
import { MathText } from "@/components/math-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OPTION_LETTERS, questionTypeLabel } from "@/lib/exam/constants";
import { toDisplayBlocks } from "@/lib/exam/shuffle";
import {
  isMcq,
  type AnswerKey,
  type ExamCode,
  type Question,
} from "@/lib/exam/types";
import { cn } from "@/lib/utils";

export type BankSampleView = {
  id: string;
  title: string;
  examCode: ExamCode;
  kind: "official" | "generated";
  number: number;
  essayPrompt: string;
  questions: Question[];
  answerKey: AnswerKey;
  essayMarked?: boolean;
  markedNumbers?: number[];
};

export function SampleExamBank({
  samples,
  signedIn,
}: {
  samples: BankSampleView[];
  signedIn: boolean;
}) {
  const [items, setItems] = useState(samples);

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Chưa có đề minh họa. Hãy đóng góp từ trang chủ bằng file JSON.
      </p>
    );
  }

  return (
    <div className="grid gap-4">
      {items.map((sample) => (
        <SampleExamCard
          key={sample.id}
          sample={sample}
          signedIn={signedIn}
          onSaved={(updated) =>
            setItems((current) =>
              current.map((item) => (item.id === updated.id ? updated : item)),
            )
          }
          onDeleted={(id) =>
            setItems((current) => current.filter((item) => item.id !== id))
          }
        />
      ))}
    </div>
  );
}

function SampleExamCard({
  sample,
  signedIn,
  onSaved,
  onDeleted,
}: {
  sample: BankSampleView;
  signedIn: boolean;
  onSaved: (sample: BankSampleView) => void;
  onDeleted: (id: string) => void;
}) {
  const editable = signedIn && sample.kind !== "official";
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(sample.title);
  const [essayPrompt, setEssayPrompt] = useState(sample.essayPrompt);
  const [questions, setQuestions] = useState(sample.questions);
  const [answerKey, setAnswerKey] = useState(sample.answerKey);
  const { busy, alertNode, setAlert, save } = useBankSave();
  const marked = new Set(sample.markedNumbers ?? []);

  function resetDraft() {
    setTitle(sample.title);
    setEssayPrompt(sample.essayPrompt);
    setQuestions(sample.questions);
    setAnswerKey(sample.answerKey);
    setAlert(null);
  }

  async function patchSample(next: {
    title: string;
    essayPrompt: string;
    questions: Question[];
    answerKey: AnswerKey;
  }) {
    const data = await save<{
      title: string;
      essayPrompt: string;
      questions: Question[];
      answerKey: AnswerKey;
    }>(() =>
      fetch(`/api/exams/sample/${sample.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      }),
    );
    if (!data) return null;
    setTitle(data.title);
    setEssayPrompt(data.essayPrompt);
    setQuestions(data.questions);
    setAnswerKey(data.answerKey);
    onSaved({
      ...sample,
      title: data.title,
      essayPrompt: data.essayPrompt,
      questions: data.questions,
      answerKey: data.answerKey,
    });
    return data;
  }

  async function onSave() {
    const data = await patchSample({ title, essayPrompt, questions, answerKey });
    if (!data) return;
    setEditing(false);
  }

  async function onDeleteQuestion(originalNumber: number) {
    if (questions.length <= 1) {
      setAlert({
        tone: "error",
        title: "Không xóa được câu",
        message: "Đề minh họa cần ít nhất 1 câu phần 2.",
      });
      setOpen(true);
      return;
    }
    if (!window.confirm(`Xóa câu ${originalNumber} khỏi đề minh họa?`)) return;
    const nextQuestions = questions.filter(
      (question) => question.originalNumber !== originalNumber,
    );
    const nextAnswerKey = { ...answerKey };
    delete nextAnswerKey[String(originalNumber)];
    setOpen(true);
    await patchSample({
      title,
      essayPrompt,
      questions: nextQuestions,
      answerKey: nextAnswerKey,
    });
  }

  async function onDelete() {
    if (!window.confirm(`Xóa ${sample.title}? Câu hỏi của đề này trong ngân hàng cũng sẽ bị xóa.`)) {
      return;
    }
    const data = await save<{ ok?: boolean }>(() =>
      fetch(`/api/exams/sample/${sample.id}`, { method: "DELETE" }),
    );
    if (!data) return;
    onDeleted(sample.id);
  }

  const indexed = questions.map((question, index) => ({
    ...question,
    displayIndex: index + 1,
  }));
  const blocks = toDisplayBlocks(indexed);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="flex min-w-0 flex-wrap items-center gap-2">
            {editing ? (
              <span className="grid min-w-[12rem] flex-1 gap-1">
                <Label htmlFor={`sample-title-${sample.id}`} className="sr-only">
                  Tên đề
                </Label>
                <Input
                  id={`sample-title-${sample.id}`}
                  value={title}
                  disabled={busy}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </span>
            ) : (
              <span>{sample.title}</span>
            )}
            <Badge variant="outline">{sample.examCode}</Badge>
            {sample.kind === "official" ? (
              <Badge variant="secondary">Chính thức</Badge>
            ) : (
              <Badge variant="secondary">Số {sample.number}</Badge>
            )}
          </span>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>
              {open ? "Thu gọn" : "Xem đề"}
            </Button>
            {editable ? (
              <>
                <EditToolbar
                  signedIn={signedIn}
                  editing={editing}
                  busy={busy}
                  onEdit={() => {
                    resetDraft();
                    setEditing(true);
                    setOpen(true);
                  }}
                  onCancel={() => {
                    resetDraft();
                    setEditing(false);
                  }}
                  onSave={onSave}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy || editing}
                  onClick={() => void onDelete()}
                >
                  {busy ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
                  Xóa
                </Button>
              </>
            ) : null}
          </div>
        </CardTitle>
      </CardHeader>
      {open ? (
        <CardContent className="space-y-4">
          {alertNode}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium">Phần 1 · Nghị luận</p>
              {sample.essayMarked ? <Badge>Đã đánh dấu</Badge> : null}
            </div>
              {editing ? (
                <BankEssayFields
                  prompt={essayPrompt}
                  disabled={busy}
                  onChange={setEssayPrompt}
                />
              ) : (
                <MathText className="font-exam text-sm leading-7" text={essayPrompt} />
              )}
          </div>
          {blocks.map((block, blockIndex) => (
            <div key={`sample-block-${blockIndex}`} className="space-y-3">
              <p className="text-sm font-medium">
                {block.kind === "independent"
                  ? `Phần 2 · Trắc nghiệm độc lập (${block.questions.length} câu)`
                  : block.header}
              </p>
              {block.kind === "cluster" && block.passage ? (
                <MathText
                  className="font-exam rounded-lg bg-muted/50 p-3 text-sm leading-7"
                  text={block.passage}
                />
              ) : null}
              {block.questions.map((question) => {
                const answer = answerKey[String(question.originalNumber)] ?? "";
                const isMarked = marked.has(question.originalNumber);
                return (
                  <div key={question.originalNumber} className="rounded-lg border p-3">
                    <p className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span className="flex flex-wrap items-center gap-2">
                        <span>
                          Câu {question.displayIndex} · {questionTypeLabel(question.type)}
                        </span>
                        {isMarked ? <Badge>Đã đánh dấu</Badge> : null}
                      </span>
                      {editable ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          onClick={() => void onDeleteQuestion(question.originalNumber)}
                        >
                          {busy ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
                          Xóa câu
                        </Button>
                      ) : null}
                    </p>
                    {editing ? (
                      <BankQuestionFields
                        type={question.type}
                        stem={questions.find((item) => item.originalNumber === question.originalNumber)?.stem ?? ""}
                        options={
                          questions.find((item) => item.originalNumber === question.originalNumber)
                            ?.options
                        }
                        answer={answer}
                        disabled={busy}
                        onChange={(next) => {
                          setQuestions((current) =>
                            current.map((item) =>
                              item.originalNumber === question.originalNumber
                                ? { ...item, stem: next.stem, options: next.options }
                                : item,
                            ),
                          );
                          setAnswerKey((current) => ({
                            ...current,
                            [String(question.originalNumber)]: next.answer,
                          }));
                        }}
                      />
                    ) : (
                      <div className="space-y-2">
                        <MathText className="font-exam text-sm leading-7" text={question.stem} />
                        {isMcq(question.type) && question.options
                          ? OPTION_LETTERS.map((letter) => (
                              <p
                                key={letter}
                                className={cn(
                                  "flex items-start gap-2 text-sm",
                                  letter === answer
                                    ? "font-medium text-emerald-700"
                                    : "text-muted-foreground",
                                )}
                              >
                                <span>{letter}.</span>
                                <MathText inline className="flex-1" text={question.options?.[letter] ?? ""} />
                              </p>
                            ))
                          : null}
                        <p className="text-sm">
                          Đáp án:{" "}
                          <MathText inline className="font-medium text-primary" text={answer} />
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </CardContent>
      ) : null}
    </Card>
  );
}
