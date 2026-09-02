import { readFile } from "node:fs/promises";
import path from "node:path";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  deleteBankItemsNotShared,
  fingerprintsFromParsedSample,
  importParsedIntoBank,
} from "./bank";
import {
  EXAM_SPECS,
  OPTION_LETTERS,
  SAMPLE_FILES,
  SAMPLE_TITLES,
  generatedSampleTitle,
  isOfficialSampleTitle,
  parseGeneratedSampleNumber,
} from "./constants";
import { asJson, optionalText, parseAnswerKeyJson, parseQuestions } from "./json";
import { parseAnswerKey } from "./parse-answers";
import { parseExamPdf } from "./parse-pdf";
import { persistExam } from "./persist-exam";
import {
  normalizeQuestionType,
  type AnswerKey,
  type ExamCode,
  type Question,
  type SampleExamOption,
} from "./types";

export type { SampleExamOption };

export async function loadAndParseSample(examCode: ExamCode) {
  const fixtures = path.join(process.cwd(), "fixtures");
  const files = SAMPLE_FILES[examCode];
  const pdfBytes = await readFile(path.join(fixtures, files.pdf));
  const answerText = await readFile(path.join(fixtures, files.answers), "utf8");
  const answerKey = parseAnswerKey(answerText, EXAM_SPECS[examCode].total);
  const parsed = await parseExamPdf(new Uint8Array(pdfBytes), answerKey, examCode);
  return { pdfBytes, answerText, answerKey, parsed, files };
}

export async function getOrCreateSampleExam(examCode: ExamCode) {
  const supabase = getSupabaseAdmin();
  const title = SAMPLE_TITLES[examCode];
  const existing = await supabase
    .from("exams")
    .select("id, questions")
    .eq("title", title)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing.data?.id) {
    const hasClusters = parseQuestions(existing.data.questions).some((question) =>
      Boolean(question.clusterId),
    );
    if (hasClusters) {
      await seedBankFromSample(examCode).catch((error) => {
        console.error("seed bank from sample failed", error);
      });
      return { examId: existing.data.id };
    }
  }

  const { pdfBytes, answerText, answerKey, parsed, files } =
    await loadAndParseSample(examCode);

  const exam = await persistExam({
    title,
    essayPrompt: parsed.essayPrompt,
    questions: parsed.questions,
    answerKey,
    examCode,
    source: "sample",
    pdf: { bytes: pdfBytes, filename: files.pdf },
    answerFile: {
      bytes: Buffer.from(answerText, "utf8"),
      filename: files.answers,
    },
  });

  await importParsedIntoBank({
    examCode,
    essayPrompt: parsed.essayPrompt,
    questions: parsed.questions,
    answerKey,
    sourceFilename: files.pdf,
    checkNearDuplicates: false,
  }).catch((error) => {
    console.error("seed bank from sample failed", error);
  });

  return { examId: exam.id };
}

export async function seedBankFromSample(examCode: ExamCode): Promise<void> {
  const supabase = getSupabaseAdmin();
  const spec = EXAM_SPECS[examCode];
  const [{ count: essayCount }, { count: questionCount }, { count: clusterCount }] =
    await Promise.all([
      supabase.from("essays").select("id", { count: "exact", head: true }),
      supabase
        .from("questions")
        .select("id", { count: "exact", head: true })
        .eq("exam_code", examCode),
      supabase
        .from("question_clusters")
        .select("id", { count: "exact", head: true })
        .eq("exam_code", examCode),
    ]);

  if (
    (essayCount ?? 0) > 0 &&
    (questionCount ?? 0) > 0 &&
    (clusterCount ?? 0) >= spec.clusters
  ) {
    return;
  }

  const title = SAMPLE_TITLES[examCode];
  const { data: exam } = await supabase
    .from("exams")
    .select("essay_prompt, essay_topic, essay_solution, questions, answer_key")
    .eq("title", title)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (exam) {
    const questions = parseQuestions(exam.questions);
    if (questions.some((question) => Boolean(question.clusterId))) {
      await importParsedIntoBank({
        examCode,
        essayPrompt: exam.essay_prompt,
        essayTopic: optionalText(exam.essay_topic),
        essaySolution: optionalText(exam.essay_solution),
        questions,
        answerKey: parseAnswerKeyJson(exam.answer_key),
        sourceFilename: SAMPLE_FILES[examCode].pdf,
        checkNearDuplicates: false,
      });
      return;
    }
  }

  const { answerKey, parsed, files } = await loadAndParseSample(examCode);
  await importParsedIntoBank({
    examCode,
    essayPrompt: parsed.essayPrompt,
    questions: parsed.questions,
    answerKey,
    sourceFilename: files.pdf,
    checkNearDuplicates: false,
  });
}

export async function ensureBankReady(examCode: ExamCode): Promise<void> {
  await seedBankFromSample(examCode);
}

export async function listSampleExams(
  examCode: ExamCode,
): Promise<SampleExamOption[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("exams")
    .select("id, title, created_at, essay_prompt, questions")
    .eq("exam_code", examCode)
    .eq("source", "sample")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const byTitle = new Map<
    string,
    { id: string; title: string; hasPart1: boolean; hasPart2: boolean }
  >();
  for (const row of data ?? []) {
    if (!byTitle.has(row.title)) {
      byTitle.set(row.title, {
        id: row.id,
        title: row.title,
        ...samplePartsFromRow(row),
      });
    }
  }

  const officialTitle = SAMPLE_TITLES[examCode];
  const official = byTitle.get(officialTitle);
  const generated: SampleExamOption[] = [];
  const other: SampleExamOption[] = [];

  for (const row of byTitle.values()) {
    if (row.title === officialTitle) continue;
    const number = parseGeneratedSampleNumber(row.title, examCode);
    if (number != null) {
      generated.push({
        id: row.id,
        title: row.title,
        kind: "generated",
        number,
        hasPart1: row.hasPart1,
        hasPart2: row.hasPart2,
      });
    } else {
      other.push({
        id: row.id,
        title: row.title,
        kind: "generated",
        number: 0,
        hasPart1: row.hasPart1,
        hasPart2: row.hasPart2,
      });
    }
  }

  generated.sort((a, b) => a.number - b.number);
  other.sort((a, b) => a.title.localeCompare(b.title, "vi"));

  return [
    {
      id: official?.id ?? null,
      title: officialTitle,
      kind: "official",
      number: 1,
      hasPart1: official?.hasPart1 ?? true,
      hasPart2: official?.hasPart2 ?? true,
    },
    ...generated,
    ...other,
  ];
}

export async function nextGeneratedSampleNumber(
  examCode: ExamCode,
): Promise<number> {
  const options = await listSampleExams(examCode);
  const maxGenerated = options
    .filter((item) => item.kind === "generated" && item.number >= 2)
    .reduce((max, item) => Math.max(max, item.number), 1);
  return maxGenerated + 1;
}

export async function getExistingSampleExam(
  examCode: ExamCode,
  examId: string,
): Promise<{ examId: string }> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("exams")
    .select("id, exam_code, source")
    .eq("id", examId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (
    !data?.id ||
    data.exam_code !== examCode ||
    data.source !== "sample"
  ) {
    throw new Error("Không tìm thấy đề minh họa.");
  }
  return { examId: data.id };
}

function fillClusterPassages(questions: Question[]): Question[] {
  const passages = new Map<string, string>();
  for (const question of questions) {
    if (question.clusterId && question.passage?.trim()) {
      passages.set(question.clusterId, question.passage.trim());
    }
  }
  return questions.map((question) => {
    if (!question.clusterId) return question;
    const passage = passages.get(question.clusterId);
    return passage ? { ...question, passage } : question;
  });
}

function samplePartsFromRow(row: {
  essay_prompt?: string | null;
  questions?: unknown;
}): { hasPart1: boolean; hasPart2: boolean } {
  const questions = Array.isArray(row.questions) ? row.questions : [];
  return {
    hasPart1: Boolean(row.essay_prompt?.trim()),
    hasPart2: questions.length > 0,
  };
}

function assertSampleParts(
  essayPrompt: string,
  questions: Question[],
  answerKey: AnswerKey,
) {
  const prompt = essayPrompt.trim();
  const hasPart1 = prompt.length > 0;
  const hasPart2 = questions.length > 0;
  if (!hasPart1 && !hasPart2) {
    throw new Error("Đề minh họa cần phần 1 hoặc phần 2.");
  }
  if (hasPart1 && prompt.length < 80) {
    throw new Error("Đề nghị luận quá ngắn.");
  }
  if (hasPart2) {
    assertFlexibleSample(questions, answerKey);
  }
}

export function assertFlexibleSample(
  questions: Question[],
  answerKey: AnswerKey,
) {
  if (questions.length < 1) {
    throw new Error("Đề minh họa cần ít nhất 1 câu phần 2.");
  }

  const seen = new Set<number>();
  const clusterPassages = new Map<string, string>();
  for (const question of questions) {
    if (question.clusterId && question.passage?.trim()) {
      clusterPassages.set(question.clusterId, question.passage.trim());
    }
  }

  for (const question of questions) {
    if (!Number.isInteger(question.originalNumber) || question.originalNumber < 1) {
      throw new Error("Số câu không hợp lệ.");
    }
    if (seen.has(question.originalNumber)) {
      throw new Error(`Trùng số câu ${question.originalNumber}.`);
    }
    seen.add(question.originalNumber);

    if (!question.stem?.trim()) {
      throw new Error(`Câu ${question.originalNumber} thiếu nội dung đề bài.`);
    }

    const type = normalizeQuestionType(question.type);
    const answer = answerKey[String(question.originalNumber)]?.trim();
    if (!answer) {
      throw new Error(`Thiếu đáp án câu ${question.originalNumber}.`);
    }

    if (type === "mcq") {
      const options = question.options;
      if (!options) {
        throw new Error(`Câu ${question.originalNumber} trắc nghiệm thiếu đáp án A–D.`);
      }
      for (const letter of OPTION_LETTERS) {
        if (!options[letter]?.trim()) {
          throw new Error(
            `Câu ${question.originalNumber} trắc nghiệm thiếu lựa chọn ${letter}.`,
          );
        }
      }
      const letter = answer.toUpperCase();
      if (!OPTION_LETTERS.includes(letter as (typeof OPTION_LETTERS)[number])) {
        throw new Error(`Đáp án câu ${question.originalNumber} phải là A, B, C hoặc D.`);
      }
      if (question.clusterId) {
        if (!clusterPassages.get(question.clusterId)) {
          throw new Error(`Câu ${question.originalNumber} thuộc cụm nhưng thiếu đoạn thông tin.`);
        }
      }
    } else if (question.clusterId) {
      throw new Error(`Câu điền ${question.originalNumber} không được thuộc cụm.`);
    }
  }
}

export type SampleExamDetail = SampleExamOption & {
  examCode: ExamCode;
  essayPrompt: string;
  essayTopic?: string;
  essaySolution?: string;
  questions: Question[];
  answerKey: AnswerKey;
};

export async function listSampleExamDetails(): Promise<SampleExamDetail[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("exams")
    .select(
      "id, title, exam_code, essay_prompt, essay_topic, essay_solution, questions, answer_key, created_at",
    )
    .eq("source", "sample")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);

  const details: SampleExamDetail[] = [];
  for (const row of data ?? []) {
    if (row.exam_code !== "CA1" && row.exam_code !== "CA4") continue;
    const examCode = row.exam_code;
    const official = isOfficialSampleTitle(row.title, examCode);
    const generatedNumber = parseGeneratedSampleNumber(row.title, examCode);
    const questions = parseQuestions(row.questions);
    details.push({
      id: row.id,
      title: row.title,
      examCode,
      kind: official ? "official" : "generated",
      number: official ? 1 : (generatedNumber ?? 0),
      hasPart1: Boolean(row.essay_prompt.trim()),
      hasPart2: questions.length > 0,
      essayPrompt: row.essay_prompt,
      essayTopic: optionalText(row.essay_topic),
      essaySolution: optionalText(row.essay_solution),
      questions,
      answerKey: parseAnswerKeyJson(row.answer_key),
    });
  }
  details.sort((a, b) => {
    if (a.examCode !== b.examCode) return a.examCode.localeCompare(b.examCode);
    if (a.number !== b.number) return a.number - b.number;
    return a.title.localeCompare(b.title, "vi");
  });
  return details;
}

export async function updateSampleExam(params: {
  examId: string;
  essayPrompt: string;
  essayTopic?: string;
  essaySolution?: string;
  questions: Question[];
  answerKey: AnswerKey;
  title?: string;
}) {
  const supabase = getSupabaseAdmin();
  const { data: existing, error: loadError } = await supabase
    .from("exams")
    .select("id, title, exam_code, source, essay_prompt, questions")
    .eq("id", params.examId)
    .maybeSingle();
  if (loadError) throw new Error(loadError.message);
  if (!existing || existing.source !== "sample") {
    throw new Error("Không tìm thấy đề minh họa.");
  }
  if (existing.exam_code !== "CA1" && existing.exam_code !== "CA4") {
    throw new Error("Mã đề minh họa không hợp lệ.");
  }
  if (isOfficialSampleTitle(existing.title, existing.exam_code)) {
    throw new Error("Không được sửa đề minh họa chính thức.");
  }
  const prompt = params.essayPrompt.trim();
  const questions = fillClusterPassages(params.questions);
  assertSampleParts(prompt, questions, params.answerKey);

  const nextTitle = params.title?.trim();
  if (nextTitle !== undefined) {
    if (!nextTitle) {
      throw new Error("Tên đề minh họa không được để trống.");
    }
    if (isOfficialSampleTitle(nextTitle, existing.exam_code)) {
      throw new Error("Không được dùng tên đề minh họa chính thức.");
    }
    const { data: clash, error: clashError } = await supabase
      .from("exams")
      .select("id")
      .eq("source", "sample")
      .eq("exam_code", existing.exam_code)
      .eq("title", nextTitle)
      .neq("id", params.examId)
      .maybeSingle();
    if (clashError) throw new Error(clashError.message);
    if (clash) {
      throw new Error("Đã có đề minh họa cùng tên.");
    }
  }

  const previous = fingerprintsFromParsedSample({
    examCode: existing.exam_code,
    essayPrompt: existing.essay_prompt,
    questions: parseQuestions(existing.questions),
  });
  const next = fingerprintsFromParsedSample({
    examCode: existing.exam_code,
    essayPrompt: prompt,
    questions,
  });
  await pruneUnsharedSampleBankItems({
    examId: params.examId,
    examCode: existing.exam_code,
    previous,
    next,
  });

  const { data, error } = await supabase
    .from("exams")
    .update({
      ...(nextTitle ? { title: nextTitle } : {}),
      essay_prompt: prompt,
      essay_topic: optionalText(params.essayTopic) ?? null,
      essay_solution: optionalText(params.essaySolution) ?? null,
      questions: asJson(questions),
      answer_key: asJson(params.answerKey),
    })
    .eq("id", params.examId)
    .select(
      "id, title, essay_prompt, essay_topic, essay_solution, questions, answer_key, exam_code",
    )
    .single();
  if (error || !data) {
    throw new Error(error?.message || "Không lưu được đề minh họa.");
  }
  return data;
}

export async function deleteSampleExam(examId: string) {
  const supabase = getSupabaseAdmin();
  const { data: existing, error: loadError } = await supabase
    .from("exams")
    .select("id, title, exam_code, source, essay_prompt, questions")
    .eq("id", examId)
    .maybeSingle();
  if (loadError) throw new Error(loadError.message);
  if (!existing || existing.source !== "sample") {
    throw new Error("Không tìm thấy đề minh họa.");
  }
  if (existing.exam_code !== "CA1" && existing.exam_code !== "CA4") {
    throw new Error("Mã đề minh họa không hợp lệ.");
  }
  if (isOfficialSampleTitle(existing.title, existing.exam_code)) {
    throw new Error("Không được xóa đề minh họa chính thức.");
  }

  const examCode = existing.exam_code;
  const mine = fingerprintsFromParsedSample({
    examCode,
    essayPrompt: existing.essay_prompt,
    questions: parseQuestions(existing.questions),
  });
  const kept = await fingerprintsKeptByOtherSamples(examId);

  await deleteBankItemsNotShared({
    examCode,
    essay:
      existing.essay_prompt.trim() && !kept.essay.has(mine.essay)
        ? mine.essay
        : null,
    questions: [...mine.questions].filter((hash) => !kept.questions.has(hash)),
    clusters: [...mine.clusters].filter((hash) => !kept.clusters.has(hash)),
  });

  const { error } = await supabase.from("exams").delete().eq("id", examId);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function saveGeneratedSampleExam(params: {
  examCode: ExamCode;
  essayPrompt: string;
  essayTopic?: string;
  essaySolution?: string;
  questions: Question[];
  answerKey: AnswerKey;
  diversity?: number;
  pdf?: { bytes: Buffer; filename: string };
  answerFile?: { bytes: Buffer; filename: string };
  createdBy?: string;
  sourceFilename?: string;
}) {
  const prompt = params.essayPrompt.trim();
  const questions = fillClusterPassages(params.questions);
  assertSampleParts(prompt, questions, params.answerKey);

  const number = await nextGeneratedSampleNumber(params.examCode);
  const title = generatedSampleTitle(params.examCode, number);
  const exam = await persistExam({
    title,
    essayPrompt: prompt,
    essayTopic: params.essayTopic,
    essaySolution: params.essaySolution,
    questions,
    answerKey: params.answerKey,
    examCode: params.examCode,
    source: "sample",
    pdf: params.pdf,
    answerFile: params.answerFile,
  });

  const sourceFilename = params.sourceFilename ?? `${title}.json`;
  let contributionId: string | null = null;
  if (params.createdBy) {
    const supabase = getSupabaseAdmin();
    const { data: contribution, error: contribError } = await supabase
      .from("contributions")
      .insert({
        user_id: params.createdBy,
        kind: "sample",
        exam_code: params.examCode,
        source_filename: sourceFilename,
        added_count: 0,
        skipped_count: 0,
      })
      .select("id")
      .single();
    if (contribError || !contribution) {
      throw new Error(contribError?.message || "Không ghi được lịch sử đóng góp.");
    }
    contributionId = contribution.id;
  }

  const imported = await importParsedIntoBank({
    examCode: params.examCode,
    essayPrompt: prompt,
    essayTopic: params.essayTopic,
    essaySolution: params.essaySolution,
    questions,
    answerKey: params.answerKey,
    sourceFilename,
    checkNearDuplicates: false,
    attribution: params.createdBy
      ? { createdBy: params.createdBy, contributionId }
      : undefined,
  });

  if (contributionId) {
    const supabase = getSupabaseAdmin();
    await supabase
      .from("contributions")
      .update({
        added_count: imported.essays.added + imported.questions.added,
        skipped_count: imported.essays.skipped + imported.questions.skipped,
      })
      .eq("id", contributionId);
  }

  return {
    examId: exam.id,
    title,
    number,
    diversity: params.diversity,
    imported,
  };
}

async function fingerprintsKeptByOtherSamples(examId: string) {
  const supabase = getSupabaseAdmin();
  const { data: others, error } = await supabase
    .from("exams")
    .select("exam_code, essay_prompt, questions")
    .eq("source", "sample")
    .neq("id", examId);
  if (error) throw new Error(error.message);

  const kept = {
    essay: new Set<string>(),
    questions: new Set<string>(),
    clusters: new Set<string>(),
  };
  for (const row of others ?? []) {
    if (row.exam_code !== "CA1" && row.exam_code !== "CA4") continue;
    const fingerprints = fingerprintsFromParsedSample({
      examCode: row.exam_code,
      essayPrompt: row.essay_prompt,
      questions: parseQuestions(row.questions),
    });
    kept.essay.add(fingerprints.essay);
    for (const hash of fingerprints.questions) kept.questions.add(hash);
    for (const hash of fingerprints.clusters) kept.clusters.add(hash);
  }
  return kept;
}

async function pruneUnsharedSampleBankItems(params: {
  examId: string;
  examCode: ExamCode;
  previous: ReturnType<typeof fingerprintsFromParsedSample>;
  next: ReturnType<typeof fingerprintsFromParsedSample>;
}) {
  const removedQuestions = [...params.previous.questions].filter(
    (hash) => !params.next.questions.has(hash),
  );
  const removedClusters = [...params.previous.clusters].filter(
    (hash) => !params.next.clusters.has(hash),
  );
  if (removedQuestions.length === 0 && removedClusters.length === 0) return;

  const kept = await fingerprintsKeptByOtherSamples(params.examId);
  await deleteBankItemsNotShared({
    examCode: params.examCode,
    essay: null,
    questions: removedQuestions.filter((hash) => !kept.questions.has(hash)),
    clusters: removedClusters.filter((hash) => !kept.clusters.has(hash)),
  });
}
