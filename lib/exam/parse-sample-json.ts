import { optionalText, parseAnswerKeyJson, parseQuestions } from "./json";
import { isExamCode, type AnswerKey, type ExamCode, type Question } from "./types";

export type ParsedSampleJson = {
  examCode: ExamCode;
  diversity?: number;
  essayPrompt: string;
  essayTopic?: string;
  essaySolution?: string;
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
  const essayPrompt =
    typeof payload.essayPrompt === "string" ? payload.essayPrompt : "";
  const questionsRaw = payload.questions ?? [];
  if (!Array.isArray(questionsRaw)) {
    throw new Error("JSON questions phải là mảng.");
  }
  for (const item of questionsRaw) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error("JSON có câu hỏi không hợp lệ.");
    }
    const type = (item as { type?: unknown }).type;
    if (
      type != null &&
      type !== "mcq" &&
      type !== "fill" &&
      type !== "numeric"
    ) {
      throw new Error(
        `Loại câu không hỗ trợ: ${String(type)}. Chỉ nhận mcq (độc lập/cụm) hoặc fill.`,
      );
    }
  }

  if (questionsRaw.length > 0 && payload.answerKey == null) {
    throw new Error("JSON thiếu answerKey.");
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
    essayPrompt,
    essayTopic: optionalText(payload.essayTopic),
    essaySolution: optionalText(payload.essaySolution),
    questions: parseQuestions(questionsRaw),
    answerKey:
      payload.answerKey == null ? {} : parseAnswerKeyJson(payload.answerKey),
  };
}
