import { generateObject } from "ai";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { CLUSTER_SIZE, clusterHeaderTemplate } from "./constants";
import { asJson } from "./json";
import {
  clusterFingerprint,
  essayFingerprint,
  isNearDuplicate,
  questionFingerprint,
} from "./fingerprint";
import { GEMINI_MODEL, getGemini } from "./gemini";
import { nearDuplicateSchema } from "./schema";
import {
  isClusterKind,
  isMcq,
  normalizeQuestionType,
  type AnswerKey,
  type ClusterKind,
  type ExamCode,
  type McqOptions,
  type Question,
  type QuestionType,
} from "./types";

export type ImportSummary = {
  added: number;
  skipped: number;
};

export type ImportAttribution = {
  createdBy?: string;
  contributionId?: string | null;
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
  clusterPosition?: number;
};

export function splitEssayPrompts(raw: string): string[] {
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
  attribution?: ImportAttribution,
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
        created_by: attribution?.createdBy ?? null,
        contribution_id: attribution?.contributionId ?? null,
      })),
      { onConflict: "fingerprint", ignoreDuplicates: true },
    );
    if (insertError) throw new Error(insertError.message);
  }

  return { added: toInsert.length, skipped };
}

function toIncoming(
  examCode: ExamCode,
  question: Question,
  answer: string,
): IncomingQuestion | null {
  const type =
    isMcq(question.type) && /^[A-D]$/i.test(answer)
      ? "mcq"
      : normalizeQuestionType(question.type);
  if (type === "mcq" && !question.options) return null;
  return {
    type,
    stem: question.stem,
    options: type === "mcq" ? question.options : undefined,
    answer,
    fingerprint: questionFingerprint({
      examCode,
      type,
      stem: question.stem,
      options: type === "mcq" ? question.options : undefined,
    }),
    clusterPosition: question.clusterPosition,
  };
}

async function insertStandaloneQuestions(params: {
  examCode: ExamCode;
  incoming: IncomingQuestion[];
  attribution?: ImportAttribution;
}): Promise<ImportSummary> {
  if (params.incoming.length === 0) return { added: 0, skipped: 0 };

  const supabase = getSupabaseAdmin();
  const { data: existingRows, error } = await supabase
    .from("questions")
    .select("id, stem, fingerprint")
    .eq("exam_code", params.examCode)
    .is("cluster_id", null);
  if (error) throw new Error(error.message);

  const existing: ExistingQuestion[] = existingRows ?? [];
  const existingFingerprints = new Set(existing.map((row) => row.fingerprint));

  const uniqueNew: IncomingQuestion[] = [];
  let skipped = 0;

  for (const item of params.incoming) {
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
        cluster_id: null,
        cluster_position: null,
        created_by: params.attribution?.createdBy ?? null,
        contribution_id: params.attribution?.contributionId ?? null,
      })),
      { onConflict: "exam_code,fingerprint", ignoreDuplicates: true },
    );
    if (insertError) throw new Error(insertError.message);
  }

  return { added: toInsert.length, skipped };
}

async function importCluster(params: {
  examCode: ExamCode;
  kind: ClusterKind;
  passage: string;
  members: IncomingQuestion[];
  attribution?: ImportAttribution;
}): Promise<ImportSummary> {
  const members = [...params.members]
    .sort((a, b) => (a.clusterPosition ?? 0) - (b.clusterPosition ?? 0))
    .slice(0, CLUSTER_SIZE);
  if (members.length < 2) {
    return insertStandaloneQuestions({
      examCode: params.examCode,
      incoming: members,
      attribution: params.attribution,
    });
  }

  const fingerprint = clusterFingerprint({
    examCode: params.examCode,
    kind: params.kind,
    passage: params.passage,
    stems: members.map((item) => item.stem),
  });

  const supabase = getSupabaseAdmin();
  const { data: existing, error } = await supabase
    .from("question_clusters")
    .select("id, passage, fingerprint")
    .eq("exam_code", params.examCode);
  if (error) throw new Error(error.message);

  const rows = existing ?? [];
  if (rows.some((row) => row.fingerprint === fingerprint)) {
    return { added: 0, skipped: members.length };
  }

  const nearDup = await detectNearDuplicateIndexes({
    incoming: [{ index: 0, text: params.passage }],
    existing: rows.map((row) => ({ id: row.id, text: row.passage })),
  });
  if (nearDup.has(0)) {
    return { added: 0, skipped: members.length };
  }

  const { data: cluster, error: clusterError } = await supabase
    .from("question_clusters")
    .insert({
      exam_code: params.examCode,
      kind: params.kind,
      header_template: clusterHeaderTemplate(params.kind),
      passage: params.passage,
      fingerprint,
    })
    .select("id")
    .single();
  if (clusterError || !cluster) {
    throw new Error(clusterError?.message || "Không lưu được cụm câu hỏi.");
  }

  const { error: insertError } = await supabase.from("questions").insert(
    members.map((item, index) => ({
      exam_code: params.examCode,
      type: item.type,
      stem: item.stem,
      options: item.options ? asJson(item.options) : null,
      answer: item.answer,
      fingerprint: `${item.fingerprint}:${cluster.id}:${index + 1}`,
      cluster_id: cluster.id,
      cluster_position: index + 1,
      created_by: params.attribution?.createdBy ?? null,
      contribution_id: params.attribution?.contributionId ?? null,
    })),
  );
  if (insertError) throw new Error(insertError.message);

  return { added: members.length, skipped: 0 };
}

export async function importQuestions(params: {
  examCode: ExamCode;
  questions: Question[];
  answerKey: AnswerKey;
  attribution?: ImportAttribution;
}): Promise<ImportSummary> {
  const standalone: IncomingQuestion[] = [];
  const clusters = new Map<
    string,
    { kind: ClusterKind; passage: string; members: IncomingQuestion[] }
  >();

  for (const question of params.questions) {
    const answer = params.answerKey[String(question.originalNumber)]?.trim();
    if (!answer) continue;
    const incoming = toIncoming(params.examCode, question, answer);
    if (!incoming) continue;

    if (question.clusterId && isMcq(incoming.type)) {
      const current = clusters.get(question.clusterId) ?? {
        kind: isClusterKind(question.clusterKind)
          ? question.clusterKind
          : "passage",
        passage: question.passage ?? "",
        members: [],
      };
      if (!current.passage && question.passage) {
        current.passage = question.passage;
      }
      current.members.push(incoming);
      clusters.set(question.clusterId, current);
      continue;
    }

    standalone.push(incoming);
  }

  let added = 0;
  let skipped = 0;

  for (const cluster of clusters.values()) {
    if (!cluster.passage.trim() || cluster.members.length < 2) {
      standalone.push(...cluster.members);
      continue;
    }
    const result = await importCluster({
      examCode: params.examCode,
      kind: cluster.kind,
      passage: cluster.passage,
      members: cluster.members,
      attribution: params.attribution,
    });
    added += result.added;
    skipped += result.skipped;
  }

  const standaloneResult = await insertStandaloneQuestions({
    examCode: params.examCode,
    incoming: standalone,
    attribution: params.attribution,
  });
  added += standaloneResult.added;
  skipped += standaloneResult.skipped;

  if (added + skipped === 0) {
    throw new Error("Không ghép được câu hỏi nào với file đáp án.");
  }

  return { added, skipped };
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

export async function existingEssayFingerprints(): Promise<Set<string>> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("essays").select("fingerprint");
  if (error) throw new Error(error.message);
  return new Set((data ?? []).map((row) => row.fingerprint));
}

export async function existingQuestionContentFingerprints(
  examCode: ExamCode,
): Promise<Set<string>> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("questions")
    .select("fingerprint, stem, options, type")
    .eq("exam_code", examCode);
  if (error) throw new Error(error.message);
  const fingerprints = new Set<string>();
  for (const row of data ?? []) {
    fingerprints.add(row.fingerprint);
    fingerprints.add(
      questionFingerprint({
        examCode,
        type: normalizeQuestionType(row.type),
        stem: row.stem,
        options: (row.options as McqOptions | null) ?? undefined,
      }),
    );
  }
  return fingerprints;
}
