"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import {
  isAttemptMode,
  isSectionMode,
  type AttemptMode,
  type SectionMode,
} from "@/lib/exam/types";

const startedKeys = new Set<string>();

export function AutoStartExam({
  examId,
  sectionMode = "full",
  shuffle = true,
  attemptMode = "exam",
}: {
  examId: string;
  sectionMode?: SectionMode;
  shuffle?: boolean;
  attemptMode?: AttemptMode;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const mode = isSectionMode(sectionMode) ? sectionMode : "full";
  const startMode = isAttemptMode(attemptMode) ? attemptMode : "exam";

  useEffect(() => {
    const key = `${examId}:${mode}:${shuffle}:${startMode}`;
    if (startedKeys.has(key)) return;
    startedKeys.add(key);

    async function start() {
      try {
        const response = await fetch(`/api/exams/${examId}/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sectionMode: mode,
            shuffle,
            attemptMode: startMode,
          }),
        });
        if (response.status === 401) {
          startedKeys.delete(key);
          router.push("/login");
          throw new Error("Cần đăng nhập để bắt đầu bài thi.");
        }
        const data = (await response.json()) as {
          attemptId?: string;
          error?: string;
        };
        if (!response.ok || !data.attemptId) {
          startedKeys.delete(key);
          throw new Error(data.error || "Không bắt đầu được bài thi.");
        }
        router.replace(`/attempts/${data.attemptId}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Lỗi không xác định.");
      }
    }

    void start();
  }, [examId, mode, router, shuffle, startMode]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : (
        <>
          <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Đang vào bài làm...</p>
        </>
      )}
    </div>
  );
}
