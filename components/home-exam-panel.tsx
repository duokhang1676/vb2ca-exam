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
import { Label } from "@/components/ui/label";
import { EXAM_SPECS, sectionModeLabel } from "@/lib/exam/constants";
import type { ExamCode, SampleExamOption, SectionMode } from "@/lib/exam/types";
import { cn } from "@/lib/utils";

const OFFICIAL_SAMPLE_VALUE = "official";

function sampleValue(sample: SampleExamOption): string {
  return sample.id ?? OFFICIAL_SAMPLE_VALUE;
}

export function HomeExamPanel({
  signedIn,
  samples,
}: {
  signedIn: boolean;
  samples: Record<ExamCode, SampleExamOption[]>;
}) {
  const router = useRouter();
  const [examCode, setExamCode] = useState<ExamCode>("CA1");
  const [selectedByCode, setSelectedByCode] = useState<Record<ExamCode, string>>(
    {
      CA1: samples.CA1[0] ? sampleValue(samples.CA1[0]) : OFFICIAL_SAMPLE_VALUE,
      CA4: samples.CA4[0] ? sampleValue(samples.CA4[0]) : OFFICIAL_SAMPLE_VALUE,
    },
  );
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [sampling, setSampling] = useState(false);
  const [sectionMode, setSectionMode] = useState<SectionMode>("full");
  const [shuffleSample, setShuffleSample] = useState(false);
  const [showTopic, setShowTopic] = useState(false);

  const options = samples[examCode];
  const selectedId =
    selectedByCode[examCode] ??
    (options[0] ? sampleValue(options[0]) : OFFICIAL_SAMPLE_VALUE);

  async function postExam(
    url: string,
    extra?: { examId?: string; shuffle?: boolean },
  ) {
    const { shuffle, ...createBody } = extra ?? {};
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ examCode, sectionMode, ...createBody }),
    });
    if (response.status === 401) {
      router.push("/login?next=/");
      throw new Error("Cần đăng nhập để tạo bài làm.");
    }
    const data = (await response.json()) as { examId?: string; error?: string };
    if (!response.ok || !data.examId) {
      throw new Error(data.error || "Không tạo được đề.");
    }

    const startResponse = await fetch(`/api/exams/${data.examId}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sectionMode,
        showTopic,
        ...(shuffle !== undefined ? { shuffle } : {}),
      }),
    });
    if (startResponse.status === 401) {
      router.push("/login?next=/");
      throw new Error("Cần đăng nhập để bắt đầu bài thi.");
    }
    const startData = (await startResponse.json()) as {
      attemptId?: string;
      error?: string;
    };
    if (!startResponse.ok || !startData.attemptId) {
      throw new Error(startData.error || "Không bắt đầu được bài thi.");
    }
    router.push(`/attempts/${startData.attemptId}`);
  }

  const spec = EXAM_SPECS[examCode];
  const busy = generating || sampling;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tạo bài làm</CardTitle>
        <CardDescription>
          Chọn mã đề và phạm vi làm bài. Hệ thống lấy ngẫu nhiên 1 câu nghị luận
          và phần 2 từ ngân hàng ({spec.independentMcq} trắc nghiệm +{" "}
          {spec.clusters} cụm × {spec.clusterSize} + {spec.fill} điền,{" "}
          {spec.total} câu). Hoặc chọn một đề minh họa có sẵn. Toàn bộ 150 phút;
          chỉ phần 1: 50 phút; chỉ phần 2: 100 phút.
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
        <div className="grid gap-2">
          <Label>Phạm vi làm bài</Label>
          <div className="grid gap-2 sm:grid-cols-3">
            {(["full", "part1", "part2"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                disabled={busy}
                onClick={() => setSectionMode(mode)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-left text-sm",
                  sectionMode === mode
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border text-muted-foreground",
                )}
              >
                {sectionModeLabel(mode)}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-2">
          <Label>Dạng câu hỏi</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => setShowTopic(false)}
              className={cn(
                "rounded-lg border px-3 py-2 text-left text-sm",
                !showTopic
                  ? "border-primary bg-primary/5 text-foreground"
                  : "border-border text-muted-foreground",
              )}
            >
              Ẩn dạng câu hỏi
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setShowTopic(true)}
              className={cn(
                "rounded-lg border px-3 py-2 text-left text-sm",
                showTopic
                  ? "border-primary bg-primary/5 text-foreground"
                  : "border-border text-muted-foreground",
              )}
            >
              Hiển thị dạng câu hỏi
            </button>
          </div>
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
          <div className="grid gap-3">
            <Button
              disabled={busy}
              onClick={async () => {
                setError(null);
                setGenerating(true);
                try {
                  await postExam("/api/exams/generate");
                } catch (err) {
                  setError(
                    err instanceof Error ? err.message : "Lỗi không xác định.",
                  );
                } finally {
                  setGenerating(false);
                }
              }}
            >
              {generating ? <LoaderCircle className="animate-spin" /> : null}
              {generating ? "Đang soạn đề..." : "Tạo bài làm"}
            </Button>
            <div className="grid gap-2">
              <Label htmlFor="sample-exam">Đề minh họa</Label>
              <select
                id="sample-exam"
                disabled={busy}
                value={selectedId}
                onChange={(event) =>
                  setSelectedByCode((current) => ({
                    ...current,
                    [examCode]: event.target.value,
                  }))
                }
                className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
              >
                {options.map((sample) => (
                  <option key={sampleValue(sample)} value={sampleValue(sample)}>
                    {sample.title}
                  </option>
                ))}
              </select>
              <Label>Thứ tự câu hỏi</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setShuffleSample(false)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-left text-sm",
                    !shuffleSample
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-border text-muted-foreground",
                  )}
                >
                  Giữ thứ tự file
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setShuffleSample(true)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-left text-sm",
                    shuffleSample
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-border text-muted-foreground",
                  )}
                >
                  Trộn đề
                </button>
              </div>
              <Button
                variant="outline"
                disabled={busy}
                onClick={async () => {
                  setError(null);
                  setSampling(true);
                  try {
                    await postExam("/api/exams/sample", {
                      examId: selectedId,
                      shuffle: shuffleSample,
                    });
                  } catch (err) {
                    setError(
                      err instanceof Error ? err.message : "Lỗi không xác định.",
                    );
                  } finally {
                    setSampling(false);
                  }
                }}
              >
                {sampling ? <LoaderCircle className="animate-spin" /> : null}
                {sampling ? "Đang tải đề minh họa..." : "Dùng đề minh họa"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
