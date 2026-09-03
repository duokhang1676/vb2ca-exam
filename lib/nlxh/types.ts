export const QUESTION_TYPES = [
  "D1_L1",
  "D1_L2",
  "D1_L3",
  "D2_L1",
  "D2_L2",
] as const;

export type QuestionType = (typeof QUESTION_TYPES)[number];

export const PRACTICE_MODES = [
  "identify_type",
  "identify_issue",
  "introduction",
  "explanation",
  "build_arguments",
  "causes",
  "benefits",
  "consequences",
  "evidence",
  "counter_argument",
  "solutions",
  "conclusion",
  "paragraph",
  "outline",
  "full_essay",
] as const;

export type PracticeMode = (typeof PRACTICE_MODES)[number];

export const PATH_MODES = ["guided", "free", "daily", "remedial", "review"] as const;
export type PathMode = (typeof PATH_MODES)[number];

export const MASTERY_LEVELS = [
  "new",
  "learning",
  "familiar",
  "mastered",
] as const;
export type MasteryLevel = (typeof MASTERY_LEVELS)[number];

export const AI_SOURCES = ["gemini", "external_pack", "manual", "local"] as const;
export type AiSource = (typeof AI_SOURCES)[number];

export type PracticeLevel = 1 | 2 | 3;

export const FRAMEWORK_VERSION = "framework_v1";
export const PROMPT_VERSION = "core_v1";
export const PATH_VERSION = "path_v1";
export const PACK_VERSION = 1;

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  D1_L1: "D1-L1 · Phẩm chất / tư tưởng tích cực",
  D1_L2: "D1-L2 · Tư tưởng / lối sống tiêu cực",
  D1_L3: "D1-L3 · Ý kiến / câu nói / quan niệm sống",
  D2_L1: "D2-L1 · Hiện tượng đời sống tiêu cực",
  D2_L2: "D2-L2 · Hiện tượng đời sống tích cực",
};

export const PRACTICE_MODE_LABELS: Record<PracticeMode, string> = {
  identify_type: "Nhận diện dạng đề",
  identify_issue: "Xác định vấn đề nghị luận",
  introduction: "Mở bài",
  explanation: "Giải thích",
  build_arguments: "Xây luận điểm",
  causes: "Phân tích nguyên nhân",
  benefits: "Ý nghĩa / vai trò",
  consequences: "Hậu quả",
  evidence: "Dẫn chứng",
  counter_argument: "Phản biện",
  solutions: "Giải pháp",
  conclusion: "Kết bài",
  paragraph: "Viết đoạn",
  outline: "Lập dàn ý",
  full_essay: "Viết bài hoàn chỉnh",
};

export type QuestionAnalysis = {
  id?: string;
  essayId: string;
  questionType: QuestionType;
  mainTopic: string;
  coreIssue: string;
  keywords: string[];
  suggestedPosition?: string;
  frameworkVersion: string;
  source: AiSource;
};

export type SeedData = {
  task: string;
  targetWords?: string;
  requiredElements?: string[];
  hints?: string[];
  commonMistakes?: string[];
  referenceIdeas?: string[];
  scaffold?: string;
  suggestedArguments?: string[];
  distractors?: string[];
  expectedIdeas?: string[];
  choices?: { id: string; text: string; correct?: boolean }[];
  correctType?: QuestionType;
};

export type ExerciseSeed = {
  id?: string;
  essayId: string;
  practiceMode: PracticeMode;
  level: PracticeLevel;
  data: SeedData;
  frameworkVersion: string;
  promptVersion: string;
  status: "valid" | "invalid" | "needs_review";
};

export type PracticeFeedback = {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  missingIdeas?: string[];
  suggestedRevision?: string;
  nextPractice?: PracticeMode;
  missingComponents?: string[];
  priorityFixes?: string[];
  scores?: Record<string, number>;
};

export type PracticeAnswer = {
  text?: string;
  selectedType?: QuestionType;
  fields?: Record<string, string>;
  items?: string[];
  selectedIds?: string[];
  keywords?: string[];
  keywordText?: string;
};

export type SkillProgress = {
  skill: PracticeMode;
  attempts: number;
  averageScore: number;
  recentAverageScore: number;
  bestScore: number;
  mastery: MasteryLevel;
};

export type PathEnrollment = {
  userId: string;
  pathVersion: string;
  currentStepId: string;
  currentEssayId: string | null;
  remedialSkill: PracticeMode | null;
  remedialReturnStepId: string | null;
  status: "active" | "completed";
};

export type CurriculumStep = {
  id: string;
  skill: PracticeMode | "framework";
  level: PracticeLevel | 0;
  title: string;
  instruction: string;
  passScore: number;
  minAttempts: number;
  skipWhen?: (
    analysis: Pick<QuestionAnalysis, "questionType"> | null,
  ) => boolean;
};

export function isQuestionType(value: unknown): value is QuestionType {
  return (
    typeof value === "string" &&
    (QUESTION_TYPES as readonly string[]).includes(value)
  );
}

export function isPracticeMode(value: unknown): value is PracticeMode {
  return (
    typeof value === "string" &&
    (PRACTICE_MODES as readonly string[]).includes(value)
  );
}

export function isPathMode(value: unknown): value is PathMode {
  return (
    typeof value === "string" && (PATH_MODES as readonly string[]).includes(value)
  );
}

export function isPracticeLevel(value: unknown): value is PracticeLevel {
  return value === 1 || value === 2 || value === 3;
}

export function isNegativeType(type: QuestionType): boolean {
  return type === "D1_L2" || type === "D2_L1";
}

export function isPositiveType(type: QuestionType): boolean {
  return type === "D1_L1" || type === "D2_L2";
}

export function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export function roundScore(score: number): number {
  return Math.max(0, Math.min(10, Math.round(score * 2) / 2));
}
