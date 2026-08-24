import { parseAnswerKeyJson, parseQuestions } from "./json";
import { isExamCode, type AnswerKey, type ExamCode, type Question } from "./types";

export type ParsedSampleJson = {
  examCode: ExamCode;
  diversity?: number;
  essayPrompt: string;
  questions: Question[];
  answerKey: AnswerKey;
};

export function parseSampleJsonText(
  text: string,
  expectedExamCode?: ExamCode,
): ParsedSampleJson {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("File JSON không đọc được.");
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("JSON đề minh họa không hợp lệ.");
  }

  const payload = raw as Record<string, unknown>;
  if (typeof payload.essayPrompt !== "string" || !payload.essayPrompt.trim()) {
    throw new Error("JSON thiếu essayPrompt.");
  }
  if (!payload.questions || !payload.answerKey) {
    throw new Error("JSON thiếu questions hoặc answerKey.");
  }

  if (payload.examCode != null && !isExamCode(payload.examCode)) {
    throw new Error("JSON có examCode không hợp lệ.");
  }
  const examCode = isExamCode(payload.examCode)
    ? payload.examCode
    : (expectedExamCode ?? "CA1");
  if (expectedExamCode && examCode !== expectedExamCode) {
    throw new Error(`JSON thuộc mã ${examCode}, không phải ${expectedExamCode}.`);
  }

  return {
    examCode,
    diversity:
      typeof payload.diversity === "number" && Number.isFinite(payload.diversity)
        ? payload.diversity
        : undefined,
    essayPrompt: payload.essayPrompt,
    questions: parseQuestions(payload.questions),
    answerKey: parseAnswerKeyJson(payload.answerKey),
  };
}
