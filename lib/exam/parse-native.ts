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
  /(?:^|\n)[^\S\n]*[^\n]{0,8}?(?:PHẦN|Phần)\s*(?:II|2)\b[^\n]*/i;
const PART1_LINE_RE =
  /(?:^|\n)[^\S\n]*[^\n]{0,8}?(?:PHẦN|Phần)\s*(?:I|1)\b[^\n]*/gi;
const ESSAY_TAIL_RE =
  /(?:^|\n)[^\S\n]*[^\n]{0,8}?(?:PHẦN|Phần)\s*(?:II|2)\b[\s\S]*$|(?:^|\n)\s*Từ câu\s+\d+\s+đến[\s\S]*$/i;
const HEADER_START_RE =
  /^(đề\s*thi(\s*minh\s*họa)?|bài\s*thi|tuyển\s*sinh|công\s*dân|đối\s*với\s*công\s*dân|có\s*bằng|trình\s*độ\s*đại\s*học|mã\s*(bài\s*thi|đề)|ca\s*[14]\b|kỳ\s*thi|bộ\s*công\s*an|thời\s*gian(\s*làm\s*bài)?|phần\s*(i|1|ii|2)\b|tự\s*luận|trắc\s*nghiệm|nội\s*dung\s*câu\s*hỏi|\(?\s*đề\s*thi\s*có\s+\d+)/i;
const QUESTION_RE = /(?:^|\n)\s*(?:Câu|CÂU)\s+(\d+)\s*[\.:)]\s*/g;
const OPTION_MARK_RE = /([A-D])\./g;
const PASSAGE_HEADER_RE =
  /dựa vào thông tin dưới đây|đọc tình huống sau đây/i;
const EXAM_NOISE_RE =
  /Cán bộ coi thi[^\n]*|Trang\s+\d+\s*\/\s*\d+[^\n]*|-{2,}\s*HẾT\s*-{2,}|Trả lời\s*:[.…\s]*/gi;

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
    const essay = text.slice(0, match.index).replace(PART1_LINE_RE, "").trim();
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

function stripLeadingDecor(line: string): string {
  return line
    .replace(/^[\s\u2022\u25CF\u25A0\u25C6\uF0A7\uFFFD•·▪►]+/u, "")
    .trim();
}

function isExamHeaderLine(line: string): boolean {
  const trimmed = stripLeadingDecor(line);
  if (trimmed.length < 4) return true;
  if (/^\(?\s*\d+\s*điểm\)?\.?$/i.test(trimmed)) return true;
  return HEADER_START_RE.test(trimmed);
}

function stripExamHeader(essay: string): string {
  const withoutTail = essay.replace(ESSAY_TAIL_RE, "");
  const lines = withoutTail.split(/\n/);
  const kept: string[] = [];
  let started = false;
  for (const line of lines) {
    if (!started) {
      if (isExamHeaderLine(line)) continue;
      started = true;
    }
    kept.push(line);
  }
  return kept.join("\n").trim();
}

function cleanExamNoise(text: string): string {
  return text
    .replace(EXAM_NOISE_RE, "\n")
    .replace(/\n\s*\d{1,2}\s*\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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

type OptionMark = {
  letter: keyof McqOptions;
  index: number;
  end: number;
};

function findOptionMarks(body: string): OptionMark[] {
  return [...body.matchAll(new RegExp(OPTION_MARK_RE.source, "g"))].flatMap(
    (match) => {
      if (match.index == null) return [];
      return [
        {
          letter: match[1] as keyof McqOptions,
          index: match.index,
          end: match.index + match[0].length,
        },
      ];
    },
  );
}

function findAbcdSequence(marks: OptionMark[]): OptionMark[] | null {
  let best: OptionMark[] | null = null;
  for (let i = 0; i < marks.length; i += 1) {
    if (marks[i].letter !== "A") continue;
    const b = marks.find((mark, index) => index > i && mark.letter === "B");
    if (!b) continue;
    const c = marks.find((mark) => mark.index > b.index && mark.letter === "C");
    if (!c) continue;
    const d = marks.find((mark) => mark.index > c.index && mark.letter === "D");
    if (!d) continue;
    best = [marks[i], b, c, d];
  }
  return best;
}

function parseOptions(body: string): {
  stem: string;
  options?: McqOptions;
  trailing: string;
} {
  const cleaned = cleanExamNoise(body);
  const sequence = findAbcdSequence(findOptionMarks(cleaned));
  if (!sequence) {
    const split = splitTrailing(cleaned);
    return { stem: split.main, trailing: split.trailing };
  }
  const [a, b, c, d] = sequence;
  const dSplit = splitTrailing(cleaned.slice(d.end));
  const options: McqOptions = {
    A: cleaned.slice(a.end, b.index).trim(),
    B: cleaned.slice(b.end, c.index).trim(),
    C: cleaned.slice(c.end, d.index).trim(),
    D: dSplit.main,
  };
  if (!options.A || !options.B || !options.C) {
    const split = splitTrailing(cleaned);
    return { stem: split.main, trailing: split.trailing };
  }
  return {
    stem: cleaned.slice(0, a.index).trim(),
    options: { ...options, D: options.D || "." },
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
    return (
      trimmed
        .slice(header.index)
        .replace(PASSAGE_HEADER_RE, "")
        .replace(/^[\s.,:;-]+/, "")
        .replace(/^và trả lời các câu từ \d+ đến \d+\.?\s*/i, "")
        .trim() || trimmed
    );
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
  const { essay, part2 } = splitParts(cleanExamNoise(params.text));
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
