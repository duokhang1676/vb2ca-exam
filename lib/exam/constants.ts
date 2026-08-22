import type { ExamCode } from "./types";

export const EXAM_DURATION_MS = 150 * 60 * 1000;
export const ESSAY_MAX_SCORE = 30;
export const MCQ_MAX_SCORE = 70;
export const TOTAL_MAX_SCORE = 100;
export const OPTION_LETTERS = ["A", "B", "C", "D"] as const;
export const AUTOSAVE_INTERVAL_MS = 30_000;
export const EXAM_CODES = ["CA1", "CA4"] as const;
export const NEAR_DUP_JACCARD = 0.55;

export const EXAM_SPECS: Record<
  ExamCode,
  { mcq: number; fill: number; total: number }
> = {
  CA1: { mcq: 45, fill: 5, total: 50 },
  CA4: { mcq: 54, fill: 6, total: 60 },
};

export const SAMPLE_TITLES: Record<ExamCode, string> = {
  CA1: "Đề minh họa 2026 — CA1",
  CA4: "Đề minh họa 2026 — CA4",
};

export const SAMPLE_FILES: Record<ExamCode, { pdf: string; answers: string }> = {
  CA1: { pdf: "de-ca1.pdf", answers: "dapanca1.txt" },
  CA4: { pdf: "de-ca4.pdf", answers: "dapanca4.txt" },
};

/** @deprecated Use EXAM_SPECS[code].total — kept for older 50-question CA1 exams */
export const EXPECTED_QUESTION_COUNT = EXAM_SPECS.CA1.total;
export const POINTS_PER_QUESTION = MCQ_MAX_SCORE / EXAM_SPECS.CA1.total;
export const SAMPLE_EXAM_TITLE = SAMPLE_TITLES.CA1;

export function pointsPerQuestion(count: number): number {
  if (count <= 0) return 0;
  return MCQ_MAX_SCORE / count;
}

export function questionTypeLabel(type: string | null | undefined): string {
  return type === "mcq" ? "Trắc nghiệm" : "Điền đáp án";
}
