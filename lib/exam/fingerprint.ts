import { createHash } from "node:crypto";
import { NEAR_DUP_JACCARD } from "./constants";
import type { ExamCode, McqOptions, QuestionType } from "./types";

export function normalizeForHash(text: string): string {
  return text
    .toLowerCase()
    .replace(/\$\$?|\\\[|\\\]|\\\(|\\\)/g, " ")
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function essayFingerprint(prompt: string): string {
  return sha256(normalizeForHash(prompt));
}

export function questionFingerprint(params: {
  examCode: ExamCode;
  type: QuestionType;
  stem: string;
  options?: McqOptions;
}): string {
  const optionPart = params.options
    ? Object.values(params.options).map(normalizeForHash).sort().join("|")
    : "";
  return sha256(
    `${params.examCode}|${params.type}|${normalizeForHash(params.stem)}|${optionPart}`,
  );
}

export function tokenize(text: string): Set<string> {
  return new Set(
    normalizeForHash(text)
      .split(" ")
      .filter((token) => token.length > 1),
  );
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection += 1;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function isNearDuplicate(a: string, b: string): boolean {
  return jaccard(tokenize(a), tokenize(b)) >= NEAR_DUP_JACCARD;
}
