"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  BankEssayFields,
  BankPassageFields,
  BankQuestionFields,
  EditToolbar,
  useBankSave,
} from "@/components/bank-item-editor";
import { SampleExamBank, type BankSampleView } from "@/components/sample-exam-bank";
import { MathText } from "@/components/math-text";
import { SolutionReveal, TopicBadge } from "@/components/question-meta";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  fingerprint: string;
  title?: string;
  topic?: string;
  solution?: string;
  marked?: boolean;
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
  fingerprint: string;
  topic?: string;
  solution?: string;
  marked?: boolean;
};

export type BankClusterView = {
  id: string;
  examCode: ExamCode;
  kind: ClusterKind;
  passage: string;
  questions: BankQuestionView[];
};

type Tab = "essay" | ExamCode | "sample";

export function QuestionBank({
  essays,
  questions,
  clusters,
  samples,
  signedIn,
  initialTab = "essay",
  initialExamCode = "CA1",
}: {
  essays: BankEssayView[];
  questions: BankQuestionView[];
  clusters: BankClusterView[];
  samples: BankSampleView[];
  signedIn: boolean;
  initialTab?: Tab;
  initialExamCode?: ExamCode;
}) {
  const router = useRouter();
  const [essayItems, setEssayItems] = useState(essays);
  const [questionItems, setQuestionItems] = useState(questions);
  const [clusterItems, setClusterItems] = useState(clusters);
  const [tab, setTab] = useState<Tab>(initialTab);
  const [examCode, setExamCode] = useState<ExamCode>(initialExamCode);
  const visibleSamples = useMemo(
    () => samples.filter((sample) => sample.examCode === examCode),
    [samples, examCode],
  );
  const counts = useMemo(
    () => ({
      essay: essayItems.length,
      CA1: questionItems.filter((item) => item.examCode === "CA1").length,
      CA4: questionItems.filter((item) => item.examCode === "CA4").length,
      sample: visibleSamples.length,
    }),
    [essayItems.length, questionItems, visibleSamples.length],
  );

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

  function handleEssayDeleted(id: string) {
    setEssayItems((current) => current.filter((item) => item.id !== id));
  }

  function handleQuestionDeleted(info: {
    id: string;
    clusterId: string | null;
    clusterRemoved: boolean;
  }) {
    setQuestionItems((current) => current.filter((item) => item.id !== info.id));
    if (info.clusterRemoved && info.clusterId) {
      setClusterItems((current) =>
        current.filter((item) => item.id !== info.clusterId),
      );
      return;
    }
    if (info.clusterId) {
      setClusterItems((current) =>
        current.map((cluster) =>
          cluster.id === info.clusterId
            ? {
                ...cluster,
                questions: cluster.questions.filter((item) => item.id !== info.id),
              }
            : cluster,
        ),
      );
    }
  }

  function handleClusterDeleted(id: string) {
    setClusterItems((current) => current.filter((item) => item.id !== id));
    setQuestionItems((current) =>
      current.filter((item) => item.clusterId !== id),
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
      ) : tab === "sample" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(["CA1", "CA4"] as const).map((code) => (
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
                {code}
              </button>
            ))}
          </div>
          <SampleExamBank
            key={examCode}
            samples={visibleSamples}
            examCode={examCode}
            signedIn={signedIn}
          />
        </div>
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
              onClusterDeleted={handleClusterDeleted}
              onQuestionDeleted={handleQuestionDeleted}
            />
          ))}
          {standalone.map((question, index) => (
            <StandaloneQuestionCard
              key={question.id}
              question={question}
              index={index}
              signedIn={signedIn}
              onSaved={handleQuestionSaved}
              onDeleted={handleQuestionDeleted}
            />
          ))}
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

function StandaloneQuestionCard({
  question,
  index,
  signedIn,
  onSaved,
  onDeleted,
}: {
  question: BankQuestionView;
  index: number;
  signedIn: boolean;
  onSaved: (question: BankQuestionView) => void;
  onDeleted: (info: {
    id: string;
    clusterId: string | null;
    clusterRemoved: boolean;
  }) => void;
}) {
  return (
    <Card>
      <QuestionEditBlock
        question={question}
        signedIn={signedIn}
        onSaved={onSaved}
        onDeleted={onDeleted}
        title={
          <>
            <span>
              {question.examCode}-{question.id.slice(0, 8).toUpperCase()}
            </span>
            <Badge variant="secondary">Câu {index + 1}</Badge>
            <Badge variant="outline">{questionTypeLabel(question.type)}</Badge>
            <TopicBadge topic={question.topic} />
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
  onClusterDeleted,
  onQuestionDeleted,
}: {
  cluster: BankClusterView;
  index: number;
  signedIn: boolean;
  onClusterSaved: (cluster: BankClusterView) => void;
  onQuestionSaved: (question: BankQuestionView) => void;
  onClusterDeleted: (id: string) => void;
  onQuestionDeleted: (info: {
    id: string;
    clusterId: string | null;
    clusterRemoved: boolean;
  }) => void;
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

  async function onDelete() {
    if (!window.confirm("Xóa cả cụm và các câu trong cụm khỏi ngân hàng?")) return;
    const data = await save<{ ok?: boolean }>(() =>
      fetch(`/api/bank/clusters/${cluster.id}`, { method: "DELETE" }),
    );
    if (!data) return;
    onClusterDeleted(cluster.id);
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
            onDelete={onDelete}
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
              onDeleted={onQuestionDeleted}
              compact
              title={
                <span className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
                  <span>Câu {questionIndex + 1}</span>
                  <TopicBadge topic={question.topic} />
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
  onDeleted,
  title,
  compact,
}: {
  question: BankQuestionView;
  signedIn: boolean;
  onSaved: (question: BankQuestionView) => void;
  onDeleted?: (info: {
    id: string;
    clusterId: string | null;
    clusterRemoved: boolean;
  }) => void;
  title: ReactNode;
  compact?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    stem: question.stem,
    options: question.options,
    answer: question.answer,
    topic: question.topic ?? "",
    solution: question.solution ?? "",
  });
  const { busy, alertNode, setAlert, save } = useBankSave();

  async function onSave() {
    const data = await save<{
      stem: string;
      options?: McqOptions;
      answer: string;
      topic: string | null;
      solution: string | null;
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
      topic: data.topic ?? undefined,
      solution: data.solution ?? undefined,
    });
    setEditing(false);
  }

  async function onDelete() {
    if (!window.confirm("Xóa câu hỏi này khỏi ngân hàng?")) return;
    const data = await save<{
      ok?: boolean;
      clusterId?: string | null;
      clusterRemoved?: boolean;
    }>(() => fetch(`/api/bank/questions/${question.id}`, { method: "DELETE" }));
    if (!data) return;
    onDeleted?.({
      id: question.id,
      clusterId: data.clusterId ?? question.clusterId,
      clusterRemoved: Boolean(data.clusterRemoved),
    });
  }

  async function onUnmark() {
    const data = await save<{ marked?: boolean }>(() =>
      fetch("/api/question-marks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "question",
          fingerprint: question.fingerprint,
          examCode: question.examCode,
          marked: false,
        }),
      }),
    );
    if (!data) return;
    onSaved({ ...question, marked: false });
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
          topic: question.topic ?? "",
          solution: question.solution ?? "",
        });
        setAlert(null);
        setEditing(true);
      }}
      onCancel={() => {
        setDraft({
          stem: question.stem,
          options: question.options,
          answer: question.answer,
          topic: question.topic ?? "",
          solution: question.solution ?? "",
        });
        setAlert(null);
        setEditing(false);
      }}
      onSave={onSave}
      onDelete={onDeleted ? onDelete : undefined}
    />
  );

  const body = editing ? (
    <BankQuestionFields
      type={question.type}
      stem={draft.stem}
      options={draft.options}
      answer={draft.answer}
      topic={draft.topic}
      solution={draft.solution}
      disabled={busy}
      onChange={(next) =>
        setDraft({
          stem: next.stem,
          options: next.options,
          answer: next.answer,
          topic: next.topic,
          solution: next.solution,
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
          <span className="flex flex-wrap items-center gap-2">
            {title}
            <MarkedBadge
              marked={question.marked}
              signedIn={signedIn}
              busy={busy}
              onUnmark={onUnmark}
            />
          </span>
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
          <span className="flex flex-wrap items-center gap-2">
            {title}
            <MarkedBadge
              marked={question.marked}
              signedIn={signedIn}
              busy={busy}
              onUnmark={onUnmark}
            />
          </span>
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
      <SolutionReveal solution={question.solution} />
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground">{text}</p>;
}
