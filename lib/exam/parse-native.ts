import { randomUUID } from "node:crypto";
import { CLUSTER_SIZE, EXAM_SPECS } from "./constants";
import { ContributeError } from "./contribute-error";
import { extractExamFileText } from "./extract-text";
import type { ParsedCluster } from "./schema";
import {
  isMcq,
  normalizeQuestionType,
  type AnswerKey,
  type ClusterKind,
  type ExamCode,
  type McqOptions,
  type Question,
} from "./types";

const PART2_RE =
  /(?:^|\n)\s*(?:PHẦN|Phần)\s*(?:II|2)\b[^\n]*/i;
const QUESTION_RE = /(?:^|\n)\s*(?:Câu|CÂU)\s+(\d+)\s*[\.:)]\s*/g;
const OPTION_RE = /(?:^|\n)\s*([A-D])[\.)]\s+/g;
const PASSAGE_HEADER_RE =
  /dựa vào thông tin dưới đây|đọc tình huống sau đây/i;

function parseError(message: string): ContributeError {
  return new ContributeError(
    "INVALID_CONTENT",
    message,
    "Không tách được cấu trúc đề",
    [
      "Đề phải có Phần 1 nghị luận và Phần 2 với câu đánh số Câu 1, Câu 2, …",
      "Mỗi câu trắc nghiệm cần đủ A. B. C. D. Câu điền để cuối, không có 4 lựa chọn.",
      "Cụm đọc hiểu/tình huống: đoạn thông tin chung rồi đúng 3 câu MCQ.",
      "Không dùng AI để sửa nội dung — hãy chỉnh file nguồn cho đúng format rồi nạp lại.",
    ],
  );
}

function splitParts(text: string): { essay: string; part2: string } {
  const match = text.match(PART2_RE);
  if (match && match.index != null) {
    const essay = text.slice(0, match.index).replace(/(?:^|\n)\s*(?:PHẦN|Phần)\s*(?:I|1)\b[^\n]*/i, "").trim();
    const part2 = text.slice(match.index + match[0].length).trim();
    return { essay, part2 };
  }
  const firstQuestion = text.search(/(?:^|\n)\s*(?:Câu|CÂU)\s+1\s*[\.:)]/i);
  if (firstQuestion >= 0) {
    return {
      essay: text.slice(0, firstQuestion).trim(),
      part2: text.slice(firstQuestion).trim(),
    };
  }
  throw parseError("Không tìm thấy Phần 2 hoặc câu hỏi Câu 1.");
}

function stripExamHeader(essay: string): string {
  const lines = essay.split(/\n/);
  const kept: string[] = [];
  let started = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!started) {
      if (
        /^(kỳ thi|đề minh họa|bộ công an|mã đề|ca1|ca4|thời gian|phần\s*(i|1)\b)/i.test(
          trimmed,
        )
      ) {
        continue;
      }
      if (trimmed.length < 4) continue;
      started = true;
    }
    kept.push(line);
  }
  return kept.join("\n").trim();
}

function splitTrailing(text: string): { main: string; trailing: string } {
  const header = text.search(PASSAGE_HEADER_RE);
  if (header >= 0) {
    return {
      main: text.slice(0, header).trim(),
      trailing: text.slice(header).trim(),
    };
  }
  const fill = text.search(/câu trắc nghiệm trả lời ngắn/i);
  if (fill >= 0) {
    return {
      main: text.slice(0, fill).trim(),
      trailing: text.slice(fill).trim(),
    };
  }
  return { main: text.trim(), trailing: "" };
}

function parseOptions(body: string): {
  stem: string;
  options?: McqOptions;
  trailing: string;
} {
  const matches = [...body.matchAll(new RegExp(OPTION_RE.source, "g"))];
  if (matches.length < 4) {
    const split = splitTrailing(body);
    return { stem: split.main, trailing: split.trailing };
  }
  const start = matches.find((item) => item[1] === "A");
  if (!start || start.index == null) {
    const split = splitTrailing(body);
    return { stem: split.main, trailing: split.trailing };
  }
  const aIndex = start.index;
  const byLetter: Partial<McqOptions> = {};
  for (let i = 0; i < matches.length; i += 1) {
    const current = matches[i];
    if (current.index == null || current.index < aIndex) continue;
    const letter = current[1] as keyof McqOptions;
    const contentStart = current.index + current[0].length;
    const next = matches[i + 1];
    const contentEnd =
      next && next.index != null && next.index > current.index
        ? next.index
        : body.length;
    byLetter[letter] = body.slice(contentStart, contentEnd).trim();
  }
  if (!byLetter.A || !byLetter.B || !byLetter.C || !byLetter.D) {
    const split = splitTrailing(body);
    return { stem: split.main, trailing: split.trailing };
  }
  const dSplit = splitTrailing(byLetter.D);
  return {
    stem: body.slice(0, aIndex).trim(),
    options: {
      A: byLetter.A,
      B: byLetter.B,
      C: byLetter.C,
      D: dSplit.main,
    },
    trailing: dSplit.trailing,
  };
}

type RawQuestion = {
  originalNumber: number;
  stem: string;
  options?: McqOptions;
  prefix: string;
};

function splitQuestions(part2: string): RawQuestion[] {
  const matches = [...part2.matchAll(new RegExp(QUESTION_RE.source, "g"))];
  if (matches.length === 0) {
    throw parseError("Không tách được câu hỏi phần 2.");
  }
  const questions: RawQuestion[] = [];
  let carryPrefix = part2.slice(0, matches[0].index ?? 0);
  for (let i = 0; i < matches.length; i += 1) {
    const current = matches[i];
    const number = Number(current[1]);
    const start = (current.index ?? 0) + current[0].length;
    const next = matches[i + 1];
    const end = next?.index ?? part2.length;
    const parsed = parseOptions(part2.slice(start, end));
    questions.push({
      originalNumber: number,
      stem: parsed.stem,
      options: parsed.options,
      prefix: carryPrefix,
    });
    carryPrefix = parsed.trailing;
  }
  return questions;
}

function clusterKindFromText(text: string, fallback: ClusterKind): ClusterKind {
  if (/tình huống/i.test(text)) return "situation";
  if (/thông tin/i.test(text)) return "passage";
  return fallback;
}

function passageFromPrefix(prefix: string): string {
  const trimmed = prefix.trim();
  if (!trimmed) return "";
  const header = trimmed.match(PASSAGE_HEADER_RE);
  if (header && header.index != null) {
    return trimmed.slice(header.index).replace(PASSAGE_HEADER_RE, "").replace(/^[\s.,:;-]+/, "").trim() || trimmed;
  }
  return trimmed;
}

function buildClusters(
  examCode: ExamCode,
  raw: RawQuestion[],
): ParsedCluster[] {
  const spec = EXAM_SPECS[examCode];
  const start = spec.independentMcq + 1;
  const clusters: ParsedCluster[] = [];
  for (let i = 0; i < spec.clusters; i += 1) {
    const from = start + i * spec.clusterSize;
    const to = from + spec.clusterSize - 1;
    const first = raw.find((item) => item.originalNumber === from);
    const members = raw.filter(
      (item) => item.originalNumber >= from && item.originalNumber <= to,
    );
    const prefix = first?.prefix ?? members[0]?.prefix ?? "";
    const kind = clusterKindFromText(prefix, spec.clusterKind);
    const passage = passageFromPrefix(prefix);
    if (!passage) {
      throw parseError(
        `Cụm câu ${from}–${to} thiếu đoạn thông tin/tình huống chung ngay trước câu ${from}.`,
      );
    }
    clusters.push({
      kind,
      header:
        kind === "situation"
          ? `Đọc tình huống sau đây và trả lời các câu từ ${from} đến ${to}.`
          : `Dựa vào thông tin dưới đây và trả lời các câu từ ${from} đến ${to}.`,
      passage,
      startNumber: from,
      endNumber: to,
      questions: members.map((item) => ({
        originalNumber: item.originalNumber,
        type: "mcq" as const,
        stem: item.stem,
        options: item.options,
      })),
    });
  }
  return clusters;
}

function toParsedQuestions(raw: RawQuestion[], answerKey: AnswerKey) {
  return raw.map((item) => {
    const fromKey = answerKey[String(item.originalNumber)];
    const type = fromKey
      ? /^[A-D]$/i.test(fromKey)
        ? ("mcq" as const)
        : ("fill" as const)
      : item.options
        ? ("mcq" as const)
        : ("fill" as const);
    return {
      originalNumber: item.originalNumber,
      type,
      stem: item.stem,
      options: type === "mcq" ? item.options : undefined,
    };
  });
}

function attachClusters(
  questions: Question[],
  clusters: ParsedCluster[],
  examCode: ExamCode,
): Question[] {
  const spec = EXAM_SPECS[examCode];
  const byNumber = new Map(questions.map((question) => [question.originalNumber, { ...question }]));
  for (const cluster of clusters) {
    const clusterId = randomUUID();
    const kind = cluster.kind ?? spec.clusterKind;
    const passage = cluster.passage.trim();
    for (let n = cluster.startNumber; n <= cluster.endNumber; n += 1) {
      const question = byNumber.get(n);
      if (!question || !isMcq(question.type)) continue;
      byNumber.set(n, {
        ...question,
        section: "cluster",
        clusterId,
        clusterPosition: n - cluster.startNumber + 1,
        clusterKind: kind,
        passage,
      });
    }
  }
  return Array.from(byNumber.values()).sort(
    (a, b) => a.originalNumber - b.originalNumber,
  );
}

export function parseNativeExamText(params: {
  text: string;
  examCode: ExamCode;
  answerKey: AnswerKey;
}): { essayPrompt: string; questions: Question[] } {
  const spec = EXAM_SPECS[params.examCode];
  const { essay, part2 } = splitParts(params.text);
  const essayPrompt = stripExamHeader(essay);
  if (essayPrompt.length < 80) {
    throw parseError("Phần nghị luận xã hội quá ngắn hoặc không tách được Phần 1.");
  }

  const raw = splitQuestions(part2);
  const unique = new Map<number, RawQuestion>();
  for (const item of raw) unique.set(item.originalNumber, item);
  const ordered = Array.from(unique.values()).sort(
    (a, b) => a.originalNumber - b.originalNumber,
  );
  if (ordered.length !== spec.total) {
    throw parseError(
      `Đề ${params.examCode} phải có đúng ${spec.total} câu phần 2 (đọc được ${ordered.length} câu).`,
    );
  }
  for (let n = 1; n <= spec.total; n += 1) {
    if (!unique.has(n)) {
      throw parseError(`Thiếu câu ${n} trong file đề.`);
    }
  }

  const parsedItems = toParsedQuestions(ordered, params.answerKey);
  const questions: Question[] = parsedItems.map((item) => {
    const fromKey = params.answerKey[String(item.originalNumber)];
    const type = fromKey
      ? /^[A-D]$/i.test(fromKey)
        ? "mcq"
        : "fill"
      : normalizeQuestionType(item.type);
    if (type === "mcq" && !item.options) {
      throw parseError(`Câu ${item.originalNumber} là trắc nghiệm nhưng thiếu A B C D.`);
    }
    if (!item.stem.trim()) {
      throw parseError(`Câu ${item.originalNumber} không có nội dung đề bài.`);
    }
    return {
      originalNumber: item.originalNumber,
      type,
      stem: item.stem.trim(),
      options: type === "mcq" ? item.options : undefined,
      section: type === "fill" ? "fill" : "independent",
    };
  });

  const clusters = buildClusters(params.examCode, ordered);
  const withClusters = attachClusters(questions, clusters, params.examCode);
  const clusterCount = new Set(
    withClusters.filter((question) => question.clusterId).map((question) => question.clusterId),
  ).size;
  if (clusterCount < spec.clusters) {
    throw parseError(`Đề ${params.examCode} cần ${spec.clusters} cụm ${CLUSTER_SIZE} câu.`);
  }
  return { essayPrompt, questions: withClusters };
}

export async function parseNativeExamFile(params: {
  bytes: Uint8Array;
  filename: string;
  mimeType?: string;
  examCode: ExamCode;
  answerKey: AnswerKey;
}) {
  const text = await extractExamFileText({
    bytes: params.bytes,
    filename: params.filename,
    mimeType: params.mimeType,
  });
  return parseNativeExamText({
    text,
    examCode: params.examCode,
    answerKey: params.answerKey,
  });
}
