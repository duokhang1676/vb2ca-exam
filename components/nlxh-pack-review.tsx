"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ContributeAlert } from "@/components/contribute-alert";
import { QUESTION_TYPE_LABELS, type QuestionType } from "@/lib/nlxh/types";

type DraftItem = {
  essayFingerprint: string;
  questionType: QuestionType;
  coreIssue: string;
  seedCount: number;
  hasReference: boolean;
};

export function NlxhPackReview({ draftId }: { draftId: string }) {
  const router = useRouter();
  const [items, setItems] = useState<DraftItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/nlxh/packs/drafts/${draftId}`)
      .then((response) => response.json())
      .then((data: { items?: DraftItem[]; error?: string }) => {
        if (data.error) setError(data.error);
        else setItems(data.items ?? []);
      })
      .catch(() => setError("Không tải được bản xem trước."));
  }, [draftId]);

  async function commit() {
    setBusy(true);
    const response = await fetch("/api/nlxh/packs/commit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draftId }),
    });
    const data = (await response.json()) as { error?: string; added?: number };
    setBusy(false);
    if (!response.ok) {
      setError(data.error || "Không nạp được.");
      return;
    }
    router.push("/nlxh/packs");
  }

  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <h1 className="text-2xl font-semibold">Xem trước gói NLXH</h1>
      {error ? <ContributeAlert tone="error" message={error} /> : null}
      {items.map((item) => (
        <Card key={item.essayFingerprint}>
          <CardHeader>
            <CardTitle>{QUESTION_TYPE_LABELS[item.questionType]}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p>{item.coreIssue}</p>
            <p className="mt-2 text-muted-foreground">
              {item.seedCount} seed{item.hasReference ? " · có bài mẫu" : ""}
            </p>
          </CardContent>
        </Card>
      ))}
      <Button onClick={commit} disabled={busy || items.length === 0}>
        {busy ? "Đang nạp..." : "Nạp vào ngân hàng dùng chung"}
      </Button>
    </div>
  );
}
