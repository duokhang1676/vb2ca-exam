"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EXAM_SPECS } from "@/lib/exam/constants";
import type { ExamCode } from "@/lib/exam/types";
import { cn } from "@/lib/utils";

export function HomeExamPanel({ signedIn }: { signedIn: boolean }) {
  const router = useRouter();
  const [examCode, setExamCode] = useState<ExamCode>("CA1");
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [sampling, setSampling] = useState(false);

  async function postExam(url: string) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ examCode }),
    });
    if (response.status === 401) {
      router.push("/login?next=/");
      throw new Error("Cần đăng nhập để tạo bài làm.");
    }
    const data = (await response.json()) as { examId?: string; error?: string };
    if (!response.ok || !data.examId) {
      throw new Error(data.error || "Không tạo được đề.");
    }
    router.push(`/exams/${data.examId}`);
  }

  const spec = EXAM_SPECS[examCode];
  const busy = generating || sampling;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tạo bài làm</CardTitle>
        <CardDescription>
          Chọn mã đề, hệ thống lấy ngẫu nhiên 1 câu nghị luận và phần 2 từ ngân
          hàng ({spec.independentMcq} trắc nghiệm + {spec.clusters} cụm ×{" "}
          {spec.clusterSize} + {spec.fill} điền, {spec.total} câu).
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
          {(["CA1", "CA4"] as const).map((code) => (
            <button
              key={code}
              type="button"
              disabled={busy}
              onClick={() => setExamCode(code)}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium",
                examCode === code
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground",
              )}
            >
              {code}
            </button>
          ))}
        </div>
        {error ? (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {!signedIn ? (
          <Button asChild>
            <Link href="/login?next=/">Đăng nhập để tạo bài làm</Link>
          </Button>
        ) : (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            className="sm:flex-1"
            disabled={busy}
            onClick={async () => {
              setError(null);
              setGenerating(true);
              try {
                await postExam("/api/exams/generate");
              } catch (err) {
                setError(err instanceof Error ? err.message : "Lỗi không xác định.");
              } finally {
                setGenerating(false);
              }
            }}
          >
            {generating ? <LoaderCircle className="animate-spin" /> : null}
            {generating ? "Đang soạn đề..." : "Tạo bài làm"}
          </Button>
          <Button
            variant="outline"
            className="sm:flex-1"
            disabled={busy}
            onClick={async () => {
              setError(null);
              setSampling(true);
              try {
                await postExam("/api/exams/sample");
              } catch (err) {
                setError(err instanceof Error ? err.message : "Lỗi không xác định.");
              } finally {
                setSampling(false);
              }
            }}
          >
            {sampling ? <LoaderCircle className="animate-spin" /> : null}
            {sampling ? "Đang tải đề minh họa..." : "Dùng đề minh họa 2026"}
          </Button>
        </div>
        )}
      </CardContent>
    </Card>
  );
}
