import type { ClusterKind, ExamCode, SectionMode } from "./types";

export const EXAM_DURATION_MS = 150 * 60 * 1000;
export const PART1_DURATION_MS = 50 * 60 * 1000;
export const PART2_DURATION_MS = 100 * 60 * 1000;

export const SECTION_DURATION_MS: Record<SectionMode, number> = {
  full: EXAM_DURATION_MS,
  part1: PART1_DURATION_MS,
  part2: PART2_DURATION_MS,
};
export const ESSAY_MAX_SCORE = 30;
export const MCQ_MAX_SCORE = 70;
export const TOTAL_MAX_SCORE = 100;
export const OPTION_LETTERS = ["A", "B", "C", "D"] as const;
export const AUTOSAVE_INTERVAL_MS = 30_000;
export const EXAM_CODES = ["CA1", "CA4"] as const;
export const NEAR_DUP_JACCARD = 0.55;
export const CLUSTER_SIZE = 3;

export type ExamSpec = {
  independentMcq: number;
  clusters: number;
  clusterSize: number;
  mcq: number;
  fill: number;
  total: number;
  clusterKind: ClusterKind;
};

export const EXAM_SPECS: Record<ExamCode, ExamSpec> = {
  CA1: {
    independentMcq: 39,
    clusters: 2,
    clusterSize: CLUSTER_SIZE,
    mcq: 45,
    fill: 5,
    total: 50,
    clusterKind: "passage",
  },
  CA4: {
    independentMcq: 48,
    clusters: 2,
    clusterSize: CLUSTER_SIZE,
    mcq: 54,
    fill: 6,
    total: 60,
    clusterKind: "situation",
  },
};

export const CLUSTER_HEADER_TEMPLATES: Record<ClusterKind, string> = {
  passage:
    "Dựa vào thông tin dưới đây và trả lời các câu từ {start} đến {end}.",
  situation:
    "Đọc tình huống sau đây và trả lời các câu từ {start} đến {end}.",
};

export const FILL_HEADER_TEMPLATE =
  "Câu trắc nghiệm trả lời ngắn. Thí sinh trả lời các câu từ {start} đến {end}.";

export const SAMPLE_TITLES: Record<ExamCode, string> = {
  CA1: "Đề minh họa 2026 — CA1",
  CA4: "Đề minh họa 2026 — CA4",
};

export function examDurationMs(mode: SectionMode = "full"): number {
  return SECTION_DURATION_MS[mode];
}

export function sectionModeLabel(mode: SectionMode): string {
  if (mode === "part1") return "Phần 1 · Nghị luận (50 phút)";
  if (mode === "part2") return "Phần 2 · Trắc nghiệm (100 phút)";
  return "Toàn bộ đề (150 phút)";
}

export function sectionModeShortLabel(mode: SectionMode): string {
  if (mode === "part1") return "Phần 1";
  if (mode === "part2") return "Phần 2";
  return "Toàn bộ";
}

export function isOfficialSampleTitle(title: string, examCode: ExamCode): boolean {
  return title === SAMPLE_TITLES[examCode];
}

export function generatedSampleTitle(examCode: ExamCode, number: number): string {
  return `Đề minh họa ${examCode} - số ${number}`;
}

export function parseGeneratedSampleNumber(
  title: string,
  examCode: ExamCode,
): number | null {
  const prefix = `Đề minh họa ${examCode} - số `;
  if (!title.startsWith(prefix)) return null;
  const n = Number(title.slice(prefix.length));
  if (!Number.isInteger(n) || n < 2) return null;
  return n;
}

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

export function formatRangeHeader(
  template: string,
  start: number,
  end: number,
): string {
  return template
    .replaceAll("{start}", String(start))
    .replaceAll("{end}", String(end));
}

export function clusterHeaderTemplate(kind: ClusterKind): string {
  return CLUSTER_HEADER_TEMPLATES[kind];
}
