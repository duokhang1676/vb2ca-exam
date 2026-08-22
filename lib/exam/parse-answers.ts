import { OPTION_LETTERS } from "./constants";
import type { AnswerKey, OptionLetter } from "./types";

const LINE_RE = /^(\d+)\s+(.+)$/;

export function parseAnswerKey(raw: string, expectedCount?: number): AnswerKey {
  const key: AnswerKey = {};

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const match = trimmed.match(LINE_RE);
    if (!match) continue;
    const number = match[1];
    const value = match[2].trim();
    if (!value) continue;
    const isLetter = OPTION_LETTERS.includes(
      value.toUpperCase() as OptionLetter,
    );
    key[number] = isLetter ? value.toUpperCase() : value;
  }

  if (Object.keys(key).length === 0) {
    throw new Error(
      "Không đọc được dòng đáp án nào. Mỗi dòng dạng: 1 A hoặc 55 Năng lực pháp luật.",
    );
  }

  if (expectedCount && expectedCount > 0) {
    const missing = Array.from({ length: expectedCount }, (_, i) => String(i + 1)).filter(
      (n) => !(n in key),
    );
    if (missing.length > 0) {
      throw new Error(
        `File đáp án thiếu câu: ${missing.join(", ")}. Cần đủ ${expectedCount} câu.`,
      );
    }
  }

  return key;
}
