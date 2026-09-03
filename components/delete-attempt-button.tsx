"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoaderCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DeleteAttemptButton({
  attemptId,
  submitted,
}: {
  attemptId: string;
  submitted: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onDelete(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (busy) return;
    const ok = window.confirm(
      submitted
        ? "Xóa bài đã nộp? Điểm và chi tiết chấm sẽ mất, không hoàn tác được."
        : "Xóa bài đang làm? Bài này sẽ biến khỏi lịch sử.",
    );
    if (!ok) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/attempts/${attemptId}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Không xóa được bài làm.");
      }
      router.refresh();
    } catch (error) {
      setBusy(false);
      window.alert(error instanceof Error ? error.message : "Không xóa được bài làm.");
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={busy}
      onClick={onDelete}
      aria-label="Xóa bài làm"
    >
      {busy ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
      Xóa
    </Button>
  );
}
