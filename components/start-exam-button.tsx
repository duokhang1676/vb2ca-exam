"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function StartExamButton({ examId }: { examId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setError(null);
    setLoading(true);
    try {
      const response = await fetch(`/api/exams/${examId}/start`, {
        method: "POST",
      });
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
        {loading ? "Đang tạo đề đảo..." : "Bắt đầu làm bài (150 phút)"}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
