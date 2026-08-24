"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { examDurationMs, sectionModeLabel } from "@/lib/exam/constants";
import { isSectionMode, type SectionMode } from "@/lib/exam/types";

export function StartExamButton({
  examId,
  sectionMode = "full",
}: {
  examId: string;
  sectionMode?: SectionMode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mode = isSectionMode(sectionMode) ? sectionMode : "full";
  const minutes = examDurationMs(mode) / 60000;

  async function start() {
    setError(null);
    setLoading(true);
    try {
      const response = await fetch(`/api/exams/${examId}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionMode: mode }),
      });
      if (response.status === 401) {
        router.push("/login");
        throw new Error("Cần đăng nhập để bắt đầu bài thi.");
      }
      const data = (await response.json()) as {
        attemptId?: string;
        error?: string;
      };
      if (!response.ok || !data.attemptId) {
        throw new Error(data.error || "Không bắt đầu được bài thi.");
      }
      router.push(`/attempts/${data.attemptId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button onClick={start} disabled={loading} size="lg">
        {loading ? <LoaderCircle className="animate-spin" /> : null}
        {loading ? "Đang tạo đề đảo..." : `Bắt đầu làm bài (${minutes} phút)`}
      </Button>
      <p className="text-xs text-muted-foreground">{sectionModeLabel(mode)}</p>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
