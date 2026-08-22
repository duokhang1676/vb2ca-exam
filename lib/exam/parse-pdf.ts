import { generateObject } from "ai";
import type { ZodType } from "zod";
import { EXAM_SPECS } from "./constants";
import { GEMINI_MODEL, getGemini } from "./gemini";
import {
  parsedEssaySchema,
  parsedExamSchema,
  parsedQuestionsSchema,
  type ParsedExam,
} from "./schema";
import {
  normalizeQuestionType,
  type AnswerKey,
  type ExamCode,
  type Question,
} from "./types";

const LATEX_RULES = `- Công thức toán PHẢI viết LaTeX: $...$ (inline) hoặc $$...$$ (display). Ma trận, định thức, hệ phương trình, tích phân, đạo hàm đều dùng LaTeX.
- Giữ nguyên ý câu hỏi, không giải bài, không thêm đáp án.
- stem có thể gồm nhiều dòng; dùng \\n khi xuống dòng.
- Câu 4 lựa chọn A/B/C/D: type = "mcq", phải có options.A/B/C/D.
- Câu điền số/chữ (không có 4 đáp án): type = "fill", không cần options.`;

function fullExamPrompt(examCode: ExamCode): string {
  const spec = EXAM_SPECS[examCode];
  return `Bạn là hệ thống OCR/trích xuất đề thi Văn bằng 2 Công an (VB2CA), mã ${examCode}.

Hãy đọc file đề thi và trả về JSON đúng schema:
- title: tên đề ngắn (ví dụ "${examCode} — Đề minh họa 2026")
- essayPrompt: nguyên văn phần tự luận nghị luận xã hội (Phần 1), gồm yêu cầu làm bài nếu có.
- questions: đúng các câu phần trắc nghiệm/điền đáp án (Phần 2). Giữ originalNumber như trong đề.

Quy tắc:
${LATEX_RULES}
- Đề ${examCode} có ${spec.total} câu phần 2 (${spec.mcq} trắc nghiệm + ${spec.fill} điền). Trả đủ, không bỏ câu.`;
}

const ESSAY_PROMPT = `Bạn là hệ thống trích xuất đề nghị luận xã hội kỳ thi Văn bằng 2 Công an.

Hãy đọc tài liệu và trả về JSON:
- essayPrompt: nguyên văn phần tự luận nghị luận xã hội (Phần 1). Nếu tài liệu có nhiều đề, lấy tất cả đề nghị luận, ngăn cách bằng \\n\\n---\\n\\n. Bỏ phần trắc nghiệm nếu có.

Giữ nguyên văn, không tóm tắt, không thêm đáp án.`;

function questionsPrompt(examCode: ExamCode): string {
  return `Bạn là hệ thống OCR/trích xuất câu hỏi trắc nghiệm kỳ thi Văn bằng 2 Công an, mã ${examCode}.

Hãy đọc tài liệu (chỉ phần 2 — trắc nghiệm/điền đáp án) và trả về JSON:
- questions: mọi câu hỏi tìm được. Giữ originalNumber như trong đề.

Quy tắc:
${LATEX_RULES}
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

export function normalizeParsedQuestions(
  items: ParsedExam["questions"],
  answerKey?: AnswerKey,
): Question[] {
  const questions: Question[] = [];

  for (const item of items) {
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
    });
  }

  return questions.sort((a, b) => a.originalNumber - b.originalNumber);
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
): NormalizedExam {
  const questions = normalizeParsedQuestions(parsed.questions, answerKey);
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
  return normalizeParsedExam(object, answerKey, EXAM_SPECS[examCode].total);
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
  const object = await generateFromDocument<{ questions: ParsedExam["questions"] }>({
    schema: parsedQuestionsSchema,
    prompt: questionsPrompt(params.examCode),
    file: params.file,
    text: params.text,
  });
  const questions = normalizeParsedQuestions(object.questions, params.answerKey);
  if (questions.length === 0) {
    throw new Error("Không trích được câu hỏi phần 2 từ file.");
  }
  return questions;
}
