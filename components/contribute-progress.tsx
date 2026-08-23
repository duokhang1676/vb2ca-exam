"use client";

import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";

export type ContributeProgressStep = {
  label: string;
  holdMs: number;
};

export const ESSAY_PARSE_STEPS: ContributeProgressStep[] = [
  { label: "Đang đọc file...", holdMs: 3000 },
  { label: "Đang OCR đề nghị luận...", holdMs: 45000 },
  { label: "Đang lưu bản review...", holdMs: 20_000 },
];

export const QUESTION_PARSE_STEPS: ContributeProgressStep[] = [
  { label: "Đang đọc file đề và đáp án...", holdMs: 3000 },
  { label: "Đang OCR câu hỏi bằng AI...", holdMs: 40000 },
  { label: "Đang đối chiếu câu trùng...", holdMs: 25000 },
  { label: "Đang lưu bản review...", holdMs: 20_000 },
];

export const COMMIT_STEPS: ContributeProgressStep[] = [
  { label: "Đang kiểm tra câu trùng...", holdMs: 8000 },
  { label: "Đang lưu vào ngân hàng...", holdMs: 20_000 },
];

function stepIndexAt(elapsedMs: number, steps: ContributeProgressStep[]) {
  let consumed = 0;
  for (let index = 0; index < steps.length; index += 1) {
    consumed += steps[index].holdMs;
    if (elapsedMs < consumed) return index;
  }
  return steps.length - 1;
}

export function ContributeProgress({
  active,
  steps,
}: {
  active: boolean;
  steps: ContributeProgressStep[];
}) {
  const [value, setValue] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (!active) {
      setValue(0);
      setElapsed(0);
      setStepIndex(0);
      return;
    }

    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      const elapsedMs = Date.now() - startedAt;
      setElapsed(Math.floor(elapsedMs / 1000));
      setStepIndex(stepIndexAt(elapsedMs, steps));
      setValue(Math.min(95, 95 * (1 - Math.exp(-elapsedMs / 28000))));
    }, 250);

    return () => window.clearInterval(timer);
  }, [active, steps]);

  if (!active) return null;

  const current = steps[stepIndex] ?? steps[0];

  return (
    <div className="space-y-2" role="status" aria-live="polite">
      <Progress value={value} className="h-2" />
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <p className="text-foreground">{current?.label}</p>
        <p className="text-muted-foreground">Đã chạy {elapsed} giây</p>
      </div>
    </div>
  );
}
