import { randomUUID } from "node:crypto";
import {
  existingEssayFingerprints,
  existingQuestionContentFingerprints,
  splitEssayPrompts,
} from "@/lib/exam/bank";
import { clusterHeaderTemplate } from "@/lib/exam/constants";
import { essayFingerprint, questionFingerprint } from "@/lib/exam/fingerprint";
import { ContributeError } from "@/lib/exam/contribute-error";
import type {
  AnswerKey,
  ExamCode,
  Question,
} from "@/lib/exam/types";
import { isClusterKind, isExamCode, isMcq, normalizeQuestionType } from "@/lib/exam/types";
import type {
  ContributionDraftPayload,
  DraftQuestionItem,
  EssayDraftPayload,
  QuestionDraftPayload,
} from "@/lib/exam/draft-types";

export type {
  ContributionDraftPayload,
  DraftEssayItem,
  DraftQuestionItem,
  EssayDraftPayload,
  QuestionDraftPayload,
} from "@/lib/exam/draft-types";

export async function buildEssayDraft(
  rawPrompt: string,
  sourceFilename: string,
): Promise<EssayDraftPayload> {
  const prompts = splitEssayPrompts(rawPrompt);
  if (prompts.length === 0) {
    throw new ContributeError(
      "OCR_EMPTY",
      "Không tìm thấy đề nghị luận hợp lệ trong file.",
      "Không đọc được đề nghị luận",
      [
        "File phải chứa Phần 1 nghị luận xã hội, không chỉ trang bìa.",
        "Nhiều đề thì ngăn cách bằng một dòng ---.",
        "Thử xuất lại PDF thành DOCX nếu chữ không chọn được.",
      ],
    );
  }
  const existing = await existingEssayFingerprints();
  return {
    kind: "essay",
    sourceFilename,
    items: prompts.map((prompt) => {
      const fingerprint = essayFingerprint(prompt);
      return {
        id: randomUUID(),
        prompt,
        fingerprint,
        duplicate: existing.has(fingerprint),
        keep: !existing.has(fingerprint),
      };
    }),
  };
}

export async function buildQuestionDraft(params: {
  examCode: ExamCode;
  questions: Question[];
  answerKey: AnswerKey;
  sourceFilename: string;
  answerFilename: string;
}): Promise<QuestionDraftPayload> {
  const existing = await existingQuestionContentFingerprints(params.examCode);
  const items: DraftQuestionItem[] = [];

  for (const question of params.questions) {
    const answer = params.answerKey[String(question.originalNumber)]?.trim();
    if (!answer) continue;
    const type =
      isMcq(question.type) && /^[A-D]$/i.test(answer)
        ? "mcq"
        : normalizeQuestionType(question.type);
    if (type === "mcq" && !question.options) continue;
    const fingerprint = questionFingerprint({
      examCode: params.examCode,
      type,
      stem: question.stem,
      options: type === "mcq" ? question.options : undefined,
    });
    const duplicate = existing.has(fingerprint);
    items.push({
      id: randomUUID(),
      originalNumber: question.originalNumber,
      type,
      stem: question.stem,
      options: type === "mcq" ? question.options : undefined,
      answer,
      clusterId: question.clusterId,
      clusterKind: question.clusterKind,
      passage: question.passage,
      clusterHeader: question.clusterId
        ? clusterHeaderTemplate(question.clusterKind ?? "passage")
        : undefined,
      clusterPosition: question.clusterPosition,
      fingerprint,
      duplicate,
      keep: !duplicate,
    });
  }

  if (items.length === 0) {
    throw new ContributeError(
      "OCR_EMPTY",
      "Không ghép được câu hỏi nào với file đáp án.",
      "Không đọc được câu hỏi phần 2",
      [
        "Số câu trong PDF/DOCX phải khớp số dòng trong TXT đáp án.",
        "Đáp án mỗi dòng dạng `1 A` hoặc `46 72`.",
        "Tải file mẫu đáp án rồi so sánh encoding UTF-8.",
      ],
    );
  }

  return {
    kind: "questions",
    examCode: params.examCode,
    sourceFilename: params.sourceFilename,
    answerFilename: params.answerFilename,
    items,
  };
}

export function payloadFromUnknown(value: unknown): ContributionDraftPayload | null {
  if (!value || typeof value !== "object") return null;
  const payload = value as ContributionDraftPayload;
  if (payload.kind === "essay" && Array.isArray(payload.items)) return payload;
  if (
    payload.kind === "questions" &&
    isExamCode(payload.examCode) &&
    Array.isArray(payload.items)
  ) {
    return payload;
  }
  return null;
}

export function keptEssayPrompt(payload: EssayDraftPayload): string {
  return payload.items
    .filter((item) => item.keep && item.prompt.trim().length > 20)
    .map((item) => item.prompt.trim())
    .join("\n\n---\n\n");
}

export function keptQuestions(payload: QuestionDraftPayload): {
  questions: Question[];
  answerKey: AnswerKey;
} {
  const questions: Question[] = [];
  const answerKey: AnswerKey = {};
  for (const item of payload.items) {
    if (!item.keep || !item.stem.trim() || !item.answer.trim()) continue;
    const type = normalizeQuestionType(item.type);
    questions.push({
      originalNumber: item.originalNumber,
      type,
      stem: item.stem.trim(),
      options: type === "mcq" ? item.options : undefined,
      section: item.clusterId ? "cluster" : type === "fill" ? "fill" : "independent",
      clusterId: item.clusterId,
      clusterKind: isClusterKind(item.clusterKind) ? item.clusterKind : undefined,
      passage: item.passage,
      clusterPosition: item.clusterPosition,
    });
    answerKey[String(item.originalNumber)] = item.answer.trim();
  }
  return { questions, answerKey };
}
