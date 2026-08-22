import { generateObject } from "ai";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { asJson } from "./json";
import {
  essayFingerprint,
  isNearDuplicate,
  questionFingerprint,
} from "./fingerprint";
import { GEMINI_MODEL, getGemini } from "./gemini";
import { nearDuplicateSchema } from "./schema";
import {
  isMcq,
  normalizeQuestionType,
  type AnswerKey,
  type ExamCode,
  type McqOptions,
  type Question,
  type QuestionType,
} from "./types";

export type ImportSummary = {
  added: number;
  skipped: number;
};

type ExistingQuestion = {
  id: string;
  stem: string;
  fingerprint: string;
};

type IncomingQuestion = {
  type: QuestionType;
  stem: string;
  options?: McqOptions;
  answer: string;
  fingerprint: string;
};

function splitEssayPrompts(raw: string): string[] {
  return raw
    .split(/\n\s*---\s*\n/)
    .map((part) => part.trim())
    .filter((part) => part.length > 20);
}

async function detectNearDuplicateIndexes(params: {
  incoming: { index: number; text: string }[];
  existing: { id: string; text: string }[];
}): Promise<Set<number>> {
  const candidates = params.incoming.filter((item) =>
    params.existing.some((existing) => isNearDuplicate(item.text, existing.text)),
  );
  if (candidates.length === 0) return new Set();

  const google = getGemini();
  const { object } = await generateObject({
    model: google(GEMINI_MODEL),
    schema: nearDuplicateSchema,
    prompt: `Bạn so khớp câu hỏi/đề bài tiếng Việt để loại trùng.

Câu MỚI (index):
${candidates.map((item) => `[${item.index}] ${item.text}`).join("\n\n")}

Câu ĐÃ CÓ:
${params.existing.map((item) => `[${item.id}] ${item.text}`).join("\n\n")}

Trả về duplicateNewIndexes: các index câu MỚI mà về bản chất cùng một câu/đề với câu đã có (cùng ý, cùng dữ kiện, chỉ khác diễn đạt nhẹ). Không liệt kê câu khác biệt.`,
  });

  return new Set(object.duplicateNewIndexes);
}

export async function importEssays(
  rawPrompt: string,
  sourceFilename?: string,
): Promise<ImportSummary> {
  const prompts = splitEssayPrompts(rawPrompt);
  if (prompts.length === 0) {
    throw new Error("Không tìm thấy đề nghị luận hợp lệ trong file.");
  }

  const supabase = getSupabaseAdmin();
  const { data: existingRows, error } = await supabase
    .from("essays")
    .select("id, prompt, fingerprint");
  if (error) throw new Error(error.message);

  const existing = existingRows ?? [];
  const existingFingerprints = new Set(existing.map((row) => row.fingerprint));

  const uniqueNew: { prompt: string; fingerprint: string }[] = [];
  let skipped = 0;

  for (const prompt of prompts) {
    const fingerprint = essayFingerprint(prompt);
    if (existingFingerprints.has(fingerprint)) {
      skipped += 1;
      continue;
    }
    if (uniqueNew.some((item) => item.fingerprint === fingerprint)) {
      skipped += 1;
      continue;
    }
    uniqueNew.push({ prompt, fingerprint });
  }

  const nearDup = await detectNearDuplicateIndexes({
    incoming: uniqueNew.map((item, index) => ({ index, text: item.prompt })),
    existing: existing.map((row) => ({ id: row.id, text: row.prompt })),
  });

  const toInsert = uniqueNew.filter((_, index) => {
    if (nearDup.has(index)) {
      skipped += 1;
      return false;
    }
    return true;
  });

  if (toInsert.length > 0) {
    const { error: insertError } = await supabase.from("essays").upsert(
      toInsert.map((item) => ({
        prompt: item.prompt,
        fingerprint: item.fingerprint,
        source_filename: sourceFilename ?? null,
      })),
      { onConflict: "fingerprint", ignoreDuplicates: true },
    );
    if (insertError) throw new Error(insertError.message);
  }

  return { added: toInsert.length, skipped };
}

export async function importQuestions(params: {
  examCode: ExamCode;
  questions: Question[];
  answerKey: AnswerKey;
}): Promise<ImportSummary> {
  const prepared: IncomingQuestion[] = [];
  for (const question of params.questions) {
    const answer = params.answerKey[String(question.originalNumber)]?.trim();
    if (!answer) continue;
    const type =
      isMcq(question.type) && /^[A-D]$/i.test(answer)
        ? "mcq"
        : normalizeQuestionType(question.type);
    if (type === "mcq" && !question.options) continue;
    prepared.push({
      type,
      stem: question.stem,
      options: type === "mcq" ? question.options : undefined,
      answer,
      fingerprint: questionFingerprint({
        examCode: params.examCode,
        type,
        stem: question.stem,
        options: type === "mcq" ? question.options : undefined,
      }),
    });
  }

  if (prepared.length === 0) {
    throw new Error("Không ghép được câu hỏi nào với file đáp án.");
  }

  const supabase = getSupabaseAdmin();
  const { data: existingRows, error } = await supabase
    .from("questions")
    .select("id, stem, fingerprint")
    .eq("exam_code", params.examCode);
  if (error) throw new Error(error.message);

  const existing: ExistingQuestion[] = existingRows ?? [];
  const existingFingerprints = new Set(existing.map((row) => row.fingerprint));

  const uniqueNew: IncomingQuestion[] = [];
  let skipped = 0;

  for (const item of prepared) {
    if (existingFingerprints.has(item.fingerprint)) {
      skipped += 1;
      continue;
    }
    if (uniqueNew.some((seen) => seen.fingerprint === item.fingerprint)) {
      skipped += 1;
      continue;
    }
    uniqueNew.push(item);
  }

  const nearDup = await detectNearDuplicateIndexes({
    incoming: uniqueNew.map((item, index) => ({ index, text: item.stem })),
    existing: existing.map((row) => ({ id: row.id, text: row.stem })),
  });

  const toInsert = uniqueNew.filter((_, index) => {
    if (nearDup.has(index)) {
      skipped += 1;
      return false;
    }
    return true;
  });

  if (toInsert.length > 0) {
    const { error: insertError } = await supabase.from("questions").upsert(
      toInsert.map((item) => ({
        exam_code: params.examCode,
        type: item.type,
        stem: item.stem,
        options: item.options ? asJson(item.options) : null,
        answer: item.answer,
        fingerprint: item.fingerprint,
      })),
      { onConflict: "exam_code,fingerprint", ignoreDuplicates: true },
    );
    if (insertError) throw new Error(insertError.message);
  }

  return { added: toInsert.length, skipped };
}

export async function importParsedIntoBank(params: {
  examCode: ExamCode;
  essayPrompt: string;
  questions: Question[];
  answerKey: AnswerKey;
  sourceFilename?: string;
}): Promise<{ essays: ImportSummary; questions: ImportSummary }> {
  const essays = await importEssays(params.essayPrompt, params.sourceFilename);
  const questions = await importQuestions({
    examCode: params.examCode,
    questions: params.questions,
    answerKey: params.answerKey,
  });
  return { essays, questions };
}
