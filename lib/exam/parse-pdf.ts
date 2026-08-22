import { randomUUID } from "node:crypto";
import { generateObject } from "ai";
import type { ZodType } from "zod";
import {
  CLUSTER_SIZE,
  EXAM_SPECS,
  clusterHeaderTemplate,
} from "./constants";
import { GEMINI_MODEL, getGemini } from "./gemini";
import {
  parsedEssaySchema,
  parsedExamSchema,
  parsedQuestionsSchema,
  type ParsedCluster,
  type ParsedExam,
} from "./schema";
import {
  isMcq,
  normalizeQuestionType,
  type AnswerKey,
  type ClusterKind,
  type ExamCode,
  type Question,
} from "./types";

const LATEX_RULES = `- Công thức toán PHẢI viết LaTeX: $...$ (inline) hoặc $$...$$ (display). Ma trận, định thức, hệ phương trình, tích phân, đạo hàm đều dùng LaTeX.
- Giữ nguyên ý câu hỏi, không giải bài, không thêm đáp án.
- stem có thể gồm nhiều dòng; dùng \\n khi xuống dòng.
- Câu 4 lựa chọn A/B/C/D: type = "mcq", phải có options.A/B/C/D.
- Câu điền số/chữ (không có 4 đáp án): type = "fill", không cần options.`;

const CLUSTER_RULES = `- Một số câu trắc nghiệm dùng CHUNG một đoạn thông tin/tình huống. Gom thành cụm, mặc định 3 câu/cụm.
- clusters[]: kind = "passage" nếu tiêu đề dạng "Dựa vào thông tin dưới đây và trả lời các câu từ X đến Y"; kind = "situation" nếu "Đọc tình huống sau đây và trả lời các câu từ X đến Y".
- passage: nguyên văn đoạn thông tin/tình huống (bảng, số liệu, tình huống). KHÔNG nhét passage vào stem từng câu.
- header: nguyên văn câu dẫn (có thể giữ số X–Y trong đề gốc).
- startNumber/endNumber: đúng khoảng câu thuộc cụm (thường X đến X+2).
- clusters[].questions: đúng 3 câu của cụm (stem + options), cùng originalNumber với questions[].
- Stem từng câu chỉ là nội dung câu hỏi + 4 lựa chọn, không lặp lại passage.
- fillHeader: nếu đề có "Câu trắc nghiệm trả lời ngắn. Thí sinh trả lời các câu từ ...", ghi nguyên văn.
- questions[] vẫn gồm ĐỦ mọi câu phần 2 (cả câu trong cụm và câu điền), giữ originalNumber.`;

function fullExamPrompt(examCode: ExamCode): string {
  const spec = EXAM_SPECS[examCode];
  const example =
    examCode === "CA1"
      ? "CA1 minh họa thường có 2 cụm thông tin (khoảng câu 40–42 và 43–45) rồi 5 câu điền (46–50)."
      : "CA4 minh họa thường có 2 cụm tình huống (khoảng câu 49–51 và 52–54) rồi 6 câu điền (55–60).";
  return `Bạn là hệ thống OCR/trích xuất đề thi Văn bằng 2 Công an (VB2CA), mã ${examCode}.

Hãy đọc file đề thi và trả về JSON đúng schema:
- title: tên đề ngắn (ví dụ "${examCode} — Đề minh họa 2026")
- essayPrompt: nguyên văn phần tự luận nghị luận xã hội (Phần 1), gồm yêu cầu làm bài nếu có.
- questions: đúng các câu phần trắc nghiệm/điền đáp án (Phần 2). Giữ originalNumber như trong đề.
- clusters, fillHeader: theo quy tắc cụm bên dưới.

Quy tắc:
${LATEX_RULES}
${CLUSTER_RULES}
- ${example}
- Đề ${examCode} có ${spec.total} câu phần 2 (${spec.mcq} trắc nghiệm gồm ${spec.independentMcq} câu độc lập + ${spec.clusters} cụm ${spec.clusterSize} câu, rồi ${spec.fill} câu điền). Trả đủ, không bỏ câu.`;
}

const ESSAY_PROMPT = `Bạn là hệ thống trích xuất đề nghị luận xã hội kỳ thi Văn bằng 2 Công an.

Hãy đọc tài liệu và trả về JSON:
- essayPrompt: nguyên văn phần tự luận nghị luận xã hội (Phần 1). Nếu tài liệu có nhiều đề, lấy tất cả đề nghị luận, ngăn cách bằng \\n\\n---\\n\\n. Bỏ phần trắc nghiệm nếu có.

Giữ nguyên văn, không tóm tắt, không thêm đáp án.`;

function questionsPrompt(examCode: ExamCode): string {
  const spec = EXAM_SPECS[examCode];
  return `Bạn là hệ thống OCR/trích xuất câu hỏi trắc nghiệm kỳ thi Văn bằng 2 Công an, mã ${examCode}.

Hãy đọc tài liệu (chỉ phần 2 — trắc nghiệm/điền đáp án) và trả về JSON:
- questions: mọi câu hỏi tìm được. Giữ originalNumber như trong đề.
- clusters, fillHeader: theo quy tắc cụm.

Quy tắc:
${LATEX_RULES}
${CLUSTER_RULES}
- Cụm mặc định ${spec.clusterSize} câu; kind mặc định "${spec.clusterKind}" nếu tiêu đề không rõ.
- Không yêu cầu đủ một số lượng cố định; trả mọi câu đọc được.
- Không lấy phần nghị luận xã hội.`;
}

export type NormalizedExam = {
  title: string;
  essayPrompt: string;
  questions: Question[];
};

type GeminiFile = {
  bytes: Uint8Array;
  mediaType: string;
  filename: string;
};

async function generateFromDocument<T>(params: {
  schema: ZodType<T>;
  prompt: string;
  file?: GeminiFile;
  text?: string;
}): Promise<T> {
  const google = getGemini();
  const content: Array<
    | { type: "text"; text: string }
    | { type: "file"; data: Uint8Array; mediaType: string; filename: string }
  > = [{ type: "text", text: params.prompt }];

  if (params.file) {
    content.push({
      type: "file",
      data: params.file.bytes,
      mediaType: params.file.mediaType,
      filename: params.file.filename,
    });
  } else if (params.text) {
    content.push({ type: "text", text: params.text });
  } else {
    throw new Error("Thiếu nội dung đề để phân tích.");
  }

  const { object } = await generateObject({
    model: google(GEMINI_MODEL),
    schema: params.schema,
    messages: [{ role: "user", content }],
  });

  return object as T;
}

function clusterQuestionNumbers(cluster: ParsedCluster): number[] {
  const nested = (cluster.questions ?? [])
    .map((question) => question.originalNumber)
    .filter((number) => Number.isInteger(number));
  if (nested.length > 0) return nested.slice(0, CLUSTER_SIZE);

  const start = Math.min(cluster.startNumber, cluster.endNumber);
  const end = Math.max(cluster.startNumber, cluster.endNumber);
  const numbers: number[] = [];
  for (let n = start; n <= end && numbers.length < CLUSTER_SIZE; n += 1) {
    numbers.push(n);
  }
  return numbers;
}

function applyClusters(
  questions: Question[],
  clusters: ParsedCluster[] | undefined,
  examCode: ExamCode,
): Question[] {
  if (!clusters || clusters.length === 0) return questions;

  const byNumber = new Map(
    questions.map((question) => [question.originalNumber, { ...question }]),
  );
  const defaultKind = EXAM_SPECS[examCode].clusterKind;

  for (const cluster of clusters) {
    const clusterId = randomUUID();
    const kind: ClusterKind = cluster.kind ?? defaultKind;
    const passage = cluster.passage.trim();
    let position = 1;
    for (const n of clusterQuestionNumbers(cluster)) {
      const question = byNumber.get(n);
      if (!question || !isMcq(question.type)) continue;
      byNumber.set(n, {
        ...question,
        section: "cluster",
        clusterId,
        clusterPosition: position,
        clusterKind: kind,
        passage,
      });
      position += 1;
    }
  }

  return Array.from(byNumber.values()).sort(
    (a, b) => a.originalNumber - b.originalNumber,
  );
}

export function normalizeParsedQuestions(
  items: ParsedExam["questions"],
  answerKey?: AnswerKey,
  clusters?: ParsedCluster[],
  examCode: ExamCode = "CA1",
): Question[] {
  const merged = [...items];
  const seen = new Set(items.map((item) => item.originalNumber));
  for (const cluster of clusters ?? []) {
    for (const question of cluster.questions ?? []) {
      if (seen.has(question.originalNumber)) continue;
      merged.push(question);
      seen.add(question.originalNumber);
    }
  }

  const questions: Question[] = [];

  for (const item of merged) {
    const fromKey = answerKey?.[String(item.originalNumber)];
    const type = fromKey
      ? /^[A-D]$/i.test(fromKey)
        ? "mcq"
        : "fill"
      : normalizeQuestionType(item.type === "mcq" && item.options ? "mcq" : "fill");

    if (type === "mcq" && !item.options) {
      continue;
    }

    questions.push({
      originalNumber: item.originalNumber,
      type,
      stem: item.stem.trim(),
      options: type === "mcq" ? item.options : undefined,
      section: type === "fill" ? "fill" : "independent",
    });
  }

  const withClusters = applyClusters(questions, clusters, examCode);
  return withClusters.sort((a, b) => a.originalNumber - b.originalNumber);
}

export function assertExpectedQuestions(
  questions: Question[],
  expectedCount: number,
): void {
  const byNumber = new Map(questions.map((question) => [question.originalNumber, question]));
  const missing: number[] = [];
  for (let n = 1; n <= expectedCount; n += 1) {
    if (!byNumber.has(n)) missing.push(n);
  }
  if (missing.length > 0) {
    throw new Error(
      `Gemini chỉ trích được ${byNumber.size} câu, thiếu: ${missing.join(", ")}. Hãy thử upload lại.`,
    );
  }
}

export function normalizeParsedExam(
  parsed: ParsedExam,
  answerKey?: AnswerKey,
  expectedCount?: number,
  examCode: ExamCode = "CA1",
): NormalizedExam {
  const questions = normalizeParsedQuestions(
    parsed.questions,
    answerKey,
    parsed.clusters,
    examCode,
  );
  if (expectedCount) {
    assertExpectedQuestions(questions, expectedCount);
  }
  return {
    title: parsed.title.trim(),
    essayPrompt: parsed.essayPrompt.trim(),
    questions,
  };
}

export async function parseExamPdf(
  pdfBytes: Uint8Array,
  answerKey?: AnswerKey,
  examCode: ExamCode = "CA1",
): Promise<NormalizedExam> {
  const object = await generateFromDocument<ParsedExam>({
    schema: parsedExamSchema,
    prompt: fullExamPrompt(examCode),
    file: {
      bytes: pdfBytes,
      mediaType: "application/pdf",
      filename: "de-thi.pdf",
    },
  });
  return normalizeParsedExam(
    object,
    answerKey,
    EXAM_SPECS[examCode].total,
    examCode,
  );
}

export async function parseEssayDocument(params: {
  file?: GeminiFile;
  text?: string;
}): Promise<string> {
  const object = await generateFromDocument<{ essayPrompt: string }>({
    schema: parsedEssaySchema,
    prompt: ESSAY_PROMPT,
    file: params.file,
    text: params.text,
  });
  const prompt = object.essayPrompt.trim();
  if (!prompt) {
    throw new Error("Không trích được đề nghị luận xã hội từ file.");
  }
  return prompt;
}

export async function parseQuestionsDocument(params: {
  examCode: ExamCode;
  answerKey?: AnswerKey;
  file?: GeminiFile;
  text?: string;
}): Promise<Question[]> {
  const object = await generateFromDocument<{
    questions: ParsedExam["questions"];
    clusters?: ParsedCluster[];
  }>({
    schema: parsedQuestionsSchema,
    prompt: questionsPrompt(params.examCode),
    file: params.file,
    text: params.text,
  });
  const questions = normalizeParsedQuestions(
    object.questions,
    params.answerKey,
    object.clusters,
    params.examCode,
  );
  if (questions.length === 0) {
    throw new Error("Không trích được câu hỏi phần 2 từ file.");
  }
  return questions;
}

export function defaultClusterHeader(kind: ClusterKind): string {
  return clusterHeaderTemplate(kind);
}
