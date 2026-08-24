import type { Json } from "@/lib/supabase/database.types";
import {
  normalizeQuestionType,
  type AnswerKey,
  type AttemptAnswers,
  type Question,
  type ShuffleMap,
} from "./types";

export function asJson(value: unknown): Json {
  return value as Json;
}

export function parseQuestions(value: unknown): Question[] {
  if (!Array.isArray(value)) {
    throw new Error("Dữ liệu câu hỏi không hợp lệ.");
  }
  return value.map((item) => {
    const question = item as Question;
    const type = normalizeQuestionType(question.type);
    const clusterId = question.clusterId;
    const section =
      question.section ??
      (clusterId ? "cluster" : type === "fill" ? "fill" : "independent");
    return {
      ...question,
      type,
      section,
      clusterId,
    };
  });
}

export function parseAnswerKeyJson(value: unknown): AnswerKey {
  if (!value || typeof value !== "object") {
    throw new Error("Đáp án không hợp lệ.");
  }
  return value as AnswerKey;
}

export function parseAnswers(value: unknown): AttemptAnswers {
  if (!value || typeof value !== "object") return {};
  return value as AttemptAnswers;
}

export function parseShuffle(value: unknown): ShuffleMap {
  if (!value || typeof value !== "object") {
    throw new Error("Dữ liệu đảo đề không hợp lệ.");
  }
  return value as ShuffleMap;
}

export function parseFlagged(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is number => Number.isInteger(item));
}
