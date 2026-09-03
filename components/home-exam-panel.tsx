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
import { EXAM_SPECS, attemptModeLabel, sectionModeLabel } from "@/lib/exam/constants";
import {
  type AttemptMode,
  type ExamCode,
  type SampleExamOption,
  type SectionMode,
  sectionModesForParts,
} from "@/lib/exam/types";
import { cn } from "@/lib/utils";

function sampleValue(sample: SampleExamOption): string {
  return sample.id ?? "";
}

function sampleLabel(sample: SampleExamOption): string {
  if (sample.hasPart1 && sample.hasPart2) return sample.title;
  if (sample.hasPart1) return `${sample.title} (phần 1)`;
  if (sample.hasPart2) return `${sample.title} (phần 2)`;
  return sample.title;
}

export type EssayOption = {
  id: string;
  title: string;
};

export function HomeExamPanel({
  signedIn,
  samples,
  essays,
  initialSectionMode = "full",
}: {
  signedIn: boolean;
  samples: Record<ExamCode, SampleExamOption[]>;
  essays: EssayOption[];
  initialSectionMode?: SectionMode;
}) {
  const router = useRouter();
  const [examCode, setExamCode] = useState<ExamCode>("CA1");
  const [essayId, setEssayId] = useState("");
  const [selectedByCode, setSelectedByCode] = useState<Record<ExamCode, string>>(
    {
      CA1: samples.CA1[0] ? sampleValue(samples.CA1[0]) : "",
      CA4: samples.CA4[0] ? sampleValue(samples.CA4[0]) : "",
    },
  );
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [sampling, setSampling] = useState(false);
  const [sectionMode, setSectionMode] = useState<SectionMode>(initialSectionMode);
  const [attemptMode, setAttemptMode] = useState<AttemptMode>("exam");
  const [shuffleSample, setShuffleSample] = useState(false);
  const [showTopic, setShowTopic] = useState(false);

  const options = samples[examCode];
  const selectedId =
    selectedByCode[examCode] ??
    (options[0] ? sampleValue(options[0]) : "");
  const selectedSample =
    options.find((sample) => sampleValue(sample) === selectedId) ?? options[0];
  const availableSectionModes = selectedSample
    ? sectionModesForParts(selectedSample.hasPart1, selectedSample.hasPart2)
    : (["full", "part1", "part2"] as SectionMode[]);
  const activeSectionMode =
    availableSectionModes.includes(sectionMode)
      ? sectionMode
      : (availableSectionModes[0] ?? "full");

  async function postExam(
    url: string,
    extra?: { examId?: string; shuffle?: boolean; sectionMode?: SectionMode },
  ) {
    const { shuffle, sectionMode: modeOverride, ...createBody } = extra ?? {};
    const mode = modeOverride ?? sectionMode;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        examCode,
        sectionMode: mode,
        ...(mode === "part1" && essayId ? { essayId } : {}),
        ...createBody,
      }),
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
        sectionMode: mode,
        showTopic,
        attemptMode,
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
          Chọn mã đề, phạm vi và chế độ làm bài. Hệ thống lấy ngẫu nhiên 1 câu nghị luận
          và phần 2 từ ngân hàng ({spec.independentMcq} trắc nghiệm +{" "}
          {spec.clusters} cụm × {spec.clusterSize} + {spec.fill} điền,{" "}
          {spec.total} câu). Hoặc chọn một đề minh họa có sẵn. Thi thử có thời gian
          (toàn bộ 150 phút; phần 1: 50 phút; phần 2: 100 phút). Luyện tập không
          giới hạn thời gian và hiện đáp án, lời giải ngay sau khi trả lời.
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
        {sectionMode === "part1" ? (
          <div className="grid gap-2">
            <Label htmlFor="part1-essay">Đề nghị luận</Label>
            <select
              id="part1-essay"
              disabled={busy}
              value={essayId}
              onChange={(event) => setEssayId(event.target.value)}
              className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
            >
              <option value="">Ngẫu nhiên</option>
              {essays.map((essay) => (
                <option key={essay.id} value={essay.id}>
                  {essay.title}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="grid gap-2">
          <Label>Chế độ làm bài</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {(["exam", "practice"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                disabled={busy}
                onClick={() => setAttemptMode(mode)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-left text-sm",
                  attemptMode === mode
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border text-muted-foreground",
                )}
              >
                <span className="block font-medium">{attemptModeLabel(mode)}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {mode === "practice"
                    ? "Không giới hạn thời gian, hiện đáp án và lời giải ngay sau khi trả lời"
                    : "Có thời gian, ẩn đáp án đến khi nộp bài"}
                </span>
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
                disabled={busy || options.length === 0}
                value={selectedId}
                onChange={(event) =>
                  setSelectedByCode((current) => ({
                    ...current,
                    [examCode]: event.target.value,
                  }))
                }
                className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
              >
                {options.length === 0 ? (
                  <option value="">Chưa có đề minh họa</option>
                ) : (
                  options.map((sample) => (
                    <option key={sampleValue(sample)} value={sampleValue(sample)}>
                      {sampleLabel(sample)}
                    </option>
                  ))
                )}
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
                disabled={busy || !selectedId}
                onClick={async () => {
                  setError(null);
                  setSampling(true);
                  try {
                    await postExam("/api/exams/sample", {
                      examId: selectedId,
                      shuffle: shuffleSample,
                      sectionMode: activeSectionMode,
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
