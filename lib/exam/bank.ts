import { generateObject } from "ai";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { CLUSTER_SIZE, clusterHeaderTemplate, OPTION_LETTERS } from "./constants";
import { ContributeError } from "./contribute-error";
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
  type OptionLetter,
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
  checkNearDuplicates = true,
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

  const nearDup = checkNearDuplicates
    ? await detectNearDuplicateIndexes({
        incoming: uniqueNew.map((item, index) => ({ index, text: item.prompt })),
        existing: existing.map((row) => ({ id: row.id, text: row.prompt })),
      })
    : new Set<number>();

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
  checkNearDuplicates?: boolean;
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

  const nearDup =
    params.checkNearDuplicates === false
      ? new Set<number>()
      : await detectNearDuplicateIndexes({
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
  checkNearDuplicates?: boolean;
}): Promise<ImportSummary> {
  const members = [...params.members]
    .sort((a, b) => (a.clusterPosition ?? 0) - (b.clusterPosition ?? 0))
    .slice(0, CLUSTER_SIZE);
  if (members.length < 2) {
    return insertStandaloneQuestions({
      examCode: params.examCode,
      incoming: members,
      attribution: params.attribution,
      checkNearDuplicates: params.checkNearDuplicates,
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

  if (params.checkNearDuplicates !== false) {
    const nearDup = await detectNearDuplicateIndexes({
      incoming: [{ index: 0, text: params.passage }],
      existing: rows.map((row) => ({ id: row.id, text: row.passage })),
    });
    if (nearDup.has(0)) {
      return { added: 0, skipped: members.length };
    }
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
  checkNearDuplicates?: boolean;
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
      checkNearDuplicates: params.checkNearDuplicates,
    });
    added += result.added;
    skipped += result.skipped;
  }

  const standaloneResult = await insertStandaloneQuestions({
    examCode: params.examCode,
    incoming: standalone,
    attribution: params.attribution,
    checkNearDuplicates: params.checkNearDuplicates,
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
  checkNearDuplicates?: boolean;
}): Promise<{ essays: ImportSummary; questions: ImportSummary }> {
  const essays = await importEssays(
    params.essayPrompt,
    params.sourceFilename,
    undefined,
    params.checkNearDuplicates,
  );
  const questions = await importQuestions({
    examCode: params.examCode,
    questions: params.questions,
    answerKey: params.answerKey,
    checkNearDuplicates: params.checkNearDuplicates,
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

export type UpdatedEssay = {
  id: string;
  prompt: string;
};

export type UpdatedQuestion = {
  id: string;
  stem: string;
  options?: McqOptions;
  answer: string;
};

export type UpdatedCluster = {
  id: string;
  passage: string;
};

function invalidContent(message: string, steps: string[]) {
  return new ContributeError("INVALID_CONTENT", message, "Nội dung chưa hợp lệ", steps);
}

function parseMcqOptions(value: unknown): McqOptions {
  if (!value || typeof value !== "object") {
    throw invalidContent("Câu trắc nghiệm cần đủ bốn lựa chọn A B C D.", [
      "Điền đầy đủ nội dung các lựa chọn.",
    ]);
  }
  const record = value as Record<string, unknown>;
  const options = {} as McqOptions;
  for (const letter of OPTION_LETTERS) {
    const text = String(record[letter] ?? "").trim();
    if (!text) {
      throw invalidContent(`Thiếu lựa chọn ${letter}.`, [
        "Điền đủ A, B, C, D trước khi lưu.",
      ]);
    }
    options[letter] = text;
  }
  return options;
}

async function assertClusterFingerprintFree(params: {
  clusterId: string;
  examCode: ExamCode;
  fingerprint: string;
}) {
  const supabase = getSupabaseAdmin();
  const { data: clash, error } = await supabase
    .from("question_clusters")
    .select("id")
    .eq("exam_code", params.examCode)
    .eq("fingerprint", params.fingerprint)
    .neq("id", params.clusterId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (clash) {
    throw new ContributeError(
      "DUPLICATE",
      "Cụm sau khi sửa trùng với một cụm đã có trong ngân hàng.",
      "Cụm bị trùng",
      ["Đổi đoạn thông tin hoặc đề câu trong cụm rồi lưu lại."],
    );
  }
}

async function writeClusterFingerprint(clusterId: string, fingerprint: string) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("question_clusters")
    .update({ fingerprint })
    .eq("id", clusterId);
  if (error) throw new Error(error.message);
}

export async function updateEssay(id: string, prompt: string): Promise<UpdatedEssay> {
  const trimmed = prompt.trim();
  if (!trimmed) {
    throw invalidContent("Đề nghị luận không được để trống.", [
      "Nhập nội dung đề rồi bấm Lưu.",
    ]);
  }

  const fingerprint = essayFingerprint(trimmed);
  const supabase = getSupabaseAdmin();
  const { data: clash, error: clashError } = await supabase
    .from("essays")
    .select("id")
    .eq("fingerprint", fingerprint)
    .neq("id", id)
    .maybeSingle();
  if (clashError) throw new Error(clashError.message);
  if (clash) {
    throw new ContributeError(
      "DUPLICATE",
      "Đề này đã có trong ngân hàng.",
      "Đề bị trùng",
      ["Sửa nội dung cho khác đề hiện có, hoặc hủy nếu không cần đổi."],
    );
  }

  const { data, error } = await supabase
    .from("essays")
    .update({ prompt: trimmed, fingerprint })
    .eq("id", id)
    .select("id, prompt")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) {
    throw new ContributeError(
      "NOT_FOUND",
      "Không tìm thấy đề nghị luận.",
      "Đề không còn trong ngân hàng",
      ["Tải lại trang rồi thử sửa đề khác."],
    );
  }
  return { id: data.id, prompt: data.prompt };
}

export async function updateQuestion(
  id: string,
  input: { stem: string; options?: McqOptions | null; answer: string },
): Promise<UpdatedQuestion> {
  const supabase = getSupabaseAdmin();
  const { data: row, error: loadError } = await supabase
    .from("questions")
    .select("id, exam_code, type, cluster_id, cluster_position")
    .eq("id", id)
    .maybeSingle();
  if (loadError) throw new Error(loadError.message);
  if (!row) {
    throw new ContributeError(
      "NOT_FOUND",
      "Không tìm thấy câu hỏi.",
      "Câu không còn trong ngân hàng",
      ["Tải lại trang rồi thử sửa câu khác."],
    );
  }

  const type = normalizeQuestionType(row.type);
  const examCode = row.exam_code as ExamCode;
  const stem = input.stem.trim();
  const answer = input.answer.trim();
  if (!stem) {
    throw invalidContent("Đề bài không được để trống.", ["Nhập đề bài rồi bấm Lưu."]);
  }

  let options: McqOptions | undefined;
  if (isMcq(type)) {
    options = parseMcqOptions(input.options);
    if (!OPTION_LETTERS.includes(answer.toUpperCase() as OptionLetter)) {
      throw invalidContent("Đáp án trắc nghiệm phải là A, B, C hoặc D.", [
        "Nhập đúng một chữ cái A–D.",
      ]);
    }
  } else if (!answer) {
    throw invalidContent("Câu điền cần có đáp án.", ["Nhập đáp án rồi bấm Lưu."]);
  }

  const normalizedAnswer = isMcq(type) ? answer.toUpperCase() : answer;
  const contentHash = questionFingerprint({
    examCode,
    type,
    stem,
    options,
  });
  const fingerprint = row.cluster_id
    ? `${contentHash}:${row.cluster_id}:${row.cluster_position}`
    : contentHash;

  const { data: clash, error: clashError } = await supabase
    .from("questions")
    .select("id")
    .eq("exam_code", examCode)
    .eq("fingerprint", fingerprint)
    .neq("id", id)
    .maybeSingle();
  if (clashError) throw new Error(clashError.message);
  if (clash) {
    throw new ContributeError(
      "DUPLICATE",
      "Câu này đã có trong ngân hàng.",
      "Câu bị trùng",
      ["Sửa đề hoặc lựa chọn cho khác câu hiện có."],
    );
  }

  let nextClusterFingerprint: string | null = null;
  if (row.cluster_id) {
    const { data: cluster, error: clusterError } = await supabase
      .from("question_clusters")
      .select("id, exam_code, kind, passage")
      .eq("id", row.cluster_id)
      .maybeSingle();
    if (clusterError) throw new Error(clusterError.message);
    if (cluster) {
      const { data: members, error: membersError } = await supabase
        .from("questions")
        .select("id, stem, cluster_position")
        .eq("cluster_id", row.cluster_id)
        .order("cluster_position", { ascending: true });
      if (membersError) throw new Error(membersError.message);
      nextClusterFingerprint = clusterFingerprint({
        examCode: cluster.exam_code as ExamCode,
        kind: isClusterKind(cluster.kind) ? cluster.kind : "passage",
        passage: cluster.passage,
        stems: (members ?? []).map((member) =>
          member.id === id ? stem : member.stem,
        ),
      });
      await assertClusterFingerprintFree({
        clusterId: cluster.id,
        examCode: cluster.exam_code as ExamCode,
        fingerprint: nextClusterFingerprint,
      });
    }
  }

  const { data, error } = await supabase
    .from("questions")
    .update({
      stem,
      options: options ? asJson(options) : null,
      answer: normalizedAnswer,
      fingerprint,
    })
    .eq("id", id)
    .select("id, stem, options, answer")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) {
    throw new ContributeError(
      "NOT_FOUND",
      "Không tìm thấy câu hỏi.",
      "Câu không còn trong ngân hàng",
      ["Tải lại trang rồi thử sửa câu khác."],
    );
  }

  if (row.cluster_id && nextClusterFingerprint) {
    await writeClusterFingerprint(row.cluster_id, nextClusterFingerprint);
  }

  return {
    id: data.id,
    stem: data.stem,
    options: (data.options as McqOptions | null) ?? undefined,
    answer: data.answer,
  };
}

export async function updateClusterPassage(
  id: string,
  passage: string,
): Promise<UpdatedCluster> {
  const trimmed = passage.trim();
  if (!trimmed) {
    throw invalidContent("Đoạn thông tin / tình huống không được để trống.", [
      "Nhập đoạn dùng chung rồi bấm Lưu.",
    ]);
  }

  const supabase = getSupabaseAdmin();
  const { data: cluster, error: loadError } = await supabase
    .from("question_clusters")
    .select("id, exam_code, kind")
    .eq("id", id)
    .maybeSingle();
  if (loadError) throw new Error(loadError.message);
  if (!cluster) {
    throw new ContributeError(
      "NOT_FOUND",
      "Không tìm thấy cụm câu hỏi.",
      "Cụm không còn trong ngân hàng",
      ["Tải lại trang rồi thử sửa cụm khác."],
    );
  }

  const { data: members, error: membersError } = await supabase
    .from("questions")
    .select("stem, cluster_position")
    .eq("cluster_id", id)
    .order("cluster_position", { ascending: true });
  if (membersError) throw new Error(membersError.message);

  const fingerprint = clusterFingerprint({
    examCode: cluster.exam_code as ExamCode,
    kind: isClusterKind(cluster.kind) ? cluster.kind : "passage",
    passage: trimmed,
    stems: (members ?? []).map((member) => member.stem),
  });
  await assertClusterFingerprintFree({
    clusterId: id,
    examCode: cluster.exam_code as ExamCode,
    fingerprint,
  });

  const { data, error } = await supabase
    .from("question_clusters")
    .update({ passage: trimmed, fingerprint })
    .eq("id", id)
    .select("id, passage")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) {
    throw new ContributeError(
      "NOT_FOUND",
      "Không tìm thấy cụm câu hỏi.",
      "Cụm không còn trong ngân hàng",
      ["Tải lại trang rồi thử sửa cụm khác."],
    );
  }
  return { id: data.id, passage: data.passage };
}

function notFoundBankItem(kind: "essay" | "question" | "cluster") {
  if (kind === "essay") {
    return new ContributeError(
      "NOT_FOUND",
      "Không tìm thấy đề nghị luận.",
      "Đề không còn trong ngân hàng",
      ["Tải lại trang rồi thử xóa mục khác."],
    );
  }
  if (kind === "cluster") {
    return new ContributeError(
      "NOT_FOUND",
      "Không tìm thấy cụm câu hỏi.",
      "Cụm không còn trong ngân hàng",
      ["Tải lại trang rồi thử xóa mục khác."],
    );
  }
  return new ContributeError(
    "NOT_FOUND",
    "Không tìm thấy câu hỏi.",
    "Câu không còn trong ngân hàng",
    ["Tải lại trang rồi thử xóa mục khác."],
  );
}

export async function deleteEssay(id: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("essays")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw notFoundBankItem("essay");
  return { ok: true as const };
}

export async function deleteQuestion(id: string) {
  const supabase = getSupabaseAdmin();
  const { data: row, error: loadError } = await supabase
    .from("questions")
    .select("id, cluster_id")
    .eq("id", id)
    .maybeSingle();
  if (loadError) throw new Error(loadError.message);
  if (!row) throw notFoundBankItem("question");

  const { error } = await supabase.from("questions").delete().eq("id", id);
  if (error) throw new Error(error.message);

  let clusterRemoved = false;
  if (row.cluster_id) {
    const { count, error: countError } = await supabase
      .from("questions")
      .select("id", { count: "exact", head: true })
      .eq("cluster_id", row.cluster_id);
    if (countError) throw new Error(countError.message);
    if ((count ?? 0) === 0) {
      const { error: clusterError } = await supabase
        .from("question_clusters")
        .delete()
        .eq("id", row.cluster_id);
      if (clusterError) throw new Error(clusterError.message);
      clusterRemoved = true;
    }
  }

  return {
    ok: true as const,
    clusterId: row.cluster_id,
    clusterRemoved,
  };
}

export async function deleteCluster(id: string) {
  const supabase = getSupabaseAdmin();
  const { data: cluster, error: loadError } = await supabase
    .from("question_clusters")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (loadError) throw new Error(loadError.message);
  if (!cluster) throw notFoundBankItem("cluster");

  const { error: questionsError } = await supabase
    .from("questions")
    .delete()
    .eq("cluster_id", id);
  if (questionsError) throw new Error(questionsError.message);

  const { error } = await supabase.from("question_clusters").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true as const };
}

export type SampleBankFingerprints = {
  essay: string;
  questions: Set<string>;
  clusters: Set<string>;
};

export function fingerprintsFromParsedSample(params: {
  examCode: ExamCode;
  essayPrompt: string;
  questions: Question[];
}): SampleBankFingerprints {
  const questionHashes = new Set<string>();
  const clusters = new Map<
    string,
    { kind: ClusterKind; passage: string; members: { stem: string; position: number }[] }
  >();

  for (const question of params.questions) {
    const type = normalizeQuestionType(question.type);
    questionHashes.add(
      questionFingerprint({
        examCode: params.examCode,
        type,
        stem: question.stem,
        options: type === "mcq" ? question.options : undefined,
      }),
    );
    if (question.clusterId && isMcq(type)) {
      const current = clusters.get(question.clusterId) ?? {
        kind: isClusterKind(question.clusterKind) ? question.clusterKind : "passage",
        passage: question.passage ?? "",
        members: [],
      };
      if (!current.passage && question.passage) current.passage = question.passage;
      current.members.push({
        stem: question.stem,
        position: question.clusterPosition ?? current.members.length + 1,
      });
      clusters.set(question.clusterId, current);
    }
  }

  const clusterHashes = new Set<string>();
  for (const cluster of clusters.values()) {
    const members = [...cluster.members]
      .sort((a, b) => a.position - b.position)
      .slice(0, CLUSTER_SIZE);
    if (!cluster.passage.trim() || members.length < 2) continue;
    clusterHashes.add(
      clusterFingerprint({
        examCode: params.examCode,
        kind: cluster.kind,
        passage: cluster.passage,
        stems: members.map((item) => item.stem),
      }),
    );
  }

  return {
    essay: essayFingerprint(params.essayPrompt),
    questions: questionHashes,
    clusters: clusterHashes,
  };
}

export async function deleteBankItemsNotShared(params: {
  examCode: ExamCode;
  essay: string | null;
  questions: string[];
  clusters: string[];
}) {
  const supabase = getSupabaseAdmin();

  if (params.clusters.length > 0) {
    const { data: clusters, error: clusterLoadError } = await supabase
      .from("question_clusters")
      .select("id")
      .eq("exam_code", params.examCode)
      .in("fingerprint", params.clusters);
    if (clusterLoadError) throw new Error(clusterLoadError.message);
    for (const cluster of clusters ?? []) {
      await deleteCluster(cluster.id);
    }
  }

  if (params.questions.length > 0) {
    const { data: rows, error: questionLoadError } = await supabase
      .from("questions")
      .select("id, fingerprint")
      .eq("exam_code", params.examCode);
    if (questionLoadError) throw new Error(questionLoadError.message);
    const hashes = new Set(params.questions);
    const ids = (rows ?? [])
      .filter((row) => {
        if (hashes.has(row.fingerprint)) return true;
        const contentHash = row.fingerprint.split(":")[0];
        return hashes.has(contentHash);
      })
      .map((row) => row.id);
    if (ids.length > 0) {
      const { error: questionDeleteError } = await supabase
        .from("questions")
        .delete()
        .in("id", ids);
      if (questionDeleteError) throw new Error(questionDeleteError.message);
    }
  }

  if (params.essay) {
    const { error: essayError } = await supabase
      .from("essays")
      .delete()
      .eq("fingerprint", params.essay);
    if (essayError) throw new Error(essayError.message);
  }
}
