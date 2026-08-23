"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  BankEssayFields,
  BankPassageFields,
  BankQuestionFields,
  EditToolbar,
  useBankSave,
} from "@/components/bank-item-editor";
import { MathText } from "@/components/math-text";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CLUSTER_HEADER_TEMPLATES,
  OPTION_LETTERS,
  formatRangeHeader,
  questionTypeLabel,
} from "@/lib/exam/constants";
import {
  isMcq,
  type ClusterKind,
  type ExamCode,
  type McqOptions,
  type QuestionType,
} from "@/lib/exam/types";
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
  clusterId: string | null;
  clusterPosition: number | null;
};

export type BankClusterView = {
  id: string;
  examCode: ExamCode;
  kind: ClusterKind;
  passage: string;
  questions: BankQuestionView[];
};

type Tab = "essay" | ExamCode;

export function QuestionBank({
  essays,
  questions,
  clusters,
  signedIn,
}: {
  essays: BankEssayView[];
  questions: BankQuestionView[];
  clusters: BankClusterView[];
  signedIn: boolean;
}) {
  const [essayItems, setEssayItems] = useState(essays);
  const [questionItems, setQuestionItems] = useState(questions);
  const [clusterItems, setClusterItems] = useState(clusters);
  const [tab, setTab] = useState<Tab>("essay");
  const counts = useMemo(
    () => ({
      essay: essayItems.length,
      CA1: questionItems.filter((item) => item.examCode === "CA1").length,
      CA4: questionItems.filter((item) => item.examCode === "CA4").length,
    }),
    [essayItems.length, questionItems],
  );
  const standalone = questionItems.filter(
    (item) => item.examCode === tab && !item.clusterId,
  );
  const visibleClusters = clusterItems.filter((item) => item.examCode === tab);

  function handleEssaySaved(updated: BankEssayView) {
    setEssayItems((current) =>
      current.map((item) => (item.id === updated.id ? updated : item)),
    );
  }

  function handleQuestionSaved(updated: BankQuestionView) {
    setQuestionItems((current) =>
      current.map((item) => (item.id === updated.id ? updated : item)),
    );
    setClusterItems((current) =>
      current.map((cluster) => ({
        ...cluster,
        questions: cluster.questions.map((item) =>
          item.id === updated.id ? updated : item,
        ),
      })),
    );
  }

  function handleClusterSaved(updated: BankClusterView) {
    setClusterItems((current) =>
      current.map((item) =>
        item.id === updated.id ? { ...item, passage: updated.passage } : item,
      ),
    );
  }

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
              />
            ))}
          </div>
        )
      ) : standalone.length === 0 && visibleClusters.length === 0 ? (
        <Empty text={`Chưa có câu hỏi mã ${tab}.`} />
      ) : (
        <div className="grid gap-4">
          {visibleClusters.map((cluster, index) => (
            <ClusterCard
              key={cluster.id}
              cluster={cluster}
              index={index}
              signedIn={signedIn}
              onClusterSaved={handleClusterSaved}
              onQuestionSaved={handleQuestionSaved}
            />
          ))}
          {standalone.map((question, index) => (
            <StandaloneQuestionCard
              key={question.id}
              question={question}
              index={index}
              signedIn={signedIn}
              onSaved={handleQuestionSaved}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EssayCard({
  essay,
  index,
  signedIn,
  onSaved,
}: {
  essay: BankEssayView;
  index: number;
  signedIn: boolean;
  onSaved: (essay: BankEssayView) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [prompt, setPrompt] = useState(essay.prompt);
  const { busy, alertNode, setAlert, save } = useBankSave();

  async function onSave() {
    const data = await save<{ prompt: string }>(() =>
      fetch(`/api/bank/essays/${essay.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      }),
    );
    if (!data) return;
    onSaved({ ...essay, prompt: data.prompt });
    setEditing(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="flex flex-wrap items-center gap-2">
            <span>NL-{essay.id.slice(0, 8).toUpperCase()}</span>
            <Badge variant="secondary">Nghị luận {index + 1}</Badge>
          </span>
          <EditToolbar
            signedIn={signedIn}
            editing={editing}
            busy={busy}
            onEdit={() => {
              setPrompt(essay.prompt);
              setAlert(null);
              setEditing(true);
            }}
            onCancel={() => {
              setPrompt(essay.prompt);
              setAlert(null);
              setEditing(false);
            }}
            onSave={onSave}
          />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {alertNode}
        {editing ? (
          <BankEssayFields prompt={prompt} disabled={busy} onChange={setPrompt} />
        ) : (
          <MathText className="text-sm leading-7" text={essay.prompt} />
        )}
      </CardContent>
    </Card>
  );
}

function StandaloneQuestionCard({
  question,
  index,
  signedIn,
  onSaved,
}: {
  question: BankQuestionView;
  index: number;
  signedIn: boolean;
  onSaved: (question: BankQuestionView) => void;
}) {
  return (
    <Card>
      <QuestionEditBlock
        question={question}
        signedIn={signedIn}
        onSaved={onSaved}
        title={
          <>
            <span>
              {question.examCode}-{question.id.slice(0, 8).toUpperCase()}
            </span>
            <Badge variant="secondary">Câu {index + 1}</Badge>
            <Badge variant="outline">{questionTypeLabel(question.type)}</Badge>
          </>
        }
      />
    </Card>
  );
}

function ClusterCard({
  cluster,
  index,
  signedIn,
  onClusterSaved,
  onQuestionSaved,
}: {
  cluster: BankClusterView;
  index: number;
  signedIn: boolean;
  onClusterSaved: (cluster: BankClusterView) => void;
  onQuestionSaved: (question: BankQuestionView) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [passage, setPassage] = useState(cluster.passage);
  const { busy, alertNode, setAlert, save } = useBankSave();

  async function onSave() {
    const data = await save<{ passage: string }>(() =>
      fetch(`/api/bank/clusters/${cluster.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passage }),
      }),
    );
    if (!data) return;
    onClusterSaved({ ...cluster, passage: data.passage });
    setEditing(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="flex flex-wrap items-center gap-2">
            <span>
              {cluster.examCode}-CUM-{cluster.id.slice(0, 8).toUpperCase()}
            </span>
            <Badge variant="secondary">Cụm {index + 1}</Badge>
            <Badge variant="outline">
              {cluster.kind === "situation" ? "Tình huống" : "Thông tin"} ·{" "}
              {cluster.questions.length} câu
            </Badge>
          </span>
          <EditToolbar
            signedIn={signedIn}
            editing={editing}
            busy={busy}
            onEdit={() => {
              setPassage(cluster.passage);
              setAlert(null);
              setEditing(true);
            }}
            onCancel={() => {
              setPassage(cluster.passage);
              setAlert(null);
              setEditing(false);
            }}
            onSave={onSave}
          />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {alertNode}
        <p className="font-exam text-sm font-medium">
          {formatRangeHeader(
            CLUSTER_HEADER_TEMPLATES[cluster.kind],
            1,
            cluster.questions.length || 3,
          )}
        </p>
        {editing ? (
          <BankPassageFields passage={passage} disabled={busy} onChange={setPassage} />
        ) : (
          <MathText
            className="font-exam rounded-lg bg-muted/50 p-3 text-sm leading-7"
            text={cluster.passage}
          />
        )}
        {cluster.questions.map((question, questionIndex) => (
          <div key={question.id} className="rounded-lg border p-3">
            <QuestionEditBlock
              question={question}
              signedIn={signedIn}
              onSaved={onQuestionSaved}
              compact
              title={
                <span className="text-xs font-medium text-muted-foreground">
                  Câu {questionIndex + 1}
                </span>
              }
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function QuestionEditBlock({
  question,
  signedIn,
  onSaved,
  title,
  compact,
}: {
  question: BankQuestionView;
  signedIn: boolean;
  onSaved: (question: BankQuestionView) => void;
  title: ReactNode;
  compact?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    stem: question.stem,
    options: question.options,
    answer: question.answer,
  });
  const { busy, alertNode, setAlert, save } = useBankSave();

  async function onSave() {
    const data = await save<{
      stem: string;
      options?: McqOptions;
      answer: string;
    }>(() =>
      fetch(`/api/bank/questions/${question.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      }),
    );
    if (!data) return;
    onSaved({
      ...question,
      stem: data.stem,
      options: data.options,
      answer: data.answer,
    });
    setEditing(false);
  }

  const toolbar = (
    <EditToolbar
      signedIn={signedIn}
      editing={editing}
      busy={busy}
      onEdit={() => {
        setDraft({
          stem: question.stem,
          options: question.options,
          answer: question.answer,
        });
        setAlert(null);
        setEditing(true);
      }}
      onCancel={() => {
        setDraft({
          stem: question.stem,
          options: question.options,
          answer: question.answer,
        });
        setAlert(null);
        setEditing(false);
      }}
      onSave={onSave}
    />
  );

  const body = editing ? (
    <BankQuestionFields
      type={question.type}
      stem={draft.stem}
      options={draft.options}
      answer={draft.answer}
      disabled={busy}
      onChange={(next) =>
        setDraft({
          stem: next.stem,
          options: next.options,
          answer: next.answer,
        })
      }
    />
  ) : (
    <QuestionBody question={question} />
  );

  if (compact) {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {title}
          {toolbar}
        </div>
        {alertNode}
        {body}
      </div>
    );
  }

  return (
    <>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="flex flex-wrap items-center gap-2">{title}</span>
          {toolbar}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {alertNode}
        {body}
      </CardContent>
    </>
  );
}

function QuestionBody({ question }: { question: BankQuestionView }) {
  return (
    <div className="space-y-3">
      <MathText className="font-exam text-sm leading-7" text={question.stem} />
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
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground">{text}</p>;
}
