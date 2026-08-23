"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import {
  alertFromApiError,
  ContributeAlert,
  type ContributeAlertPayload,
} from "@/components/contribute-alert";
import { COMMIT_STEPS, ContributeProgress } from "@/components/contribute-progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { OPTION_LETTERS } from "@/lib/exam/constants";
import type {
  ContributionDraftPayload,
  DraftEssayItem,
  DraftQuestionItem,
  EssayDraftPayload,
  QuestionDraftPayload,
} from "@/lib/exam/draft-types";

export function ContributeReview({ draftId }: { draftId: string }) {
  const router = useRouter();
  const [payload, setPayload] = useState<ContributionDraftPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState<ContributeAlertPayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const response = await fetch(`/api/bank/drafts/${draftId}`);
      const data = (await response.json()) as {
        payload?: ContributionDraftPayload;
        error?: string;
        title?: string;
        steps?: string[];
      };
      if (cancelled) return;
      if (!response.ok || !data.payload) {
        setAlert(alertFromApiError(data));
        setLoading(false);
        return;
      }
      setPayload(data.payload);
      setLoading(false);
    }
    load().catch(() => {
      if (!cancelled) {
        setAlert({
          tone: "error",
          title: "Không tải được bản review",
          message: "Thử tải lại trang hoặc nạp file mới từ trang chủ.",
        });
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [draftId]);

  async function commit() {
    if (!payload) return;
    setBusy(true);
    setAlert(null);
    try {
      const response = await fetch("/api/bank/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId, payload }),
      });
      const data = (await response.json()) as {
        added?: number;
        skipped?: number;
        error?: string;
        title?: string;
        steps?: string[];
      };
      if (!response.ok) {
        setAlert(alertFromApiError(data));
        setBusy(false);
        return;
      }
      const added = data.added ?? 0;
      const skipped = data.skipped ?? 0;
      router.push(
        `/bank?added=${added}&skipped=${skipped}`,
      );
    } catch {
      setAlert({
        tone: "error",
        title: "Không nạp được ngân hàng",
        message: "Mất kết nối khi xác nhận. Thử lại.",
      });
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <LoaderCircle className="animate-spin" /> Đang tải câu đã OCR...
      </div>
    );
  }

  if (!payload) {
    return alert ? <ContributeAlert {...alert} /> : null;
  }

  const keepCount =
    payload.kind === "essay"
      ? payload.items.filter((item) => item.keep).length
      : payload.items.filter((item) => item.keep).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Review câu đã trích xuất</h1>
          <p className="text-sm text-muted-foreground">
            Sửa chỗ OCR sai, bỏ câu không muốn nạp, rồi xác nhận. Câu đánh dấu trùng có thể đã có
            trong ngân hàng.
          </p>
        </div>
        <Button onClick={commit} disabled={busy || keepCount === 0}>
          {busy ? <LoaderCircle className="animate-spin" /> : null}
          {busy ? "Đang nạp..." : `Xác nhận nạp (${keepCount})`}
        </Button>
      </div>
      <ContributeProgress active={busy} steps={COMMIT_STEPS} />
      {alert ? <ContributeAlert {...alert} /> : null}
      {payload.kind === "essay" ? (
        <EssayReview
          payload={payload}
          onChange={setPayload}
          disabled={busy}
        />
      ) : (
        <QuestionReview
          payload={payload}
          onChange={setPayload}
          disabled={busy}
        />
      )}
    </div>
  );
}

function EssayReview({
  payload,
  onChange,
  disabled,
}: {
  payload: EssayDraftPayload;
  onChange: (payload: ContributionDraftPayload) => void;
  disabled: boolean;
}) {
  function update(id: string, patch: Partial<DraftEssayItem>) {
    onChange({
      ...payload,
      items: payload.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    });
  }

  return (
    <div className="grid gap-3">
      {payload.items.map((item, index) => (
        <Card key={item.id} className={item.keep ? undefined : "opacity-60"}>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">Đề {index + 1}</CardTitle>
            <div className="flex items-center gap-2">
              {item.duplicate ? <Badge variant="outline">Có thể trùng</Badge> : null}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={item.keep}
                  disabled={disabled}
                  onChange={(event) => update(item.id, { keep: event.target.checked })}
                />
                Giữ
              </label>
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              value={item.prompt}
              disabled={disabled || !item.keep}
              className="min-h-40 font-exam text-base"
              onChange={(event) => update(item.id, { prompt: event.target.value })}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function QuestionReview({
  payload,
  onChange,
  disabled,
}: {
  payload: QuestionDraftPayload;
  onChange: (payload: ContributionDraftPayload) => void;
  disabled: boolean;
}) {
  function update(id: string, patch: Partial<DraftQuestionItem>) {
    onChange({
      ...payload,
      items: payload.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    });
  }

  function dropCluster(clusterId: string) {
    onChange({
      ...payload,
      items: payload.items.map((item) =>
        item.clusterId === clusterId ? { ...item, keep: false } : item,
      ),
    });
  }

  const clusters = new Map<string, DraftQuestionItem[]>();
  const standalone: DraftQuestionItem[] = [];
  for (const item of payload.items) {
    if (item.clusterId) {
      const list = clusters.get(item.clusterId) ?? [];
      list.push(item);
      clusters.set(item.clusterId, list);
    } else {
      standalone.push(item);
    }
  }

  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground">
        File {payload.sourceFilename} · Đáp án {payload.answerFilename} · {payload.examCode}
      </p>
      {[...clusters.entries()].map(([clusterId, members]) => (
        <Card key={clusterId}>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">
              {members[0]?.clusterHeader || "Cụm câu hỏi"}
            </CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => dropCluster(clusterId)}
            >
              Bỏ cả cụm
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2">
              <Label>Đoạn thông tin / tình huống</Label>
              <Textarea
                className="min-h-28 font-exam"
                disabled={disabled}
                value={members[0]?.passage ?? ""}
                onChange={(event) => {
                  const passage = event.target.value;
                  onChange({
                    ...payload,
                    items: payload.items.map((item) =>
                      item.clusterId === clusterId ? { ...item, passage } : item,
                    ),
                  });
                }}
              />
            </div>
            {members.map((item) => (
              <QuestionEditor
                key={item.id}
                item={item}
                disabled={disabled}
                onChange={(patch) => update(item.id, patch)}
              />
            ))}
          </CardContent>
        </Card>
      ))}
      {standalone.map((item) => (
        <QuestionEditor
          key={item.id}
          item={item}
          disabled={disabled}
          onChange={(patch) => update(item.id, patch)}
          card
        />
      ))}
    </div>
  );
}

function QuestionEditor({
  item,
  disabled,
  onChange,
  card,
}: {
  item: DraftQuestionItem;
  disabled: boolean;
  onChange: (patch: Partial<DraftQuestionItem>) => void;
  card?: boolean;
}) {
  const body = (
    <div className={`space-y-3 ${item.keep ? "" : "opacity-60"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium">
          Câu {item.originalNumber}
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            {item.type === "mcq" ? "Trắc nghiệm" : "Điền đáp án"}
          </span>
        </p>
        <div className="flex items-center gap-2">
          {item.duplicate ? <Badge variant="outline">Có thể trùng</Badge> : null}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={item.keep}
              disabled={disabled}
              onChange={(event) => onChange({ keep: event.target.checked })}
            />
            Giữ
          </label>
        </div>
      </div>
      <div className="grid gap-2">
        <Label>Đề bài</Label>
        <Textarea
          className="font-exam"
          disabled={disabled || !item.keep}
          value={item.stem}
          onChange={(event) => onChange({ stem: event.target.value })}
        />
      </div>
      {item.type === "mcq" ? (
        <div className="grid gap-2">
          {OPTION_LETTERS.map((letter) => (
            <div key={letter} className="flex items-center gap-2">
              <span className="w-6 font-exam font-medium">{letter}.</span>
              <Input
                className="font-exam"
                disabled={disabled || !item.keep}
                value={item.options?.[letter] ?? ""}
                onChange={(event) =>
                  onChange({
                    options: {
                      A: item.options?.A ?? "",
                      B: item.options?.B ?? "",
                      C: item.options?.C ?? "",
                      D: item.options?.D ?? "",
                      [letter]: event.target.value,
                    },
                  })
                }
              />
            </div>
          ))}
        </div>
      ) : null}
      <div className="grid max-w-md gap-2">
        <Label>Đáp án</Label>
        <Input
          className="font-exam"
          disabled={disabled || !item.keep}
          value={item.answer}
          onChange={(event) => onChange({ answer: event.target.value })}
        />
      </div>
    </div>
  );

  if (!card) return <div className="rounded-lg border p-3">{body}</div>;
  return (
    <Card>
      <CardContent className="pt-4">{body}</CardContent>
    </Card>
  );
}
