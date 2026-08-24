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
  SAMPLE_FILES,
  SAMPLE_TITLES,
  generatedSampleTitle,
  isOfficialSampleTitle,
  parseGeneratedSampleNumber,
} from "./constants";
import { asJson, parseAnswerKeyJson, parseQuestions } from "./json";
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
    .select("essay_prompt, questions, answer_key")
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
    .select("id, title, created_at")
    .eq("exam_code", examCode)
    .eq("source", "sample")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const byTitle = new Map<string, { id: string; title: string }>();
  for (const row of data ?? []) {
    if (!byTitle.has(row.title)) {
      byTitle.set(row.title, { id: row.id, title: row.title });
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
      });
    } else {
      other.push({
        id: row.id,
        title: row.title,
        kind: "generated",
        number: 0,
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

export function assertSampleStructure(
  examCode: ExamCode,
  questions: Question[],
  answerKey: AnswerKey,
) {
  const spec = EXAM_SPECS[examCode];
  if (questions.length !== spec.total) {
    throw new Error(
      `Đề ${examCode} phải có đúng ${spec.total} câu phần 2 (đang có ${questions.length}).`,
    );
  }

  const numbers = questions.map((question) => question.originalNumber).sort(
    (a, b) => a - b,
  );
  for (let i = 0; i < spec.total; i += 1) {
    if (numbers[i] !== i + 1) {
      throw new Error(`Thiếu hoặc trùng số câu phần 2 (cần 1–${spec.total}).`);
    }
  }

  const byNumber = new Map(
    questions.map((question) => [question.originalNumber, question]),
  );
  const independentEnd = spec.independentMcq;
  const clusterEnd = independentEnd + spec.clusters * spec.clusterSize;
  const clusterRange = Array.from({ length: spec.clusters * spec.clusterSize }, (_, i) =>
    byNumber.get(independentEnd + 1 + i),
  );
  const clusteredCount = clusterRange.filter((question) => question?.clusterId).length;
  const allowIndependentClusters = examCode === "CA4" && clusteredCount === 0;

  if (examCode === "CA4" && clusteredCount > 0 && clusteredCount < clusterRange.length) {
    throw new Error("Câu 49–54 phải cùng thuộc cụm tình huống hoặc cùng độc lập.");
  }

  const mcqEnd = allowIndependentClusters ? clusterEnd : independentEnd;
  for (let n = 1; n <= mcqEnd; n += 1) {
    const question = byNumber.get(n);
    if (
      !question ||
      normalizeQuestionType(question.type) !== "mcq" ||
      question.clusterId
    ) {
      throw new Error(`Câu ${n} phải là trắc nghiệm độc lập.`);
    }
  }
  if (!allowIndependentClusters) {
    for (let n = independentEnd + 1; n <= clusterEnd; n += 1) {
      const question = byNumber.get(n);
      if (
        !question ||
        normalizeQuestionType(question.type) !== "mcq" ||
        !question.clusterId
      ) {
        throw new Error(`Câu ${n} phải thuộc cụm thông tin/tình huống.`);
      }
      if (!question.passage?.trim()) {
        throw new Error(`Câu ${n} thiếu đoạn thông tin của cụm.`);
      }
    }
  }
  for (let n = clusterEnd + 1; n <= spec.total; n += 1) {
    const question = byNumber.get(n);
    if (!question || normalizeQuestionType(question.type) === "mcq") {
      throw new Error(`Câu ${n} phải là câu điền đáp án.`);
    }
  }

  for (const question of questions) {
    const answer = answerKey[String(question.originalNumber)]?.trim();
    if (!answer) {
      throw new Error(`Thiếu đáp án câu ${question.originalNumber}.`);
    }
  }
}

export type SampleExamDetail = SampleExamOption & {
  examCode: ExamCode;
  essayPrompt: string;
  questions: Question[];
  answerKey: AnswerKey;
};

export async function listSampleExamDetails(): Promise<SampleExamDetail[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("exams")
    .select("id, title, exam_code, essay_prompt, questions, answer_key, created_at")
    .eq("source", "sample")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);

  const details: SampleExamDetail[] = [];
  for (const row of data ?? []) {
    if (row.exam_code !== "CA1" && row.exam_code !== "CA4") continue;
    const examCode = row.exam_code;
    const official = isOfficialSampleTitle(row.title, examCode);
    const generatedNumber = parseGeneratedSampleNumber(row.title, examCode);
    details.push({
      id: row.id,
      title: row.title,
      examCode,
      kind: official ? "official" : "generated",
      number: official ? 1 : (generatedNumber ?? 0),
      essayPrompt: row.essay_prompt,
      questions: parseQuestions(row.questions),
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
  questions: Question[];
  answerKey: AnswerKey;
}) {
  const supabase = getSupabaseAdmin();
  const { data: existing, error: loadError } = await supabase
    .from("exams")
    .select("id, title, exam_code, source")
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
  if (prompt.length < 80) {
    throw new Error("Đề nghị luận quá ngắn.");
  }
  assertSampleStructure(existing.exam_code, params.questions, params.answerKey);

  const { data, error } = await supabase
    .from("exams")
    .update({
      essay_prompt: prompt,
      questions: asJson(params.questions),
      answer_key: asJson(params.answerKey),
    })
    .eq("id", params.examId)
    .select("id, title, essay_prompt, questions, answer_key, exam_code")
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

  const { data: others, error: othersError } = await supabase
    .from("exams")
    .select("exam_code, essay_prompt, questions")
    .eq("source", "sample")
    .neq("id", examId);
  if (othersError) throw new Error(othersError.message);

  const keptEssay = new Set<string>();
  const keptQuestions = new Set<string>();
  const keptClusters = new Set<string>();
  for (const row of others ?? []) {
    if (row.exam_code !== "CA1" && row.exam_code !== "CA4") continue;
    const fingerprints = fingerprintsFromParsedSample({
      examCode: row.exam_code,
      essayPrompt: row.essay_prompt,
      questions: parseQuestions(row.questions),
    });
    keptEssay.add(fingerprints.essay);
    for (const hash of fingerprints.questions) keptQuestions.add(hash);
    for (const hash of fingerprints.clusters) keptClusters.add(hash);
  }

  await deleteBankItemsNotShared({
    examCode,
    essay: keptEssay.has(mine.essay) ? null : mine.essay,
    questions: [...mine.questions].filter((hash) => !keptQuestions.has(hash)),
    clusters: [...mine.clusters].filter((hash) => !keptClusters.has(hash)),
  });

  const { error } = await supabase.from("exams").delete().eq("id", examId);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function saveGeneratedSampleExam(params: {
  examCode: ExamCode;
  essayPrompt: string;
  questions: Question[];
  answerKey: AnswerKey;
  diversity?: number;
  pdf?: { bytes: Buffer; filename: string };
  answerFile?: { bytes: Buffer; filename: string };
}) {
  const prompt = params.essayPrompt.trim();
  if (prompt.length < 80) {
    throw new Error("Đề nghị luận quá ngắn.");
  }

  assertSampleStructure(params.examCode, params.questions, params.answerKey);

  const number = await nextGeneratedSampleNumber(params.examCode);
  const title = generatedSampleTitle(params.examCode, number);
  const exam = await persistExam({
    title,
    essayPrompt: prompt,
    questions: params.questions,
    answerKey: params.answerKey,
    examCode: params.examCode,
    source: "sample",
    pdf: params.pdf,
    answerFile: params.answerFile,
  });

  const imported = await importParsedIntoBank({
    examCode: params.examCode,
    essayPrompt: prompt,
    questions: params.questions,
    answerKey: params.answerKey,
    sourceFilename: `${title}.json`,
    checkNearDuplicates: false,
  });

  return {
    examId: exam.id,
    title,
    number,
    diversity: params.diversity,
    imported,
  };
}
