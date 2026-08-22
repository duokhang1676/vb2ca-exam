export type QuestionType = "mcq" | "fill";
export type OptionLetter = "A" | "B" | "C" | "D";
export type ExamCode = "CA1" | "CA4";
export type ExamSource = "random" | "sample";

export type McqOptions = Record<OptionLetter, string>;

export type Question = {
  originalNumber: number;
  type: QuestionType;
  stem: string;
  options?: McqOptions;
};

export type AnswerKey = Record<string, string>;

export type ShuffleMap = {
  order: number[];
  optionMaps: Record<string, OptionLetter[]>;
};

export type AttemptAnswers = Record<string, string>;

export type DisplayQuestion = {
  originalNumber: number;
  displayIndex: number;
  type: QuestionType;
  stem: string;
  options?: McqOptions;
};

export type McqDetailItem = {
  originalNumber: number;
  displayIndex: number;
  type: QuestionType;
  stem: string;
  options?: McqOptions;
  userAnswer: string | null;
  correctAnswer: string;
  correctDisplayAnswer: string;
  isCorrect: boolean;
  points: number;
};

export type GradeResult = {
  mcqScore: number;
  correctCount: number;
  totalQuestions: number;
  detail: McqDetailItem[];
};

export type BankQuestion = {
  id: string;
  examCode: ExamCode;
  type: QuestionType;
  stem: string;
  options?: McqOptions;
  answer: string;
  fingerprint: string;
  createdAt: string;
};

export type BankEssay = {
  id: string;
  prompt: string;
  fingerprint: string;
  sourceFilename: string | null;
  createdAt: string;
};

export function normalizeQuestionType(type: string | null | undefined): QuestionType {
  return type === "mcq" ? "mcq" : "fill";
}

export function isMcq(type: string | null | undefined): boolean {
  return normalizeQuestionType(type) === "mcq";
}

export function isExamCode(value: unknown): value is ExamCode {
  return value === "CA1" || value === "CA4";
}
